// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// REGISTER route (for testing)
router.post("/register", async (req, res) => {
  const { name, rollNumber, password, role, club } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, rollNumber, password: hashedPassword, role, club: club || null });
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ error: "User registration failed", details: err.message });
  }
});

// LOGIN route
router.post("/login", async (req, res) => {
  const { rollNumber, password } = req.body;
  try {
    // Case-insensitive match
    const user = await User.findOne({ rollNumber: { $regex: new RegExp(`^${rollNumber}$`, "i") } });
    if (!user) return res.status(400).json({ error: "Invalid Roll Number" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid Password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const redisClient = req.app.get("redisClient");
    if (redisClient) {
      try {
        await redisClient.set(`session:${user._id}`, token, { EX: 3600 });
      } catch (e) {
        console.warn("Redis set session failed:", e.message || e);
      }
    }

    // include club (if applicable) so frontend can redirect / show club selection
    res.json({
      message: "Login successful",
      token,
      role: user.role,
      name: user.name,
      club: user.club || null
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// LOGOUT route
router.post("/logout", authMiddleware, async (req, res) => {
  const redisClient = req.app.get("redisClient");
  if (redisClient) {
    try {
      await redisClient.del(`session:${req.user.id}`);
    } catch (e) {
      console.warn("Redis del session failed:", e.message || e);
    }
  }
  res.json({ message: "Logged out" });
});

module.exports = router;
