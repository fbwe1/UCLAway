import "./App.css"
import { useState } from "react"
import Login from "./pages/Login.jsx"
import Signup from "./pages/signup.jsx"
//basic implementation: could be more visually appealling


export default function App() {
  const [currentPage, setCurrentPage] = useState("login");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  function handleLogin(uclaEmail) {
    setCurrentUserEmail(uclaEmail);
  }

  function handleLogout() {
    setCurrentUserEmail("");
    setCurrentPage("login");
  }

  if (currentUserEmail) {
    return (
      <div className="home-container">
        <h1>Welcome to UCLAway</h1>
        <p>You are logged in as {currentUserEmail}.</p>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    );
  }

  return ( 
    <div>
      {currentPage === "login" ? (
        <Login
          onCreateAccount={() => setCurrentPage("signup")}
          onLogin={handleLogin}
        />
      ) : (
        <Signup />
      )}
    </div>
  );
}
