// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { createClient } = require("redis");
const path = require("path");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const taskRoutes = require("./routes/tasks");
const studentRoutes = require("./routes/students");
const clubRoutes = require("./routes/club");
const notificationRoutes = require("./routes/notifications"); // NEW

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/club", clubRoutes);
app.use("/api/notifications", notificationRoutes); // NEW

const PORT = process.env.PORT || 5000;

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Redis connect
(async () => {
  try {
    const redisUrl = process.env.REDIS_URL || undefined;
    const redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (err) => console.error("Redis Client Error", err));
    await redisClient.connect();
    console.log("Redis connected");
    app.set("redisClient", redisClient);
  } catch (err) {
    console.error("Failed to connect to Redis (continuing without redis):", err);
  }
})();

app.get("/redis-sessions", async (req, res) => {
  const redisClient = req.app.get("redisClient");
  if (!redisClient) return res.json({});
  const keys = await redisClient.keys("session:*");
  const sessions = {};
  for (let key of keys) {
    sessions[key] = await redisClient.get(key);
  }
  res.json(sessions);
});

// appended: start cron jobs and load model hooks
try { require('./models/hooks'); } catch (e) { console.warn('hooks require failed', e); }
try { require('./cronJobs')(); } catch (e) { console.warn('cronJobs require failed', e); }

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
