import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import RideFeed from "./pages/RideFeed"
import CreateRide from "./pages/CreateRide"
import Profile from "./Profile"
import BottomNav from "./components/BottomNav"
import "./App.css"

const params = new URLSearchParams(window.location.search)
const currentUserId = parseInt(params.get("userId")) || 251

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <img src="/logo.svg" alt="UCLAway Logo" className="logo" />
          <span className="user-label">User ID: {currentUserId}</span>
        </header>

        <Routes>
          <Route path="/" element={<RideFeed currentUserId={currentUserId} />} />
          <Route
            path="/create"
            element={<CreateRide currentUserId={currentUserId} />}
          />
          <Route path="/profile" element={<Profile currentUserId={currentUserId} />} />
        </Routes>

        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App