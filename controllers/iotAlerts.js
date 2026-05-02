const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const IoT = require('../models/IoT');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Alert = require('../models/Alert');
const {
    detectRouteDeviations,
    processDeviceHealth
} = require('../services/iotProcessingService');

/**
 * Get all IoT-generated alerts
 */
exports.getIoTAlerts = asyncHandler(async (req, res, next) => {
    const { vehicleId, routeId, type, severity, status = 'active', page = 1, limit = 50 } = req.query;

    // Build query
    let query = { status };

    if (vehicleId) query.vehicleId = vehicleId;
    if (routeId) {
        const vehicles = await Vehicle.find({ assignedRoute: routeId }).select('_id');
        query.vehicleId = { $in: vehicles.map(v => v._id) };
    }
    if (type) query.type = type;
    if (severity) query.severity = severity;

    // Get alerts from database
    const alerts = await Alert.find(query)
        .populate('vehicleId', 'plateNumber vehicleModel')
        .populate('routeId', 'routeName routeNumber')
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Alert.countDocuments(query);

    res.status(200).json({
        success: true,
        count: alerts.length,
        total,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        },
        data: alerts
    });
});

/**
 * Process and generate IoT alerts in real-time
 */
exports.processIoTAlerts = asyncHandler(async (req, res, next) => {
    const { vehicleId, deviceId, iotData } = req.body;

    if (!vehicleId && !deviceId) {
        return next(new ErrorResponse('Vehicle ID or Device ID is required', 400));
    }

    const allAlerts = [];

    // Get vehicle information
    const vehicle = await Vehicle.findById(vehicleId).populate('assignedRoute');
    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }

    // 1. Process route deviation alerts
    if (iotData?.location) {
        const routeAlerts = await detectRouteDeviations(vehicleId, iotData);
        allAlerts.push(...routeAlerts);
    }

    // 2. Process device health alerts
    if (iotData?.deviceStatus) {
        const healthAlerts = await processDeviceHealth(deviceId || vehicle.deviceId, iotData.deviceStatus);
        allAlerts.push(...healthAlerts);
    }

    // 3. Process capacity alerts
    if (iotData?.sensorData?.passengerCount) {
        const capacityAlerts = await generateCapacityAlerts(vehicle, iotData.sensorData.passengerCount);
        allAlerts.push(...capacityAlerts);
    }

    // 4. Process fuel alerts
    if (iotData?.sensorData?.fuelLevel !== undefined) {
        const fuelAlerts = await generateFuelAlerts(vehicle, iotData.sensorData.fuelLevel);
        allAlerts.push(...fuelAlerts);
    }

    // 5. Process schedule delay alerts
    if (iotData?.location && vehicle.assignedRoute) {
        const delayAlerts = await generateDelayAlerts(vehicle, iotData);
        allAlerts.push(...delayAlerts);
    }

    // 6. Process speed violation alerts
    if (iotData?.location?.speed) {
        const speedAlerts = await generateSpeedAlerts(vehicle, iotData.location.speed);
        allAlerts.push(...speedAlerts);
    }

    // Save alerts to database
    if (allAlerts.length > 0) {
        try {
            await Alert.insertMany(allAlerts);
        } catch (error) {
            console.error('Error saving alerts:', error);
        }
    }

    // Broadcast alerts via WebSocket
    const io = req.app.get('io');
    if (io && allAlerts.length > 0) {
        io.to(`vehicle_${vehicleId}`).emit('iot_alerts', {
            type: 'ALERTS_GENERATED',
            vehicleId,
            alerts: allAlerts,
            timestamp: new Date()
        });
    }

    res.status(200).json({
        success: true,
        message: `Processed ${allAlerts.length} IoT alerts`,
        data: {
            vehicleId,
            deviceId,
            alertsGenerated: allAlerts.length,
            alerts: allAlerts,
            timestamp: new Date()
        }
    });
});

/**
 * Generate capacity alerts
 */
