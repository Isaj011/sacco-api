const Course = require('../models/Course');
const Vehicle = require('../models/Vehicle');
const IoT = require('../models/IoT');
const PassengerEvent = require('../models/PassengerEvent');

/**
 * Adjust schedule frequency based on IoT passenger demand data
 */
exports.adjustScheduleFromIoT = async (routeId, iotData) => {
    try {
        const route = await Course.findById(routeId);
        if (!route) return;

        const currentPassengers = iotData.sensorData?.passengerCount?.current || 0;
        const maxCapacity = route.maxCapacity || 50;
        const utilizationRate = currentPassengers / maxCapacity;

        let adjustmentType = null;
        let adjustmentReason = '';

        // High demand - increase frequency
        if (utilizationRate > 0.8) {
            adjustmentType = 'increase';
            adjustmentReason = `High passenger demand: ${currentPassengers}/${maxCapacity} (${(utilizationRate * 100).toFixed(1)}%)`;
            await updateScheduleFrequency(routeId, 'increase');
        }
        // Low demand - decrease frequency
        else if (utilizationRate < 0.3 && currentPassengers < 10) {
            adjustmentType = 'decrease';
            adjustmentReason = `Low passenger demand: ${currentPassengers}/${maxCapacity} (${(utilizationRate * 100).toFixed(1)}%)`;
            await updateScheduleFrequency(routeId, 'decrease');
        }

        if (adjustmentType) {
            console.log(`📅 ${adjustmentType} frequency for route ${route.routeName}: ${adjustmentReason}`);

            // Create schedule adjustment event
            await createScheduleAdjustmentEvent(routeId, adjustmentType, adjustmentReason, iotData);
        }

        return {
            adjustmentMade: !!adjustmentType,
            adjustmentType,
            adjustmentReason,
            utilizationRate,
            currentPassengers
        };
    } catch (error) {
        console.error('Error adjusting schedule from IoT:', error);
        return { adjustmentMade: false };
    }
};

/**
 * Update schedule frequency for a route
 */
const updateScheduleFrequency = async (routeId, adjustmentType) => {
    try {
        const route = await Course.findById(routeId);
        if (!route) return;

        // This would typically update a separate Schedule collection
        // For now, we'll store the adjustment in the route document
        const currentFrequency = route.scheduleFrequency || 30; // Default 30 minutes

        let newFrequency;
        if (adjustmentType === 'increase') {
            newFrequency = Math.max(10, currentFrequency - 10); // Increase frequency (decrease interval)
        } else {
            newFrequency = Math.min(60, currentFrequency + 10); // Decrease frequency (increase interval)
        }

        await Course.findByIdAndUpdate(routeId, {
            scheduleFrequency: newFrequency,
            lastScheduleAdjustment: new Date(),
            scheduleAdjustmentReason: `IoT-driven ${adjustmentType} based on passenger demand`
        });

        return newFrequency;
    } catch (error) {
        console.error('Error updating schedule frequency:', error);
    }
};

/**
 * Calculate delays based on IoT GPS data vs schedule
 */
exports.calculateDelaysFromIoT = async (vehicleId, iotData) => {
    try {
        const vehicle = await Vehicle.findById(vehicleId).populate('assignedRoute');
        if (!vehicle || !vehicle.assignedRoute) return [];

        const route = vehicle.assignedRoute;
        const currentTime = new Date();
        const currentLocation = iotData.location || vehicle.currentLocation;

        if (!currentLocation) return [];

        // Get scheduled stops and times
        const routeWithStops = await Course.findById(route._id).populate('stops');
        if (!routeWithStops.stops || routeWithStops.stops.length === 0) return [];

        const delays = [];

        for (const stop of routeWithStops.stops) {
            // Calculate expected arrival time based on schedule
            const expectedArrival = calculateExpectedArrival(vehicleId, stop._id);

            // Calculate actual ETA based on current location and speed
            const actualETA = calculateActualETA(currentLocation, stop.coordinates, iotData.location?.speed || 0);

            const delayMinutes = (actualETA - expectedArrival) / (1000 * 60);

            if (Math.abs(delayMinutes) > 2) { // Only report delays over 2 minutes
                delays.push({
                    stopId: stop._id,
                    stopName: stop.stopName,
                    expectedArrival,
                    actualETA,
                    delayMinutes: Math.round(delayMinutes),
                    isLate: delayMinutes > 0,
                    severity: Math.abs(delayMinutes) > 10 ? 'HIGH' : Math.abs(delayMinutes) > 5 ? 'MEDIUM' : 'LOW'
                });
            }
        }

        return delays;
    } catch (error) {
        console.error('Error calculating delays from IoT:', error);
        return [];
    }
};

/**
 * Calculate expected arrival time based on schedule
 */
const calculateExpectedArrival = async (vehicleId, stopId) => {
    try {
        // This would typically use the schedule data
        // For now, we'll use a simplified calculation
        const now = new Date();
        const stopOrder = await getStopOrder(stopId);
        const baseInterval = 30; // 30 minutes between stops
        const expectedTime = new Date(now.getTime() + (stopOrder * baseInterval * 60 * 1000));
        return expectedTime;
    } catch (error) {
        console.error('Error calculating expected arrival:', error);
        return new Date();
    }
};

