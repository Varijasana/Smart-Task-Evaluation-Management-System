// cronJobs.js
// Run scheduled tasks: reminders, escalation, recurring tasks.
// Requires environment variables for email (optional).
const cron = require('node-cron');
const mongoose = require('mongoose');
const Task = require('./models/Task');
const User = require('./models/User');
const Notification = require('./models/Notification');
const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

module.exports = function startCronJobs() {
  // Run every minute for immediate updates (dev/demo mode)
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const twoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Reminder: tasks assigned to members due in next 48 hours and not completed
      const upcoming = await Task.find({
        assignedTo: { $exists: true, $ne: null },
        status: { $ne: 'completed' },
        deadline: { $gte: now, $lte: twoDays }
      }).populate('assignedTo', 'name rollNumber email');

      for (const t of upcoming) {
        // optional: send email if user has email on record
        if (t.assignedTo && t.assignedTo.email) {
          const subj = `Reminder: "${t.title}" due on ${t.deadline.toLocaleDateString()}`;
          const text = `Task "${t.title}" is due on ${t.deadline.toLocaleDateString()}. Please submit required documents before the deadline.`;
          sendEmail(t.assignedTo.email, subj, text);
        }
      }
      // Escalation: tasks overdue and not escalated
      const overdue = await Task.find({
        status: { $ne: 'completed' },
        deadline: { $lt: now },
        'escalation.escalated': { $ne: true }
      });

      for (const t of overdue) {
        t.escalation = t.escalation || {};
        t.escalation.escalated = true;
        t.escalation.escalatedAt = new Date();
        // escalate to assignedBy (if present) or leave null
        t.escalation.escalatedTo = t.assignedBy || null;
        t.priority = 'high'; // Bump priority
        await t.save();

        // Create persistent notifications
        if (t.assignedTo) {
          await Notification.create({
            userId: t.assignedTo,
            message: `Task "${t.title}" is OVERDUE and has been escalated!`,
            type: 'error'
          });
        }
        if (t.assignedBy) {
          await Notification.create({
            userId: t.assignedBy,
            message: `URGENT: Task "${t.title}" assigned to ${t.assignedTo && t.assignedTo.name ? t.assignedTo.name : 'member'} is OVERDUE and has been automatically escalated.`,
            type: 'warning'
          });
        }

        // notify assignedBy if possible
        if (t.assignedBy) {
          const u = await User.findById(t.assignedBy);
          if (u && u.email) {
            sendEmail(u.email, `Escalation: Task overdue "${t.title}"`, `Task "${t.title}" assigned to ${t.assignedTo} is overdue and has been escalated.`);
          }
        }
      }

      // Recurring tasks: create next instance if nextDue is in past or now
      const recurring = await Task.find({
        'recurrence.enabled': true,
        'recurrence.nextDue': { $lte: new Date() }
      });

      for (const t of recurring) {
        try {
          const next = t.recurrence.nextDue ? new Date(t.recurrence.nextDue) : null;
          if (!next) continue;

          // create a copy of the task for the next occurrence
          const newTask = new Task({
            title: t.title,
            description: t.description,
            priority: t.priority,
            deadline: t.recurrence.nextDue, // next due becomes deadline for the new occurrence
            assignedBy: t.assignedBy,
            assignedTo: t.assignedTo,
            status: 'pending',
            recurrence: t.recurrence // copy recurrence; we'll update nextDue after creating
          });

          // compute next nextDue
          const freq = t.recurrence.frequency || 'weekly';
          const interval = t.recurrence.interval || 1;
          let computedNext = null;
          const base = new Date(t.recurrence.nextDue);

          if (freq === 'daily') {
            computedNext = new Date(base.getTime() + interval * 24 * 60 * 60 * 1000);
          } else if (freq === 'weekly') {
            computedNext = new Date(base.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
          } else if (freq === 'monthly') {
            computedNext = new Date(base);
            computedNext.setMonth(computedNext.getMonth() + interval);
          } else if (freq === 'yearly') {
            computedNext = new Date(base);
            computedNext.setFullYear(computedNext.getFullYear() + interval);
          } else if (freq === 'custom') {
            // simple fallback: add interval days
            computedNext = new Date(base.getTime() + interval * 24 * 60 * 60 * 1000);
          }

          // save new task and update original's nextDue
          await newTask.save();

          t.recurrence.nextDue = computedNext;
          await t.save();
        } catch (err) {
          console.error('Recurring task creation error:', err);
        }
      }

    } catch (err) {
      console.error('Cron job failed:', err);
    }
  });
};
