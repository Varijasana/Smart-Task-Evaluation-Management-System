// backend/seedTasks.js
require("dotenv").config();
const mongoose = require("mongoose");
const Task = require("./models/Task");
const User = require("./models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await Task.deleteMany({});

    const president = await User.findOne({ rollNumber: "25bd1a0523" });
    const artHead = await User.findOne({ rollNumber: "24bd1a057p" });
    const artMember = await User.findOne({ rollNumber: "24bd1a05a7" });
    const danceHead = await User.findOne({ rollNumber: "24bd1a05bm" });
    const danceMember = await User.findOne({ rollNumber: "24bd1a05ab" });

    if (!president) {
      console.warn("President missing — run seed.js first");
      process.exit(1);
    }

    const tasks = [
      {
        title: "Plan Art Exhibition",
        description: "Organize art exhibition for campus fest",
        assignedBy: president._id,
        assignedTo: artHead ? artHead._id : null,
        status: "pending",
        priority: "high",
        deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000)
      },
      {
        title: "Prepare Art Report",
        description: "Monthly report for art activities",
        assignedBy: artHead ? artHead._id : president._id,
        assignedTo: artMember ? artMember._id : null,
        status: "pending",
        priority: "medium",
        deadline: new Date(Date.now() + 5 * 24 * 3600 * 1000)
      },
      {
        title: "Choreography Plan",
        description: "Prepare dance routine for cultural night",
        assignedBy: president._id,
        assignedTo: danceHead ? danceHead._id : null,
        status: "pending",
        priority: "high",
        deadline: new Date(Date.now() + 10 * 24 * 3600 * 1000)
      },
      {
        title: "Dance Practice Report",
        description: "Collect practice schedule and progress",
        assignedBy: danceHead ? danceHead._id : null,
        assignedTo: danceMember ? danceMember._id : null,
        status: "pending",
        priority: "medium",
        deadline: new Date(Date.now() + 6 * 24 * 3600 * 1000)
      }
    ];

    await Task.insertMany(tasks);
    console.log("Seed tasks inserted");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
