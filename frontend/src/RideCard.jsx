import React from 'react';
import { useNavigate } from 'react-router-dom';

const RideCard = ({ ride, currentUserId, onUpdate }) => {
  if (!ride) return null;

  const navigate = useNavigate();
  const [removing, setRemoving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const isCreator = ride.creator_user_id === currentUserId;
  const isFull = ride.available_seats <= 0;
  const statusText = isFull ? 'Full' : `Missing ${ride.available_seats}`;
  const statusColor = isFull ? '#f0a500' : '#2196F3';

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

  const handleRemoveRide = async (e) => {
    // Stop click from bubbling up to the card and navigating to detail
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this ride?")) return;
    setRemoving(true);
    setErrorMsg('');

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
    } catch {
      setErrorMsg("Failed to connect to the backend server.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/rides/${ride.id}`)}
      style={{
        border: '1px solid #ccc',
        padding: '16px',
        margin: '10px 0',
        borderRadius: '8px',
        maxWidth: '400px',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#4CAF50'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#ccc'}
    >
      {/* Title and status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{ride.title || `${ride.pickup_location} → ${ride.destination}`}</h3>
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
        📍 {ride.pickup_location} → {ride.destination}
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

      {/* Departure time */}
      {ride.departure_time && (
        <p style={{ fontSize: '13px', margin: '4px 0' }}>
          🕐 <strong>Departure:</strong> {formatDate(ride.departure_time)}
        </p>
      )}

      {/* Riders count and posted time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <p style={{ margin: '4px 0' }}>
          <strong>Riders:</strong> {(ride.passengers || []).length + 1} / {ride.total_seats}
        </p>
        {ride.created_at && (
          <span style={{ color: '#aaa', fontSize: '12px' }}>Posted {formatDate(ride.created_at)}</span>
        )}
      </div>

      <p style={{ color: '#aaa', fontSize: '12px', margin: '6px 0 0' }}>
        Click to view details →
      </p>

      {errorMsg && <p style={{ color: 'red', fontSize: '14px', marginTop: '6px' }}>{errorMsg}</p>}

      {/* Remove ride button — creator only, stops card click propagation */}
      {isCreator && (
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
            marginTop: '10px'
          }}
        >
          {removing ? "Removing..." : "Remove Ride"}
        </button>
      )}
    </div>
  );
};

export default RideCard;