import React from 'react'
import '../App.css'
import { useState } from 'react'

export default function Signup() {
    //json structure to send to backend
    //user data (tentative, just for testing)
    const [userData, setuserData] = useState({ 
        email: "",
        password: "",
        options:{
            data:{
                first_name: "",
            }
        }
    }
    )
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
        } catch (error) {
            console.error("signup req failed:", error);
        }
    }
    return (
        <div className="login-container">
            <form onSubmit={handleData}>
            <div className="input">
                    UCLA Email: <input type="text" placeholder="UCLA-affiliated email"
                    onChange={e => setuserData({...userData, email: e.target.value})}/>
                </div>
                <div className="input">
                    Username: <input type="text" placeholder="Username" 
                    onChange={e =>
                        setuserData({
                          ...userData,
                          options: {
                            ...userData.options,
                            data: {
                              ...userData.options.data,
                              first_name: e.target.value
                            }
                          }
                        })
                      }/>
                </div>
                <div className="input">
                Password: <input type="password" placeholder="Password"
                onChange={e => setuserData({...userData, password: e.target.value})}/>
                </div>
                <button type="submit" className="signin-container button">
                    Signup
                </button>
            </form>
        </div>
    )

}
