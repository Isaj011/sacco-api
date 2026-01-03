const SchoolTrip = require('../models/SchoolTrip');
const SchoolRoute = require('../models/SchoolRoute');
const SchoolVehicle = require('../models/SchoolVehicle');
const SchoolDriver = require('../models/SchoolDriver');
const SchoolStudent = require('../models/SchoolStudent');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all trips for a school
// @route   GET /api/v1/schools/:schoolId/trips
// @access  Private
exports.getSchoolTrips = asyncHandler(async (req, res, next) => {
    const { date, status, tripType, route, vehicle, driver } = req.query;

    // Build query
    const query = { school: req.params.schoolId };

    if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        query.date = { $gte: startDate, $lt: endDate };
    }

    if (status) query.status = status;
    if (tripType) query.tripType = tripType;
    if (route) query.route = route;
    if (vehicle) query.vehicle = vehicle;
    if (driver) query.driver = driver;

    const trips = await SchoolTrip.find(query)
        .populate('route', 'name routeId')
        .populate('vehicle', 'registrationNumber make model')
        .populate('driver', 'firstName lastName driverId')
        .populate('enrolledStudents.student', 'firstName lastName admissionNumber')
        .sort({ date: -1, scheduledStartTime: -1 });

    res.status(200).json({
        success: true,
        count: trips.length,
        data: trips
    });
});

// @desc    Get single trip
// @route   GET /api/v1/trips/:id
// @access  Private
exports.getSchoolTrip = asyncHandler(async (req, res, next) => {
    const trip = await SchoolTrip.findById(req.params.id)
        .populate('school', 'name code')
        .populate('route', 'name routeId stops')
        .populate('vehicle', 'registrationNumber make model capacity')
        .populate('driver', 'firstName lastName driverId contact.phone')
        .populate('enrolledStudents.student', 'firstName lastName admissionNumber parents')
        .populate('enrolledStudents.pickupStop', 'name address')
        .populate('enrolledStudents.dropOffStop', 'name address')
        .populate('stops.stop', 'name address')
        .populate('events.reportedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');

    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: trip
    });
});

// @desc    Create a new trip
// @route   POST /api/v1/schools/:schoolId/trips
// @access  Private
exports.createSchoolTrip = asyncHandler(async (req, res, next) => {
    req.body.school = req.params.schoolId;

    // Validate that route, vehicle, and driver belong to the school
    const route = await SchoolRoute.findOne({ _id: req.body.route, school: req.params.schoolId });
    if (!route) {
        return next(new ErrorResponse(`Route not found in this school`, 404));
    }

    const vehicle = await SchoolVehicle.findOne({ _id: req.body.vehicle, school: req.params.schoolId });
    if (!vehicle) {
        return next(new ErrorResponse(`Vehicle not found in this school`, 404));
    }

    const driver = await SchoolDriver.findOne({ _id: req.body.driver, school: req.params.schoolId });
    if (!driver) {
        return next(new ErrorResponse(`Driver not found in this school`, 404));
    }

    // If enrolled students are provided, validate they belong to the school
    if (req.body.enrolledStudents && req.body.enrolledStudents.length > 0) {
        const studentIds = req.body.enrolledStudents.map(s => s.student);
        const students = await SchoolStudent.find({
            _id: { $in: studentIds },
            school: req.params.schoolId
        });

        if (students.length !== studentIds.length) {
            return next(new ErrorResponse(`Some students not found in this school`, 400));
        }
    }

    const trip = await SchoolTrip.create(req.body);

    // Populate the response
    const populatedTrip = await SchoolTrip.findById(trip._id)
        .populate('route', 'name routeId')
        .populate('vehicle', 'registrationNumber make model')
        .populate('driver', 'firstName lastName driverId')
        .populate('enrolledStudents.student', 'firstName lastName admissionNumber');

    res.status(201).json({
        success: true,
        data: populatedTrip
    });
});

