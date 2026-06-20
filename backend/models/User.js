// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: [
      "studentpresident",
      "artclubhead",
      "artclubmember",
      "danceclubhead",
      "danceclubmember"
    ],
    required: true
  },
  // optional club marker for easier queries (values: 'art' | 'dance' | null)
  club: {
    type: String,
    enum: ["art", "dance", null],
    default: null
  }
});

module.exports = mongoose.model("User", userSchema);
