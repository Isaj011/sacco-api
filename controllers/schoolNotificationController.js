const SchoolNotification = require('../models/SchoolNotification');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all notifications for a school
// @route   GET /api/v1/schools/:schoolId/notifications
// @access  Private
exports.getSchoolNotifications = asyncHandler(async (req, res, next) => {
    const { type, priority, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Build query
    const query = { school: req.params.schoolId };

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (status) query.status = status;

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await SchoolNotification.find(query)
        .populate('recipients.user', 'firstName lastName email role')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await SchoolNotification.countDocuments(query);

    res.status(200).json({
        success: true,
        count: notifications.length,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        data: notifications
    });
});

// @desc    Get single notification
// @route   GET /api/v1/notifications/:id
// @access  Private
exports.getSchoolNotification = asyncHandler(async (req, res, next) => {
    const notification = await SchoolNotification.findById(req.params.id)
        .populate('school', 'name code')
        .populate('recipients.user', 'firstName lastName email role')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .populate('relatedEntities.entityId', 'name');

    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: notification
    });
});

// @desc    Create a new notification
// @route   POST /api/v1/schools/:schoolId/notifications
// @access  Private
exports.createSchoolNotification = asyncHandler(async (req, res, next) => {
    req.body.school = req.params.schoolId;
    req.body.createdBy = req.user.id;

    // Validate recipients
    if (!req.body.recipients || req.body.recipients.length === 0) {
        return next(new ErrorResponse('At least one recipient is required', 400));
    }

    // Validate that all recipients exist and belong to the school
    const recipientIds = req.body.recipients.map(r => r.user);
    const users = await User.find({
        _id: { $in: recipientIds },
        // Note: You might need to add school field to User model for this validation
    });

    if (users.length !== recipientIds.length) {
        return next(new ErrorResponse('Some recipients not found', 400));
    }

    const notification = await SchoolNotification.create(req.body);

    // Populate the response
    const populatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role')
        .populate('createdBy', 'firstName lastName');

    res.status(201).json({
        success: true,
        data: populatedNotification
    });
});

// @desc    Update a notification
// @route   PUT /api/v1/notifications/:id
// @access  Private
exports.updateSchoolNotification = asyncHandler(async (req, res, next) => {
    let notification = await SchoolNotification.findById(req.params.id);

    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    // Check if notification can be updated
    if (notification.status === 'sent' || notification.status === 'delivered') {
        return next(new ErrorResponse(`Cannot update ${notification.status} notification`, 400));
    }

    req.body.updatedBy = req.user.id;
    notification = await SchoolNotification.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate('recipients.user', 'firstName lastName email role')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');

    res.status(200).json({
        success: true,
        data: notification
    });
});

// @desc    Delete a notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteSchoolNotification = asyncHandler(async (req, res, next) => {
    const notification = await SchoolNotification.findById(req.params.id);

    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    // Check if notification can be deleted
    if (notification.status === 'sent') {
        return next(new ErrorResponse('Cannot delete sent notification', 400));
    }

    await notification.remove();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Send notification
// @route   POST /api/v1/notifications/:id/send
// @access  Private
exports.sendNotification = asyncHandler(async (req, res, next) => {
    const notification = await SchoolNotification.findById(req.params.id);

    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    if (notification.status === 'sent' || notification.status === 'delivered') {
        return next(new ErrorResponse('Notification already sent', 400));
    }

    await notification.send();

    const updatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role');

    res.status(200).json({
        success: true,
        data: updatedNotification,
        message: 'Notification sent successfully'
    });
});

// @desc    Schedule notification
// @route   POST /api/v1/notifications/:id/schedule
// @access  Private
exports.scheduleNotification = asyncHandler(async (req, res, next) => {
    const { scheduledDate } = req.body;

    const notification = await SchoolNotification.findById(req.params.id);
    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    await notification.schedule(scheduledDate);

    const updatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role');

    res.status(200).json({
        success: true,
        data: updatedNotification,
        message: 'Notification scheduled successfully'
    });
});

// @desc    Cancel notification
// @route   POST /api/v1/notifications/:id/cancel
// @access  Private
exports.cancelNotification = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    const notification = await SchoolNotification.findById(req.params.id);
    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    if (notification.status === 'cancelled' || notification.status === 'expired') {
        return next(new ErrorResponse('Notification already cancelled or expired', 400));
    }

    await notification.cancel(reason, req.user.id);

    const updatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role');

    res.status(200).json({
        success: true,
        data: updatedNotification,
        message: 'Notification cancelled successfully'
    });
});

// @desc    Mark notification as delivered
// @route   POST /api/v1/notifications/:id/delivered
// @access  Private
exports.markAsDelivered = asyncHandler(async (req, res, next) => {
    const { userId, method, messageId } = req.body;

    const notification = await SchoolNotification.findById(req.params.id);
    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    await notification.markAsDelivered(userId, method, messageId);

    const updatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role');

    res.status(200).json({
        success: true,
        data: updatedNotification,
        message: 'Notification marked as delivered'
    });
});

// @desc    Mark notification as read
// @route   POST /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
    const { method } = req.body;

    const notification = await SchoolNotification.findById(req.params.id);
    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    await notification.markAsRead(req.user.id, method);

    const updatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role');

    res.status(200).json({
        success: true,
        data: updatedNotification,
        message: 'Notification marked as read'
    });
});