const generateCapacityAlerts = async (vehicle, passengerData) => {
    const alerts = [];
    const currentPassengers = passengerData.current || 0;
    const maxCapacity = vehicle.maxCapacity || 50;
    const utilizationRate = (currentPassengers / maxCapacity) * 100;

    // Overcapacity alert
    if (utilizationRate > 100) {
        alerts.push({
            type: 'OVERCAPACITY',
            severity: 'HIGH',
            message: `Vehicle over capacity: ${currentPassengers}/${maxCapacity} (${utilizationRate.toFixed(1)}%)`,
            vehicleId: vehicle._id,
            routeId: vehicle.assignedRoute?._id,
            value: utilizationRate,
            threshold: 100,
            timestamp: new Date(),
            status: 'active'
        });
    }
    // High utilization alert
    else if (utilizationRate > 90) {
        alerts.push({
            type: 'HIGH_UTILIZATION',
            severity: 'MEDIUM',
            message: `High vehicle utilization: ${currentPassengers}/${maxCapacity} (${utilizationRate.toFixed(1)}%)`,
            vehicleId: vehicle._id,
            routeId: vehicle.assignedRoute?._id,
            value: utilizationRate,
            threshold: 90,
            timestamp: new Date(),
            status: 'active'
        });
    }
    // Low utilization alert
    else if (utilizationRate < 20 && currentPassengers > 0) {
        alerts.push({
            type: 'LOW_UTILIZATION',
            severity: 'LOW',
            message: `Low vehicle utilization: ${currentPassengers}/${maxCapacity} (${utilizationRate.toFixed(1)}%)`,
            vehicleId: vehicle._id,
            routeId: vehicle.assignedRoute?._id,
            value: utilizationRate,
            threshold: 20,
            timestamp: new Date(),
            status: 'active'
        });
    }

    return alerts;
};

/**
 * Generate fuel alerts
 */
const generateFuelAlerts = async (vehicle, fuelLevel) => {
    const alerts = [];

    // Critical fuel alert
    if (fuelLevel < 10) {
        alerts.push({
            type: 'CRITICAL_FUEL',
            severity: 'CRITICAL',
            message: `Critical fuel level: ${fuelLevel.toFixed(1)}%`,
            vehicleId: vehicle._id,
            routeId: vehicle.assignedRoute?._id,
            value: fuelLevel,
            threshold: 10,
            timestamp: new Date(),
            status: 'active'
        });
    }
    // Low fuel alert
    else if (fuelLevel < 20) {
        alerts.push({
            type: 'LOW_FUEL',
            severity: 'HIGH',
            message: `Low fuel level: ${fuelLevel.toFixed(1)}%`,
            vehicleId: vehicle._id,
            routeId: vehicle.assignedRoute?._id,
            value: fuelLevel,
            threshold: 20,
            timestamp: new Date(),
            status: 'active'
        });
    }

    return alerts;
};

/**
 * Generate delay alerts
 */
const generateDelayAlerts = async (vehicle, iotData) => {
    const alerts = [];

    if (!vehicle.assignedRoute) return alerts;

    // Calculate expected vs actual position
    const route = vehicle.assignedRoute;
    const currentLocation = iotData.location;

    // Simplified delay calculation (in real implementation, use route schedule)
    const expectedTime = new Date();
    const actualTime = new Date(iotData.timestamp);
    const delayMinutes = (actualTime - expectedTime) / (1000 * 60);

    if (Math.abs(delayMinutes) > 10) { // 10 minutes delay
        alerts.push({
            type: 'SCHEDULE_DELAY',
            severity: delayMinutes > 20 ? 'HIGH' : 'MEDIUM',
            message: `Schedule delay: ${Math.abs(delayMinutes).toFixed(1)} minutes ${delayMinutes > 0 ? 'late' : 'early'}`,
            vehicleId: vehicle._id,
            routeId: route._id,
            value: Math.abs(delayMinutes),
            threshold: 10,
            timestamp: new Date(),
            status: 'active'
        });
    }

    return alerts;
};

