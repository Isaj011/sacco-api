const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const IoT = require('../models/IoT');
const Vehicle = require('../models/Vehicle');
const Course = require('../models/Course');
const PassengerEvent = require('../models/PassengerEvent');
const Alert = require('../models/Alert');

/**
 * Get IoT-driven performance analytics
 */
exports.getIoTPerformanceAnalytics = asyncHandler(async (req, res, next) => {
    const { vehicleId, routeId, timeRange = '24h', groupBy = 'hour' } = req.query;

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

    // Get IoT data for analytics
    const iotData = await IoT.find(query).sort({ timestamp: -1 });

    if (iotData.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No IoT data found for the specified criteria',
            data: {
                summary: {},
                trends: [],
                alerts: []
            }
        });
    }

    // Calculate comprehensive performance metrics
    const performance = await calculateIoTPerformanceMetrics(iotData, groupBy);

    // Generate alerts based on performance
    const alerts = await generatePerformanceAlerts(performance, vehicleId, routeId);

    res.status(200).json({
        success: true,
        data: {
            timeRange,
            summary: performance.summary,
            trends: performance.trends,
            efficiency: performance.efficiency,
            utilization: performance.utilization,
            alerts,
            dataPoints: iotData.length,
            generatedAt: new Date()
        }
    });
});

/**
 * Calculate IoT performance metrics
 */
const calculateIoTPerformanceMetrics = async (iotData, groupBy) => {
    try {
        // Group data by time period
        const groupedData = groupIoTDataByTime(iotData, groupBy);

        const summary = {
            totalDistance: 0,
            averageSpeed: 0,
            fuelEfficiency: 0,
            passengerUtilization: 0,
            deviceUptime: 0,
            routeAdherence: 0,
            totalTrips: 0,
            onTimePerformance: 0
        };

        const trends = [];
        let totalSpeed = 0;
        let totalFuel = 0;
        let totalPassengers = 0;
        let totalCapacity = 0;
        let onlineTime = 0;
        let totalTime = 0;
        let adherentTime = 0;

        for (const group of groupedData) {
            const groupMetrics = calculateGroupMetrics(group);

            trends.push({
                timestamp: group.timestamp,
                averageSpeed: groupMetrics.averageSpeed,
                passengerCount: groupMetrics.passengerCount,
                fuelLevel: groupMetrics.fuelLevel,
                deviceStatus: groupMetrics.deviceStatus,
                locationCount: group.data.length
            });

            // Accumulate for summary
            totalSpeed += groupMetrics.averageSpeed * group.data.length;
            totalFuel += groupMetrics.fuelLevel * group.data.length;
            totalPassengers += groupMetrics.passengerCount * group.data.length;
            totalCapacity += groupMetrics.maxCapacity * group.data.length;

            if (groupMetrics.deviceStatus === 'online') {
                onlineTime += group.data.length;
            }

            totalTime += group.data.length;
        }

        // Calculate summary metrics
        summary.averageSpeed = totalTime > 0 ? totalSpeed / totalTime : 0;
        summary.fuelEfficiency = totalFuel > 0 ? (totalDistance / totalFuel) * 100 : 0; // km/l
        summary.passengerUtilization = totalCapacity > 0 ? (totalPassengers / totalCapacity) * 100 : 0;
        summary.deviceUptime = totalTime > 0 ? (onlineTime / totalTime) * 100 : 0;
        summary.routeAdherence = totalTime > 0 ? (adherentTime / totalTime) * 100 : 95; // Default 95%

        // Calculate efficiency metrics
        const efficiency = {
            speedEfficiency: Math.min(100, (summary.averageSpeed / 60) * 100), // 60 km/h as optimal
            fuelEfficiency: Math.min(100, summary.fuelEfficiency * 2), // Scale to 100
            timeEfficiency: summary.deviceUptime,
            overallEfficiency: (summary.averageSpeed > 0 && summary.fuelEfficiency > 0) ?
                ((summary.averageSpeed / 60) * 0.4 + (summary.fuelEfficiency * 2) * 0.6) : 0
        };

        // Calculate utilization metrics
        const utilization = {
            passengerUtilization: summary.passengerUtilization,
            vehicleUtilization: summary.deviceUptime,
            routeUtilization: summary.routeAdherence,
            overallUtilization: (summary.passengerUtilization + summary.deviceUptime + summary.routeAdherence) / 3
        };

        return {
            summary,
            trends,
            efficiency,
            utilization
        };
    } catch (error) {
        console.error('Error calculating IoT performance metrics:', error);
        return {
            summary: {},
            trends: [],
            efficiency: {},
            utilization: {}
        };
    }
};

