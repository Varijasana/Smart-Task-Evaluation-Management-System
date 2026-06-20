// backend/models/Task.js
const mongoose = require("mongoose");

const RecurrenceSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  // 'daily', 'weekly', 'monthly', 'yearly' or custom
  frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly", "custom"], default: "weekly" },
  interval: { type: Number, default: 1 }, // every n frequency
  // for custom you can store cron-like rule or daysOfWeek etc.
  daysOfWeek: [{ type: Number }], // 0..6 (optional)
  // nextDue computed/stored to create next instance automatically
  nextDue: { type: Date }
}, { _id: false });

const EscalationSchema = new mongoose.Schema({
  escalated: { type: Boolean, default: false },
  escalatedAt: { type: Date },
  escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // optional
}, { _id: false });

const SubmissionSchema = new mongoose.Schema({
  submitted: { type: Boolean, default: false },
  submittedAt: { type: Date },
  mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
  // store who submitted (optional)
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { _id: false });

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ["low", "medium", "high"], required: true },
  deadline: { type: Date, required: true },

  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Remove manual status editing in UI; backend still stores status
  status: {
    type: String,
    enum: ["pending", "completed", "overdue"],
    default: "pending"
  },


  type: {
    type: String,
    enum: ["task", "meeting"],
    default: "task"
  },

  recurrence: RecurrenceSchema,
  escalation: EscalationSchema,
  submission: SubmissionSchema
}, { timestamps: true });

module.exports = mongoose.model("Task", TaskSchema);
