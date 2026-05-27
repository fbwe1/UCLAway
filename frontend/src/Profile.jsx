import { useEffect, useState } from "react"

export default function Profile({ currentUserId }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [])

  const createdRides = rides.filter(
    (ride) => ride.creator_user_id === currentUserId
  )

  const joinedRides = rides.filter((ride) =>
    ride.passengers?.includes(currentUserId)
  )

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
            <article className="post-card" key={ride.id}>
              <div className="post-top">
                <div>
                  <h2>
                    {ride.title ||
                      `${ride.pickup_location} → ${ride.destination}`}
                  </h2>
                  <p className="muted">
                    {ride.pickup_location} → {ride.destination}
                  </p>
                </div>

                <span className={ride.available_seats <= 0 ? "status full" : "status open"}>
                  {ride.available_seats <= 0
                    ? "Full"
                    : `Missing ${ride.available_seats}`}
                </span>
              </div>

              {ride.description && (
                <p className="post-note">{ride.description}</p>
              )}
            </article>
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
            <article className="post-card" key={ride.id}>
              <div className="post-top">
                <div>
                  <h2>
                    {ride.title ||
                      `${ride.pickup_location} → ${ride.destination}`}
                  </h2>
                  <p className="muted">
                    {ride.pickup_location} → {ride.destination}
                  </p>
                </div>

                <span className={ride.available_seats <= 0 ? "status full" : "status open"}>
                  {ride.available_seats <= 0
                    ? "Full"
                    : `Missing ${ride.available_seats}`}
                </span>
              </div>

              {ride.description && (
                <p className="post-note">{ride.description}</p>
              )}
            </article>
          ))
        ) : (
          <p className="empty-message">You have not created any rides yet.</p>
        )}
      </section>

      
    </main>
  )
}