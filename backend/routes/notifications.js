const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware'); // Assuming you have an auth middleware

// Get all notifications for the logged-in user
router.get('/', auth, async (req, res) => {
    try {
        // Sort by newest first
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark a notification as read
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        notification.isRead = true;
        await notification.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark ALL as read
router.patch('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
