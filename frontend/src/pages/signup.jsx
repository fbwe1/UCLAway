import React from 'react'
import '../App.css'
import { useState } from 'react'

export default function Signup() {
    //json structure to send to backend
    //user data (tentative, just for testing)
    const [userData, setuserData] = useState({ 
        username: "",
        ucla_email: "",
        password: "",
    }
    )
    const [message, setMessage] = useState("");

    async function handleData(e){
        e.preventDefault();
        //don't execute until click signup, then send usr credentials to auth routes
        console.log("Frontend sending:", userData);
        try{
            const res = await fetch("http://localhost:3001/auth/signup", {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            });
            const data = await res.json();

            console.log("Backend response:", data);
            setMessage(data.message || "Signup complete.");
        } catch (error) {
            console.error("signup req failed:", error);
            setMessage("Could not connect to the server.");
        }
    }
    return (
        <div className="login-container">
            <form onSubmit={handleData}>
            <div className="input">
                    UCLA Email: <input type="text" placeholder="UCLA-affiliated email"
                    onChange={e => setuserData({...userData, ucla_email: e.target.value})}/>
                </div>
                <div className="input">
                    Username: <input type="text" placeholder="Username" 
                    onChange={e => setuserData({...userData, username: e.target.value})}/>
                </div>
                <div className="input">
                Password: <input type="password" placeholder="Password"
                onChange={e => setuserData({...userData, password: e.target.value})}/>
                </div>
                <button type="submit" className="signin-container button">
                    Signup
                </button>
                {message && <p className="auth-message">{message}</p>}
            </form>
        </div>
    )

}
