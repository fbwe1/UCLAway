import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function RideDetail({ currentUserId, socket }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [removingRider, setRemovingRider] = useState(null);
  const [usernames, setUsernames] = useState({});

  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPickupLocation, setEditPickupLocation] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editTotalSeats, setEditTotalSeats] = useState('');
  const [editDepartureTime, setEditDepartureTime] = useState('');
  const [editIsRoundTrip, setEditIsRoundTrip] = useState(false);
  const [editReturnTime, setEditReturnTime] = useState('');



  

  const toDatetimeLocal = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const now = toDatetimeLocal(new Date());

  const fetchRide = async () => {
    try {
      // ensure JWT auth included
      const token = localStorage.getItem("token")
      if (!token){
        console.error("No JWT found. User must log in again");
        setErrorMsg("Please Log In Again!")
        setLoading(false);
        return;
      }
      const res = await fetch(`http://localhost:3001/api/rides/${id}`,{
        headers: {
          Authorization: `Bearer ${token}`,
        }
    });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Ride not found');
      } else {
        setRide(data);
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
  }, [id]);

  // Populate edit fields whenever ride data loads
  useEffect(() => {
    if (!ride) return;
    setEditTitle(ride.title || '');
    setEditDescription(ride.description || '');
    setEditPickupLocation(ride.pickup_location || '');
    setEditDestination(ride.destination || '');
    setEditTotalSeats(ride.total_seats || '');
    setEditDepartureTime(toDatetimeLocal(ride.departure_time));
    setEditIsRoundTrip(Boolean(ride.is_round_trip));
    setEditReturnTime(toDatetimeLocal(ride.return_time));
  }, [ride]);

  // Fetch usernames for creator and all passengers
  useEffect(() => {
    if (!ride) return;
    const token = localStorage.getItem("token");
    const ids = [ride.creator_user_id, ...(ride.passengers || [])];
    Promise.all(
      ids.map(uid =>
        fetch(`http://localhost:3001/api/profile/${uid}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json())
      )
    ).then(profiles => {
      const map = {};
      profiles.forEach(p => { if (p.profile_id) map[p.profile_id] = p.username; });
      setUsernames(map);
    }).catch(console.error);
  }, [ride]);

  // Listen for real-time ride updates via Socket.io
  // So join/leave/remove rider updates are reflected instantly without going back to feed
  useEffect(() => {
    if (!socket) return;
    socket.on('rides-update', (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new.id === parseInt(id)) {
        // Re-fetch instead of using payload.new directly
        // because join uses an RPC which may return incomplete data
        fetchRide();
      }
      if (payload.eventType === 'DELETE' && payload.old.id === parseInt(id)) {
        navigate('/');
      }
    });
    return () => socket.off('rides-update');
  }, [socket, id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles' // TODO: get from user profile after auth merges
    });
  };

  const handleJoinLeave = async () => {
    if (!ride) return;
    setActionLoading(true);
    setErrorMsg('');
    const hasJoined = ride.passengers && ride.passengers.includes(currentUserId);
    const action = hasJoined ? 'leave' : 'join';
    try {
      const token = localStorage.getItem("token");
      if (!token){
        console.error("No JWT found. User must log in again");
        setErrorMsg("Please Log In Again!")
        setLoading(false);
        return;
      }
      const res = await fetch(`http://localhost:3001/api/rides/${ride.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
         },
        body: JSON.stringify({ userId: currentUserId })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong');
      } else {
        fetchRide(); // re-fetch to get updated ride state
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRider = async (riderId) => {
    setRemovingRider(riderId);
    setErrorMsg('');

    try {
      // ensure JWT auth included
      const token = localStorage.getItem("token");
      if (!token){
        console.error("No JWT found. User must log in again");
        setErrorMsg("Please Log In Again!")
        setLoading(false);
        return;
      }
      const res = await fetch(`http://localhost:3001/api/rides/${ride.id}/remove-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
         },
        body: JSON.stringify({ userId: currentUserId, riderId })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to remove rider');
      } else {
        fetchRide();
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setRemovingRider(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setErrorMsg('');

    if (editIsRoundTrip) {
      if (!editReturnTime) {
        setErrorMsg('Return time is required for round trips');
        setSavingEdit(false);
        return;
      }
      if (new Date(editReturnTime) <= new Date(editDepartureTime)) {
        setErrorMsg('Return time must be after departure time');
        setSavingEdit(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem("token")
      if (!token){
        console.error("No JWT found. User must log in again");
        setErrorMsg("Please Log In Again!")
        setLoading(false);
        return;
      }
      const res = await fetch(`http://localhost:3001/api/rides/${ride.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
         },
        body: JSON.stringify({
          userId: currentUserId,
          title: editTitle,
          description: editDescription,
          pickup_location: editPickupLocation,
          destination: editDestination,
          total_seats: parseInt(editTotalSeats),
          departure_time: new Date(editDepartureTime).toISOString(),
          is_round_trip: editIsRoundTrip,
          return_time: editIsRoundTrip ? new Date(editReturnTime).toISOString() : null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update ride');
      } else {
        setEditing(false);
        fetchRide();
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleMessageUser = async (targetUserId) => {
    // Start or find a conversation then navigate to it
    try {
      const token = localStorage.getItem("token");
      if (!token){
        console.error("No JWT found. User must log in again");
        setErrorMsg("Please Log In Again!")
        setLoading(false);
        return;
      }
      const res = await fetch('http://localhost:3001/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
         },
        body: JSON.stringify({ senderId: currentUserId, receiverId: targetUserId })
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/messages/${data.conversation.id}`);
      } else {
        setErrorMsg(data.error || 'Failed to start conversation');
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (errorMsg && !ride) return (
    <div style={{ padding: '20px' }}>
      <p style={{ color: 'red' }}>{errorMsg}</p>
      <button
        type="button"
        className="back-link"
        onClick={() => navigate('/')}
      >
        ← Back to Feed
      </button>
    </div>
  );
  if (!ride) return null;

  const isCreator = ride.creator_user_id === currentUserId;
  const hasJoined = ride.passengers && ride.passengers.includes(currentUserId);
  const isRemoved = ride.removed_passengers && ride.removed_passengers.includes(currentUserId);
  const isFull = ride.available_seats <= 0;
  const canJoin = !isCreator && !isRemoved && !hasJoined && !isFull;

  let joinButtonColor = '#4CAF50';
  if (hasJoined) joinButtonColor = '#ff4d4d';
  else if (isFull || isRemoved) joinButtonColor = '#cccccc';

  return (
    <main className="page">

      {/* Back button */}
      <button
        type="button"
        className="back-link"
        onClick={() => navigate('/')}
      >
        ← Back to Feed
      </button>
      <article className="post-card ride-detail-card">
        {/* Title, status, and trip type */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <h2 style={{ margin: 0 }}>{ride.title}</h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '6px',
            }}
          >
            <span
              className="ride-detail-badge"
              style={{
                backgroundColor: isFull ? '#f0a500' : '#2196F3',
              }}
            >
              {isFull ? 'Full' : `Missing ${ride.available_seats}`}
            </span>

            <span
              className="ride-detail-badge"
              style={{
                backgroundColor: ride.is_round_trip ? '#6a0dad' : '#333',
              }}
            >
              {ride.is_round_trip ? 'Round Trip' : 'One Way'}
            </span>
          </div>
        </div>

        {/* Route */}
        <p style={{ fontSize: '15px', margin: '6px 0' }}>
          <strong>{ride.pickup_location}</strong> → <strong>{ride.destination}</strong>
        </p>

        {/* Description */}
        {ride.description && (
          <p style={{ fontSize: '14px', color: '#555', margin: '8px 0' }}>{ride.description}</p>
        )}

        {/* Times */}
        {ride.departure_time && (
          <p style={{ fontSize: '14px', margin: '4px 0' }}>
            <strong>Departure:</strong> {formatDate(ride.departure_time)}
          </p>
        )}
        {ride.is_round_trip && ride.return_time && (
          <p style={{ fontSize: '14px', margin: '4px 0' }}>
            <strong>Return:</strong> {formatDate(ride.return_time)}
          </p>
        )}

        {/* Riders count */}
        <p style={{ fontSize: '14px', margin: '8px 0' }}>
          <strong>Riders:</strong> {(ride.passengers || []).length + 1} / {ride.total_seats}
        </p>

        {/* Posted time */}
        {ride.created_at && (
          <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0' }}>
            Posted {formatDate(ride.created_at)}
          </p>
        )}

        <hr style={{ margin: '16px 0', borderColor: '#eee' }} />

        {/* ── People section ── */}
        <h3 style={{ margin: '0 0 10px 0' }}>People</h3>

        {/* Creator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px' }}>
            👤 <strong>{usernames[ride.creator_user_id] || `User ${ride.creator_user_id}`}</strong>
            <span style={{
              marginLeft: '8px',
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '1px 6px',
              borderRadius: '8px',
              fontSize: '11px'
            }}>Driver</span>
          </span>
          {/* Don't show message button for yourself */}
          {ride.creator_user_id !== currentUserId && (
            <button
              onClick={() => handleMessageUser(ride.creator_user_id)}
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Message
            </button>
          )}
        </div>

        {/* Passengers */}
        {ride.passengers && ride.passengers.length > 0 ? (
          ride.passengers.map(passengerId => (
            <div key={passengerId} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px' }}>
                👤 {usernames[passengerId] || `User ${passengerId}`}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {/* Message button — hidden for yourself */}
                {passengerId !== currentUserId && (
                  <button
                    onClick={() => handleMessageUser(passengerId)}
                    style={{
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Message
                  </button>
                )}
                {/* Remove rider button — creator only */}
                {isCreator && (
                  <button
                    onClick={() => handleRemoveRider(passengerId)}
                    disabled={removingRider === passengerId}
                    style={{
                      backgroundColor: removingRider === passengerId ? '#ccc' : '#c0392b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: removingRider === passengerId ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {removingRider === passengerId ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          !isCreator && <p style={{ color: '#aaa', fontSize: '13px' }}>No passengers yet.</p>
        )}

        <hr style={{ margin: '16px 0', borderColor: '#eee' }} />

        {errorMsg && <p style={{ color: 'red', fontSize: '14px' }}>{errorMsg}</p>}

        {/* ── Join / Leave button ── */}
        {isRemoved && (
          <p style={{ color: '#c0392b', fontSize: '13px', textAlign: 'center' }}>
            You have been removed from this ride
          </p>
        )}

        {isCreator && (
          <>
            <p style={{ color: '#888', fontSize: '13px', textAlign: 'center' }}>
              You created this ride
            </p>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="secondary-button"
                style={{ width: '100%', marginBottom: '8px' }}
              >
                Edit Ride
              </button>
            ) : (
              <form onSubmit={handleSaveEdit} className="edit-ride-form">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Pickup Location</label>
                  <input
                    type="text"
                    value={editPickupLocation}
                    onChange={(e) => setEditPickupLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Destination</label>
                  <input
                    type="text"
                    value={editDestination}
                    onChange={(e) => setEditDestination(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Total Seats including yourself</label>
                  <input
                    type="number"
                    value={editTotalSeats}
                    onChange={(e) => setEditTotalSeats(e.target.value)}
                    required
                    min={Math.max((ride.passengers?.length || 0) + 1, 2)}
                    max="8"
                  />
                </div>

                <div className="form-group">
                  <label>Departure Time</label>
                  <input
                    type="datetime-local"
                    value={editDepartureTime}
                    onChange={(e) => setEditDepartureTime(e.target.value)}
                    required
                    min={now}
                  />
                </div>

                <div className="edit-checkbox-row">
                  <input
                    type="checkbox"
                    id="editRoundTrip"
                    checked={editIsRoundTrip}
                    onChange={(e) => setEditIsRoundTrip(e.target.checked)}
                  />
                  <label htmlFor="editRoundTrip">Round Trip</label>
                </div>

                {editIsRoundTrip && (
                  <div className="form-group">
                    <label>Return Time</label>
                    <input
                      type="datetime-local"
                      value={editReturnTime}
                      onChange={(e) => setEditReturnTime(e.target.value)}
                      required={editIsRoundTrip}
                      min={editDepartureTime || now}
                    />
                  </div>
                )}

                <div className="edit-form-actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={savingEdit}
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setEditing(false);
                      setErrorMsg('');
                    }}
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {!isCreator && !isRemoved && (
          <button
            onClick={handleJoinLeave}
            disabled={actionLoading || (!hasJoined && !canJoin)}
            style={{
              backgroundColor: actionLoading ? '#ccc' : joinButtonColor,
              color: (!hasJoined && !canJoin) ? '#666' : 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '4px',
              cursor: actionLoading || (!hasJoined && !canJoin) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              width: '100%',
              fontSize: '15px'
            }}
          >
            {actionLoading ? 'Processing...' :
            hasJoined ? 'Leave Ride' :
            isFull ? 'Ride Full' : 'Join Ride'}
          </button>
        )}

      </article>
    </main>
  );
}

export default RideDetail;