/**
 * Group IoT data by time period
 */
const groupIoTDataByTime = (iotData, groupBy) => {
    const groups = {};

    for (const data of iotData) {
        let key;
        const timestamp = new Date(data.timestamp);

        switch (groupBy) {
            case 'minute':
                key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}-${timestamp.getMinutes()}`;
                break;
            case 'hour':
                key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
                break;
            case 'day':
                key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`;
                break;
            case 'week':
                const weekStart = new Date(timestamp.setDate(timestamp.getDate() - timestamp.getDay()));
                key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
                break;
            case 'month':
                key = `${timestamp.getFullYear()}-${timestamp.getMonth()}`;
                break;
            default:
                key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
        }

        if (!groups[key]) {
            groups[key] = {
                timestamp: key,
                data: []
            };
        }

        groups[key].data.push(data);
    }

    return Object.values(groups).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

/**
 * Calculate metrics for a group of IoT data
 */
const calculateGroupMetrics = (group) => {
    let totalSpeed = 0;
    let totalPassengers = 0;
    let totalFuel = 0;
    let maxCapacity = 50; // Default capacity
    let onlineCount = 0;

    for (const data of group.data) {
        totalSpeed += data.location?.speed || 0;
        totalPassengers += data.sensorData?.passengerCount?.current || 0;
        totalFuel += data.sensorData?.fuelLevel || 0;

        if (data.deviceStatus?.online) {
            onlineCount++;
        }
    }

    return {
        averageSpeed: group.data.length > 0 ? totalSpeed / group.data.length : 0,
        passengerCount: group.data.length > 0 ? totalPassengers / group.data.length : 0,
        fuelLevel: group.data.length > 0 ? totalFuel / group.data.length : 0,
        deviceStatus: group.data.length > 0 ? (onlineCount / group.data.length) > 0.5 ? 'online' : 'offline' : 'offline',
        maxCapacity
    };
};

/**
 * Generate performance alerts
 */
const generatePerformanceAlerts = async (performance, vehicleId, routeId) => {
    const alerts = [];

    // Speed efficiency alert
    if (performance.efficiency.speedEfficiency < 50) {
        alerts.push({
            type: 'LOW_SPEED_EFFICIENCY',
            severity: 'MEDIUM',
            message: `Low speed efficiency detected: ${performance.efficiency.speedEfficiency.toFixed(1)}%`,
            vehicleId,
            routeId,
            value: performance.efficiency.speedEfficiency,
            threshold: 50,
            timestamp: new Date()
        });
    }

    // Fuel efficiency alert
    if (performance.efficiency.fuelEfficiency < 30) {
        alerts.push({
            type: 'POOR_FUEL_EFFICIENCY',
            severity: 'HIGH',
            message: `Poor fuel efficiency detected: ${performance.efficiency.fuelEfficiency.toFixed(1)}%`,
            vehicleId,
            routeId,
            value: performance.efficiency.fuelEfficiency,
            threshold: 30,
            timestamp: new Date()
        });
    }

    // Passenger utilization alert
    if (performance.utilization.passengerUtilization > 90) {
        alerts.push({
            type: 'HIGH_PASSENGER_UTILIZATION',
            severity: 'MEDIUM',
            message: `High passenger utilization: ${performance.utilization.passengerUtilization.toFixed(1)}%`,
            vehicleId,
            routeId,
            value: performance.utilization.passengerUtilization,
            threshold: 90,
            timestamp: new Date()
        });
    } else if (performance.utilization.passengerUtilization < 20) {
        alerts.push({
            type: 'LOW_PASSENGER_UTILIZATION',
            severity: 'LOW',
            message: `Low passenger utilization: ${performance.utilization.passengerUtilization.toFixed(1)}%`,
            vehicleId,
            routeId,
            value: performance.utilization.passengerUtilization,
            threshold: 20,
            timestamp: new Date()
        });
    }

    // Device uptime alert
    if (performance.utilization.deviceUptime < 80) {
        alerts.push({
            type: 'LOW_DEVICE_UPTIME',
            severity: 'HIGH',
            message: `Low device uptime: ${performance.utilization.deviceUptime.toFixed(1)}%`,
            vehicleId,
            routeId,
            value: performance.utilization.deviceUptime,
            threshold: 80,
            timestamp: new Date()
        });
    }

    // Save alerts to database if Alert model exists
    try {
        if (Alert && alerts.length > 0) {
            await Alert.insertMany(alerts);
        }
    } catch (error) {
        console.error('Error saving performance alerts:', error);
    }

    return alerts;
};

