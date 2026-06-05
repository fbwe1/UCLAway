import { NavLink } from "react-router-dom";

function BottomNav() {
  const linkStyle = ({ isActive }) => ({
    textDecoration: 'none',
    color: '#000',
    fontWeight: '600',
    padding: '10px 28px',
    borderRadius: '50px',
    backgroundColor: isActive ? '#fff' : 'transparent',
    fontSize: '15px',
    whiteSpace: 'nowrap',
  });

  return (
    <nav style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      backgroundColor: '#e8e8e8',
      borderRadius: '50px',
      display: 'flex',
      gap: '4px',
      padding: '6px',
    }}>
      <NavLink to="/" style={linkStyle}>
        Feed
      </NavLink>

      <NavLink to="/create" style={linkStyle}>
        Create
      </NavLink>

      <NavLink to="/users" style={linkStyle}>
        Search
      </NavLink>

      <NavLink to="/profile" style={linkStyle}>
        Profile
      </NavLink>
    </nav>
  )
}

export default BottomNav