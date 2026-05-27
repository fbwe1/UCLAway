import React, { useState } from "react"

const RideCard = ({ ride, currentUserId, onUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const isCreator = ride.creator_user_id === currentUserId
  const hasJoined = ride.passengers && ride.passengers.includes(currentUserId)
  const isFull = ride.available_seats <= 0
  const isDisabled = loading || (!hasJoined && isFull)

  const handleJoinLeave = async () => {
    setLoading(true)
    setErrorMsg("")

    const action = hasJoined ? "leave" : "join"

    try {
      const response = await fetch(
        `http://localhost:3001/api/rides/${ride.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.error || "Something went wrong on the server")
      } else {
        onUpdate()
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the backend server.")
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!window.confirm("Are you sure you want to remove this ride?")) return

    setRemoving(true)
    setErrorMsg("")

    try {
      const response = await fetch(`http://localhost:3001/api/rides/${ride.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.error || "Failed to remove ride")
      } else {
        onUpdate()
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the backend server.")
    } finally {
      setRemoving(false)
    }
  }

  const formattedDate = ride.created_at
    ? new Date(ride.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <article className="post-card">
      <div className="post-top">
        <div>
          <h2>{ride.title || `${ride.pickup_location} → ${ride.destination}`}</h2>
          <p className="muted">
            {ride.pickup_location} → {ride.destination}
          </p>
        </div>

        <span className={isFull ? "status full" : "status open"}>
          {isFull ? "Full" : `Missing ${ride.available_seats}`}
        </span>
      </div>

      <div className="post-details">
        <p>
          <strong>Riders:</strong> {(ride.passengers || []).length + 1} /{" "}
          {ride.total_seats}
        </p>

        {formattedDate && (
          <p>
            <strong>Posted:</strong> {formattedDate}
          </p>
        )}
      </div>

      {ride.description && <p className="post-note">{ride.description}</p>}

      {isCreator ? (
        <p className="creator-note">You created this ride</p>
      ) : (
        <button
          onClick={handleJoinLeave}
          disabled={isDisabled}
          className="join-button"
        >
          {loading
            ? "Processing..."
            : hasJoined
              ? "Leave Ride"
              : isFull
                ? "Ride Full"
                : "Join Ride"}
        </button>
      )}

      {errorMsg && <p className="error-message">{errorMsg}</p>}

      {isCreator && (
        <button
          onClick={handleRemove}
          disabled={removing}
          className="danger-button"
        >
          {removing ? "Removing..." : "Remove Ride"}
        </button>
      )}
    </article>
  )
}

export default RideCard