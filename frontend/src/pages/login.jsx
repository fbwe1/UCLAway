import React from 'react'
import '../App.css'
import { useState } from 'react'
export default function Login({ onCreateAccount, onForgotPassword, onLogin }) {
    const [loginData, setLoginData] = useState({
        ucla_email: "",
        password: ""
    })
    const [message, setMessage] = useState("");
    const canLogin = loginData.ucla_email.length > 0 && loginData.password.length > 0;
    async function handleLogin(e) {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:3001/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(loginData),
            });
            const data = await res.json();
            if (data.success) {
                setMessage("Login successful!");
                onLogin(loginData.ucla_email);
            } else {
                setMessage(data.message || "Login failed... Please try again.");
            }
        } catch (error) {
            console.error("login req failed:", error);
            setMessage("Couldn't connect to the server.");
        }
    }
    return (
        <div className="login-container login-page">
            <form className="login-form" onSubmit={handleLogin}>
                <div className="input">
                    UCLA Email: <input type="text" placeholder="UCLA email"
                    onChange={e => setLoginData({...loginData, ucla_email: e.target.value})}/>
                </div>
                <div className="input">
                    Password: <input type="password" placeholder="Password"
                    onChange={e => setLoginData({...loginData, password: e.target.value})}/>
                </div>
                <button type="submit" className="signin-container button" disabled={!canLogin}>
                    Login
                </button>
                <button type="button" className="signin-container button" onClick={onCreateAccount}>
                    Not registered? Create an account!
                </button>
                <button type="button" className="signin-container button" onClick={onForgotPassword}>
                    Forgot password?
                </button>
                {message && <p className="auth-message">{message}</p>}
            </form>
        </div>
    )
}
