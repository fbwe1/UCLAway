import React from 'react'
import '../App.css'
import { useEffect, useState } from 'react'
import supabase from '../supabaseClient'

export default function ResetPassword({ onBackToLogin }) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const canSubmit = password.length > 0 && confirmPassword.length > 0;

    useEffect(() => {
        async function loadRecoverySession() {
            const code = new URLSearchParams(window.location.search).get("code");

            if (code && supabase) {
                await supabase.auth.exchangeCodeForSession(code);
            }
        }

        loadRecoverySession();
    }, []);

    async function handleResetPassword(e) {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        const complexPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
        if (!complexPasswordRegex.test(password)) {
            setMessage("You need to make a more complex password");
            return;
        }

        if (!supabase) {
            setMessage("Supabase is not configured.");
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            setMessage(error.message || "Could not update password.");
        } else {
            setMessage("Password updated successfully.");
        }
    }

    return (
        <div className="login-container">
            <form onSubmit={handleResetPassword}>
                <button type="button" className="back-to-login-button" onClick={onBackToLogin}>
                    Go back to login
                </button>
                <div className="input">
                    New Password: <input type="password" placeholder="New password"
                    onChange={e => setPassword(e.target.value)}/>
                </div>
                <div className="input">
                    Confirm Password: <input type="password" placeholder="Confirm password"
                    onChange={e => setConfirmPassword(e.target.value)}/>
                </div>
                <button type="submit" className="signin-container button" disabled={!canSubmit}>
                    Update password
                </button>
                {message && <p className="auth-message">{message}</p>}
            </form>
        </div>
    )
}
