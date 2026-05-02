const Route = require('../models/Route');
const Vehicle = require('../models/Vehicle');
const IoT = require('../models/IoT');
const PassengerEvent = require('../models/PassengerEvent');

/**
 * Update route information based on IoT data
 */
exports.updateRouteFromIoT = async (vehicleId, iotData) => {
    try {
        const vehicle = await Vehicle.findById(vehicleId).populate('assignedRoute');
        if (!vehicle || !vehicle.assignedRoute) return;

        const route = vehicle.assignedRoute;

        // Update route with real-time data
        await Route.findByIdAndUpdate(route._id, {
            currentLocation: {
                latitude: iotData.location?.latitude || vehicle.currentLocation?.latitude,
                longitude: iotData.location?.longitude || vehicle.currentLocation?.longitude,
                lastUpdated: new Date().toISOString()
            },
            currentPassengers: iotData.sensorData?.passengerCount?.current || 0,
            // Update route performance metrics
            'performance.averageSpeed': iotData.location?.speed || route.performance?.averageSpeed || 0,
            'performance.onTimePercentage': await calculateOnTimePercentage(route._id, vehicleId),
            lastUpdated: new Date()
        });

        console.log(`📍 Updated route ${route.routeName} with IoT data from vehicle ${vehicleId}`);
    } catch (error) {
        console.error('Error updating route from IoT:', error);
    }
};

/**
 * Calculate on-time performance percentage
 */
const calculateOnTimePercentage = async (routeId, vehicleId) => {
    try {
        // Get recent trips for this vehicle on this route
        const recentTrips = await PassengerEvent.aggregate([
            {
                $match: {
                    vehicleId: vehicleId,
                    eventType: 'TRIP_ENDED',
                    timestamp: { $gte: Date.now() - (7 * 24 * 60 * 60 * 1000) } // Last 7 days
                }
            },
            {
                $group: {
                    _id: null,
                    totalTrips: { $sum: 1 },
                    onTimeTrips: {
                        $sum: {
                            $cond: [
                                { $lte: [{ $subtract: ['$timestamp', '$plannedTimestamp'] }, 300000] }, // 5 minutes tolerance
                                1, 0
                            ]
                        }
                    }
                }
            }
        ]);

        if (recentTrips.length > 0 && recentTrips[0].totalTrips > 0) {
            return (recentTrips[0].onTimeTrips / recentTrips[0].totalTrips) * 100;
        }
        return 85; // Default on-time percentage
    } catch (error) {
        console.error('Error calculating on-time percentage:', error);
        return 85;
    }
};

/**
 * Check if vehicle is following assigned route
 */
exports.checkRouteAdherence = async (vehicleId, currentLocation) => {
    try {
        const vehicle = await Vehicle.findById(vehicleId).populate('assignedRoute');
        if (!vehicle || !vehicle.assignedRoute || !currentLocation) return { adhering: true, deviation: 0 };

        const route = vehicle.assignedRoute;

        // Get route waypoints (simplified - in real implementation, you'd have detailed route geometry)
        const routeStops = await Route.findById(route._id).populate('stops');

        if (!routeStops.stops || routeStops.stops.length === 0) {
            return { adhering: true, deviation: 0 };
        }

        // Find nearest point on route (simplified calculation)
        let minDistance = Infinity;
        let nearestStop = null;

        for (const stop of routeStops.stops) {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                stop.coordinates.latitude,
                stop.coordinates.longitude
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestStop = stop;
            }
        }

        // Consider deviation if more than 500m from route
        const isAdhering = minDistance < 0.5; // 500 meters

        return {
            adhering: isAdhering,
            deviation: minDistance,
            nearestStop: nearestStop?.stopName
        };
    } catch (error) {
        console.error('Error checking route adherence:', error);
        return { adhering: true, deviation: 0 };
    }
};

/**
 * Calculate ETA for next stops based on current location and speed
 */
