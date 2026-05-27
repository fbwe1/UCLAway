import React, { useState } from 'react';

const RideCard = ({ ride, currentUserId, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isCreator = ride.creator_user_id === currentUserId;
  const hasJoined = ride.passengers && ride.passengers.includes(currentUserId);
  const isDisabled = loading || (!hasJoined && ride.available_seats <= 0);
  const isFull = ride.available_seats <= 0;
  const missingCount = ride.available_seats;

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

  const handleRemove = async () => {
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

  let buttonColor = '#4CAF50';
  if (hasJoined) buttonColor = '#ff4d4d';
  else if (isDisabled) buttonColor = '#cccccc';

  const statusText = isFull ? 'Full' : `Missing ${missingCount}`;
  const statusColor = isFull ? '#f0a500' : '#2196F3';

  // Format timestamp
  const formattedDate = ride.created_at
    ? new Date(ride.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', margin: '10px 0', borderRadius: '8px', maxWidth: '400px' }}>
      
      {/* Title and status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{ride.title || `${ride.pickup_location} ➡️ ${ride.destination}`}</h3>
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

      {/* Description */}
      {ride.description && (
        <p style={{ fontSize: '14px', margin: '6px 0' }}>{ride.description}</p>
      )}

      {/* Riders and timestamp */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: '4px 0' }}><strong>Riders:</strong> {(ride.passengers || []).length + 1} / {ride.total_seats}</p>
        {formattedDate && <span style={{ color: '#aaa', fontSize: '12px' }}>{formattedDate}</span>}
      </div>

      {isCreator ? (
        <p style={{ textAlign: 'center', color: '#888', fontSize: '13px', margin: '8px 0' }}>
          You created this ride
        </p>
      ) : (
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

      {errorMsg && <p style={{ color: 'red', fontSize: '14px', marginTop: '6px' }}>{errorMsg}</p>}

      {isCreator && (
        <button
          onClick={handleRemove}
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
      )}
    </div>
  );
};

export default RideCard;