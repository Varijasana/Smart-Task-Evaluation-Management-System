// backend/routes/club.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Task = require("../models/Task");
const Media = require("../models/Media");

// GET club info: /api/club/:clubName  (clubName = "art" or "dance")
// Returns: clubHead, members (with tasksCompleted count)
router.get("/:clubName", authMiddleware, async (req, res) => {
  try {
    const clubName = req.params.clubName;
    if (!["art", "dance"].includes(clubName)) {
      return res.status(400).json({ error: "Invalid club name" });
    }

    // allow only president or staff with access:
    // president can view any club; clubheads can view their club only
    const allowedRoles = ["studentpresident", `${clubName}clubhead`, `${clubName}clubmember`];
    if (!allowedRoles.includes(req.user.role) && req.user.role.indexOf(clubName) === -1) {
      // still allow studentpresident anywhere
      if (req.user.role !== "studentpresident") {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const clubHead = await User.findOne({ role: `${clubName}clubhead` }).select("name rollNumber _id");
    const members = await User.find({ $or: [{ role: `${clubName}clubmember` }, { role: `${clubName}clubhead` }] })
      .select("name rollNumber _id");

    // calculate tasksCompleted for each member
    const membersWithStats = await Promise.all(members.map(async (m) => {
      const completed = await Task.countDocuments({ assignedTo: m._id, status: "completed" });
      return {
        _id: m._id,
        name: m.name,
        rollNumber: m.rollNumber,
        tasksCompleted: completed
      };
    }));

    // also return recent pending media for club (if any)
    const medias = await Media.find({}).populate('uploadedBy', 'name rollNumber').populate('taskId', 'title').sort({ createdAt: -1 }).limit(50);
    // filter medias by club: media.taskId might be null. We'll include any media uploaded by users of this club.
    const memberIds = members.map(m => m._id.toString());
    const clubMedias = medias.filter(m => memberIds.includes(String(m.uploadedBy?._id)));

    res.json({
      clubHead: clubHead || null,
      members: membersWithStats,
      medias: clubMedias
    });
  } catch (err) {
    console.error("Club fetch error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
