import "./App.css"
import { useState } from "react"
import Login from "./pages/Login.jsx"
import Signup from "./pages/signup.jsx"
//basic implementation: could be more visually appealling


export default function App() {
  const [currentPage, setCurrentPage] = useState("login");

  return ( 
    <div>
      {currentPage === "login" ? (
        <Login onCreateAccount={() => setCurrentPage("signup")} />
      ) : (
        <Signup />
      )}
    </div>
  );
}