/**
 * Get stop order in route
 */
const getStopOrder = async (stopId) => {
    try {
        // This would typically come from the route-stop relationship
        // For now, return a simple calculation
        return Math.floor(Math.random() * 10) + 1;
    } catch (error) {
        return 1;
    }
};

/**
 * Calculate actual ETA based on current location and speed
 */
const calculateActualETA = (currentLocation, stopLocation, currentSpeed) => {
    if (!currentLocation || !stopLocation || currentSpeed === 0) {
        return new Date(Date.now() + (30 * 60 * 1000)); // Default 30 minutes
    }

    const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        stopLocation.latitude,
        stopLocation.longitude
    );

    const travelTimeHours = distance / Math.max(currentSpeed, 1); // Avoid division by zero
    const travelTimeMinutes = travelTimeHours * 60;

    return new Date(Date.now() + (travelTimeMinutes * 60 * 1000));
};

/**
 * Notify about delays
 */
exports.notifyDelay = async (routeId, delays) => {
    try {
        if (!delays || delays.length === 0) return;

        const route = await Course.findById(routeId);
        if (!route) return;

        // Create delay notifications
        for (const delay of delays) {
            await createDelayNotification(routeId, delay);
        }

        console.log(`⚠️ Delay notifications sent for route ${route.routeName}: ${delays.length} stops affected`);
    } catch (error) {
        console.error('Error notifying delay:', error);
    }
};

/**
 * Create delay notification
 */
const createDelayNotification = async (routeId, delay) => {
    try {
        // This would typically create a notification in the database
        // For now, we'll just log it
        console.log(`Delay Alert: Route ${routeId} - ${delay.stopName} is ${delay.delayMinutes} minutes ${delay.isLate ? 'late' : 'early'}`);
    } catch (error) {
        console.error('Error creating delay notification:', error);
    }
};

/**
 * Create schedule adjustment event
 */
const createScheduleAdjustmentEvent = async (routeId, adjustmentType, reason, iotData) => {
    try {
        // This would typically create an audit log
        console.log(`Schedule Adjustment: Route ${routeId} - ${adjustmentType} - Reason: ${reason}`);
    } catch (error) {
        console.error('Error creating schedule adjustment event:', error);
    }
};

/**
 * Generate schedule performance metrics from IoT data
 */
exports.generateSchedulePerformance = async (routeId, timeRange) => {
    try {
        const route = await Course.findById(routeId).populate('assignedVehicles');
        if (!route) return {};

        const vehicles = route.assignedVehicles;
        let totalTrips = 0;
        let onTimeTrips = 0;
        let totalDelay = 0;
        let delayCount = 0;

        for (const vehicle of vehicles) {
            // Get IoT data for this vehicle in the time range
            const iotData = await IoT.find({
                vehicleId: vehicle._id,
                timestamp: { $gte: timeRange.start, $lte: timeRange.end }
            });

            // Get passenger events for this vehicle
            const events = await PassengerEvent.find({
                vehicleId: vehicle._id,
                timestamp: { $gte: timeRange.start, $lte: timeRange.end },
                eventType: { $in: ['TRIP_STARTED', 'TRIP_ENDED'] }
            });

            // Calculate metrics
            const tripCount = events.filter(e => e.eventType === 'TRIP_ENDED').length;
            totalTrips += tripCount;

            // Calculate delays (simplified)
            for (const data of iotData) {
                if (data.location && data.location.speed < 5) { // Assuming low speed means delay
                    totalDelay += 5; // Add 5 minutes for each slow data point
                    delayCount++;
                }
            }
        }

        const averageDelay = delayCount > 0 ? totalDelay / delayCount : 0;
        const onTimePercentage = totalTrips > 0 ? ((totalTrips - delayCount) / totalTrips) * 100 : 100;

        return {
            totalTrips,
            onTimeTrips: totalTrips - delayCount,
            onTimePercentage,
            averageDelay,
            scheduleAdherence: Math.max(0, 100 - (averageDelay * 2)), // Simplified calculation
            vehicles: vehicles.length,
            activeVehicles: vehicles.filter(v => v.deviceStatus?.online).length
        };
    } catch (error) {
        console.error('Error generating schedule performance:', error);
        return {};
    }
};

/**
 * Process schedule-related IoT data
 */
exports.processScheduleIoTData = async (deviceId, iotData) => {
    try {
        // Get device and vehicle
        const device = await IoT.findOne({ deviceId });
        if (!device || !device.vehicleId) return;

        const vehicle = await Vehicle.findById(device.vehicleId).populate('assignedRoute');
        if (!vehicle || !vehicle.assignedRoute) return;

        const routeId = vehicle.assignedRoute._id;

        // Adjust schedule based on passenger demand
        const scheduleAdjustment = await exports.adjustScheduleFromIoT(routeId, iotData);

        // Calculate delays
        const delays = await exports.calculateDelaysFromIoT(device.vehicleId, iotData);

        // Notify about significant delays
        if (delays.length > 0) {
            await exports.notifyDelay(routeId, delays);
        }

        return {
            scheduleAdjustment,
            delays,
            routeId,
            vehicleId: device.vehicleId
        };
    } catch (error) {
        console.error('Error processing schedule IoT data:', error);
        return {};
    }
};

/**
 * Calculate distance between two points
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
