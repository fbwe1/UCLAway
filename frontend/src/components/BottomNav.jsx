import { NavLink } from "react-router-dom"

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
        Feed
      </NavLink>

      <NavLink
        to="/create"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        Create
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        Profile
      </NavLink>
    </nav>
  )
}

export default BottomNav