exports.calculateETA = async (vehicleId) => {
    try {
        const vehicle = await Vehicle.findById(vehicleId).populate('assignedRoute');
        if (!vehicle || !vehicle.assignedRoute) return [];

        const route = vehicle.assignedRoute;
        const currentLocation = vehicle.currentLocation;
        const currentSpeed = vehicle.currentMetrics?.speed || 0;

        if (!currentLocation || currentSpeed === 0) return [];

        // Get route stops
        const routeWithStops = await Route.findById(route._id).populate('stops');
        if (!routeWithStops.stops || routeWithStops.stops.length === 0) return [];

        const etas = [];

        for (const stop of routeWithStops.stops) {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                stop.coordinates.latitude,
                stop.coordinates.longitude
            );

            const travelTime = currentSpeed > 0 ? (distance / currentSpeed) * 60 : 0; // minutes
            const eta = new Date(Date.now() + (travelTime * 60 * 1000));

            etas.push({
                stopId: stop._id,
                stopName: stop.stopName,
                eta: eta,
                distance: distance,
                estimatedTravelTime: travelTime
            });
        }

        // Sort by ETA
        etas.sort((a, b) => a.eta - b.eta);

        return etas.slice(0, 5); // Return next 5 stops
    } catch (error) {
        console.error('Error calculating ETA:', error);
        return [];
    }
};

/**
 * Update route performance metrics based on IoT data
 */
exports.updateRoutePerformance = async (routeId, iotData) => {
    try {
        const route = await Route.findById(routeId);
        if (!route) return;

        // Get all vehicles on this route
        const vehicles = await Vehicle.find({ assignedRoute: routeId });

        let totalSpeed = 0;
        let totalPassengers = 0;
        let activeVehicles = 0;

        for (const vehicle of vehicles) {
            if (vehicle.deviceStatus?.online) {
                totalSpeed += vehicle.currentMetrics?.speed || 0;
                totalPassengers += vehicle.currentMetrics?.passengerCount || 0;
                activeVehicles++;
            }
        }

        const avgSpeed = activeVehicles > 0 ? totalSpeed / activeVehicles : 0;
        const avgPassengers = activeVehicles > 0 ? totalPassengers / activeVehicles : 0;

        // Update route performance
        await Route.findByIdAndUpdate(routeId, {
            'performance.averageSpeed': avgSpeed,
            currentPassengers: totalPassengers,
            'performance.activeVehicles': activeVehicles,
            'performance.utilization': route.maxCapacity > 0 ? (avgPassengers / route.maxCapacity) * 100 : 0
        });

        console.log(`📊 Updated performance for route ${route.routeName}: ${avgPassengers} avg passengers, ${avgSpeed} avg speed`);
    } catch (error) {
        console.error('Error updating route performance:', error);
    }
};

/**
 * Detect route deviations and generate alerts
 */
exports.detectRouteDeviations = async (vehicleId, iotData) => {
    try {
        if (!iotData.location) return [];

        const adherence = await exports.checkRouteAdherence(vehicleId, iotData.location);
        const alerts = [];

        if (!adherence.adhering) {
            alerts.push({
                type: 'ROUTE_DEVIATION',
                severity: adherence.deviation > 1 ? 'HIGH' : 'MEDIUM',
                message: `Vehicle ${vehicleId} is ${adherence.deviation.toFixed(2)}km off route`,
                vehicleId,
                location: iotData.location,
                nearestStop: adherence.nearestStop,
                timestamp: new Date()
            });
        }

        return alerts;
    } catch (error) {
        console.error('Error detecting route deviations:', error);
        return [];
    }
};

/**
 * Calculate distance between two points (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Process route-related IoT data
 */
exports.processRouteIoTData = async (deviceId, iotData) => {
    try {
        // Get device and vehicle
        const device = await IoT.findOne({ deviceId });
        if (!device || !device.vehicleId) return;

        const vehicleId = device.vehicleId;

        // Update route with IoT data
        await exports.updateRouteFromIoT(vehicleId, iotData);

        // Update route performance
        await exports.updateRoutePerformance(device.vehicleId, iotData);

        // Check for route deviations
        const deviationAlerts = await exports.detectRouteDeviations(vehicleId, iotData);

        // Calculate ETA updates
        const etaUpdates = await exports.calculateETA(vehicleId);

        return {
            routeUpdated: true,
            performanceUpdated: true,
            alerts: deviationAlerts,
            etaUpdates
        };
    } catch (error) {
        console.error('Error processing route IoT data:', error);
        return {
            routeUpdated: false,
            performanceUpdated: false,
            alerts: [],
            etaUpdates: []
        };
    }
};
