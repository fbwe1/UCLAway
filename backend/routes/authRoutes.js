const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const supabase = require("../supabaseClient");
const { hashPassword, comparePassword } = require("../services/hashService");
const { generateToken } = require("../services/jwtService");

const uclaEmailRegex = /^[A-Za-z0-9._%+-]+@(g\.)?ucla\.edu$/i;
const complexPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per window
  message: { status: false, message: "Too many login attempts, please try again later" }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // max 5 signups per hour per IP
  message: { status: false, message: "Too many accounts created, please try again later" }
});

// POST /auth/signup
router.post("/signup", signupLimiter, async (req, res) => {
  try {
    const { username, full_name, ucla_email, password } = req.body;

    if (!username || !full_name || !ucla_email || !password)
      return res.status(400).json({ status: false, message: "All fields are required" });

    if (!uclaEmailRegex.test(ucla_email))
      return res.status(400).json({ status: false, message: "Please use a valid UCLA email address" });

    if (!complexPasswordRegex.test(password))
      return res.status(400).json({ status: false, message: "Password must include uppercase, lowercase, number, and special character" });

    const { data: existing } = await supabase
      .from("profiles")
      .select("profile_id")
      .eq("ucla_email", ucla_email)
      .maybeSingle();

    if (existing)
      return res.status(409).json({ status: false, message: "An account with this email already exists" });

    const password_hash = await hashPassword(password);

    const { data: newUser, error } = await supabase
      .from("profiles")
      .insert({ username, full_name, ucla_email, password_hash })
      .select("profile_id, username")
      .single();

    if (error) {
      console.error("Signup DB error:", error.message);
      return res.status(500).json({ status: false, message: "Signup failed" });
    }

    return res.status(201).json({ status: true, message: "Account created successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { ucla_email, password } = req.body;

    if (!ucla_email || !password)
      return res.status(400).json({ status: false, message: "Email and password are required" });

    const { data: user, error } = await supabase
      .from("profiles")
      .select("profile_id, username, password_hash")
      .eq("ucla_email", ucla_email)
      .maybeSingle();

    if (error || !user)
      return res.status(401).json({ status: false, message: "Invalid email or password" });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ status: false, message: "Invalid email or password" });

    const token = generateToken({ userId: user.profile_id, username: user.username });

    return res.status(200).json({
      status: true,
      token,
      userId: user.profile_id,
      username: user.username,
      email: ucla_email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
});

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { ucla_email } = req.body;

    const { data: user } = await supabase
      .from("profiles")
      .select("profile_id")
      .eq("ucla_email", ucla_email)
      .maybeSingle();

    if (!user)
      return res.json({ status: true, message: "If your account exists, check your email inbox." });

    // TODO: generate reset token and send email via nodemailer/Resend

    return res.json({ status: true, message: "If your account exists, check your email inbox." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
});

module.exports = router;