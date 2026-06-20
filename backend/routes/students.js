// routes/students.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

// GET all students
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Fetch name + rollNumber only
    const students = await User.find({}, { name: 1, rollNumber: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Error fetching students", error: err });
  }
});

module.exports = router;
