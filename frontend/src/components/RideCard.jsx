import { useEffect, useState } from "react"

const RideCard = ({ ride, currentUserId, onUpdate, socket }) => {
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removingRider, setRemovingRider] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")

  if (!ride) return null

  const passengers = Array.isArray(ride.passengers) ? ride.passengers : []
  const removedPassengers = Array.isArray(ride.removed_passengers)
    ? ride.removed_passengers
    : []

  const currentUserIdNumber = Number(currentUserId)
  const creatorUserIdNumber = Number(ride.creator_user_id)

  const isCreator = creatorUserIdNumber === currentUserIdNumber
  const hasJoined = passengers.map(Number).includes(currentUserIdNumber)
  const isRemoved = removedPassengers.map(Number).includes(currentUserIdNumber)

  const availableSeats = Number(ride.available_seats ?? 0)
  const totalSeats = Number(ride.total_seats ?? 0)
  const riderCount = passengers.length + 1

  const isFull = availableSeats <= 0
  const hasDeparted = ride.departure_time
    ? new Date(ride.departure_time) <= new Date()
    : false

  const isDisabled = loading || (!hasJoined && isFull) || isRemoved || hasDeparted

  const statusText = hasDeparted
    ? "Departed"
    : isFull
      ? "Full"
      : `Missing ${availableSeats}`

  const formatDateTime = (value) => {
    if (!value) return null

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formattedPostedDate = formatDateTime(ride.created_at)
  const formattedDepartureTime = formatDateTime(ride.departure_time)
  const formattedReturnTime = formatDateTime(ride.return_time)

  useEffect(() => {
    if (!socket) return

    const handleRiderRemoved = ({ rideId, riderId }) => {
      if (Number(rideId) === Number(ride.id) && Number(riderId) === currentUserIdNumber) {
        alert(
          `You have been removed from the ride: ${
            ride.title || `${ride.pickup_location} → ${ride.destination}`
          }`
        )
        onUpdate()
      }
    }

    socket.on("rider-removed", handleRiderRemoved)

    return () => {
      socket.off("rider-removed", handleRiderRemoved)
    }
  }, [socket, ride.id, ride.title, ride.pickup_location, ride.destination, currentUserIdNumber, onUpdate])

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
    } catch {
      setErrorMsg("Failed to connect to the backend server.")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveRide = async () => {
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
    } catch {
      setErrorMsg("Failed to connect to the backend server.")
    } finally {
      setRemoving(false)
    }
  }

  const handleRemoveRider = async (riderId) => {
    if (
      !window.confirm(
        `Are you sure you want to remove User ${riderId} from this ride? They will not be able to rejoin.`
      )
    ) {
      return
    }

    setRemovingRider(riderId)
    setErrorMsg("")

    try {
      const response = await fetch(
        `http://localhost:3001/api/rides/${ride.id}/remove-rider`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUserId,
            riderId,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.error || "Failed to remove rider")
      } else {
        onUpdate()
      }
    } catch {
      setErrorMsg("Failed to connect to the backend server.")
    } finally {
      setRemovingRider(null)
    }
  }

  return (
    <article className="post-card">
      <div className="post-top">
        <div>
          <h2>{ride.title || `${ride.pickup_location} → ${ride.destination}`}</h2>
          <p className="muted">
            {ride.pickup_location} → {ride.destination}
          </p>
        </div>

        <div className="card-badges">
          <span className="trip-badge">
            {ride.is_round_trip ? "Round Trip" : "One Way"}
          </span>

          <span className={isFull || hasDeparted ? "status full" : "status open"}>
            {statusText}
          </span>
        </div>
      </div>

      <div className="post-details">
        <p>
          <strong>Riders:</strong> {riderCount} / {totalSeats}
        </p>

        <p>
          <strong>Trip Type:</strong>{" "}
          {ride.is_round_trip ? "Round Trip" : "One Way"}
        </p>

        {formattedDepartureTime && (
          <p>
            <strong>Departure:</strong> {formattedDepartureTime}
          </p>
        )}

        {ride.is_round_trip && formattedReturnTime && (
          <p>
            <strong>Return:</strong> {formattedReturnTime}
          </p>
        )}

        {formattedPostedDate && (
          <p>
            <strong>Posted:</strong> {formattedPostedDate}
          </p>
        )}
      </div>

      {ride.description && <p className="post-note">{ride.description}</p>}

      {isCreator && passengers.length > 0 && (
        <div className="passenger-list">
          <p className="passenger-list-title">Passengers:</p>

          {passengers.map((passengerId) => (
            <div className="passenger-row" key={passengerId}>
              <span>User {passengerId}</span>

              <button
                type="button"
                className="small-danger-button"
                onClick={() => handleRemoveRider(passengerId)}
                disabled={removingRider === passengerId}
              >
                {removingRider === passengerId ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {isRemoved && !isCreator && (
        <p className="error-message">You have been removed from this ride.</p>
      )}

      {hasDeparted && !isCreator && !isRemoved && (
        <p className="empty-message">This ride has already departed.</p>
      )}

      {isCreator ? (
        <>
          <p className="creator-note">You created this ride</p>

          <button
            type="button"
            onClick={handleRemoveRide}
            disabled={removing}
            className="danger-button"
          >
            {removing ? "Removing..." : "Remove Ride"}
          </button>
        </>
      ) : (
        !isRemoved && (
          <button
            type="button"
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
                  : hasDeparted
                    ? "Ride Departed"
                    : "Join Ride"}
          </button>
        )
      )}

      {errorMsg && <p className="error-message">{errorMsg}</p>}
    </article>
  )
}

export default RideCard