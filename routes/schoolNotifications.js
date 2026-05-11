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
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSchoolNotifications)
    .post(authorize('admin', 'staff'), createSchoolNotification);

// Statistics and filtering
router.route('/stats')
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getNotificationStatistics);

router.route('/filter')
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getNotificationsByTypeAndPriority);

// User-specific routes
router.route('/my')
    .get(getMyNotifications);

router.route('/my/unread')
    .get(getMyUnreadNotifications);

// Individual notification routes
router.route('/:id')
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSchoolNotification)
    .put(authorize('admin', 'staff'), updateSchoolNotification)
    .delete(authorize('admin'), deleteSchoolNotification);

// Notification actions
router.route('/:id/send')
    .post(authorize('admin', 'staff'), sendNotification);

router.route('/:id/schedule')
    .post(authorize('admin', 'staff'), scheduleNotification);

router.route('/:id/cancel')
    .post(authorize('admin', 'staff'), cancelNotification);

router.route('/:id/delivered')
    .post(markAsDelivered);

router.route('/:id/read')
    .post(markAsRead);

router.route('/:id/click')
    .post(trackClick);

// Recipient management
router.route('/:id/recipients')
    .post(authorize('admin', 'staff'), addRecipient);

router.route('/:id/recipients/:userId')
    .delete(authorize('admin', 'staff'), removeRecipient);

router.route('/:id/recipients/:userId/preferences')
    .put(authorize('admin', 'staff'), updateRecipientPreferences);

module.exports = router;