/**
 * Generate speed violation alerts
 */
const generateSpeedAlerts = async (vehicle, currentSpeed) => {
    const alerts = [];
    const maxSpeed = 80; // km/h, configurable per route

    if (currentSpeed > maxSpeed) {
        alerts.push({
            type: 'SPEED_VIOLATION',
            severity: 'HIGH',
            message: `Speed violation: ${currentSpeed.toFixed(1)} km/h (limit: ${maxSpeed} km/h)`,
            vehicleId: vehicle._id,
            routeId: vehicle.assignedRoute?._id,
            value: currentSpeed,
            threshold: maxSpeed,
            timestamp: new Date(),
            status: 'active'
        });
    }

    return alerts;
};

/**
 * Get alert statistics
 */
exports.getAlertStatistics = asyncHandler(async (req, res, next) => {
    const { vehicleId, routeId, timeRange = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startDate;

    switch (timeRange) {
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
    let query = { timestamp: { $gte: startDate } };
    if (vehicleId) query.vehicleId = vehicleId;
    if (routeId) {
        const vehicles = await Vehicle.find({ assignedRoute: routeId }).select('_id');
        query.vehicleId = { $in: vehicles.map(v => v._id) };
    }

    // Get alert statistics
    const stats = await Alert.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalAlerts: { $sum: 1 },
                criticalAlerts: {
                    $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] }
                },
                highAlerts: {
                    $sum: { $cond: [{ $eq: ['$severity', 'HIGH'] }, 1, 0] }
                },
                mediumAlerts: {
                    $sum: { $cond: [{ $eq: ['$severity', 'MEDIUM'] }, 1, 0] }
                },
                lowAlerts: {
                    $sum: { $cond: [{ $eq: ['$severity', 'LOW'] }, 1, 0] }
                },
                activeAlerts: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                resolvedAlerts: {
                    $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                }
            }
        }
    ]);

    // Get alert type breakdown
    const typeStats = await Alert.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                severity: { $first: '$severity' }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Get hourly trend
    const hourlyTrend = await Alert.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    hour: { $hour: '$timestamp' },
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ]);

    const result = stats[0] || {
        totalAlerts: 0,
        criticalAlerts: 0,
        highAlerts: 0,
        mediumAlerts: 0,
        lowAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0
    };

    res.status(200).json({
        success: true,
        data: {
            summary: result,
            typeBreakdown: typeStats,
            hourlyTrend,
            timeRange,
            generatedAt: new Date()
        }
    });
});

/**
 * Resolve alert
 */
exports.resolveAlert = asyncHandler(async (req, res, next) => {
    const { alertId } = req.params;
    const { resolution, resolvedBy } = req.body;

    const alert = await Alert.findByIdAndUpdate(
        alertId,
        {
            status: 'resolved',
            resolution,
            resolvedBy,
            resolvedAt: new Date()
        },
        { new: true, runValidators: true }
    );

    if (!alert) {
        return next(new ErrorResponse('Alert not found', 404));
    }

    // Broadcast resolution
    const io = req.app.get('io');
    if (io) {
        io.to(`vehicle_${alert.vehicleId}`).emit('alert_resolved', {
            type: 'ALERT_RESOLVED',
            alertId: alert._id,
            vehicleId: alert.vehicleId,
            timestamp: new Date()
        });
    }

    res.status(200).json({
        success: true,
        message: 'Alert resolved successfully',
        data: alert
    });
});

/**
 * Get active alerts for dashboard
 */
exports.getActiveAlerts = asyncHandler(async (req, res, next) => {
    const { limit = 20 } = req.query;

    const alerts = await Alert.find({ status: 'active' })
        .populate('vehicleId', 'plateNumber vehicleModel')
        .populate('routeId', 'routeName routeNumber')
        .sort({ severity: -1, timestamp: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts
    });
});
