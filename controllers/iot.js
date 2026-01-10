const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const IoT = require('../models/IoT');
const Vehicle = require('../models/Vehicle');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');
const {
    updateVehicleLocation,
    updateVehicleStatus,
    generateEventsFromSensorData,
    broadcastIoTUpdate,
    processDeviceHealth
} = require('../services/iotProcessingService');
const {
    processRouteIoTData
} = require('../services/routeIoTService');
const {
    processScheduleIoTData
} = require('../services/scheduleIoTService');

// @desc    Receive IoT data from device
// @route   POST /api/v1/iot/data
// @access  Public (with device authentication)
exports.receiveIoTData = asyncHandler(async (req, res, next) => {
    // Check if this is Android simulation data
    if (req.body.events && Array.isArray(req.body.events) && req.body.source === 'android_simulation') {
        return handleAndroidSimulation(req, res, next);
    }

    // Handle standard IoT data with enhanced processing
    const { deviceId, location, sensorData, deviceStatus, vehicleStatus } = req.body;

    // For development/testing, allow any device to send data
    // No device registration required - just process the data

    // Find associated vehicle if vehicleId is provided
    let vehicle = null;
    if (vehicleStatus && vehicleStatus.vehicleId) {
        vehicle = await Vehicle.findById(vehicleStatus.vehicleId);
    }

    let eventsGenerated = [];
    let locationUpdated = false;
    let statusUpdated = false;
    let alerts = [];
    let routeUpdates = {};
    let scheduleUpdates = {};

    // 1. Update vehicle location if provided
    if (vehicle && location) {
        await updateVehicleLocation(vehicle._id, location, deviceId);
        locationUpdated = true;
    }

    // 2. Process sensor data and generate passenger events
    if (sensorData) {
        eventsGenerated = await generateEventsFromSensorData(deviceId, sensorData, location);
    }

    // 3. Update vehicle status if provided
    if (vehicle && vehicleStatus) {
        await updateVehicleStatus(vehicle._id, vehicleStatus, deviceId);
        statusUpdated = true;
    }

    // 4. Process device health and generate alerts
    if (deviceStatus) {
        alerts = await processDeviceHealth(deviceId, deviceStatus);
    }

    // 5. Process route-related IoT data
    if (vehicle) {
        routeUpdates = await processRouteIoTData(deviceId, {
            location,
            sensorData,
            deviceStatus,
            vehicleStatus
        });
    }

    // 6. Process schedule-related IoT data
    if (vehicle) {
        scheduleUpdates = await processScheduleIoTData(deviceId, {
            location,
            sensorData,
            deviceStatus,
            vehicleStatus
        });
    }

    // 7. Combine all alerts
    const allAlerts = [...alerts, ...(routeUpdates.alerts || [])];

    // 8. Store IoT data with enhanced metadata
    const iotData = await IoT.create({
        deviceId,
        deviceType: 'MULTI_SENSOR',
        location: location || {},
        sensorData: sensorData || {},
        deviceStatus: deviceStatus || {},
        vehicleId: vehicle ? vehicle._id : null,
        processedEvents: eventsGenerated.length,
        generatedAlerts: allAlerts.length,
        routeUpdates: Object.keys(routeUpdates).length,
        scheduleUpdates: Object.keys(scheduleUpdates).length,
        dataSource: 'HTTP_POST',
        rawData: JSON.stringify(req.body)
    });

    // 9. Broadcast comprehensive real-time updates
    const io = req.app.get('io');
    await broadcastIoTUpdate(vehicle ? vehicle._id : null, {
        deviceId,
        location,
        sensorData,
        eventsGenerated: eventsGenerated.length,
        alerts: allAlerts,
        routeUpdates,
        scheduleUpdates,
        timestamp: new Date()
    }, io);

    console.log(`📱 Comprehensive IoT Processing: Device ${deviceId}`);
    console.log(`   Events: ${eventsGenerated.length} | Location: ${locationUpdated ? '✅' : '❌'} | Status: ${statusUpdated ? '✅' : '❌'}`);
    console.log(`   Route Updates: ${Object.keys(routeUpdates).length} | Schedule Updates: ${Object.keys(scheduleUpdates).length} | Alerts: ${allAlerts.length}`);

    res.status(201).json({
        success: true,
        message: 'IoT data processed successfully across all systems',
        data: {
            deviceId,
            eventsGenerated: eventsGenerated.length,
            locationUpdated,
            statusUpdated,
            routeUpdates: Object.keys(routeUpdates).length,
            scheduleUpdates: Object.keys(scheduleUpdates).length,
            alertsGenerated: allAlerts.length,
            vehicleId: vehicle ? vehicle._id : null,
            timestamp: new Date().toISOString(),
            systemsAffected: [
                ...(locationUpdated ? ['Vehicle Location'] : []),
                ...(eventsGenerated.length > 0 ? ['Passenger Events'] : []),
                ...(Object.keys(routeUpdates).length > 0 ? ['Route Management'] : []),
                ...(Object.keys(scheduleUpdates).length > 0 ? ['Schedule Management'] : []),
                ...(allAlerts.length > 0 ? ['Alert System'] : [])
            ]
        }
    });
});

