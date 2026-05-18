import React, { useState, useEffect } from 'react';
import RideCard from './RideCard';

function App() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [pickupFilter, setPickupFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);

  //Will be detirmined from the loginin database.
  const currentUserId = 1;

  // Function to fetch rides with optional filters
  const fetchRides = (filters = {}) => {
    setLoading(true);
    const params = new URLSearchParams();

    if (filters.pickupLocation) params.append('pickupLocation', filters.pickupLocation);
    if (filters.destination) params.append('destination', filters.destination);
    if (filters.date) params.append('date', filters.date);
    if (filters.time) params.append('time', filters.time);

    const queryString = params.toString();
    const url = `http://localhost:3001/api/rides${queryString ? '?' + queryString : ''}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setRides(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching rides:", err);
        setLoading(false);
      });
  };

  // Fetch initial data from our Node backend when the app loads
  useEffect(() => {
    fetchRides();
  }, []);

  // Apply filters
  const applyFilters = () => {
    const filters = {};
    if (pickupFilter.trim()) filters.pickupLocation = pickupFilter.trim();
    if (destinationFilter.trim()) filters.destination = destinationFilter.trim();
    if (dateFilter.trim()) filters.date = dateFilter.trim();
    if (timeFilter.trim()) filters.time = timeFilter.trim();

    setIsFilterActive(true);
    fetchRides(filters);
  };

  // Clear filters
  const clearFilters = () => {
    setPickupFilter('');
    setDestinationFilter('');
    setDateFilter('');
    setTimeFilter('');
    setIsFilterActive(false);
    fetchRides(); // Fetch all rides
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Carpool Join/Leave Full-Stack Test</h1>
      <p>Simulating as User ID: {currentUserId}</p>

      {/* Filter Section */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0 }}>🔍 Find Rides</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Pickup Location:
            </label>
            <input
              type="text"
              value={pickupFilter}
              onChange={(e) => setPickupFilter(e.target.value)}
              placeholder="Enter pickup location"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Destination:
            </label>
            <input
              type="text"
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              placeholder="Enter destination"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Date:
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Time:
            </label>
            <input
              type="time"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <button
            onClick={applyFilters}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Apply Filters
          </button>

          {isFilterActive && (
            <button
              onClick={clearFilters}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {isFilterActive && (
          <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
            Showing {rides.length} ride(s) matching your filters
          </p>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : rides.length > 0 ? (
        rides.map(ride => (
          <RideCard
            key={ride.id}
            initialRideData={ride}
            currentUserId={currentUserId}
          />
        ))
      ) : (
        <p style={{color: 'red'}}>
          {isFilterActive ? 'No rides found matching your filters.' : 'No rides found.'}
        </p>
      )}
    </div>
  );
}

export default App;