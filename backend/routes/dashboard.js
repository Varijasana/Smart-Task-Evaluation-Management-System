// dashboard.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

// Club Head
router.get("/club-head", authMiddleware, (req, res) => {
  if (req.user.role !== "clubhead")
    return res.status(403).json({ error: "Access denied" });

  res.json({ info: "Welcome Club Head! Here are your tasks." });
});

// Club Member
router.get("/club-member", authMiddleware, (req, res) => {
  if (req.user.role !== "clubmember")
    return res.status(403).json({ error: "Access denied" });

  res.json({ info: "Welcome Club Member! Here are your tasks." });
});

// President
router.get("/president", authMiddleware, (req, res) => {
  if (req.user.role !== "studentpresident")
    return res.status(403).json({ error: "Access denied" });

  res.json({ info: "Welcome Student President! Here are your tasks." });
});

router.get("/students", authMiddleware, async (req, res) => {
  try {
    const students = await User.find({}, { name: 1, rollNumber: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Error fetching students", error: err });
  }
});

module.exports = router;
