const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const IoT = require('../models/IoT');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const PassengerEvent = require('../models/PassengerEvent');

/**
 * Get enhanced performance analytics with IoT integration
 */
exports.getEnhancedPerformanceAnalytics = asyncHandler(async (req, res, next) => {
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

    // Build query for IoT data
    let iotQuery = { timestamp: { $gte: startDate } };
    if (vehicleId) iotQuery.vehicleId = vehicleId;
    if (routeId) {
        const vehicles = await Vehicle.find({ assignedRoute: routeId }).select('_id');
        iotQuery.vehicleId = { $in: vehicles.map(v => v._id) };
    }

    // Get IoT data for performance calculations
    const iotData = await IoT.find(iotQuery).sort({ timestamp: -1 });

    if (iotData.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No IoT data found for performance analytics',
            data: {
                performance: {
                    averageSpeed: 0,
                    fuelEfficiency: 0,
                    passengerUtilization: 0,
                    deviceUptime: 0,
                    routeAdherence: 95
                },
                trends: [],
                insights: []
            }
        });
    }

    // Calculate IoT-driven performance metrics
    const performance = await calculateIoTDrivenPerformance(iotData);
    const trends = calculatePerformanceTrends(iotData);
    const insights = generatePerformanceInsights(performance, iotData);

    res.status(200).json({
        success: true,
        data: {
            performance,
            trends,
            insights,
            dataPoints: iotData.length,
            timeRange,
            generatedAt: new Date()
        }
    });
});

/**
 * Get IoT-driven analytics for courses/routes
 */
exports.getIoTCourseAnalytics = asyncHandler(async (req, res, next) => {
    const { courseId } = req.params;
    const { timeRange = '24h' } = req.query;

    // Get course information
    const course = await Route.findById(courseId).populate('assignedVehicles');
    if (!course) {
        return next(new ErrorResponse('Course not found', 404));
    }

    // Get vehicle IDs for this course
    const vehicleIds = course.assignedVehicles.map(v => v._id);

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

    // Get IoT data for all vehicles on this course
    const iotData = await IoT.find({
        vehicleId: { $in: vehicleIds },
        timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });

    // Calculate course-specific metrics
    const courseMetrics = await calculateCourseMetrics(course, iotData);
    const vehicleMetrics = await calculateVehicleMetrics(vehicleIds, iotData);
    const routeAnalytics = await calculateRouteAnalytics(course, iotData);

    res.status(200).json({
        success: true,
        data: {
            course: {
                id: course._id,
                name: course.routeName,
                number: course.routeNumber
            },
            metrics: courseMetrics,
            vehicles: vehicleMetrics,
            route: routeAnalytics,
            dataPoints: iotData.length,
            timeRange,
            generatedAt: new Date()
        }
    });
});

/**
 * Update existing performance controller with IoT integration
 */
exports.updatePerformanceWithIoT = asyncHandler(async (req, res, next) => {
    const { performanceId } = req.params;
    const { iotData } = req.body;

    // Get existing performance record
    const Performance = require('../models/Performance');
    const performance = await Performance.findById(performanceId);

    if (!performance) {
        return next(new ErrorResponse('Performance not found', 404));
    }

    // Update performance with IoT data
    if (iotData) {
        performance.averageSpeed = iotData.averageSpeed || performance.averageSpeed;
        performance.fuelEfficiency = iotData.fuelEfficiency || performance.fuelEfficiency;
        performance.passengerSatisfaction = iotData.passengerUtilization || performance.passengerSatisfaction;
        performance.lastIoTUpdate = new Date();

        await performance.save();
    }

    res.status(200).json({
        success: true,
        message: 'Performance updated with IoT data',
        data: performance
    });
});

/**
 * Get real-time fleet performance from IoT
 */
exports.getFleetPerformanceFromIoT = asyncHandler(async (req, res, next) => {
    const { timeRange = '1h' } = req.query;

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
        default:
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
    }

    // Get all vehicles with IoT devices
    const vehicles = await Vehicle.find({ deviceId: { $exists: true } })
        .populate('assignedRoute', 'routeName routeNumber');

    // Get latest IoT data for all vehicles
    const iotData = await IoT.find({
        timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });

    // Calculate fleet-wide metrics
    const fleetMetrics = await calculateFleetPerformanceMetrics(vehicles, iotData);

    res.status(200).json({
        success: true,
        data: {
            fleet: fleetMetrics,
            vehicles: vehicles.length,
            dataPoints: iotData.length,
            timeRange,
            generatedAt: new Date()
        }
    });
});

