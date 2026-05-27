import React, { useEffect, useState } from "react"
import { io } from "socket.io-client"
import RideCard from "../RideCard"

const socket = io("http://localhost:3001")

function RideFeed({ currentUserId }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchRides = () => {
    fetch("http://localhost:3001/api/rides")
      .then((res) => res.json())
      .then((data) => {
        setRides(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching rides:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchRides()

    socket.on("rides-update", (payload) => {
      console.log("Real-time update received:", payload.eventType)
      fetchRides()
    })

    return () => socket.off("rides-update")
  }, [])

  const filteredRides = rides
  .filter((ride) => {
    const query = search.toLowerCase()

    return (
      ride.title?.toLowerCase().includes(query) ||
      ride.pickup_location?.toLowerCase().includes(query) ||
      ride.destination?.toLowerCase().includes(query) ||
      ride.description?.toLowerCase().includes(query)
    )
  })
  .sort((a, b) => {
    const aJoined = a.passengers?.includes(currentUserId)
    const bJoined = b.passengers?.includes(currentUserId)

    if (aJoined && !bJoined) return -1
    if (!aJoined && bJoined) return 1

    return new Date(b.created_at) - new Date(a.created_at)
  })

  return (
    <main className="page">
      <section className="page-header">
        <h1>Ride Feed</h1>
        <p>Find available rides from UCLA students.</p>
      </section>

      <section className="feed-controls">
        <input
          type="text"
          placeholder="Search pickup, destination, or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section className="post-list">
        {loading ? (
          <p className="empty-message">Loading rides...</p>
        ) : filteredRides.length > 0 ? (
          filteredRides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              currentUserId={currentUserId}
              onUpdate={fetchRides}
            />
          ))
        ) : (
          <p className="empty-message">No rides found.</p>
        )}
      </section>
    </main>
  )
}

export default RideFeed