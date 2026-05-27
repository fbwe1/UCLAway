import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import RideFeed from "./pages/RideFeed";
import CreateRide from "./pages/CreateRide";
import Profile from "./Profile";

// Temporary user id until auth is connected
const params = new URLSearchParams(window.location.search);
const currentUserId = parseInt(params.get("userId")) || 251;

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid #ccc",
            paddingBottom: "12px",
          }}
        >
          <img
            src="/logo.svg"
            alt="UCLAway Logo"
            style={{
              height: "90px",
              objectFit: "contain",
            }}
          />

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Link to="/" style={{ textDecoration: "none", color: "#333", fontWeight: "bold" }}>
              Feed
            </Link>

            <Link
              to="/create"
              style={{
                textDecoration: "none",
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "8px 14px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              + Create Ride
            </Link>

            <Link to="/profile" style={{ textDecoration: "none", color: "#333", fontWeight: "bold" }}>
              Profile
            </Link>

            <span style={{ color: "#888", fontSize: "13px" }}>
              User ID: {currentUserId}
            </span>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<RideFeed currentUserId={currentUserId} />} />
          <Route path="/create" element={<CreateRide currentUserId={currentUserId} />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;