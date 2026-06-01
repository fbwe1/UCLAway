import React from 'react'
import '../App.css'
import { useState } from 'react'

export default function Signup({ onBackToLogin }) {
    const [userData, setuserData] = useState({ 
        username: "",
        first_name: "",
        last_name: "",
        ucla_email: "",
        password: "",
    }
    )
    const [message, setMessage] = useState("");

    async function handleData(e){
        e.preventDefault();
        const signupData = {
            ...userData,
            full_name: `${userData.first_name} ${userData.last_name}`.trim(),
        };
        console.log("Frontend sending:", signupData);
        try{
            const res = await fetch("http://localhost:3001/auth/signup", {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(signupData),
            });
            const data = await res.json();

            console.log("Backend response:", data);
            setMessage(data.message || "Signup complete.");
        } catch (error) {
            console.error("signup req failed:", error);
            setMessage("Couldn't connect to the server.");
        }
    }
    return (
        <div className="login-container">
            <form onSubmit={handleData}>
                <button type="button" className="back-to-login-button" onClick={onBackToLogin}>
                    Go back to login
                </button>
                <div className="input">
                    UCLA Email: <input type="text" placeholder="UCLA-affiliated email"
                    onChange={e => setuserData({...userData, ucla_email: e.target.value})}/>
                </div>
                <div className="input">
                    Username: <input type="text" placeholder="Username" 
                    onChange={e => setuserData({...userData, username: e.target.value})}/>
                </div>
                <div className="input">
                    First Name: <input type="text" placeholder="First name"
                    onChange={e => setuserData({...userData, first_name: e.target.value})}/>
                </div>
                <div className="input">
                    Last Name: <input type="text" placeholder="Last name"
                    onChange={e => setuserData({...userData, last_name: e.target.value})}/>
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
