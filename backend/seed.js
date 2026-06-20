// backend/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // Remove existing users (ONLY for dev)
    await User.deleteMany({});

    const users = [
      { name: "Student President", rollNumber: "25bd1a0523", password: "kmit123", role: "studentpresident", club: null },
      { name: "Art Club Head", rollNumber: "24bd1a057p", password: "kmit123", role: "artclubhead", club: "art" },
      { name: "Art Club Member 1", rollNumber: "24bd1a05a7", password: "kmit123", role: "artclubmember", club: "art" },
      { name: "Art Club Member 2", rollNumber: "24bd1a05a3", password: "kmit123", role: "artclubmember", club: "art" },
      { name: "Art Club Member 3", rollNumber: "24bd1a05a4", password: "kmit123", role: "artclubmember", club: "art" },
      { name: "Dance Club Head", rollNumber: "24bd1a05bm", password: "kmit123", role: "danceclubhead", club: "dance" },
      { name: "Dance Club Member 1", rollNumber: "24bd1a05ab", password: "kmit123", role: "danceclubmember", club: "dance" },
      { name: "Dance Club Member 2", rollNumber: "24bd1a05ag", password: "kmit123", role: "danceclubmember", club: "dance" },
      { name: "Dance Club Member 3", rollNumber: "24bd1a05a9", password: "kmit123", role: "danceclubmember", club: "dance" },
      { name: "Dance Club Member 4", rollNumber: "25bd1a0524", password: "kmit123", role: "danceclubmember", club: "dance" }
    ];

    for (const u of users) {
      const hashed = await bcrypt.hash(u.password, 10);
      await User.create({ name: u.name, rollNumber: u.rollNumber, password: hashed, role: u.role, club: u.club });
    }

    console.log("Seed users created");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

run();
