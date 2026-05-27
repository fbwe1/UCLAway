import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import RideCard from '../RideCard';

const socket = io('http://localhost:3001');

function RideFeed({ currentUserId }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = () => {
    fetch('http://localhost:3001/api/rides')
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

  useEffect(() => {
    fetchRides();

    socket.on('rides-update', (payload) => {
      console.log('Real-time update received:', payload.eventType);

      if (payload.eventType === 'INSERT') {
        // Re-fetch instead of appending to avoid duplicates on navigation
        fetchRides();
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

  return (
    <div>
      <h2>Available Rides</h2>
      {loading ? (
        <p>Loading...</p>
      ) : rides.length > 0 ? (
        rides.map(ride => (
          <RideCard
            key={ride.id}
            ride={ride}
            currentUserId={currentUserId}
            onUpdate={fetchRides}
          />
        ))
      ) : (
        <p style={{ color: 'red' }}>No rides found.</p>
      )}
    </div>
  );
}

export default RideFeed;