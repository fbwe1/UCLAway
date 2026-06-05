import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateRide({ currentUserId }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnTime, setReturnTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isRoundTrip && returnTime && departureTime) {
      if (new Date(returnTime) <= new Date(departureTime)) {
        setErrorMsg('Return time must be after departure time');
        setLoading(false);
        return;
      }
    }

    try {
      // ensure JWT auth included
      const token = localStorage.getItem("token");
      if (!token){
        console.error("No JWT found. User must log in again");
        setErrorMsg("Please Log In Again!")
        setLoading(false);
        return;
      }
      const response = await fetch('http://localhost:3001/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
         },
        body: JSON.stringify({
          title,
          description,
          pickup_location: pickupLocation,
          destination,
          total_seats: parseInt(totalSeats),
          creator_user_id: currentUserId,
          departure_time: new Date(departureTime).toISOString(),
          is_round_trip: isRoundTrip,
          return_time: isRoundTrip ? new Date(returnTime).toISOString() : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || 'Failed to create ride');
      } else {
        navigate('/');
      }

    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date().toISOString().slice(0, 16);

  return (
  <main className="page">
    <section className="page-header">
      <h1>Create a Ride</h1>
      <p>You are automatically added as the driver.</p>
    </section>

    {errorMsg && <p className="error-message">{errorMsg}</p>}

    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Ride to LAX Friday"
        />
      </div>

      <div className="form-group">
        <label>
          Description{" "}
          <span style={{ color: "#6b7280", fontWeight: "400" }}>
            (optional)
          </span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Leaving at 5PM, happy to stop along the way"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Pickup Location</label>
        <input
          type="text"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          required
          placeholder="e.g. UCLA Dorms"
        />
      </div>

      <div className="form-group">
        <label>Destination</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
          placeholder="e.g. LAX"
        />
      </div>

      <div className="form-group">
        <label>Total Seats including yourself</label>
        <input
          type="number"
          value={totalSeats}
          onChange={(e) => setTotalSeats(e.target.value)}
          required
          min="2"
          max="8"
          placeholder="e.g. 4"
        />
      </div>

      <div className="form-group">
        <label>Departure Time</label>
        <input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          required
          min={now}
        />
      </div>

      <div className="form-group">
        <label
          htmlFor="roundTrip"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            id="roundTrip"
            checked={isRoundTrip}
            onChange={(e) => setIsRoundTrip(e.target.checked)}
            style={{ width: "18px", height: "18px" }}
          />
          Round Trip
        </label>
      </div>

      {isRoundTrip && (
        <div className="form-group">
          <label>Return Time</label>
          <input
            type="datetime-local"
            value={returnTime}
            onChange={(e) => setReturnTime(e.target.value)}
            required={isRoundTrip}
            min={departureTime || now}
          />
        </div>
      )}

      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Ride"}
      </button>

      <button
        className="secondary-button"
        type="button"
        onClick={() => navigate("/")}
        disabled={loading}
      >
        Cancel
      </button>
    </form>
  </main>
  );
}

export default CreateRide;