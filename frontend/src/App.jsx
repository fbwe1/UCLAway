import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import RideFeed from './pages/RideFeed';
import CreateRide from './pages/CreateRide';
import RideDetail from './pages/RideDetail';
import Conversation from './pages/Conversation';
import Messages from './pages/Messages';
import SearchUsers from './pages/SearchUsers';
import Profile from './Profile';
import BottomNav from './components/BottomNav';
import './App.css';

const socket = io('http://localhost:3001');

const params = new URLSearchParams(window.location.search);
const currentUserId = parseInt(params.get('userId')) || 251;

function App() {
  return (
    <BrowserRouter>
      <div style={{ paddingBottom: '70px', fontFamily: 'sans-serif' }}>
        <div style={{
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #ccc',
          paddingBottom: '12px'
        }}>
          <h1 style={{ margin: 0 }}>
            <Link to="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'inherit'
            }}>
              <img src="/logo.svg" alt="UCLAway Logo" className="logo" style={{ height: '80px', width: 'auto' }} />
              UCLAway
            </Link>
          </h1>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Feed</Link>
            <Link to="/search" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Search</Link>
            <Link to="/messages" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Messages</Link>
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
            <span style={{ color: '#888', fontSize: '13px' }}>User ID: {currentUserId}</span>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          <Routes>
            <Route path="/" element={<RideFeed currentUserId={currentUserId} socket={socket} />} />
            <Route path="/search" element={<SearchUsers currentUserId={currentUserId} />} />
            <Route path="/create" element={<CreateRide currentUserId={currentUserId} />} />
            <Route path="/rides/:id" element={<RideDetail currentUserId={currentUserId} socket={socket} />} />
            <Route path="/messages" element={<Messages currentUserId={currentUserId} socket={socket} />} />
            <Route path="/messages/:id" element={<Conversation currentUserId={currentUserId} socket={socket} />} />
            <Route path="/profile" element={<Profile currentUserId={currentUserId} />} />
          </Routes>
        </div>

        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
