import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RideFeed from './pages/RideFeed';
import CreateRide from './pages/CreateRide';

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '12px' }}>
          <img
            src="/logo.svg"
            alt="UCLAway Logo"
            style={{
              height: '90px',
              objectFit: 'contain'
            }}
          />
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Feed</Link>
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
          <Route path="/" element={<RideFeed currentUserId={currentUserId} />} />
          <Route path="/create" element={<CreateRide currentUserId={currentUserId} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
