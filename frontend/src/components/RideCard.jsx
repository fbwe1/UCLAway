import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const RideCard = ({ ride, currentUserId, onUpdate }) => {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followOverride, setFollowOverride] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!ride) return null;

  const currentUserIdNumber = Number(currentUserId);
  const creatorUserIdNumber = Number(ride.creator_user_id);
  const isCreator = creatorUserIdNumber === currentUserIdNumber;
  const isFollowingCreator = followOverride ?? Boolean(ride.is_followed_creator);

  const availableSeats = Number(ride.available_seats ?? 0);
  const isFull = availableSeats <= 0;
  const hasDeparted = ride.departure_time
    ? new Date(ride.departure_time) <= new Date()
    : false;

  const statusText = hasDeparted ? 'Departed' : isFull ? 'Full' : `Missing ${availableSeats}`;
  const formatDateTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles' // TODO: get from user profile after auth merges
    });
  };

  const handleRemoveRide = async (e) => {
    e.stopPropagation(); // prevent card click from navigating to detail
    if (!window.confirm('Are you sure you want to remove this ride?')) return;
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
        setErrorMsg(data.error || 'Failed to remove ride');
      } else {
        onUpdate();
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setRemoving(false);
    }
  };

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    if (isCreator) return;

    setFollowLoading(true);
    setErrorMsg('');
    const currentlyFollowing = isFollowingCreator;

    try {
      const response = await fetch(
        currentlyFollowing
          ? `http://localhost:3001/api/follows/${ride.creator_user_id}`
          : 'http://localhost:3001/api/follows',
        {
          method: currentlyFollowing ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            currentlyFollowing
              ? { followerUserId: currentUserId }
              : { followerUserId: currentUserId, followedUserId: ride.creator_user_id }
          )
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (!currentlyFollowing && response.status === 409) {
          setFollowOverride(true);
          onUpdate();
        } else if (currentlyFollowing && response.status === 404) {
          setFollowOverride(false);
          onUpdate();
        } else {
          setErrorMsg(data.error || 'Failed to update follow status');
        }
      } else {
        setFollowOverride(!currentlyFollowing);
        onUpdate();
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setFollowLoading(false);
    }
  };

  const passengers = Array.isArray(ride.passengers) ? ride.passengers : [];
  const riderCount = passengers.length + 1;

  return (
    <article
      className="post-card"
      onClick={() => navigate(`/rides/${ride.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="post-top">
        <div>
          <h2>{ride.title || `${ride.pickup_location} → ${ride.destination}`}</h2>
          <p className="muted">{ride.pickup_location} → {ride.destination}</p>
        </div>

        <div className="card-badges">
          {isFollowingCreator && !isCreator && (
            <span className="follow-chip">Following</span>
          )}
          <span className="trip-badge">
            {ride.is_round_trip ? 'Round Trip' : 'One Way'}
          </span>
          <span className={isFull || hasDeparted ? 'status full' : 'status open'}>
            {statusText}
          </span>
        </div>
      </div>

      <div className="post-details">
        <p><strong>Riders:</strong> {riderCount} / {Number(ride.total_seats)}</p>

        {formatDateTime(ride.departure_time) && (
          <p><strong>Departure:</strong> {formatDateTime(ride.departure_time)}</p>
        )}

        {ride.is_round_trip && formatDateTime(ride.return_time) && (
          <p><strong>Return:</strong> {formatDateTime(ride.return_time)}</p>
        )}

        {formatDateTime(ride.created_at) && (
          <p><strong>Posted:</strong> {formatDateTime(ride.created_at)}</p>
        )}
      </div>

      {ride.description && <p className="post-note">{ride.description}</p>}

      {!isCreator && (
        <button
          type="button"
          onClick={handleFollowToggle}
          disabled={followLoading}
          className={isFollowingCreator ? "follow-button-following" : "follow-button"}
        >
          {followLoading ? 'Updating...' : isFollowingCreator ? 'Following' : 'Follow Creator'}
        </button>
      )}

      <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
        Click to view details →
      </p>

      {errorMsg && <p className="error-message">{errorMsg}</p>}

      {/* Remove Ride stays on card all other actions like edit post and join ride are in ride detail*/}
      {isCreator && (
        <button
          type="button"
          onClick={handleRemoveRide}
          disabled={removing}
          className="danger-button"
          style={{ marginTop: '10px', width: '100%' }}
        >
          {removing ? 'Removing...' : 'Remove Ride'}
        </button>
      )}
    </article>
  );
};

export default RideCard;
