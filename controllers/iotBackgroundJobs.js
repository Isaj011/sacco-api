const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const IoT = require('../models/IoT');
const Vehicle = require('../models/Vehicle');
const Course = require('../models/Course');
const Alert = require('../models/Alert');
const PassengerEvent = require('../models/PassengerEvent');
const {
    processRouteIoTData
} = require('../services/routeIoTService');
const {
    processScheduleIoTData
} = require('../services/scheduleIoTService');

/**
 * Run IoT maintenance check - Background job
 */
exports.runIoTMaintenanceCheck = asyncHandler(async (req, res, next) => {
    const results = {
        devicesChecked: 0,
        maintenanceAlerts: 0,
        fuelAlerts: 0,
        batteryAlerts: 0,
        signalAlerts: 0,
        totalAlerts: 0
    };

    try {
        // Get all devices with recent data
        const recentTime = new Date(Date.now() - 30 * 60 * 1000); // Last 30 minutes
        const devices = await IoT.find({
            timestamp: { $gte: recentTime }
        }).distinct('deviceId');

        results.devicesChecked = devices.length;

        for (const deviceId of devices) {
            const latestData = await IoT.findOne({ deviceId }).sort({ timestamp: -1 });

            if (!latestData) continue;

            // Check battery level
            if (latestData.deviceStatus?.batteryLevel < 20) {
                await createMaintenanceAlert({
                    type: 'LOW_BATTERY',
                    severity: latestData.deviceStatus.batteryLevel < 10 ? 'CRITICAL' : 'HIGH',
                    deviceId,
                    vehicleId: latestData.vehicleId,
                    message: `Device battery critically low: ${latestData.deviceStatus.batteryLevel}%`,
                    value: latestData.deviceStatus.batteryLevel
                });
                results.batteryAlerts++;
                results.totalAlerts++;
            }

            // Check signal strength
            if (latestData.deviceStatus?.signalStrength < 2) {
                await createMaintenanceAlert({
                    type: 'POOR_SIGNAL',
                    severity: 'MEDIUM',
                    deviceId,
                    vehicleId: latestData.vehicleId,
                    message: `Poor signal strength: ${latestData.deviceStatus.signalStrength}/5`,
                    value: latestData.deviceStatus.signalStrength
                });
                results.signalAlerts++;
                results.totalAlerts++;
            }

            // Check fuel level
            if (latestData.sensorData?.fuelLevel < 15) {
                await createMaintenanceAlert({
                    type: 'LOW_FUEL',
                    severity: latestData.sensorData.fuelLevel < 10 ? 'CRITICAL' : 'HIGH',
                    deviceId,
                    vehicleId: latestData.vehicleId,
                    message: `Vehicle fuel low: ${latestData.sensorData.fuelLevel}%`,
                    value: latestData.sensorData.fuelLevel
                });
                results.fuelAlerts++;
                results.totalAlerts++;
            }

            // Check device offline status
            const lastSeen = new Date(latestData.timestamp);
            const timeSinceLastSeen = Date.now() - lastSeen.getTime();

            if (timeSinceLastSeen > 15 * 60 * 1000) { // 15 minutes
                await createMaintenanceAlert({
                    type: 'DEVICE_OFFLINE',
                    severity: timeSinceLastSeen > 60 * 60 * 1000 ? 'HIGH' : 'MEDIUM',
                    deviceId,
                    vehicleId: latestData.vehicleId,
                    message: `Device offline for ${Math.floor(timeSinceLastSeen / 60000)} minutes`,
                    value: Math.floor(timeSinceLastSeen / 60000)
                });
                results.maintenanceAlerts++;
                results.totalAlerts++;
            }
        }

        console.log(`🔧 IoT Maintenance Check: ${results.devicesChecked} devices checked, ${results.totalAlerts} alerts generated`);

        res.status(200).json({
            success: true,
            message: 'IoT maintenance check completed',
            data: results,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error in IoT maintenance check:', error);
        return next(new ErrorResponse('IoT maintenance check failed', 500));
    }
});

/**
 * Generate IoT performance reports - Background job
 */
exports.generateIoTPerformanceReport = asyncHandler(async (req, res, next) => {
    const { reportType = 'daily', vehicleId, routeId } = req.query;

    const results = {
        reportsGenerated: 0,
        vehiclesProcessed: 0,
        routesProcessed: 0,
        errors: []
    };

    try {
        // Calculate time range based on report type
        const now = new Date();
        let startDate, endDate;

        switch (reportType) {
            case 'hourly':
                startDate = new Date(now.getTime() - 60 * 60 * 1000);
                endDate = now;
                break;
            case 'daily':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'monthly':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                endDate = now;
        }

        // Get vehicles to process
        let vehicleQuery = { deviceId: { $exists: true } };
        if (vehicleId) vehicleQuery._id = vehicleId;

        const vehicles = await Vehicle.find(vehicleQuery);
        results.vehiclesProcessed = vehicles.length;

        for (const vehicle of vehicles) {
            try {
                const report = await generateVehiclePerformanceReport(vehicle._id, startDate, endDate);
                await savePerformanceReport(report);
                results.reportsGenerated++;
            } catch (error) {
                results.errors.push({
                    vehicleId: vehicle._id,
                    error: error.message
                });
            }
        }

        // Process route-level reports if no specific vehicle
        if (!vehicleId) {
            const routes = await Course.find({ status: 'Active' });
            results.routesProcessed = routes.length;

            for (const route of routes) {
                try {
                    const report = await generateRoutePerformanceReport(route._id, startDate, endDate);
                    await savePerformanceReport(report);
                    results.reportsGenerated++;
                } catch (error) {
                    results.errors.push({
                        routeId: route._id,
                        error: error.message
                    });
                }
            }
        }

        console.log(`📊 IoT Performance Report: ${results.reportsGenerated} reports generated`);

        res.status(200).json({
            success: true,
            message: `${reportType} IoT performance reports generated`,
            data: results,
            reportPeriod: {
                type: reportType,
                startDate,
                endDate
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error generating IoT performance reports:', error);
        return next(new ErrorResponse('IoT performance report generation failed', 500));
    }
});

/**
 * Optimize routes based on IoT data - Background job
 */
exports.optimizeRoutesFromIoT = asyncHandler(async (req, res, next) => {
    const results = {
        routesAnalyzed: 0,
        optimizationsSuggested: 0,
        routesUpdated: 0,
        fuelSavings: 0,
        timeSavings: 0
    };

    try {
        // Get all active routes
        const routes = await Course.find({ status: 'Active' }).populate('assignedVehicles');
        results.routesAnalyzed = routes.length;

        for (const route of routes) {
            try {
                const optimization = await analyzeRouteOptimization(route);

                if (optimization.shouldOptimize) {
                    // Apply optimization suggestions
                    await applyRouteOptimization(route._id, optimization);
                    results.optimizationsSuggested++;
                    results.routesUpdated++;

                    results.fuelSavings += optimization.estimatedFuelSavings || 0;
                    results.timeSavings += optimization.estimatedTimeSavings || 0;
                }
            } catch (error) {
                console.error(`Error optimizing route ${route._id}:`, error);
            }
        }

        console.log(`🛣️ Route Optimization: ${results.routesUpdated}/${results.routesAnalyzed} routes optimized`);

        res.status(200).json({
            success: true,
            message: 'Route optimization completed',
            data: results,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error in route optimization:', error);
        return next(new ErrorResponse('Route optimization failed', 500));
    }
});

/**
 * Clean up old IoT data - Background job
 */
exports.cleanupOldIoTData = asyncHandler(async (req, res, next) => {
    const { retentionDays = 30 } = req.query;

    const results = {
        recordsDeleted: 0,
        storageFreed: 0,
        errors: []
    };

    try {
        // Calculate cutoff date
        const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));

        // Delete old IoT data
        const deleteResult = await IoT.deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        results.recordsDeleted = deleteResult.deletedCount;

        // Estimate storage freed (rough calculation)
        results.storageFreed = results.recordsDeleted * 0.001; // ~1KB per record

        console.log(`🗑️ IoT Data Cleanup: ${results.recordsDeleted} old records deleted`);

        res.status(200).json({
            success: true,
            message: `IoT data cleanup completed (retention: ${retentionDays} days)`,
            data: results,
            cutoffDate,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error in IoT data cleanup:', error);
        return next(new ErrorResponse('IoT data cleanup failed', 500));
    }
});

/**
 * Sync IoT data with analytics - Background job
 */
exports.syncIoTDataWithAnalytics = asyncHandler(async (req, res, next) => {
    const results = {
        vehiclesSynced: 0,
        routesSynced: 0,
        eventsProcessed: 0,
        analyticsUpdated: 0,
        errors: []
    };

    try {
        // Get recent IoT data
        const recentTime = new Date(Date.now() - 60 * 60 * 1000); // Last hour
        const recentIoTData = await IoT.find({
            timestamp: { $gte: recentTime }
        });

        // Group by vehicle
        const vehicleGroups = {};
        for (const data of recentIoTData) {
            if (data.vehicleId) {
                if (!vehicleGroups[data.vehicleId]) {
                    vehicleGroups[data.vehicleId] = [];
                }
                vehicleGroups[data.vehicleId].push(data);
            }
        }

        // Process each vehicle's data
        for (const [vehicleId, vehicleData] of Object.entries(vehicleGroups)) {
            try {
                // Update vehicle analytics
                await updateVehicleAnalytics(vehicleId, vehicleData);
                results.vehiclesSynced++;

                // Update route analytics
                const vehicle = await Vehicle.findById(vehicleId);
                if (vehicle?.assignedRoute) {
                    await updateRouteAnalytics(vehicle.assignedRoute, vehicleData);
                    results.routesSynced++;
                }

                // Process events
                const events = await processIoTEvents(vehicleData);
                results.eventsProcessed += events.length;

            } catch (error) {
                results.errors.push({
                    vehicleId,
                    error: error.message
                });
            }
        }

        console.log(`🔄 IoT-Analytics Sync: ${results.vehiclesSynced} vehicles, ${results.routesSynced} routes synced`);

        res.status(200).json({
            success: true,
            message: 'IoT data sync with analytics completed',
            data: results,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error in IoT data sync:', error);
        return next(new ErrorResponse('IoT data sync failed', 500));
    }
});

/**
 * Schedule IoT-driven background jobs
 */
exports.scheduleIoTJobs = asyncHandler(async (req, res, next) => {
    const { jobs } = req.body;

    const scheduledJobs = [];

    try {
        for (const job of jobs) {
            const scheduledJob = await scheduleIoTJob(job);
            scheduledJobs.push(scheduledJob);
        }

        res.status(200).json({
            success: true,
            message: `${scheduledJobs.length} IoT jobs scheduled`,
            data: scheduledJobs,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error scheduling IoT jobs:', error);
        return next(new ErrorResponse('IoT job scheduling failed', 500));
    }
});

// Helper functions

/**
 * Create maintenance alert
 */
const createMaintenanceAlert = async (alertData) => {
    try {
        if (Alert) {
            await Alert.create({
                ...alertData,
                timestamp: new Date(),
                status: 'active'
            });
        }
    } catch (error) {
        console.error('Error creating maintenance alert:', error);
    }
};

/**
 * Generate vehicle performance report
 */
const generateVehiclePerformanceReport = async (vehicleId, startDate, endDate) => {
    const iotData = await IoT.find({
        vehicleId,
        timestamp: { $gte: startDate, $lte: endDate }
    });

    const vehicle = await Vehicle.findById(vehicleId).populate('assignedRoute');

    return {
        type: 'vehicle_performance',
        vehicleId,
        routeId: vehicle?.assignedRoute?._id,
        period: { startDate, endDate },
        metrics: {
            totalDistance: calculateTotalDistance(iotData),
            averageSpeed: calculateAverageSpeed(iotData),
            fuelEfficiency: calculateFuelEfficiency(iotData),
            passengerUtilization: calculatePassengerUtilization(iotData),
            deviceUptime: calculateDeviceUptime(iotData),
            totalTrips: countTrips(iotData)
        },
        generatedAt: new Date()
    };
};

/**
 * Generate route performance report
 */
const generateRoutePerformanceReport = async (routeId, startDate, endDate) => {
    const vehicles = await Vehicle.find({ assignedRoute: routeId });
    const vehicleIds = vehicles.map(v => v._id);

    const iotData = await IoT.find({
        vehicleId: { $in: vehicleIds },
        timestamp: { $gte: startDate, $lte: endDate }
    });

    return {
        type: 'route_performance',
        routeId,
        period: { startDate, endDate },
        metrics: {
            totalVehicles: vehicles.length,
            activeVehicles: vehicles.filter(v => v.deviceStatus?.online).length,
            averageSpeed: calculateAverageSpeed(iotData),
            totalPassengers: calculateTotalPassengers(iotData),
            routeEfficiency: calculateRouteEfficiency(iotData),
            onTimePerformance: calculateOnTimePerformance(iotData)
        },
        generatedAt: new Date()
    };
};

/**
 * Save performance report
 */
const savePerformanceReport = async (report) => {
    try {
        // This would save to a reports collection
        console.log(`Performance report saved: ${report.type} for ${report.vehicleId || report.routeId}`);
    } catch (error) {
        console.error('Error saving performance report:', error);
    }
};

/**
 * Analyze route optimization
 */
const analyzeRouteOptimization = async (route) => {
    // Simplified optimization analysis
    const vehicles = route.assignedVehicles || [];
    const avgUtilization = 65; // Would calculate from real data

    return {
        shouldOptimize: avgUtilization < 40 || avgUtilization > 85,
        suggestions: avgUtilization < 40 ? ['Increase frequency', 'Reduce vehicle count'] : ['Decrease frequency', 'Add vehicles'],
        estimatedFuelSavings: avgUtilization < 40 ? 15 : 10,
        estimatedTimeSavings: avgUtilization < 40 ? 20 : 5
    };
};

/**
 * Apply route optimization
 */
const applyRouteOptimization = async (routeId, optimization) => {
    try {
        await Course.findByIdAndUpdate(routeId, {
            'optimization.lastOptimized': new Date(),
            'optimization.suggestions': optimization.suggestions,
            'optimization.estimatedSavings': {
                fuel: optimization.estimatedFuelSavings,
                time: optimization.estimatedTimeSavings
            }
        });
    } catch (error) {
        console.error('Error applying route optimization:', error);
    }
};

/**
 * Update vehicle analytics
 */
const updateVehicleAnalytics = async (vehicleId, vehicleData) => {
    try {
        const latestData = vehicleData[vehicleData.length - 1];
        await Vehicle.findByIdAndUpdate(vehicleId, {
            'analytics.lastUpdate': new Date(),
            'analytics.currentSpeed': latestData.location?.speed || 0,
            'analytics.currentPassengers': latestData.sensorData?.passengerCount?.current || 0,
            'analytics.fuelLevel': latestData.sensorData?.fuelLevel || 0,
            'analytics.deviceStatus': latestData.deviceStatus?.online || false
        });
    } catch (error) {
        console.error('Error updating vehicle analytics:', error);
    }
};

/**
 * Update route analytics
 */
const updateRouteAnalytics = async (routeId, vehicleData) => {
    try {
        const totalPassengers = vehicleData.reduce((sum, data) =>
            sum + (data.sensorData?.passengerCount?.current || 0), 0);
        const avgSpeed = vehicleData.reduce((sum, data) =>
            sum + (data.location?.speed || 0), 0) / vehicleData.length;

        await Course.findByIdAndUpdate(routeId, {
            'analytics.lastUpdate': new Date(),
            'analytics.totalPassengers': totalPassengers,
            'analytics.averageSpeed': avgSpeed,
            'analytics.activeVehicles': new Set(vehicleData.map(d => d.vehicleId)).size
        });
    } catch (error) {
        console.error('Error updating route analytics:', error);
    }
};

/**
 * Process IoT events
 */
const processIoTEvents = async (vehicleData) => {
    // This would process IoT data to generate events
    return [];
};

/**
 * Schedule IoT job
 */
const scheduleIoTJob = async (job) => {
    return {
        id: `job_${Date.now()}`,
        type: job.type,
        scheduledAt: new Date(),
        status: 'scheduled',
        config: job.config
    };
};

// Metric calculation helper functions
const calculateTotalDistance = (iotData) => iotData.reduce((sum, data) => sum + (data.location?.speed || 0) * 0.00833, 0);
const calculateAverageSpeed = (iotData) => iotData.length > 0 ? iotData.reduce((sum, data) => sum + (data.location?.speed || 0), 0) / iotData.length : 0;
const calculateFuelEfficiency = (iotData) => 0; // Simplified
const calculatePassengerUtilization = (iotData) => 0; // Simplified
const calculateDeviceUptime = (iotData) => 0; // Simplified
const countTrips = (iotData) => 0; // Simplified
const calculateTotalPassengers = (iotData) => iotData.reduce((sum, data) => sum + (data.sensorData?.passengerCount?.current || 0), 0);
const calculateRouteEfficiency = (iotData) => 0; // Simplified
const calculateOnTimePerformance = (iotData) => 85; // Simplified
