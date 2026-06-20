const express = require("express");
const Task = require("../models/Task");
const Media = require("../models/Media");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|doc|docx|txt|xls|xlsx|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().replace('.', ''));

    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not supported. Allowed: Images, Videos, PDFs, Docs.'));
    }
  }
});

// ---------------- CREATE TASK ----------------
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { title, description, assignedTo, priority, deadline, type } = req.body;

    if (!title || !description || !assignedTo || !priority || !deadline) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const task = new Task({
      title,
      description,
      priority,
      deadline,
      assignedBy: req.user.id,
      assignedTo,
      type: type || 'task'
    });

    await task.save();
    res.status(201).json({ message: "Task created successfully", task });

  } catch (err) {
    console.error("Task Create Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- GET USERS BY ROLE (PRESIDENT) ----------------
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    if (!role) return res.status(400).json({ error: "Role required" });

    const users = await User.find({ role }, { name: 1, rollNumber: 1 });
    res.json({ users });
  } catch (err) {
    console.error("Fetch Users Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- GET MEMBERS FOR DROPDOWN (CLUB HEAD) ----------------
router.get("/members", authMiddleware, async (req, res) => {
  try {
    let query = {};

    if (req.user.role.includes("clubhead")) {
      const currentUser = await User.findById(req.user.id);
      if (currentUser && currentUser.club) {
        query.club = currentUser.club;
        query.role = { $regex: 'member' };
      }
    }

    const members = await User.find(query, { name: 1, rollNumber: 1, role: 1 });
    res.json({ members });
  } catch (err) {
    console.error("Fetch Members Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- GET TASKS ASSIGNED BY ME ----------------
router.get("/assigned-by-me", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedBy: req.user.id
    })
      .populate("assignedTo", "name rollNumber club")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // For each task, check if associated media is approved
    for (let task of tasks) {
      if (task.submission && task.submission.mediaIds && task.submission.mediaIds.length > 0) {
        const media = await Media.findOne({
          _id: { $in: task.submission.mediaIds },
          status: 'approved'
        });
        task.isApproved = !!media;
      } else {
        task.isApproved = false;
      }

      // Check if this task has any rejected submissions (for assigner's view)
      const rejectedMedia = await Media.findOne({
        taskId: task._id,
        status: 'rejected'
      }).sort({ verificationDate: -1 });

      task.wasRejected = !!rejectedMedia;
      if (rejectedMedia) {
        task.lastRejectionReason = rejectedMedia.feedback;
      }
    }

    res.json({ tasks });
  } catch (err) {
    console.error("Fetch Tasks Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- GET MY TASKS (CLUB MEMBER) ----------------
router.get("/my-tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user.id
    })
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // For each task, check if associated media is approved or rejected
    for (let task of tasks) {
      if (task.submission && task.submission.mediaIds && task.submission.mediaIds.length > 0) {
        const approvedMedia = await Media.findOne({
          _id: { $in: task.submission.mediaIds },
          status: 'approved'
        });
        task.isApproved = !!approvedMedia;
      } else {
        task.isApproved = false;
      }

      // Check if there's any rejected media for this task (for UI feedback)
      const rejectedMedia = await Media.findOne({
        taskId: task._id,
        uploadedBy: req.user.id,
        status: 'rejected'
      }).sort({ verificationDate: -1 });

      task.hasRejectedSubmission = !!rejectedMedia;
      if (rejectedMedia) {
        task.rejectionFeedback = rejectedMedia.feedback;
      }
    }

    res.json(tasks);
  } catch (err) {
    console.error("Fetch Tasks Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- GET STATS (CLUB MEMBER) ----------------
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id });

    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      pending: tasks.filter(t => t.status === 'pending').length
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const completionData = await Task.aggregate([
      {
        $match: {
          assignedTo: req.user.id,
          status: 'completed',
          updatedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ stats, completionData });
  } catch (err) {
    console.error("Fetch Stats Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- UPDATE TASK STATUS ----------------
router.patch("/:taskId/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const { taskId } = req.params;

    const allowed = ["pending", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const task = await Task.findById(taskId);

    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }

    task.status = status;
    await task.save();

    res.json({ message: "Status updated", task });

  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- DELETE TASK (CLUB HEAD/PRESIDENT) ----------------
router.delete("/:taskId", authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (task.assignedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this task" });
    }

    await Task.findByIdAndDelete(taskId);
    res.json({ message: "Task deleted successfully" });

  } catch (err) {
    console.error("Delete Task Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- UPLOAD MEDIA ----------------
router.post("/upload-media", authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { taskId, description } = req.body;

    const media = new Media({
      uploadedBy: req.user.id,
      taskId: taskId || null,
      fileName: req.file.filename,
      fileType: req.file.mimetype.startsWith('image') ? 'image' : req.file.mimetype.startsWith('video') ? 'video' : 'document',
      filePath: req.file.path,
      description: description || '',
      status: 'pending'
    });

    await media.save();
    res.status(201).json({ message: "Media uploaded successfully", media });

  } catch (err) {
    console.error("Upload Media Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- GET MY MEDIA ----------------
router.get("/my-media", authMiddleware, async (req, res) => {
  try {
    const media = await Media.find({ uploadedBy: req.user.id })
      .populate('taskId', 'title')
      .sort({ createdAt: -1 });

    res.json({ media });
  } catch (err) {
    console.error("Fetch Media Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- REMINDERS ----------------
router.get("/reminders", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const twoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const reminders = await Task.find({
      assignedTo: req.user.id,
      status: { $ne: 'completed' },
      deadline: { $gte: now, $lte: twoDays }
    }).sort({ deadline: 1 });

    res.json({ reminders });
  } catch (err) {
    console.error("Reminders Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- EXTENDED UPLOAD (WITH TASK SUBMISSION) ----------------
const uploadExtended = require("../middleware/upload");
router.post("/upload-media-extended", authMiddleware, uploadExtended.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { taskId, description } = req.body;

    const mediaType = req.file.mimetype.startsWith('image') ? 'image' :
      req.file.mimetype.startsWith('video') ? 'video' : 'document';

    const media = new Media({
      uploadedBy: req.user.id,
      taskId: taskId || null,
      fileName: req.file.filename,
      fileType: mediaType,
      filePath: req.file.path,
      description: description || '',
      status: 'pending'
    });

    await media.save();

    if (taskId) {
      const task = await Task.findById(taskId);
      if (task) {
        task.submission = task.submission || {};
        task.submission.submitted = true;
        task.submission.submittedAt = new Date();
        task.submission.mediaIds = task.submission.mediaIds || [];
        task.submission.mediaIds.push(media._id);
        task.submission.submittedBy = req.user.id;
        task.status = 'completed';
        await task.save();
      }
    }

    res.status(201).json({ message: "Media uploaded successfully", media });
  } catch (err) {
    console.error("Extended Upload Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- GET PENDING MEDIA (REVIEW) ----------------
router.get("/pending-media", authMiddleware, async (req, res) => {
  try {
    let pendingMedia = await Media.find({ status: 'pending' })
      .populate('uploadedBy', 'name rollNumber club')
      .populate({
        path: 'taskId',
        populate: {
          path: 'assignedBy',
          select: '_id'
        }
      })
      .sort({ createdAt: 1 });

    // Filter: Only show media where current user assigned the task
    let filteredMedia = pendingMedia.filter(media => {
      if (!media.taskId) return false;
      if (!media.taskId.assignedBy) return false;
      return media.taskId.assignedBy._id.toString() === req.user.id;
    });

    // For President, additionally filter by club if provided
    if (req.user.role === 'studentpresident') {
      const club = req.query.club;
      if (club) {
        filteredMedia = filteredMedia.filter(media => {
          return media.uploadedBy && media.uploadedBy.club === club;
        });
      }
    }

    res.json({ media: filteredMedia });
  } catch (err) {
    console.error("Fetch Pending Media Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- VERIFY MEDIA (APPROVE/REJECT) ----------------
router.patch("/media/:mediaId/verify", authMiddleware, async (req, res) => {
  try {
    const { status, feedback } = req.body;
    const { mediaId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const media = await Media.findById(mediaId).populate('taskId');
    if (!media) return res.status(404).json({ error: "Media not found" });

    media.status = status;
    media.verifiedBy = req.user.id;
    media.verificationDate = new Date();
    media.feedback = feedback || '';

    await media.save();

    // If rejected and task exists, reset task to pending so member can resubmit
    if (status === 'rejected' && media.taskId) {
      const task = await Task.findById(media.taskId);
      if (task) {
        // Reset task status to pending
        task.status = 'pending';

        // Extend deadline by 3 days for resubmission
        const currentDeadline = new Date(task.deadline);
        const newDeadline = new Date(currentDeadline.getTime() + (3 * 24 * 60 * 60 * 1000)); // Add 3 days
        task.deadline = newDeadline;

        // Clear submission data
        if (task.submission) {
          task.submission.submitted = false;
          task.submission.submittedAt = null;
          task.submission.submittedBy = null;
          // Remove rejected media from mediaIds array
          if (task.submission.mediaIds) {
            task.submission.mediaIds = task.submission.mediaIds.filter(
              id => id.toString() !== mediaId
            );
          }
        }

        await task.save();
      }
    }

    res.json({ message: `Media ${status}`, media });
  } catch (err) {
    console.error("Verify Media Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- DELETE MEDIA (OWN SUBMISSION) ----------------
router.delete("/media/:mediaId", authMiddleware, async (req, res) => {
  try {
    const { mediaId } = req.params;

    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    // Only allow deletion if user is the uploader and status is pending
    if (media.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this media" });
    }

    if (media.status !== 'pending') {
      return res.status(400).json({ error: "Cannot delete media that has already been reviewed" });
    }

    // Delete file from filesystem
    if (fs.existsSync(media.filePath)) {
      fs.unlinkSync(media.filePath);
    }

    // If media is linked to a task, reset the task status
    if (media.taskId) {
      const task = await Task.findById(media.taskId);
      if (task) {
        // Remove this media ID from task submission
        if (task.submission && task.submission.mediaIds) {
          task.submission.mediaIds = task.submission.mediaIds.filter(
            id => id.toString() !== mediaId
          );
        }

        // If no more media IDs, reset task to pending
        if (!task.submission.mediaIds || task.submission.mediaIds.length === 0) {
          task.status = 'pending';
          task.submission.submitted = false;
          task.submission.submittedAt = null;
          task.submission.submittedBy = null;
        }

        await task.save();
      }
    }

    await Media.findByIdAndDelete(mediaId);
    res.json({ message: "Media deleted successfully" });
  } catch (err) {
    console.error("Delete Media Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- EVENTS (CALENDAR) ----------------
router.get("/events", authMiddleware, async (req, res) => {
  try {
    let match = {};
    if (req.user.role === 'clubmember') {
      match.assignedTo = req.user.id;
    }
    const tasks = await Task.find(match).select('title deadline status recurrence').lean();

    const mediaMatch = req.user.role === 'clubmember' ? { uploadedBy: req.user.id } : {};
    const medias = await Media.find(mediaMatch).select('fileName createdAt taskId status').lean();

    res.json({ tasks, medias });
  } catch (err) {
    console.error("Events Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;