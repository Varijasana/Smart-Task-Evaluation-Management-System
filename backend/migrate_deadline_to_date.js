// backend/migrate_deadline_to_date.js
require('dotenv').config();
const mongoose = require("mongoose");
const Task = require("./models/Task");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const tasks = await Task.find({});
  for (const t of tasks) {
    if (t.deadline && typeof t.deadline === "string") {
      const parsed = new Date(t.deadline);
      if (!isNaN(parsed.getTime())) {
        t.deadline = parsed;
        await t.save();
        console.log("Converted task", t._id, "=>", parsed.toISOString());
      } else {
        console.warn("Could not parse deadline for task", t._id, t.deadline);
      }
    }
  }
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
