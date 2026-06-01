import React from 'react'
import '../App.css'
import { useState } from 'react'

export default function ForgotPassword({ onBackToLogin }) {
    const [uclaEmail, setUclaEmail] = useState("");
    const [message, setMessage] = useState("");
    const canSubmit = uclaEmail.length > 0;

    async function handleForgotPassword(e) {
        e.preventDefault();

        try {
            const res = await fetch("http://localhost:3001/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ucla_email: uclaEmail }),
            });
            const data = await res.json();

            setMessage(data.message || "If an account exists, check your email.");
        } catch (error) {
            console.error("forgot password req failed:", error);
            setMessage("Could not connect to the server.");
        }
    }

    return (
        <div className="login-container">
            <form onSubmit={handleForgotPassword}>
                <button type="button" className="back-to-login-button" onClick={onBackToLogin}>
                    Go back to login
                </button>
                <div className="input">
                    UCLA Email: <input type="text" placeholder="UCLA-affiliated email"
                    onChange={e => setUclaEmail(e.target.value)}/>
                </div>
                <button type="submit" className="signin-container button" disabled={!canSubmit}>
                    Send reset email
                </button>
                {message && <p className="auth-message">{message}</p>}
            </form>
        </div>
    )
}
