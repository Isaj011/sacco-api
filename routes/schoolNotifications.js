const express = require('express');
const {
    getSchoolNotifications,
    getSchoolNotification,
    createSchoolNotification,
    updateSchoolNotification,
    deleteSchoolNotification,
    sendNotification,
    scheduleNotification,
    cancelNotification,
    markAsDelivered,
    markAsRead,
    trackClick,
    getMyNotifications,
    getMyUnreadNotifications,
    addRecipient,
    removeRecipient,
    updateRecipientPreferences,
    getNotificationStatistics,
    getNotificationsByTypeAndPriority
} = require('../controllers/schoolNotificationController');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Main notification routes
router.route('/')
    .get(authorize('admin', 'manager', 'supervisor'), getSchoolNotifications)
    .post(authorize('admin', 'manager'), createSchoolNotification);

// Statistics and filtering
router.route('/stats')
    .get(authorize('admin', 'manager', 'supervisor'), getNotificationStatistics);

router.route('/filter')
    .get(authorize('admin', 'manager', 'supervisor'), getNotificationsByTypeAndPriority);

// User-specific routes
router.route('/my')
    .get(getMyNotifications);

router.route('/my/unread')
    .get(getMyUnreadNotifications);

// Individual notification routes
router.route('/:id')
    .get(authorize('admin', 'manager', 'supervisor'), getSchoolNotification)
    .put(authorize('admin', 'manager'), updateSchoolNotification)
    .delete(authorize('admin'), deleteSchoolNotification);

// Notification actions
router.route('/:id/send')
    .post(authorize('admin', 'manager'), sendNotification);

router.route('/:id/schedule')
    .post(authorize('admin', 'manager'), scheduleNotification);

router.route('/:id/cancel')
    .post(authorize('admin', 'manager'), cancelNotification);

router.route('/:id/delivered')
    .post(markAsDelivered);

router.route('/:id/read')
    .post(markAsRead);

router.route('/:id/click')
    .post(trackClick);

// Recipient management
router.route('/:id/recipients')
    .post(authorize('admin', 'manager'), addRecipient);

router.route('/:id/recipients/:userId')
    .delete(authorize('admin', 'manager'), removeRecipient);

router.route('/:id/recipients/:userId/preferences')
    .put(authorize('admin', 'manager'), updateRecipientPreferences);

module.exports = router;
