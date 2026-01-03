const School = require('../models/School');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get real-time updates for a school
// @route   GET /api/v1/schools/:id/real-time
// @access  Private/Admin
const getRealTimeUpdates = asyncHandler(async (req, res, next) => {
    const school = await School.findById(req.params.id)
        .populate('activeDrivers', 'name phone')
        .populate('activeVehicles', 'registrationNumber status');

    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: {
            activeDrivers: school.activeDrivers,
            activeVehicles: school.activeVehicles,
            lastUpdated: Date.now()
        }
    });
});

// @desc    Send notification to school
// @route   POST /api/v1/schools/:id/notifications
// @access  Private/Admin
const sendNotification = asyncHandler(async (req, res, next) => {
    const school = await School.findById(req.params.id);

    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.id}`, 404)
        );
    }

    const { message, type = 'info' } = req.body;

    // Broadcast to WebSocket clients
    const wss = req.app.get('wss');
    wss.broadcastToSchool(school._id.toString(), {
        type: 'NOTIFICATION',
        data: { message, type, timestamp: new Date() }
    });

    res.status(200).json({
        success: true,
        data: { message: 'Notification sent successfully' }
    });
});

module.exports = {
    getRealTimeUpdates,
    sendNotification
};
