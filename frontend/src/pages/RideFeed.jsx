import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import RideCard from '../RideCard';

const socket = io('http://localhost:3001');

const buildRidesUrl = (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.pickupLocation) params.append('pickupLocation', filters.pickupLocation);
  if (filters.destination) params.append('destination', filters.destination);
  if (filters.departureDate) params.append('departureDate', filters.departureDate);
  if (filters.minSeats) params.append('minSeats', filters.minSeats);
  // isRoundTrip: only append if explicitly set (true or false)
  if (filters.isRoundTrip !== undefined && filters.isRoundTrip !== '') {
    params.append('isRoundTrip', filters.isRoundTrip);
  }

  const queryString = params.toString();
  return `http://localhost:3001/api/rides${queryString ? `?${queryString}` : ''}`;
};

function RideFeed({ currentUserId }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickupFilter, setPickupFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [departureDateFilter, setDepartureDateFilter] = useState('');
  const [minSeatsFilter, setMinSeatsFilter] = useState('');
  const [roundTripFilter, setRoundTripFilter] = useState(''); // '' = any, 'true' = round trip, 'false' = one way
  const [activeFilters, setActiveFilters] = useState({});
  const activeFiltersRef = useRef(activeFilters);

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  const fetchRides = (filters = activeFilters) => {
    setLoading(true);
    fetch(buildRidesUrl(filters))
      .then(res => res.json())
      .then(data => {
        setRides(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching rides:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    activeFiltersRef.current = activeFilters;
  }, [activeFilters]);

  useEffect(() => {
    fetchRides({});

    socket.on('rides-update', (payload) => {
      console.log('Real-time update received:', payload.eventType);
      const currentFilters = activeFiltersRef.current;
      const filtersAreActive = Object.keys(currentFilters).length > 0;

      if (filtersAreActive || payload.eventType === 'INSERT') {
        fetchRides(currentFilters);
      } else if (payload.eventType === 'UPDATE') {
        setRides(prev => prev.map(ride =>
          ride.id === payload.new.id ? payload.new : ride
        ));
      } else if (payload.eventType === 'DELETE') {
        setRides(prev => prev.filter(ride => ride.id !== payload.old.id));
      }
    });

    return () => socket.off('rides-update');
  }, []);

  const applyFilters = () => {
    const filters = {};
    if (pickupFilter.trim()) filters.pickupLocation = pickupFilter.trim();
    if (destinationFilter.trim()) filters.destination = destinationFilter.trim();
    if (departureDateFilter) filters.departureDate = departureDateFilter;
    if (minSeatsFilter.trim()) filters.minSeats = minSeatsFilter.trim();
    if (roundTripFilter !== '') filters.isRoundTrip = roundTripFilter;

    setActiveFilters(filters);
    fetchRides(filters);
  };

  const clearFilters = () => {
    setPickupFilter('');
    setDestinationFilter('');
    setDepartureDateFilter('');
    setMinSeatsFilter('');
    setRoundTripFilter('');
    setActiveFilters({});
    fetchRides({});
  };

  return (
    <div>
      <h2>Available Rides</h2>
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0 }}>Find Rides</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Pickup Location</label>
            <input
              type="text"
              value={pickupFilter}
              onChange={(e) => setPickupFilter(e.target.value)}
              placeholder="e.g. UCLA Dorms"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Destination</label>
            <input
              type="text"
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              placeholder="e.g. LAX"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Departure Date</label>
            <input
              type="date"
              value={departureDateFilter}
              onChange={(e) => setDepartureDateFilter(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Minimum Seats</label>
            <input
              type="number"
              value={minSeatsFilter}
              onChange={(e) => setMinSeatsFilter(e.target.value)}
              min="0"
              placeholder="e.g. 2"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Round trip filter */}
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Trip Type</label>
            <select
              value={roundTripFilter}
              onChange={(e) => setRoundTripFilter(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            >
              <option value="">Any</option>
              <option value="false">One Way</option>
              <option value="true">Round Trip</option>
            </select>
          </div>

        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button
            onClick={applyFilters}
            style={{
              padding: '10px 16px',
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

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: '#555',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <p style={{ margin: '10px 0 0', color: '#666', fontSize: '13px' }}>
            Showing {rides.length} ride(s) matching your filters
          </p>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : rides.filter(ride => ride && ride.id).length > 0 ? (
        rides.filter(ride => ride && ride.id).map(ride => (
          <RideCard
            key={ride.id}
            ride={ride}
            currentUserId={currentUserId}
            onUpdate={fetchRides}
            socket={socket}
          />
        ))
      ) : (
        <p style={{ color: 'red' }}>
          {hasActiveFilters ? 'No rides found matching your filters.' : 'No rides found.'}
        </p>
      )}
    </div>
  );
}

export default RideFeed;