// Handle Android simulation data
const handleAndroidSimulation = asyncHandler(async (req, res, next) => {
    const { events, vehicleId, simulationTimestamp, source } = req.body;

    // Validate simulation structure
    if (!events || !Array.isArray(events) || events.length === 0) {
        return next(new ErrorResponse('Simulation must contain at least one event', 400));
    }

    const processedEvents = [];
    const errors = [];

    // Process each simulation event
    for (let i = 0; i < events.length; i++) {
        const eventData = events[i];

        try {
            // Create IoT entry for simulation event
            const iotData = new IoT({
                deviceId: `android_sim_${vehicleId}`,
                deviceType: 'MULTI_SENSOR',
                vehicleId: vehicleId,
                location: {
                    latitude: eventData.gps?.latitude,
                    longitude: eventData.gps?.longitude,
                    altitude: eventData.gps?.altitude,
                    accuracy: eventData.gps?.accuracy,
                    speed: eventData.gps?.speed,
                    heading: eventData.gps?.heading
                },
                sensorData: {
                    eventType: eventData.eventType,
                    tripId: eventData.tripId,
                    zoneId: eventData.zoneId,
                    zoneType: eventData.zoneType,
                    passengerCount: eventData.passengerCount || 1,
                    simulationData: true
                },
                deviceStatus: {
                    isActive: true,
                    batteryLevel: 100,
                    signalStrength: 5,
                    lastSeen: new Date()
                },
                rawData: JSON.stringify(eventData),
                dataSource: 'ANDROID_SIMULATION',
                timestamp: new Date(eventData.timestamp)
            });

            // Update vehicle location if provided
            if (vehicleId && eventData.gps && eventData.gps.latitude && eventData.gps.longitude) {
                try {
                    // Try to find vehicle by plateNumber first, then by ObjectId
                    let vehicle = await Vehicle.findOne({ plateNumber: vehicleId });
                    if (!vehicle) {
                        // Fallback: try to find by ObjectId (in case vehicleId is actually an ObjectId)
                        vehicle = await Vehicle.findById(vehicleId);
                    }

                    if (vehicle) {
                        vehicle.currentLocation = {
                            latitude: eventData.gps.latitude,
                            longitude: eventData.gps.longitude,
                            updatedAt: new Date()
                        };
                        await vehicle.save();

                        // Create location history entry
                        await VehicleLocationHistory.create({
                            vehicleId: vehicleId,
                            location: {
                                latitude: eventData.gps.latitude,
                                longitude: eventData.gps.longitude,
                                altitude: eventData.gps.altitude,
                                accuracy: eventData.gps.accuracy,
                                speed: eventData.gps.speed,
                                heading: eventData.gps.heading
                            },
                            timestamp: new Date(eventData.timestamp),
                            dataSource: 'ANDROID_SIMULATION',
                            deviceId: `android_sim_${vehicleId}`,
                            sensorData: iotData.sensorData,
                            alerts: iotData.alerts || []
                        });
                    }
                } catch (error) {
                    console.error('Error updating vehicle location:', error);
                }
            }

            await iotData.save();
            processedEvents.push({
                id: iotData._id,
                eventType: eventData.eventType,
                tripId: eventData.tripId,
                timestamp: eventData.timestamp
            });

        } catch (error) {
            errors.push(`Event ${i}: ${error.message}`);
        }
    }

    // Broadcast real-time simulation data if WebSocket is available
    if (req.app.get('broadcastToSchool') && processedEvents.length > 0) {
        try {
            req.app.get('broadcastToSchool')(vehicleId, {
                type: 'ANDROID_SIMULATION_BATCH',
                simulationId: simulationTimestamp || Date.now(),
                eventCount: processedEvents.length,
                source: 'android_simulation',
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error broadcasting simulation data:', error);
        }
    }

    console.log(`📱 Android Simulation: ${processedEvents.length} events processed, ${errors.length} errors`);

    res.status(201).json({
        success: true,
        message: 'Android simulation data processed',
        processedCount: processedEvents.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
    });
});

// @desc    Get IoT data by device ID
// @route   GET /api/v1/iot/device/:deviceId
// @access  Private
exports.getDeviceData = asyncHandler(async (req, res, next) => {
    const { deviceId } = req.params;
    const { limit = 100, page = 1, startDate, endDate } = req.query;

    // Build query
    const query = { deviceId };

    // Add date range filter
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (page - 1) * limit;

    const iotData = await IoT.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate('vehicleId', 'plateNumber vehicleModel operationalStatus');

    const total = await IoT.countDocuments(query);

    res.status(200).json({
        success: true,
        count: iotData.length,
        total,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        },
        data: iotData
    });
});

// @desc    Get all IoT devices
// @route   GET /api/v1/iot/devices
// @access  Private
exports.getAllDevices = asyncHandler(async (req, res, next) => {
    const devices = await IoT.aggregate([
        {
            $group: {
                _id: '$deviceId',
                deviceType: { $first: '$deviceType' },
                vehicleId: { $first: '$vehicleId' },
                lastSeen: { $max: '$timestamp' },
                isActive: { $first: '$deviceStatus.isActive' },
                batteryLevel: { $first: '$deviceStatus.batteryLevel' },
                signalStrength: { $first: '$deviceStatus.signalStrength' },
                dataPoints: { $sum: 1 },
                alerts: { $sum: { $size: '$alerts' } }
            }
        },
        {
            $lookup: {
                from: 'vehicles',
                localField: 'vehicleId',
                foreignField: '_id',
                as: 'vehicle'
            }
        },
        {
            $unwind: {
                path: '$vehicle',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $sort: { lastSeen: -1 }
        }
    ]);

    res.status(200).json({
        success: true,
        count: devices.length,
        data: devices
    });
});

// @desc    Get IoT analytics
// @route   GET /api/v1/iot/analytics
// @access  Private
exports.getIoTAnalytics = asyncHandler(async (req, res, next) => {
    const { deviceId, vehicleId, period = '24h' } = req.query;

    // Calculate date range based on period
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
    const query = { timestamp: { $gte: startDate } };
    if (deviceId) query.deviceId = deviceId;
    if (vehicleId) query.vehicleId = vehicleId;

    // Get analytics data
    const analytics = await IoT.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalDataPoints: { $sum: 1 },
                activeDevices: { $addToSet: '$deviceId' },
                avgBatteryLevel: { $avg: '$deviceStatus.batteryLevel' },
                avgSpeed: { $avg: '$location.speed' },
                avgTemperature: { $avg: '$sensorData.temperature' },
                avgFuelLevel: { $avg: '$sensorData.fuelLevel' },
                totalAlerts: { $sum: { $size: '$alerts' } },
                maxSpeed: { $max: '$location.speed' },
                minBatteryLevel: { $min: '$deviceStatus.batteryLevel' },
                locations: { $push: '$location' }
            }
        },
        {
            $addFields: {
                activeDeviceCount: { $size: '$activeDevices' },
                hasValidLocations: {
                    $filter: {
                        input: '$locations',
                        cond: {
                            $and: [
                                { $ne: ['$$this.latitude', null] },
                                { $ne: ['$$this.longitude', null] }
                            ]
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                validLocationCount: { $size: '$hasValidLocations' }
            }
        },
        {
            $project: {
                totalDataPoints: 1,
                activeDeviceCount: 1,
                avgBatteryLevel: { $round: ['$avgBatteryLevel', 2] },
                avgSpeed: { $round: ['$avgSpeed', 2] },
                avgTemperature: { $round: ['$avgTemperature', 2] },
                avgFuelLevel: { $round: ['$avgFuelLevel', 2] },
                totalAlerts: 1,
                maxSpeed: { $round: ['$maxSpeed', 2] },
                minBatteryLevel: { $round: ['$minBatteryLevel', 2] },
                validLocationCount: 1,
                coveragePercentage: {
                    $cond: {
                        if: { $eq: ['$totalDataPoints', 0] },
                        then: 0,
                        else: { $multiply: [{ $divide: ['$validLocationCount', '$totalDataPoints'] }, 100] }
                    }
                }
            }
        }
    ]);

    const result = analytics[0] || {
        totalDataPoints: 0,
        activeDeviceCount: 0,
        avgBatteryLevel: 0,
        avgSpeed: 0,
        avgTemperature: 0,
        avgFuelLevel: 0,
        totalAlerts: 0,
        maxSpeed: 0,
        minBatteryLevel: 0,
        validLocationCount: 0,
        coveragePercentage: 0
    };

    res.status(200).json({
        success: true,
        period,
        startDate,
        endDate: now,
        data: result
    });
});

// @desc    Get device alerts
// @route   GET /api/v1/iot/alerts
// @access  Private
exports.getDeviceAlerts = asyncHandler(async (req, res, next) => {
    const { deviceId, vehicleId, severity, type, limit = 50, page = 1 } = req.query;

    // Build query
    const query = { 'alerts.0': { $exists: true } }; // Only documents with alerts

    if (deviceId) query.deviceId = deviceId;
    if (vehicleId) query.vehicleId = vehicleId;
    if (severity) query['alerts.severity'] = severity;
    if (type) query['alerts.type'] = type;

    // Pagination
    const skip = (page - 1) * limit;

    const alerts = await IoT.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate('vehicleId', 'plateNumber vehicleModel')
        .select('deviceId alerts timestamp vehicleId');

    // Flatten alerts for easier consumption
    const flattenedAlerts = [];
    alerts.forEach(doc => {
        doc.alerts.forEach(alert => {
            flattenedAlerts.push({
                deviceId: doc.deviceId,
                vehicleId: doc.vehicleId,
                ...alert.toObject(),
                iotTimestamp: doc.timestamp
            });
        });
    });

    // Sort flattened alerts by timestamp
    flattenedAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
        success: true,
        count: flattenedAlerts.length,
        data: flattenedAlerts.slice(0, limit)
    });
});

// @desc    Update device configuration
// @route   PUT /api/v1/iot/device/:deviceId/config
// @access  Private
exports.updateDeviceConfig = asyncHandler(async (req, res, next) => {
    const { deviceId } = req.params;
    const { vehicleId, deviceType, isActive } = req.body;

    // Find the most recent data point for this device
    const latestData = await IoT.findOne({ deviceId }).sort({ timestamp: -1 });

    if (!latestData) {
        return next(new ErrorResponse(`Device ${deviceId} not found`, 404));
    }

    // Update configuration by creating a new entry with updated config
    const updatedData = new IoT({
        deviceId,
        deviceType: deviceType || latestData.deviceType,
        vehicleId: vehicleId || latestData.vehicleId,
        location: latestData.location,
        sensorData: latestData.sensorData,
        deviceStatus: {
            ...latestData.deviceStatus,
            isActive: isActive !== undefined ? isActive : latestData.deviceStatus.isActive
        },
        dataSource: 'MANUAL',
        rawData: `Configuration update: ${JSON.stringify(req.body)}`
    });

    await updatedData.save();

    res.status(200).json({
        success: true,
        data: updatedData,
        message: 'Device configuration updated successfully'
    });
});