// Helper functions

/**
 * Calculate IoT-driven performance metrics
 */
const calculateIoTDrivenPerformance = async (iotData) => {
    const totalSpeed = iotData.reduce((sum, data) => sum + (data.location?.speed || 0), 0);
    const averageSpeed = iotData.length > 0 ? totalSpeed / iotData.length : 0;

    const totalFuel = iotData.reduce((sum, data) => sum + (data.sensorData?.fuelLevel || 0), 0);
    const averageFuelLevel = iotData.length > 0 ? totalFuel / iotData.length : 0;

    const totalPassengers = iotData.reduce((sum, data) => sum + (data.sensorData?.passengerCount?.current || 0), 0);
    const averagePassengers = iotData.length > 0 ? totalPassengers / iotData.length : 0;

    const onlineDevices = iotData.filter(data => data.deviceStatus?.online).length;
    const deviceUptime = iotData.length > 0 ? (onlineDevices / iotData.length) * 100 : 0;

    // Calculate fuel efficiency (km/l)
    const totalDistance = iotData.reduce((sum, data) => sum + ((data.location?.speed || 0) * 0.00833), 0); // km per 30 seconds
    const fuelEfficiency = averageFuelLevel > 0 ? (totalDistance / averageFuelLevel) * 100 : 0;

    // Calculate passenger utilization (assuming 50 seat capacity)
    const maxCapacity = 50;
    const passengerUtilization = maxCapacity > 0 ? (averagePassengers / maxCapacity) * 100 : 0;

    return {
        averageSpeed: Math.round(averageSpeed * 10) / 10,
        fuelEfficiency: Math.round(fuelEfficiency * 10) / 10,
        passengerUtilization: Math.round(passengerUtilization * 10) / 10,
        deviceUptime: Math.round(deviceUptime * 10) / 10,
        routeAdherence: 95, // Would calculate from route data
        totalDistance: Math.round(totalDistance * 10) / 10,
        averageFuelLevel: Math.round(averageFuelLevel * 10) / 10,
        averagePassengers: Math.round(averagePassengers * 10) / 10
    };
};

/**
 * Calculate performance trends
 */
const calculatePerformanceTrends = (iotData) => {
    // Group by hour for trend analysis
    const hourlyData = {};

    for (const data of iotData) {
        const hour = new Date(data.timestamp).getHours();
        if (!hourlyData[hour]) {
            hourlyData[hour] = {
                speed: [],
                fuel: [],
                passengers: []
            };
        }

        hourlyData[hour].speed.push(data.location?.speed || 0);
        hourlyData[hour].fuel.push(data.sensorData?.fuelLevel || 0);
        hourlyData[hour].passengers.push(data.sensorData?.passengerCount?.current || 0);
    }

    const trends = [];
    for (let i = 0; i < 24; i++) {
        if (hourlyData[i]) {
            const avgSpeed = hourlyData[i].speed.reduce((sum, val) => sum + val, 0) / hourlyData[i].speed.length;
            const avgFuel = hourlyData[i].fuel.reduce((sum, val) => sum + val, 0) / hourlyData[i].fuel.length;
            const avgPassengers = hourlyData[i].passengers.reduce((sum, val) => sum + val, 0) / hourlyData[i].passengers.length;

            trends.push({
                hour: i,
                averageSpeed: Math.round(avgSpeed * 10) / 10,
                fuelLevel: Math.round(avgFuel * 10) / 10,
                passengerCount: Math.round(avgPassengers * 10) / 10
            });
        }
    }

    return trends.sort((a, b) => a.hour - b.hour);
};

/**
 * Generate performance insights
 */