/**
 * Get real-time IoT dashboard data
 */
exports.getIoTDashboardData = asyncHandler(async (req, res, next) => {
    const { vehicleId, routeId } = req.query;

    // Get active vehicles with IoT devices
    let vehicleQuery = { deviceId: { $exists: true } };
    if (vehicleId) vehicleQuery._id = vehicleId;

    const vehicles = await Vehicle.find(vehicleQuery)
        .populate('assignedRoute', 'routeName routeNumber')
        .populate('currentDriver', 'driverName');

    // Get latest IoT data for each vehicle
    const dashboardData = [];

    for (const vehicle of vehicles) {
        const latestIoTData = await IoT.findOne({
            vehicleId: vehicle._id
        }).sort({ timestamp: -1 });

        if (latestIoTData) {
            // Calculate real-time metrics
            const metrics = {
                speed: latestIoTData.location?.speed || 0,
                passengerCount: latestIoTData.sensorData?.passengerCount?.current || 0,
                fuelLevel: latestIoTData.sensorData?.fuelLevel || 0,
                batteryLevel: latestIoTData.deviceStatus?.batteryLevel || 0,
                signalStrength: latestIoTData.deviceStatus?.signalStrength || 0,
                lastUpdate: latestIoTData.timestamp,
                online: latestIoTData.deviceStatus?.online || false
            };

            dashboardData.push({
                vehicle: {
                    id: vehicle._id,
                    plateNumber: vehicle.plateNumber,
                    model: vehicle.vehicleModel,
                    route: vehicle.assignedRoute,
                    driver: vehicle.currentDriver
                },
                location: latestIoTData.location,
                metrics,
                alerts: await generatePerformanceAlerts(
                    {
                        efficiency: { speedEfficiency: metrics.speed > 0 ? (metrics.speed / 60) * 100 : 0 },
                        utilization: { passengerUtilization: vehicle.maxCapacity > 0 ? (metrics.passengerCount / vehicle.maxCapacity) * 100 : 0 }
                    },
                    vehicle._id,
                    vehicle.assignedRoute?._id
                )
            });
        }
    }

    // Calculate overall fleet metrics
    const fleetMetrics = calculateFleetMetrics(dashboardData);

    res.status(200).json({
        success: true,
        data: {
            vehicles: dashboardData,
            fleet: fleetMetrics,
            timestamp: new Date()
        }
    });
});

/**
 * Calculate fleet-wide metrics
 */
const calculateFleetMetrics = (dashboardData) => {
    const activeVehicles = dashboardData.filter(v => v.metrics.online);
    const totalVehicles = dashboardData.length;

    const totalPassengers = activeVehicles.reduce((sum, v) => sum + v.metrics.passengerCount, 0);
    const avgSpeed = activeVehicles.length > 0 ?
        activeVehicles.reduce((sum, v) => sum + v.metrics.speed, 0) / activeVehicles.length : 0;
    const avgFuelLevel = activeVehicles.length > 0 ?
        activeVehicles.reduce((sum, v) => sum + v.metrics.fuelLevel, 0) / activeVehicles.length : 0;
    const avgBatteryLevel = activeVehicles.length > 0 ?
        activeVehicles.reduce((sum, v) => sum + v.metrics.batteryLevel, 0) / activeVehicles.length : 0;

    const totalAlerts = dashboardData.reduce((sum, v) => sum + (v.alerts?.length || 0), 0);
    const criticalAlerts = dashboardData.reduce((sum, v) =>
        sum + (v.alerts?.filter(a => a.severity === 'HIGH').length || 0), 0);

    return {
        totalVehicles,
        activeVehicles: activeVehicles.length,
        utilizationRate: totalVehicles > 0 ? (activeVehicles.length / totalVehicles) * 100 : 0,
        totalPassengers,
        averageSpeed: avgSpeed,
        averageFuelLevel: avgFuelLevel,
        averageBatteryLevel: avgBatteryLevel,
        totalAlerts,
        criticalAlerts,
        fleetHealth: avgBatteryLevel > 50 && avgFuelLevel > 30 ? 'GOOD' : 'NEEDS_ATTENTION'
    };
};
