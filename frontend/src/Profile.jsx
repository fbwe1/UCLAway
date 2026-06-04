import { useEffect, useState } from "react"
import RideCard from "./components/RideCard"

export default function Profile({ currentUserId }) {
  const [rides, setRides] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRides = () => {
    setLoading(true)
    // ensure JWT auth included
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No JWT found. User must log in again");
      setLoading(false);
      return;
    }
    //shared header for both fetch APIs
    const authHeader = {
      Authorization: `Bearer ${token}`
    }
    // Fetch active rides and history in parallel
    Promise.all([
      fetch("http://localhost:3001/api/rides",{
        headers: authHeader,
      }).then(res => res.json()),
      fetch(`http://localhost:3001/api/rides/history?userId=${currentUserId}`,{
        headers: authHeader,
      }).then(res => res.json())
    ])
      .then(([activeData, historyData]) => {
        setRides(Array.isArray(activeData) ? activeData : [])
        setHistory(Array.isArray(historyData) ? historyData : [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching profile rides:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchRides()
  }, [])

  const createdRides = [...rides, ...history]
    .filter((ride) => Number(ride.creator_user_id) === Number(currentUserId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const joinedRides = [...rides, ...history]
    .filter((ride) => ride.passengers?.map(Number).includes(Number(currentUserId)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const totalRides = createdRides.length + joinedRides.length

  return (
    <main className="page">
      <section className="profile-card">
        <div className="avatar">U</div>
        <div>
          <h1>User Profile</h1>
          <p className="muted">User ID: {currentUserId}</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <h2>{createdRides.length}</h2>
          <p>Created</p>
        </div>
        <div className="stat-card">
          <h2>{joinedRides.length}</h2>
          <p>Joined</p>
        </div>
        <div className="stat-card">
          <h2>{totalRides}</h2>
          <p>Total</p>
        </div>
      </section>

      <h2 className="section-title">My Joined Rides</h2>
      <section className="post-list">
        {loading ? (
          <p className="empty-message">Loading rides...</p>
        ) : joinedRides.length > 0 ? (
          joinedRides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              currentUserId={currentUserId}
              onUpdate={fetchRides}
            />
          ))
        ) : (
          <p className="empty-message">You have not joined any rides yet.</p>
        )}
      </section>

      <h2 className="section-title">My Created Rides</h2>
      <section className="post-list">
        {loading ? (
          <p className="empty-message">Loading rides...</p>
        ) : createdRides.length > 0 ? (
          createdRides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              currentUserId={currentUserId}
              onUpdate={fetchRides}
            />
          ))
        ) : (
          <p className="empty-message">You have not created any rides yet.</p>
        )}
      </section>
    </main>
  )
}