import React, { useState, useEffect } from 'react';

const RideCard = ({ ride, currentUserId, onUpdate, socket }) => {
  if (!ride) return null;

  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removingRider, setRemovingRider] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const isCreator = ride.creator_user_id === currentUserId;
  const hasJoined = ride.passengers && ride.passengers.includes(currentUserId);
  const isRemoved = ride.removed_passengers && ride.removed_passengers.includes(currentUserId);
  const isDisabled = loading || (!hasJoined && ride.available_seats <= 0) || isRemoved;
  const isFull = ride.available_seats <= 0;
  const missingCount = ride.available_seats;

  // Listen for removal notification
  useEffect(() => {
    if (!socket) return;
    socket.on('rider-removed', ({ rideId, riderId }) => {
      if (riderId === currentUserId && rideId === ride.id) {
        alert(`You have been removed from the ride: ${ride.title || ride.pickup_location + ' → ' + ride.destination}`);
        onUpdate();
      }
    });
    return () => socket.off('rider-removed');
  }, [socket, ride.id, currentUserId]);

  const handleJoinLeave = async () => {
    setLoading(true);
    setErrorMsg("");
    const action = hasJoined ? 'leave' : 'join';

    try {
      const response = await fetch(`http://localhost:3001/api/rides/${ride.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "Something went wrong on the server");
      } else {
        onUpdate();
      }

    } catch (err) {
      setErrorMsg("Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRide = async () => {
    if (!window.confirm("Are you sure you want to remove this ride?")) return;
    setRemoving(true);
    setErrorMsg("");

    try {
      const response = await fetch(`http://localhost:3001/api/rides/${ride.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || "Failed to remove ride");
      } else {
        onUpdate();
      }

    } catch (err) {
      setErrorMsg("Failed to connect to the backend server.");
    } finally {
      setRemoving(false);
    }
  };

  const handleRemoveRider = async (riderId) => {
    if (!window.confirm(`Are you sure you want to remove rider ${riderId} from this ride? They will not be able to rejoin.`)) return;
    setRemovingRider(riderId);
    setErrorMsg("");

    try {
      const response = await fetch(`http://localhost:3001/api/rides/${ride.id}/remove-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, riderId })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || "Failed to remove rider");
      } else {
        onUpdate();
      }

    } catch (err) {
      setErrorMsg("Failed to connect to the backend server.");
    } finally {
      setRemovingRider(null);
    }
  };

  let buttonColor = '#4CAF50';
  if (hasJoined) buttonColor = '#ff4d4d';
  else if (isDisabled) buttonColor = '#cccccc';

  const statusText = isFull ? 'Full' : `Missing ${missingCount}`;
  const statusColor = isFull ? '#f0a500' : '#2196F3';

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', margin: '10px 0', borderRadius: '8px', maxWidth: '400px' }}>

      {/* Title and status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{ride.title || `${ride.pickup_location} to ${ride.destination}`}</h3>
        <span style={{
          backgroundColor: statusColor,
          color: 'white',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 'bold',
          marginLeft: '8px',
          whiteSpace: 'nowrap'
        }}>
          {statusText}
        </span>
      </div>

      {/* Route */}
      <p style={{ color: '#888', fontSize: '13px', margin: '4px 0' }}>
        {ride.pickup_location} to {ride.destination}
      </p>

      {/* Trip type badge */}
      <span style={{
        display: 'inline-block',
        backgroundColor: ride.is_round_trip ? '#6a0dad' : '#333',
        color: 'white',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        marginBottom: '6px'
      }}>
        {ride.is_round_trip ? '🔄 Round Trip' : '➡️ One Way'}
      </span>

      {/* Description */}
      {ride.description && (
        <p style={{ fontSize: '14px', margin: '6px 0' }}>{ride.description}</p>
      )}

      {/* Departure time */}
      {ride.departure_time && (
        <p style={{ fontSize: '13px', margin: '4px 0' }}>
          <strong>Departure:</strong> {formatDate(ride.departure_time)}
        </p>
      )}

      {/* Return time */}
      {ride.is_round_trip && ride.return_time && (
        <p style={{ fontSize: '13px', margin: '4px 0' }}>
          <strong>Return:</strong> {formatDate(ride.return_time)}
        </p>
      )}

      {/* Riders count and posted time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <p style={{ margin: '4px 0' }}><strong>Riders:</strong> {(ride.passengers || []).length + 1} / {ride.total_seats}</p>
        {ride.created_at && (
          <span style={{ color: '#aaa', fontSize: '12px' }}>Posted {formatDate(ride.created_at)}</span>
        )}
      </div>

      {/* Passenger list — only visible to creator */}
      {isCreator && ride.passengers && ride.passengers.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 6px 0' }}>Passengers:</p>
          {ride.passengers.map(passengerId => (
            <div key={passengerId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px' }}>User {passengerId}</span>
              <button
                onClick={() => handleRemoveRider(passengerId)}
                disabled={removingRider === passengerId}
                style={{
                  backgroundColor: removingRider === passengerId ? '#cccccc' : '#c0392b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  cursor: removingRider === passengerId ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {removingRider === passengerId ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {errorMsg && <p style={{ color: 'red', fontSize: '14px', marginTop: '6px' }}>{errorMsg}</p>}

      {/* Removed notice for banned users */}
      {isRemoved && !isCreator && (
        <p style={{ color: '#c0392b', fontSize: '13px', textAlign: 'center', margin: '8px 0' }}>
           You have been removed from this ride
        </p>
      )}

      {/* Join/Leave button — hidden if removed or creator */}
      {!isCreator && !isRemoved && (
        <button
          onClick={handleJoinLeave}
          disabled={isDisabled}
          style={{
            backgroundColor: buttonColor,
            color: isDisabled && !hasJoined ? '#666' : 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            width: '100%',
            marginTop: '8px'
          }}
        >
          {loading ? "Processing..." :
           hasJoined ? "Leave Ride" :
           isFull ? "Ride Full" : "Join Ride"}
        </button>
      )}

      {/* Creator label and remove ride button */}
      {isCreator && (
        <>
          <p style={{ textAlign: 'center', color: '#888', fontSize: '13px', margin: '8px 0' }}>
            You created this ride
          </p>
          <button
            onClick={handleRemoveRide}
            disabled={removing}
            style={{
              backgroundColor: removing ? '#cccccc' : '#7b2d2d',
              color: 'white',
              padding: '8px 15px',
              border: 'none',
              borderRadius: '4px',
              cursor: removing ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              width: '100%',
              fontSize: '13px',
              marginTop: '8px'
            }}
          >
            {removing ? "Removing..." : "Remove Ride"}
          </button>
        </>
      )}
    </div>
  );
};

export default RideCard;