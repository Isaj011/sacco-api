const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const IoT = require('../models/IoT');
const Vehicle = require('../models/Vehicle');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');

// @desc    Receive IoT data from device
// @route   POST /api/v1/iot/data
// @access  Public (with device authentication)
exports.receiveIoTData = asyncHandler(async (req, res, next) => {
    const { deviceId, deviceType, vehicleId, location, sensorData, deviceStatus, rawData } = req.body;

    // Validate required fields
    if (!deviceId) {
        return next(new ErrorResponse('Device ID is required', 400));
    }

    // Check if device exists or create new one
    let iotData = new IoT({
        deviceId,
        deviceType: deviceType || 'GPS_TRACKER',
        vehicleId: vehicleId || null,
        location: location || {},
        sensorData: sensorData || {},
        deviceStatus: deviceStatus || {},
        rawData: rawData || JSON.stringify(req.body),
        dataSource: 'HTTP_POST'
    });

    // If vehicleId is provided, update vehicle location and create location history
    if (vehicleId && location && location.latitude && location.longitude) {
        try {
            const vehicle = await Vehicle.findById(vehicleId);
            if (vehicle) {
                // Update vehicle current location
                vehicle.currentLocation = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    updatedAt: new Date()
                };
                await vehicle.save();

                // Create location history entry
                await VehicleLocationHistory.create({
                    vehicleId: vehicleId,
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        altitude: location.altitude,
                        accuracy: location.accuracy,
                        speed: location.speed,
                        heading: location.heading
                    },
                    timestamp: new Date(),
                    dataSource: 'IOT_DEVICE',
                    deviceId: deviceId,
                    sensorData: sensorData || {},
                    alerts: iotData.alerts || []
                });
            }
        } catch (error) {
            console.error('Error updating vehicle location:', error);
            // Don't fail the IoT data submission if vehicle update fails
        }
    }

    // Save IoT data
    await iotData.save();

    // Broadcast real-time data if WebSocket is available
    if (req.app.get('broadcastToSchool') && vehicleId) {
        try {
            req.app.get('broadcastToSchool')(vehicleId, {
                type: 'IOT_UPDATE',
                deviceId,
                location,
                sensorData,
                timestamp: iotData.timestamp
            });
        } catch (error) {
            console.error('Error broadcasting IoT data:', error);
        }
    }

    res.status(201).json({
        success: true,
        data: iotData,
        message: 'IoT data received successfully'
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
