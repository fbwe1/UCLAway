import { useEffect, useState } from "react"

const RideCard = ({ ride, currentUserId, onUpdate, socket }) => {
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removingRider, setRemovingRider] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")

  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPickupLocation, setEditPickupLocation] = useState("")
  const [editDestination, setEditDestination] = useState("")
  const [editTotalSeats, setEditTotalSeats] = useState("")
  const [editDepartureTime, setEditDepartureTime] = useState("")
  const [editIsRoundTrip, setEditIsRoundTrip] = useState(false)
  const [editReturnTime, setEditReturnTime] = useState("")

  const toDatetimeLocal = (value) => {
    if (!value) return ""

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    const offsetMs = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
  }

  const now = toDatetimeLocal(new Date())

  useEffect(() => {
    if (!ride) return

    setEditTitle(ride.title || "")
    setEditDescription(ride.description || "")
    setEditPickupLocation(ride.pickup_location || "")
    setEditDestination(ride.destination || "")
    setEditTotalSeats(ride.total_seats || "")
    setEditDepartureTime(toDatetimeLocal(ride.departure_time))
    setEditIsRoundTrip(Boolean(ride.is_round_trip))
    setEditReturnTime(toDatetimeLocal(ride.return_time))
  }, [ride])

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
  const handleSaveEdit = async (e) => {
  e.preventDefault()
  setSavingEdit(true)
  setErrorMsg("")

  if (editIsRoundTrip) {
    if (!editReturnTime) {
      setErrorMsg("Return time is required for round trips")
      setSavingEdit(false)
      return
    }

    if (new Date(editReturnTime) <= new Date(editDepartureTime)) {
      setErrorMsg("Return time must be after departure time")
      setSavingEdit(false)
      return
    }
  }

  try {
    const response = await fetch(`http://localhost:3001/api/rides/${ride.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        title: editTitle,
        description: editDescription,
        pickup_location: editPickupLocation,
        destination: editDestination,
        total_seats: parseInt(editTotalSeats),
        departure_time: new Date(editDepartureTime).toISOString(),
        is_round_trip: editIsRoundTrip,
        return_time: editIsRoundTrip ? new Date(editReturnTime).toISOString() : null,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setErrorMsg(data.error || "Failed to update ride")
    } else {
      setEditing(false)
      onUpdate()
    }
  } catch {
    setErrorMsg("Failed to connect to the backend server.")
  } finally {
    setSavingEdit(false)
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

        {!editing ? (
          <>
            {!hasDeparted && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="secondary-button"
              >
                Edit Ride
              </button>
            )}

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
          <form className="form-card" onSubmit={handleSaveEdit}>
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
                min={Math.max(passengers.length + 1, 2)}
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

            <div className="form-group">
              <label
                htmlFor={`roundTrip-${ride.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  id={`roundTrip-${ride.id}`}
                  checked={editIsRoundTrip}
                  onChange={(e) => setEditIsRoundTrip(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                Round Trip
              </label>
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

            <button
              type="submit"
              className="primary-button"
              disabled={savingEdit}
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setEditing(false)
                setErrorMsg("")
              }}
              disabled={savingEdit}
            >
              Cancel
            </button>
          </form>
        )}
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