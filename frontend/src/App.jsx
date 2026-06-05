import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import RideFeed from './pages/RideFeed';
import CreateRide from './pages/CreateRide';
import RideDetail from './pages/Ridedetail';
import Conversation from './pages/Conversation';
import Messages from './pages/Messages';
import Profile from './Profile';
import BottomNav from './components/BottomNav';
import Login from './pages/Login.jsx';
import Signup from './pages/signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import UserSearch from './pages/UserSearch';
import PublicProfile from './pages/PublicProfile';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const startingPage = window.location.pathname === '/reset-password' ? 'reset-password' : 'login';
  const [currentPage, setCurrentPage] = useState(startingPage);
  const [currentUserEmail, setCurrentUserEmail] = useState(
    localStorage.getItem("token") ? "logged-in" : ""
  );
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [currentUserId, setCurrentUserId] = useState(
    parseInt(localStorage.getItem("userId")) || null
  );
  const [currentUsername, setCurrentUsername] = useState(
    localStorage.getItem("username") || ""
  );

  function handleLogin(uclaEmail, userId, username) {
    setToken(localStorage.getItem("token"));
    setCurrentUserEmail(uclaEmail);
    setCurrentUserId(userId);
    setCurrentUsername(username);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setToken("");
    setCurrentUserEmail('');
    setCurrentUserId(null);
    setCurrentUsername("");
    setCurrentPage('login');
  }

  if (!currentUserEmail) {
    if (currentPage === 'signup') {
      return <Signup onBackToLogin={() => setCurrentPage('login')} />;
    }
    if (currentPage === 'forgot-password') {
      return <ForgotPassword onBackToLogin={() => setCurrentPage('login')} />;
    }
    if (currentPage === 'reset-password') {
      return <ResetPassword onBackToLogin={() => setCurrentPage('login')} />;
    }
    return (
      <Login
        onCreateAccount={() => setCurrentPage('signup')}
        onForgotPassword={() => setCurrentPage('forgot-password')}
        onLogin={handleLogin}
      />
    );
  }

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
            <span style={{ color: '#888', fontSize: '13px' }}>👤 {currentUsername}</span>
            <button type="button" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          <Routes>
            <Route path="/" element={<RideFeed currentUserId={currentUserId} socket={socket} />} />
            <Route path="/create" element={<CreateRide currentUserId={currentUserId} />} />
            <Route path="/rides/:id" element={<RideDetail currentUserId={currentUserId} socket={socket} />} />
            <Route path="/messages" element={<Messages currentUserId={currentUserId} socket={socket} />} />
            <Route path="/messages/:id" element={<Conversation currentUserId={currentUserId} socket={socket} />} />
            <Route path="/profile" element={<Profile currentUserId={currentUserId} />} />
            <Route path="/users" element={<UserSearch currentUserId={currentUserId} />} />
            <Route path="/profile/:id" element={<PublicProfile currentUserId={currentUserId} />} />
          </Routes>
        </div>

        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;