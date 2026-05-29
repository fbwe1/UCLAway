import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import RideFeed from './pages/RideFeed';
import CreateRide from './pages/CreateRide';
import RideDetail from './pages/RideDetail';
import Conversation from './pages/Conversation';
import Messages from './pages/Messages';

// Socket created once at the top level and passed down to pages that need it
// This prevents multiple socket connections being created
const socket = io('http://localhost:3001');

// ============================================================
// TODO: DELETE THIS BLOCK WHEN AUTH IS MERGED
// Temporary way to simulate different users for testing.
// Usage: http://localhost:5173?userId=251
//        http://localhost:5173?userId=999
// Replace with real logged-in user ID from auth system.
const params = new URLSearchParams(window.location.search);
const currentUserId = parseInt(params.get('userId')) || 251;
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        {/* Nav bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #ccc',
          paddingBottom: '12px'
        }}>
          <h1 style={{ margin: 0 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>UCLAway 🚗</Link>
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Feed</Link>
            <Link to="/messages" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>💬 Messages</Link>
            <Link to="/create" style={{
              textDecoration: 'none',
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '8px 14px',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>
              + Create Ride
            </Link>
            {/* TODO: DELETE - remove this debug label when auth is merged */}
            <span style={{ color: '#888', fontSize: '13px' }}>User ID: {currentUserId}</span>
          </div>
        </div>

        {/* Pages */}
        <Routes>
          <Route path="/" element={<RideFeed currentUserId={currentUserId} socket={socket} />} />
          <Route path="/create" element={<CreateRide currentUserId={currentUserId} />} />
          <Route path="/rides/:id" element={<RideDetail currentUserId={currentUserId} socket={socket} />} />
          <Route path="/messages" element={<Messages currentUserId={currentUserId} socket={socket} />} />
          <Route path="/messages/:id" element={<Conversation currentUserId={currentUserId} socket={socket} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;