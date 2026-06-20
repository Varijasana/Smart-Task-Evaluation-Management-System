// models/hooks.js
// Attach Mongoose post-save hook to Media to auto-update Task.submission and Task.status
const Media = require('./Media');
const Task = require('./Task');

Media.schema.post('save', async function(doc) {
  try {
    if (!doc.taskId) return;
    const task = await Task.findById(doc.taskId);
    if (!task) return;

    // ensure submission object exists
    task.submission = task.submission || {};
    task.submission.submitted = true;
    task.submission.submittedAt = new Date();
    task.submission.mediaIds = task.submission.mediaIds || [];
    task.submission.mediaIds.push(doc._id);
    task.submission.submittedBy = doc.uploadedBy || task.submission.submittedBy;

    // update status ONLY when a document is submitted
    task.status = 'completed';

    await task.save();
  } catch (err) {
    console.error('Media post-save hook error:', err);
  }
});
