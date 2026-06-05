import { NavLink } from "react-router-dom";

function BottomNav() {
  const linkStyle = ({ isActive }) => ({
    textDecoration: "none",
    color: "#000",
    fontWeight: "600",
    padding: "10px 18px",
    borderRadius: "50px",
    backgroundColor: isActive ? "#fff" : "transparent",
    fontSize: "14px",
    whiteSpace: "nowrap",
  });

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        backgroundColor: "#e8e8e8",
        borderRadius: "50px",
        display: "flex",
        gap: "4px",
        padding: "6px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
      }}
    >
      <NavLink to="/" style={linkStyle}>
        Feed
      </NavLink>

      <NavLink to="/create" style={linkStyle}>
        Create
      </NavLink>

      <NavLink to="/messages" style={linkStyle}>
        Messages
      </NavLink>

      <NavLink to="/users" style={linkStyle}>
        Search
      </NavLink>

      <NavLink to="/profile" style={linkStyle}>
        Profile
      </NavLink>
    </nav>
  );
}

export default BottomNav;