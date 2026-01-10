const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const PassengerEvent = require('../models/PassengerEvent');
const Vehicle = require('../models/Vehicle');

// @desc    Receive passenger event from IoT device
// @route   POST /api/v1/events
// @access  Public (with device authentication)
exports.receiveEvent = asyncHandler(async (req, res, next) => {
    // Check if this is a batch request
    if (req.body.events && Array.isArray(req.body.events)) {
        return handleBatchEvents(req, res, next);
    }

    // Handle single event (existing logic)
    const { eventType, tripId, zoneId, zoneType, timestamp, gps, passengerCount, routeId, driverId } = req.body;

    // Validate required fields
    if (!eventType || !tripId || !timestamp || !gps) {
        return next(new ErrorResponse('Missing required fields: eventType, tripId, timestamp, gps', 400));
    }

    // Validate GPS coordinates
    if (!gps.latitude || !gps.longitude) {
        return next(new ErrorResponse('GPS coordinates are required', 400));
    }

    // Create event with device info
    const event = new PassengerEvent({
        eventType,
        tripId,
        zoneId: zoneId || null,
        zoneType: zoneType || 'UNKNOWN',
        timestamp,
        gps: {
            latitude: gps.latitude,
            longitude: gps.longitude,
            accuracy: gps.accuracy || 10.0,
            altitude: gps.altitude || null,
            speed: gps.speed || null,
            heading: gps.heading || null
        },
        deviceId: req.device?.deviceId || null,
        passengerCount: passengerCount || 1,
        routeId: routeId || null,
        driverId: driverId || null,
        rawData: JSON.stringify(req.body)
    });

    // Try to associate with vehicle if deviceId is provided
    if (req.device?.deviceId) {
        try {
            const vehicle = await Vehicle.findOne({
                $or: [
                    { deviceId: req.device.deviceId },
                    { plateNumber: req.device.deviceId }
                ]
            });

            if (vehicle) {
                event.vehicleId = vehicle._id;

                // Update vehicle location for trip events
                if (['TRIP_STARTED', 'TRIP_ENDED', 'STOP_REACHED'].includes(eventType)) {
                    vehicle.currentLocation = {
                        latitude: gps.latitude,
                        longitude: gps.longitude,
                        updatedAt: new Date()
                    };
                    await vehicle.save();
                }
            }
        } catch (error) {
            console.error('Error finding vehicle:', error);
            // Don't fail the event submission if vehicle lookup fails
        }
    }

    // Save event
    await event.save();

    // Broadcast real-time event if WebSocket is available
    if (req.app.get('broadcastToSchool') && event.vehicleId) {
        try {
            req.app.get('broadcastToSchool')(event.vehicleId, {
                type: 'PASSENGER_EVENT',
                eventType,
                tripId,
                zoneId,
                gps,
                timestamp: event.timestamp,
                passengerCount
            });
        } catch (error) {
            console.error('Error broadcasting passenger event:', error);
        }
    }

    console.log(`🚌 Passenger Event: ${eventType} for trip ${tripId} at ${gps.latitude}, ${gps.longitude}`);

    res.status(201).json({
        success: true,
        data: {
            id: event._id,
            eventType: event.eventType,
            tripId: event.tripId,
            timestamp: event.timestamp,
            receivedAt: event.receivedAt,
            deviceId: event.deviceId
        },
        message: 'Event received successfully'
    });
});

// Handle batch events from Android devices
const handleBatchEvents = asyncHandler(async (req, res, next) => {
    const { events, vehicleId, batchTimestamp } = req.body;

    // Validate batch structure
    if (!events || !Array.isArray(events) || events.length === 0) {
        return next(new ErrorResponse('Batch must contain at least one event', 400));
    }

    const processedEvents = [];
    const errors = [];

    // Process each event in the batch
    for (let i = 0; i < events.length; i++) {
        const eventData = events[i];

        try {
            // Validate required fields for each event
            if (!eventData.eventType || !eventData.tripId || !eventData.timestamp || !eventData.gps) {
                errors.push(`Event ${i}: Missing required fields`);
                continue;
            }

            // Validate GPS coordinates
            if (!eventData.gps.latitude || !eventData.gps.longitude) {
                errors.push(`Event ${i}: Invalid GPS coordinates`);
                continue;
            }

            // Create event with device info
            const event = new PassengerEvent({
                eventType: eventData.eventType,
                tripId: eventData.tripId,
                zoneId: eventData.zoneId || null,
                zoneType: eventData.zoneType || 'UNKNOWN',
                timestamp: eventData.timestamp,
                gps: {
                    latitude: eventData.gps.latitude,
                    longitude: eventData.gps.longitude,
                    accuracy: eventData.gps.accuracy || 10.0,
                    altitude: eventData.gps.altitude || null,
                    speed: eventData.gps.speed || null,
                    heading: eventData.gps.heading || null
                },
                deviceId: req.device?.deviceId || null,
                passengerCount: eventData.passengerCount || 1,
                routeId: eventData.routeId || null,
                driverId: eventData.driverId || null,
                vehicleId: vehicleId || eventData.vehicleId || null,
                rawData: JSON.stringify(eventData)
            });

            // Try to associate with vehicle if deviceId is provided
            if (req.device?.deviceId) {
                try {
                    const vehicle = await Vehicle.findOne({
                        $or: [
                            { deviceId: req.device.deviceId },
                            { plateNumber: req.device.deviceId }
                        ]
                    });

                    if (vehicle) {
                        event.vehicleId = vehicle._id;
                    }
                } catch (error) {
                    console.error('Error finding vehicle:', error);
                }
            }

            await event.save();
            processedEvents.push({
                id: event._id,
                eventType: event.eventType,
                tripId: event.tripId,
                timestamp: event.timestamp
            });

        } catch (error) {
            errors.push(`Event ${i}: ${error.message}`);
        }
    }

    // Broadcast real-time events if WebSocket is available
    if (req.app.get('broadcastToSchool') && processedEvents.length > 0) {
        try {
            processedEvents.forEach(event => {
                req.app.get('broadcastToSchool')(event.vehicleId, {
                    type: 'PASSENGER_EVENT_BATCH',
                    batchId: batchTimestamp || Date.now(),
                    eventCount: processedEvents.length,
                    timestamp: new Date()
                });
            });
        } catch (error) {
            console.error('Error broadcasting batch events:', error);
        }
    }

    console.log(`🚌 Batch Events: ${processedEvents.length} processed, ${errors.length} errors`);

    res.status(201).json({
        success: true,
        message: 'Batch events processed',
        processedCount: processedEvents.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
    });
});

