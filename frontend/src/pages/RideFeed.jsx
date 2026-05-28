import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import RideCard from "../components/RideCard"

const socket = io("http://localhost:3001")

const buildRidesUrl = (filters = {}) => {
  const params = new URLSearchParams()

  if (filters.pickupLocation) params.append("pickupLocation", filters.pickupLocation)
  if (filters.destination) params.append("destination", filters.destination)
  if (filters.departureDate) params.append("departureDate", filters.departureDate)
  if (filters.minSeats) params.append("minSeats", filters.minSeats)

  if (filters.isRoundTrip !== undefined && filters.isRoundTrip !== "") {
    params.append("isRoundTrip", filters.isRoundTrip)
  }

  const queryString = params.toString()
  return `http://localhost:3001/api/rides${queryString ? `?${queryString}` : ""}`
}

function RideFeed({ currentUserId }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [pickupFilter, setPickupFilter] = useState("")
  const [destinationFilter, setDestinationFilter] = useState("")
  const [departureDateFilter, setDepartureDateFilter] = useState("")
  const [minSeatsFilter, setMinSeatsFilter] = useState("")
  const [roundTripFilter, setRoundTripFilter] = useState("")
  const [activeFilters, setActiveFilters] = useState({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const activeFiltersRef = useRef(activeFilters)
  const hasActiveFilters = Object.keys(activeFilters).length > 0

  const fetchRides = (filters = activeFiltersRef.current) => {
    setLoading(true)

    fetch(buildRidesUrl(filters))
      .then((res) => res.json())
      .then((data) => {
        setRides(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching rides:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    activeFiltersRef.current = activeFilters
  }, [activeFilters])

  useEffect(() => {
    fetchRides({})

    socket.on("rides-update", (payload) => {
      console.log("Real-time update received:", payload.eventType)

      const currentFilters = activeFiltersRef.current
      const filtersAreActive = Object.keys(currentFilters).length > 0

      if (filtersAreActive || payload.eventType === "INSERT") {
        fetchRides(currentFilters)
      } else if (payload.eventType === "UPDATE") {
        setRides((prev) =>
          prev.map((ride) => (ride.id === payload.new.id ? payload.new : ride))
        )
      } else if (payload.eventType === "DELETE") {
        setRides((prev) => prev.filter((ride) => ride.id !== payload.old.id))
      }
    })

    return () => socket.off("rides-update")
  }, [])

  const applyFilters = () => {
    const filters = {}

    if (pickupFilter.trim()) filters.pickupLocation = pickupFilter.trim()
    if (destinationFilter.trim()) filters.destination = destinationFilter.trim()
    if (departureDateFilter) filters.departureDate = departureDateFilter
    if (minSeatsFilter.trim()) filters.minSeats = minSeatsFilter.trim()
    if (roundTripFilter !== "") filters.isRoundTrip = roundTripFilter

    setActiveFilters(filters)
    fetchRides(filters)
  }

  const clearFilters = () => {
    setPickupFilter("")
    setDestinationFilter("")
    setDepartureDateFilter("")
    setMinSeatsFilter("")
    setRoundTripFilter("")
    setActiveFilters({})
    fetchRides({})
  }

  const filteredRides = rides
    .filter((ride) => ride && ride.id)
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
          placeholder="Search pickup, destination, title, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          type="button"
          className="secondary-button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          {showAdvancedFilters ? "Hide Advanced Search" : "Advanced Search"}
        </button>
      </section>

      {hasActiveFilters && !showAdvancedFilters && (
        <section className="feed-controls">
          <p className="empty-message">Advanced filters are currently active.</p>

          <button
            type="button"
            className="secondary-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </section>
      )}

      {showAdvancedFilters && (
        <section className="feed-controls filter-controls">
          <input
            type="text"
            placeholder="Pickup location"
            value={pickupFilter}
            onChange={(e) => setPickupFilter(e.target.value)}
          />

          <input
            type="text"
            placeholder="Destination"
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
          />

          <input
            type="date"
            value={departureDateFilter}
            onChange={(e) => setDepartureDateFilter(e.target.value)}
          />

          <input
            type="number"
            min="0"
            placeholder="Minimum seats"
            value={minSeatsFilter}
            onChange={(e) => setMinSeatsFilter(e.target.value)}
          />

          <select
            value={roundTripFilter}
            onChange={(e) => setRoundTripFilter(e.target.value)}
          >
            <option value="">Any trip</option>
            <option value="false">One way</option>
            <option value="true">Round trip</option>
          </select>

          <button
            type="button"
            className="primary-button"
            onClick={applyFilters}
          >
            Apply Filters
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="secondary-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </section>
      )}

      {hasActiveFilters && (
        <p className="empty-message">
          Showing {filteredRides.length} ride(s) matching your filters.
        </p>
      )}

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
          <p className="empty-message">
            {hasActiveFilters
              ? "No rides found matching your filters."
              : "No rides found."}
          </p>
        )}
      </section>
    </main>
  )
}

export default RideFeed