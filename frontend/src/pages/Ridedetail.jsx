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

  // Temporary note — resets on every page load (useState only, no DB or localStorage)
  // TODO: persist to DB once comments are added to rides table
  const [note, setNote] = useState('');

  // Defined outside the effect — same pattern as fetchRides in RideFeed.
  // All values it closes over (id, setRide, setErrorMsg, setLoading) are stable
  // references so calling this from a once-registered socket handler is safe.
  const fetchRide = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/rides/${id}`);
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

  // Single effect, empty dep array — mirrors RideFeed exactly.
  // Combining the initial fetch and socket listener into one effect with []
  // means the listener is registered once and never torn down/re-created,
  // which is why RideFeed reliably receives updates.
  useEffect(() => {
    fetchRide();

    socket.on('rides-update', (payload) => {
      console.log('RideDetail real-time update:', payload.eventType);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const res = await fetch(`http://localhost:3001/api/rides/${ride.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (!window.confirm(`Remove rider ${riderId}? They will not be able to rejoin.`)) return;
    setRemovingRider(riderId);
    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:3001/api/rides/${ride.id}/remove-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleMessageUser = async (targetUserId) => {
    // Start or find a conversation then navigate to it
    try {
      const res = await fetch('http://localhost:3001/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <button onClick={() => navigate('/')}>← Back to Feed</button>
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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: '#4CAF50',
          fontSize: '15px',
          cursor: 'pointer',
          padding: '0 0 16px 0',
          fontWeight: 'bold'
        }}
      >
        ← Back to Feed
      </button>

      {/* Title and status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>{ride.title}</h2>
        <span style={{
          backgroundColor: isFull ? '#f0a500' : '#2196F3',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 'bold'
        }}>
          {isFull ? 'Full' : `Missing ${ride.available_seats}`}
        </span>
      </div>

      {/* Trip type */}
      <span style={{
        display: 'inline-block',
        backgroundColor: ride.is_round_trip ? '#6a0dad' : '#333',
        color: 'white',
        padding: '2px 10px',
        borderRadius: '10px',
        fontSize: '12px',
        marginBottom: '12px'
      }}>
        {ride.is_round_trip ? '🔄 Round Trip' : '➡️ One Way'}
      </span>

      {/* Route */}
      <p style={{ fontSize: '15px', margin: '6px 0' }}>
        📍 <strong>{ride.pickup_location}</strong> → <strong>{ride.destination}</strong>
      </p>

      {/* Description */}
      {ride.description && (
        <p style={{ fontSize: '14px', color: '#555', margin: '8px 0' }}>{ride.description}</p>
      )}

      {/* Times */}
      {ride.departure_time && (
        <p style={{ fontSize: '14px', margin: '4px 0' }}>
          🕐 <strong>Departure:</strong> {formatDate(ride.departure_time)}
        </p>
      )}
      {ride.is_round_trip && ride.return_time && (
        <p style={{ fontSize: '14px', margin: '4px 0' }}>
          🔁 <strong>Return:</strong> {formatDate(ride.return_time)}
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
          👤 <strong>User {ride.creator_user_id}</strong>
          {/* TODO: replace User {id} with username after auth merges */}
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
            💬 Message
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
              👤 User {passengerId}
              {/* TODO: replace User {id} with username after auth merges */}
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
                  💬 Message
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
          🚫 You have been removed from this ride
        </p>
      )}

      {isCreator && (
        <p style={{ color: '#888', fontSize: '13px', textAlign: 'center' }}>
          You created this ride
        </p>
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

      <hr style={{ margin: '16px 0', borderColor: '#eee' }} />

      {/* ── Temporary notes section ── */}
      {/* TODO: replace with real comments stored in DB once comments are added to rides table */}
      {/* Currently resets every page load — only visible to you, nothing is saved */}
      <h3 style={{ margin: '0 0 8px 0' }}>📝 My Notes <span style={{ color: '#aaa', fontSize: '12px', fontWeight: 'normal' }}>(only visible to you, resets on refresh)</span></h3>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add a private note about this ride..."
        rows={4}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
          resize: 'vertical',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

export default RideDetail;