// @desc    Get events by trip ID
// @route   GET /api/v1/events/trip/:tripId
// @access  Private
exports.getTripEvents = asyncHandler(async (req, res, next) => {
    const { tripId } = req.params;
    const { limit = 100, page = 1 } = req.query;

    const events = await PassengerEvent.find({ tripId })
        .sort({ timestamp: 1 })
        .limit(parseInt(limit))
        .skip((page - 1) * limit)
        .populate('vehicleId', 'plateNumber vehicleModel');

    const total = await PassengerEvent.countDocuments({ tripId });

    res.status(200).json({
        success: true,
        count: events.length,
        total,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        },
        data: events
    });
});

// @desc    Get recent events
// @route   GET /api/v1/events
// @access  Private
exports.getRecentEvents = asyncHandler(async (req, res, next) => {
    const { limit = 50, page = 1, eventType, deviceId } = req.query;

    // Build query
    const query = {};
    if (eventType) query.eventType = eventType;
    if (deviceId) query.deviceId = deviceId;

    const events = await PassengerEvent.find(query)
        .sort({ receivedAt: -1 })
        .limit(parseInt(limit))
        .skip((page - 1) * limit)
        .populate('vehicleId', 'plateNumber vehicleModel');

    const total = await PassengerEvent.countDocuments(query);

    res.status(200).json({
        success: true,
        count: events.length,
        total,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        },
        data: events
    });
});

// @desc    Get trip statistics
// @route   GET /api/v1/events/trip/:tripId/stats
// @access  Private
exports.getTripStatistics = asyncHandler(async (req, res, next) => {
    const { tripId } = req.params;

    const stats = await PassengerEvent.getTripStatistics(tripId);

    res.status(200).json({
        success: true,
        tripId,
        data: stats
    });
});

// @desc    Get active trips
// @route   GET /api/v1/events/trips/active
// @access  Private
exports.getActiveTrips = asyncHandler(async (req, res, next) => {
    const { hours = 24 } = req.query;

    const activeTrips = await PassengerEvent.getActiveTrips(parseInt(hours));

    res.status(200).json({
        success: true,
        hours: parseInt(hours),
        count: activeTrips.length,
        data: activeTrips
    });
});

// @desc    Get passenger count analytics
// @route   GET /api/v1/events/analytics/passengers
// @access  Private
exports.getPassengerAnalytics = asyncHandler(async (req, res, next) => {
    const { period = '24h', vehicleId } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
        case '1h':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
        case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build query
    const query = {
        timestamp: { $gte: startDate.getTime() },
        eventType: { $in: ['PASSENGER_SEATED', 'PASSENGER_BOARDED', 'PASSENGER_ALIGHTED'] }
    };

    if (vehicleId) {
        query.vehicleId = vehicleId;
    }

    const analytics = await PassengerEvent.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$eventType',
                count: { $sum: '$passengerCount' },
                trips: { $addToSet: '$tripId' },
                uniqueDevices: { $addToSet: '$deviceId' }
            }
        },
        {
            $addFields: {
                tripCount: { $size: '$trips' },
                deviceCount: { $size: '$uniqueDevices' }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Get hourly breakdown
    const hourlyBreakdown = await PassengerEvent.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    hour: { $hour: { $toDate: '$timestamp' } },
                    eventType: '$eventType'
                },
                count: { $sum: '$passengerCount' }
            }
        },
        { $sort: { '_id.hour': 1, '_id.eventType': 1 } }
    ]);

    res.status(200).json({
        success: true,
        period,
        startDate,
        endDate: now,
        data: {
            summary: analytics,
            hourlyBreakdown
        }
    });
});

// @desc    Health check for events service
// @route   GET /api/v1/events/health
// @access  Public
exports.getEventsHealth = asyncHandler(async (req, res, next) => {
    const now = Date.now();
    const last5Minutes = now - (5 * 60 * 1000);
    const last1Hour = now - (60 * 60 * 1000);

    const [
        recentEvents,
        hourlyEvents,
        activeTrips,
        totalEvents
    ] = await Promise.all([
        PassengerEvent.countDocuments({ receivedAt: { $gte: new Date(last5Minutes) } }),
        PassengerEvent.countDocuments({ receivedAt: { $gte: new Date(last1Hour) } }),
        PassengerEvent.getActiveTrips(1),
        PassengerEvent.countDocuments()
    ]);

    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date(),
        metrics: {
            eventsLast5Minutes: recentEvents,
            eventsLastHour: hourlyEvents,
            activeTrips: activeTrips.length,
            totalEvents,
            averageEventsPerMinute: hourlyEvents / 60
        }
    });
});