// @desc    Track notification click
// @route   POST /api/v1/notifications/:id/click
// @access  Private
exports.trackClick = asyncHandler(async (req, res, next) => {
    const { action } = req.body;

    const notification = await SchoolNotification.findById(req.params.id);
    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    await notification.trackClick(req.user.id, action);

    res.status(200).json({
        success: true,
        message: 'Click tracked successfully'
    });
});

// @desc    Get notifications for current user
// @route   GET /api/v1/notifications/my
// @access  Private
exports.getMyNotifications = asyncHandler(async (req, res, next) => {
    const { status, limit = 50 } = req.query;

    const notifications = await SchoolNotification.findByRecipient(
        req.user.id,
        status,
        parseInt(limit)
    );

    res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications
    });
});

// @desc    Get unread notifications for current user
// @route   GET /api/v1/notifications/my/unread
// @access  Private
exports.getMyUnreadNotifications = asyncHandler(async (req, res, next) => {
    const { limit = 50 } = req.query;

    const notifications = await SchoolNotification.findUnreadByRecipient(
        req.user.id,
        parseInt(limit)
    );

    res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications
    });
});

// @desc    Add recipient to notification
// @route   POST /api/v1/notifications/:id/recipients
// @access  Private
exports.addRecipient = asyncHandler(async (req, res, next) => {
    const { userId, role, preferences } = req.body;

    const notification = await SchoolNotification.findById(req.params.id);
    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    if (notification.status === 'sent') {
        return next(new ErrorResponse('Cannot add recipients to sent notification', 400));
    }

    await notification.addRecipient(userId, role, preferences);

    const updatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role');

    res.status(200).json({
        success: true,
        data: updatedNotification,
        message: 'Recipient added successfully'
    });
});

// @desc    Remove recipient from notification
// @route   DELETE /api/v1/notifications/:id/recipients/:userId
// @access  Private
exports.removeRecipient = asyncHandler(async (req, res, next) => {
    const notification = await SchoolNotification.findById(req.params.id);
    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    if (notification.status === 'sent') {
        return next(new ErrorResponse('Cannot remove recipients from sent notification', 400));
    }

    await notification.removeRecipient(req.params.userId);

    const updatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role');

    res.status(200).json({
        success: true,
        data: updatedNotification,
        message: 'Recipient removed successfully'
    });
});

// @desc    Update recipient preferences
// @route   PUT /api/v1/notifications/:id/recipients/:userId/preferences
// @access  Private
exports.updateRecipientPreferences = asyncHandler(async (req, res, next) => {
    const { preferences } = req.body;

    const notification = await SchoolNotification.findById(req.params.id);
    if (!notification) {
        return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }

    await notification.updateRecipientPreferences(req.params.userId, preferences);

    const updatedNotification = await SchoolNotification.findById(notification._id)
        .populate('recipients.user', 'firstName lastName email role');

    res.status(200).json({
        success: true,
        data: updatedNotification,
        message: 'Recipient preferences updated successfully'
    });
});

// @desc    Get notification statistics
// @route   GET /api/v1/schools/:schoolId/notifications/stats
// @access  Private
exports.getNotificationStatistics = asyncHandler(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
        dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
    } else {
        // Default to last 30 days
        dateFilter = {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };
    }

    const stats = await SchoolNotification.aggregate([
        {
            $match: {
                school: mongoose.Types.ObjectId(req.params.schoolId),
                createdAt: dateFilter
            }
        },
        {
            $group: {
                _id: null,
                totalNotifications: { $sum: 1 },
                sentNotifications: {
                    $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
                },
                deliveredNotifications: {
                    $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                },
                scheduledNotifications: {
                    $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
                },
                cancelledNotifications: {
                    $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                },
                totalRecipients: { $sum: { $size: '$recipients' } },
                byType: {
                    $push: {
                        type: '$type',
                        count: 1
                    }
                },
                byPriority: {
                    $push: {
                        priority: '$priority',
                        count: 1
                    }
                }
            }
        }
    ]);

    const result = stats[0] || {
        totalNotifications: 0,
        sentNotifications: 0,
        deliveredNotifications: 0,
        scheduledNotifications: 0,
        cancelledNotifications: 0,
        totalRecipients: 0,
        byType: [],
        byPriority: []
    };

    // Process byType and byPriority data
    const typeStats = {};
    result.byType.forEach(item => {
        if (!typeStats[item.type]) {
            typeStats[item.type] = 0;
        }
        typeStats[item.type] += 1;
    });
    result.byType = typeStats;

    const priorityStats = {};
    result.byPriority.forEach(item => {
        if (!priorityStats[item.priority]) {
            priorityStats[item.priority] = 0;
        }
        priorityStats[item.priority] += 1;
    });
    result.byPriority = priorityStats;

    // Calculate delivery and read rates
    const deliveryRate = result.totalNotifications > 0 ?
        (result.deliveredNotifications / result.totalNotifications) * 100 : 0;

    res.status(200).json({
        success: true,
        data: {
            ...result,
            deliveryRate: Math.round(deliveryRate * 100) / 100
        }
    });
});

// @desc    Get notifications by type and priority
// @route   GET /api/v1/schools/:schoolId/notifications/filter
// @access  Private
exports.getNotificationsByTypeAndPriority = asyncHandler(async (req, res, next) => {
    const { type, priority, startDate, endDate } = req.query;

    const notifications = await SchoolNotification.findByTypeAndPriority(
        req.params.schoolId,
        type,
        priority,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
    );

    res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications
    });
});
