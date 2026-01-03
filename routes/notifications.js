const express = require('express');
const {
    getMyNotifications,
    getMyUnreadNotifications,
    markAsRead,
    trackClick
} = require('../controllers/schoolNotificationController');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect);

// User notification routes (global, not school-specific)
router.route('/my')
    .get(getMyNotifications);

router.route('/my/unread')
    .get(getMyUnreadNotifications);

// Notification actions
router.route('/:id/read')
    .post(markAsRead);

router.route('/:id/click')
    .post(trackClick);

module.exports = router;
