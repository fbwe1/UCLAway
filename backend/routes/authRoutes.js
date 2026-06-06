const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const supabase = require("../supabaseclient");
const { hashPassword, comparePassword } = require("../services/hashService");
const { generateToken } = require("../services/jwtService");

const uclaEmailRegex = /^[A-Za-z0-9._%+-]+@(g\.)?ucla\.edu$/i;
const complexPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: { status: false, message: "Too many login attempts, please try again later" }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
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

// POST /auth/forgot-password (kind of useless right now)
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

    // No forgot password email sent
    return res.json({ status: true, message: "If your account exists, check your email inbox." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
});

// DELETE /auth/delete-account Not used in the frontend can be added later only here for deleting the account for global teardown for e2e tests
router.delete("/delete-account", async (req, res) => {
  try {
    const { ucla_email, password } = req.body;

    if (!ucla_email || !password)
      return res.status(400).json({ status: false, message: "Email and password are required" });

    const { data: user, error } = await supabase
      .from("profiles")
      .select("profile_id, password_hash")
      .eq("ucla_email", ucla_email)
      .maybeSingle();

    if (error || !user)
      return res.status(404).json({ status: false, message: "Account not found" });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ status: false, message: "Invalid password" });

    const userId = user.profile_id;

    // Clean up dependent data before deleting the profile
    await Promise.all([
      supabase.from("follows").delete().eq("follower_user_id", userId),
      supabase.from("follows").delete().eq("followed_user_id", userId),
      supabase.from("rides").delete().eq("creator_user_id", userId),
    ]);

    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("profile_id", userId);

    if (deleteError) {
      console.error("Delete account error:", deleteError.message);
      return res.status(500).json({ status: false, message: "Failed to delete account" });
    }

    return res.status(200).json({ status: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
});

module.exports = router;