import React from 'react'
import '../App.css'
import { useState } from 'react'

export default function Login({ onCreateAccount }) {
    const [loginData, setLoginData] = useState({
        ucla_email: "",
        password: ""
    })

    function handleLogin(e) {
        e.preventDefault();
        console.log("Login credentials entered:", loginData);
    }

    return (
        <div className="login-container">
            <form onSubmit={handleLogin}>
                <div className="input">
                    UCLA Email: <input type="text" placeholder="UCLA-affiliated email"
                    onChange={e => setLoginData({...loginData, ucla_email: e.target.value})}/>
                </div>
                <div className="input">
                    Password: <input type="password" placeholder="Password"
                    onChange={e => setLoginData({...loginData, password: e.target.value})}/>
                </div>
                <button type="submit" className="signin-container button">
                    Login
                </button>
                <button type="button" className="signin-container button" onClick={onCreateAccount}>
                    Not registered? Create an account!
                </button>
            </form>
        </div>
    )
}
