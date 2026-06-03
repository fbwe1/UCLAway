const express = require("express");
const supabase = require('../supabaseclient.js');
const router = express.Router()
const jwt = require('jsonwebtoken')

router.post("/signup", async (req, res) => {

    // credential verification
    const uclaEmailRegex = /^[A-Za-z0-9._%+-]+@(g\.)?ucla\.edu$/i;
    const complexPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
    try{
        //account details
        const {username, full_name, ucla_email, password} = req.body;
        if(!uclaEmailRegex.test(ucla_email)){
            return res.status(400).json({
                status:false,
                message: "Please use a valid UCLA email address"
            })
        }
        if(!complexPasswordRegex.test(password)){
            return res.status(400).json({
                status:false,
                message: "You need to make a more complex password"
            })
        }
        const { data, error } = await supabase.auth.signUp(
            {
              email: ucla_email,
              password: password,
              options: {
                data: {
                  first_name: full_name,
                  username: username,
                }
              }
            }
          )
        if(error){
            console.log("Supabase signup error:", error.message);
            return res.json({
                status:false,
                message: error.message || "Signup failed."})
        }
        else{
            return res.json({
                status:true,
                message : "User Was Created Successfully"})
        }
    }catch(error){
        console.log(error);
        return res.status(400).send(error.message);
    }
})
// login route
router.post("/login", async (req,res) =>{
    try{
        const {ucla_email, password} = req.body;
        const { data, error } = await supabase.auth.signInWithPassword({
        email: ucla_email,
        password: password,
      })
      if (error){
        return res.json({
            status:false,
            message: "User Not Found"})
      } else{
        //JWT generated
        const token = generateToken({
            id: data.user.id, 
            email: data.user.ucla_email
        });
        return res.status(200).json({success: true, token})
      }
    } catch(error){
        console.log(error)
        return res.status(400).send(error.message)
    }
})
router.post("/forgot-password", async (req, res) => {
    try {
        const { ucla_email } = req.body;
        const redirectTo = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(ucla_email, {
            redirectTo,
        });
        if (error) {
            console.log("Supabase password reset error:", error.message);
        }
        return res.json({
            status: true,
            message: "If your account exists, check your email inbox."
        });
    } catch(error) {
        console.log(error);
        return res.status(400).send(error.message);
    }
})

module.exports=router;