const generatePerformanceInsights = (performance, iotData) => {
    const insights = [];

    // Speed efficiency insight
    if (performance.averageSpeed < 30) {
        insights.push({
            type: 'SPEED_EFFICIENCY',
            severity: 'MEDIUM',
            message: `Average speed (${performance.averageSpeed} km/h) is below optimal range (40-60 km/h)`,
            recommendation: 'Review route conditions and driver behavior'
        });
    }

    // Fuel efficiency insight
    if (performance.fuelEfficiency < 10) {
        insights.push({
            type: 'FUEL_EFFICIENCY',
            severity: 'HIGH',
            message: `Fuel efficiency (${performance.fuelEfficiency} km/l) is below industry standards`,
            recommendation: 'Check for maintenance issues or route optimization'
        });
    }

    // Passenger utilization insight
    if (performance.passengerUtilization > 85) {
        insights.push({
            type: 'CAPACITY_UTILIZATION',
            severity: 'MEDIUM',
            message: `High passenger utilization (${performance.passengerUtilization}%) may indicate overcrowding`,
            recommendation: 'Consider increasing service frequency'
        });
    } else if (performance.passengerUtilization < 30) {
        insights.push({
            type: 'CAPACITY_UTILIZATION',
            severity: 'LOW',
            message: `Low passenger utilization (${performance.passengerUtilization}%) suggests underutilization`,
            recommendation: 'Review schedule and route demand'
        });
    }

    // Device uptime insight
    if (performance.deviceUptime < 90) {
        insights.push({
            type: 'DEVICE_RELIABILITY',
            severity: 'HIGH',
            message: `Device uptime (${performance.deviceUptime}%) is below acceptable threshold`,
            recommendation: 'Check device connectivity and maintenance schedule'
        });
    }

    return insights;
};

/**
 * Calculate course-specific metrics
 */
const calculateCourseMetrics = async (course, iotData) => {
    const totalPassengers = iotData.reduce((sum, data) => sum + (data.sensorData?.passengerCount?.current || 0), 0);
    const averageSpeed = iotData.length > 0 ?
        iotData.reduce((sum, data) => sum + (data.location?.speed || 0), 0) / iotData.length : 0;

    const activeVehicles = new Set(iotData.map(data => data.vehicleId)).size;
    const totalVehicles = course.assignedVehicles.length;
    const utilizationRate = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0;

    return {
        totalPassengers: Math.round(totalPassengers * 10) / 10,
        averageSpeed: Math.round(averageSpeed * 10) / 10,
        activeVehicles,
        totalVehicles,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        maxCapacity: course.maxCapacity || (totalVehicles * 50),
        currentUtilization: course.maxCapacity > 0 ? (totalPassengers / course.maxCapacity) * 100 : 0
    };
};

/**
 * Calculate vehicle metrics
 */
const calculateVehicleMetrics = async (vehicleIds, iotData) => {
    const vehicleMetrics = [];

    for (const vehicleId of vehicleIds) {
        const vehicleIoTData = iotData.filter(data => data.vehicleId.toString() === vehicleId.toString());

        if (vehicleIoTData.length > 0) {
            const latestData = vehicleIoTData[0];
            const vehicle = await Vehicle.findById(vehicleId);

            vehicleMetrics.push({
                vehicleId,
                plateNumber: vehicle.plateNumber,
                currentSpeed: latestData.location?.speed || 0,
                passengerCount: latestData.sensorData?.passengerCount?.current || 0,
                fuelLevel: latestData.sensorData?.fuelLevel || 0,
                deviceStatus: latestData.deviceStatus?.online || false,
                lastUpdate: latestData.timestamp
            });
        }
    }

    return vehicleMetrics;
};

/**
 * Calculate route analytics
 */
const calculateRouteAnalytics = async (course, iotData) => {
    const routeAdherence = 95; // Would calculate from actual route data
    const onTimePerformance = 88; // Would calculate from schedule data

    return {
        routeAdherence,
        onTimePerformance,
        totalDistance: course.totalDistance || 0,
        estimatedDuration: course.estimatedDuration || 'N/A',
        stopsCount: course.stops?.length || 0
    };
};

/**
 * Calculate fleet performance metrics
 */
const calculateFleetPerformanceMetrics = async (vehicles, iotData) => {
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.deviceStatus?.online).length;

    const totalPassengers = iotData.reduce((sum, data) => sum + (data.sensorData?.passengerCount?.current || 0), 0);
    const averageSpeed = iotData.length > 0 ?
        iotData.reduce((sum, data) => sum + (data.location?.speed || 0), 0) / iotData.length : 0;

    const totalFuel = iotData.reduce((sum, data) => sum + (data.sensorData?.fuelLevel || 0), 0);
    const averageFuelLevel = iotData.length > 0 ? totalFuel / iotData.length : 0;

    return {
        totalVehicles,
        activeVehicles,
        fleetUtilization: totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0,
        totalPassengers: Math.round(totalPassengers * 10) / 10,
        averageSpeed: Math.round(averageSpeed * 10) / 10,
        averageFuelLevel: Math.round(averageFuelLevel * 10) / 10,
        totalDistance: Math.round(iotData.reduce((sum, data) => sum + ((data.location?.speed || 0) * 0.00833), 0) * 10) / 10
    };
};