// @desc    Update a trip
// @route   PUT /api/v1/trips/:id
// @access  Private
exports.updateSchoolTrip = asyncHandler(async (req, res, next) => {
    let trip = await SchoolTrip.findById(req.params.id);

    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    // Check if trip can be updated (not completed or cancelled)
    if (trip.status === 'completed' || trip.status === 'cancelled') {
        return next(new ErrorResponse(`Cannot update ${trip.status} trip`, 400));
    }

    trip = await SchoolTrip.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate('route', 'name routeId')
        .populate('vehicle', 'registrationNumber make model')
        .populate('driver', 'firstName lastName driverId')
        .populate('enrolledStudents.student', 'firstName lastName admissionNumber');

    res.status(200).json({
        success: true,
        data: trip
    });
});

// @desc    Delete a trip
// @route   DELETE /api/v1/trips/:id
// @access  Private
exports.deleteSchoolTrip = asyncHandler(async (req, res, next) => {
    const trip = await SchoolTrip.findById(req.params.id);

    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    // Check if trip can be deleted (not started)
    if (trip.status === 'in_progress' || trip.status === 'completed') {
        return next(new ErrorResponse(`Cannot delete ${trip.status} trip`, 400));
    }

    await trip.remove();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Start a trip
// @route   POST /api/v1/trips/:id/start
// @access  Private
exports.startTrip = asyncHandler(async (req, res, next) => {
    const { startTime, location } = req.body;

    const trip = await SchoolTrip.findById(req.params.id);
    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    if (trip.status !== 'scheduled') {
        return next(new ErrorResponse(`Trip must be scheduled to start`, 400));
    }

    await trip.startTrip(startTime ? new Date(startTime) : new Date(), location);

    const updatedTrip = await SchoolTrip.findById(trip._id)
        .populate('route', 'name routeId')
        .populate('vehicle', 'registrationNumber make model')
        .populate('driver', 'firstName lastName driverId');

    res.status(200).json({
        success: true,
        data: updatedTrip,
        message: 'Trip started successfully'
    });
});

// @desc    End a trip
// @route   POST /api/v1/trips/:id/end
// @access  Private
exports.endTrip = asyncHandler(async (req, res, next) => {
    const { endTime, location } = req.body;

    const trip = await SchoolTrip.findById(req.params.id);
    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    if (trip.status !== 'in_progress') {
        return next(new ErrorResponse(`Trip must be in progress to end`, 400));
    }

    await trip.endTrip(endTime ? new Date(endTime) : new Date(), location);

    const updatedTrip = await SchoolTrip.findById(trip._id)
        .populate('route', 'name routeId')
        .populate('vehicle', 'registrationNumber make model')
        .populate('driver', 'firstName lastName driverId');

    res.status(200).json({
        success: true,
        data: updatedTrip,
        message: 'Trip ended successfully'
    });
});

// @desc    Pick up student
// @route   POST /api/v1/trips/:id/pickup
// @access  Private
exports.pickupStudent = asyncHandler(async (req, res, next) => {
    const { studentId, stopId, pickupTime, method } = req.body;

    const trip = await SchoolTrip.findById(req.params.id);
    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    if (trip.status !== 'in_progress') {
        return next(new ErrorResponse(`Trip must be in progress to pick up students`, 400));
    }

    await trip.pickupStudent(
        studentId,
        stopId,
        pickupTime ? new Date(pickupTime) : new Date(),
        method
    );

    const updatedTrip = await SchoolTrip.findById(trip._id)
        .populate('enrolledStudents.student', 'firstName lastName admissionNumber');

    res.status(200).json({
        success: true,
        data: updatedTrip,
        message: 'Student picked up successfully'
    });
});

// @desc    Drop off student
// @route   POST /api/v1/trips/:id/dropoff
// @access  Private
exports.dropOffStudent = asyncHandler(async (req, res, next) => {
    const { studentId, stopId, dropOffTime, method, receivedBy, receivedByPhone } = req.body;

    const trip = await SchoolTrip.findById(req.params.id);
    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    if (trip.status !== 'in_progress') {
        return next(new ErrorResponse(`Trip must be in progress to drop off students`, 400));
    }

    await trip.dropOffStudent(
        studentId,
        stopId,
        dropOffTime ? new Date(dropOffTime) : new Date(),
        method,
        receivedBy,
        receivedByPhone
    );

    const updatedTrip = await SchoolTrip.findById(trip._id)
        .populate('enrolledStudents.student', 'firstName lastName admissionNumber');

    res.status(200).json({
        success: true,
        data: updatedTrip,
        message: 'Student dropped off successfully'
    });
});

// @desc    Add trip event
// @route   POST /api/v1/trips/:id/events
// @access  Private
exports.addTripEvent = asyncHandler(async (req, res, next) => {
    const { eventType, description, severity, location, metadata } = req.body;

    const trip = await SchoolTrip.findById(req.params.id);
    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    await trip.addEvent(eventType, description, severity, location, req.user.id, metadata);

    const updatedTrip = await SchoolTrip.findById(trip._id)
        .populate('events.reportedBy', 'firstName lastName');

    res.status(200).json({
        success: true,
        data: updatedTrip,
        message: 'Event added successfully'
    });
});

// @desc    Add delay to trip
// @route   POST /api/v1/trips/:id/delay
// @access  Private
exports.addTripDelay = asyncHandler(async (req, res, next) => {
    const { reason, duration, location } = req.body;

    const trip = await SchoolTrip.findById(req.params.id);
    if (!trip) {
        return next(new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404));
    }

    await trip.addDelay(reason, duration, location);

    const updatedTrip = await SchoolTrip.findById(trip._id);

    res.status(200).json({
        success: true,
        data: updatedTrip,
        message: 'Delay added successfully'
    });
});

// @desc    Get trip statistics
// @route   GET /api/v1/schools/:schoolId/trips/stats
// @access  Private
exports.getTripStatistics = asyncHandler(async (req, res, next) => {
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

    const stats = await SchoolTrip.aggregate([
        {
            $match: {
                school: mongoose.Types.ObjectId(req.params.schoolId),
                date: dateFilter
            }
        },
        {
            $group: {
                _id: null,
                totalTrips: { $sum: 1 },
                completedTrips: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                cancelledTrips: {
                    $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                },
                delayedTrips: {
                    $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] }
                },
                totalStudentsTransported: { $sum: '$attendance.totalDroppedOff' },
                averageTripDuration: { $avg: '$metrics.totalDuration' },
                averageDistance: { $avg: '$metrics.totalDistance' },
                totalDelays: { $sum: { $size: '$metrics.delays' } },
                byType: {
                    $push: {
                        type: '$tripType',
                        count: 1
                    }
                }
            }
        }
    ]);

    const result = stats[0] || {
        totalTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        delayedTrips: 0,
        totalStudentsTransported: 0,
        averageTripDuration: 0,
        averageDistance: 0,
        totalDelays: 0,
        byType: []
    };

    // Process byType data
    const typeStats = {};
    result.byType.forEach(item => {
        if (!typeStats[item.type]) {
            typeStats[item.type] = 0;
        }
        typeStats[item.type] += 1;
    });
    result.byType = typeStats;

    res.status(200).json({
        success: true,
        data: result
    });
});

// @desc    Get active trips
// @route   GET /api/v1/schools/:schoolId/trips/active
// @access  Private
exports.getActiveTrips = asyncHandler(async (req, res, next) => {
    const trips = await SchoolTrip.find({
        school: req.params.schoolId,
        status: 'in_progress'
    })
        .populate('route', 'name routeId')
        .populate('vehicle', 'registrationNumber make model currentLocation')
        .populate('driver', 'firstName lastName contact.phone')
        .populate('enrolledStudents.student', 'firstName lastName admissionNumber')
        .sort({ actualStartTime: -1 });

    res.status(200).json({
        success: true,
        count: trips.length,
        data: trips
    });
});
