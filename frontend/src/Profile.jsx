import { useEffect, useState } from "react"
import RideCard from "./components/RideCard"

export default function Profile({ currentUserId }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRides = () => {
    setLoading(true)

    fetch("http://localhost:3001/api/rides")
      .then((res) => res.json())
      .then((data) => {
        setRides(data)
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

  const createdRides = rides
    .filter((ride) => ride.creator_user_id === currentUserId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const joinedRides = rides
    .filter((ride) => ride.passengers?.includes(currentUserId))
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