const Vehicle = require('../models/Vehicle');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');
const PassengerEvent = require('../models/PassengerEvent');
const IoT = require('../models/IoT');

/**
 * Update vehicle location from IoT device data
 */
exports.updateVehicleLocation = async (vehicleId, location, deviceId) => {
    try {
        // Update vehicle current location
        await Vehicle.findByIdAndUpdate(vehicleId, {
            currentLocation: {
                latitude: location.latitude,
                longitude: location.longitude,
                updatedAt: new Date(location.timestamp)
            },
            'currentMetrics.speed': location.speed || 0,
            lastIoTUpdate: new Date(),
            'deviceStatus.lastSeen': new Date(),
            'deviceStatus.online': true
        });

        // Create location history entry
        await VehicleLocationHistory.create({
            vehicleId,
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                altitude: location.altitude,
                accuracy: location.accuracy
            },
            timestamp: new Date(location.timestamp),
            speed: {
                current: location.speed,
                heading: location.heading
            },
            dataSource: 'IOT_DEVICE',
            deviceId
        });

        console.log(`📍 Updated location for vehicle ${vehicleId} from device ${deviceId}`);
    } catch (error) {
        console.error('Error updating vehicle location:', error);
    }
};

/**
 * Update vehicle status from IoT device data
 */
exports.updateVehicleStatus = async (vehicleId, vehicleStatus, deviceId) => {
    try {
        const updateData = {
            lastIoTUpdate: new Date(),
            'deviceStatus.lastSeen': new Date(),
            'deviceStatus.online': true
        };

        // Update operational status based on engine status
        if (vehicleStatus.engineOn !== undefined) {
            updateData.operationalStatus = vehicleStatus.engineOn;
        }

        // Update current speed
        if (vehicleStatus.speed !== undefined) {
            updateData['currentMetrics.speed'] = vehicleStatus.speed;
        }

        // Update fuel level if available
        if (vehicleStatus.fuelLevel !== undefined) {
            updateData['currentMetrics.fuelLevel'] = vehicleStatus.fuelLevel;
        }

        // Update engine temperature if available
        if (vehicleStatus.engineTemperature !== undefined) {
            updateData['currentMetrics.engineTemperature'] = vehicleStatus.engineTemperature;
        }

        await Vehicle.findByIdAndUpdate(vehicleId, updateData);

        console.log(`🔄 Updated status for vehicle ${vehicleId} from device ${deviceId}`);
    } catch (error) {
        console.error('Error updating vehicle status:', error);
    }
};

/**
 * Generate passenger events from IoT sensor data
 */
exports.generateEventsFromSensorData = async (deviceId, sensorData, gps) => {
    const events = [];

    try {
        // Get device info
        const device = await IoT.findOne({ deviceId });
        if (!device || !device.vehicleId) return events;

        // Get current trip ID (simplified - in real implementation, you'd have active trip management)
        const tripId = `TRIP_${Date.now()}`;

        // Process passenger count changes
        if (sensorData.passengerCount) {
            const { current, seated, standing, change } = sensorData.passengerCount;

            // Update vehicle metrics
            await Vehicle.findByIdAndUpdate(device.vehicleId, {
                'currentMetrics.passengerCount': current || 0,
                'currentMetrics.seatedPassengers': seated || 0,
                'currentMetrics.standingPassengers': standing || 0
            });

            // Generate events based on changes
            if (change && change.startsWith('+')) {
                const passengerCount = parseInt(change.substring(1));
                events.push({
                    eventType: 'PASSENGER_BOARDED',
                    tripId,
                    vehicleId: device.vehicleId,
                    passengerCount,
                    timestamp: Date.now(),
                    gps: gps || await getCurrentGPS(device.vehicleId),
                    deviceId
                });
            } else if (change && change.startsWith('-')) {
                const passengerCount = parseInt(change.substring(1));
                events.push({
                    eventType: 'PASSENGER_ALIGHTED',
                    tripId,
                    vehicleId: device.vehicleId,
                    passengerCount,
                    timestamp: Date.now(),
                    gps: gps || await getCurrentGPS(device.vehicleId),
                    deviceId
                });
            }
        }

        // Process seat sensor data
        if (sensorData.seatSensors) {
            for (const seat of sensorData.seatSensors) {
                if (seat.occupied) {
                    events.push({
                        eventType: 'PASSENGER_SEATED',
                        tripId,
                        vehicleId: device.vehicleId,
                        zoneId: seat.seatId,
                        zoneType: 'SEAT',
                        timestamp: seat.timestamp || Date.now(),
                        gps: gps || await getCurrentGPS(device.vehicleId),
                        deviceId
                    });
                }
            }
        }

        // Process standing area sensors
        if (sensorData.standingSensors) {
            for (const standingArea of sensorData.standingSensors) {
                if (standingArea.occupied) {
                    events.push({
                        eventType: 'PASSENGER_STANDING',
                        tripId,
                        vehicleId: device.vehicleId,
                        zoneId: standingArea.areaId,
                        zoneType: 'STANDING_AREA',
                        timestamp: standingArea.timestamp || Date.now(),
                        gps: gps || await getCurrentGPS(device.vehicleId),
                        deviceId
                    });
                }
            }
        }

        // Process door sensors for trip events
        if (sensorData.doorSensors) {
            const anyDoorOpen = Object.values(sensorData.doorSensors).some(status => status === 'open');

            if (anyDoorOpen && !await isDoorCurrentlyOpen(device.vehicleId)) {
                // Door opened - could be start of passenger boarding/alighting
                events.push({
                    eventType: 'DOOR_OPENED',
                    tripId,
                    vehicleId: device.vehicleId,
                    timestamp: Date.now(),
                    gps: gps || await getCurrentGPS(device.vehicleId),
                    deviceId
                });
            } else if (!anyDoorOpen && await isDoorCurrentlyOpen(device.vehicleId)) {
                // Door closed - could be end of passenger boarding/alighting
                events.push({
                    eventType: 'DOOR_CLOSED',
                    tripId,
                    vehicleId: device.vehicleId,
                    timestamp: Date.now(),
                    gps: gps || await getCurrentGPS(device.vehicleId),
                    deviceId
                });
            }
        }

        // Save generated events
        if (events.length > 0) {
            await PassengerEvent.insertMany(events);
            console.log(`🚌 Generated ${events.length} passenger events from device ${deviceId}`);
        }

        return events;
    } catch (error) {
        console.error('Error generating passenger events:', error);
        return events;
    }
};

/**
 * Get current GPS location for vehicle
 */
const getCurrentGPS = async (vehicleId) => {
    try {
        const vehicle = await Vehicle.findById(vehicleId);
        if (vehicle && vehicle.currentLocation) {
            return {
                latitude: vehicle.currentLocation.latitude,
                longitude: vehicle.currentLocation.longitude,
                accuracy: 10,
                timestamp: vehicle.currentLocation.updatedAt
            };
        }
    } catch (error) {
        console.error('Error getting current GPS:', error);
    }

    // Return default location if no GPS data available
    return {
        latitude: -1.2921,
        longitude: 36.8219,
        accuracy: 100,
        timestamp: Date.now()
    };
};

/**
 * Check if door is currently open (simplified implementation)
 */
const isDoorCurrentlyOpen = async (vehicleId) => {
    try {
        const recentEvent = await PassengerEvent.findOne({
            vehicleId,
            eventType: { $in: ['DOOR_OPENED', 'DOOR_CLOSED'] }
        }).sort({ timestamp: -1 });

        return recentEvent && recentEvent.eventType === 'DOOR_OPENED';
    } catch (error) {
        console.error('Error checking door status:', error);
        return false;
    }
};

/**
 * Broadcast IoT updates to connected clients
 */
exports.broadcastIoTUpdate = async (vehicleId, updateData, io) => {
    try {
        if (io && vehicleId) {
            io.to(`vehicle_${vehicleId}`).emit('iot_update', {
                type: 'IOT_UPDATE',
                vehicleId,
                data: updateData,
                timestamp: new Date()
            });
        }
    } catch (error) {
        console.error('Error broadcasting IoT update:', error);
    }
};

/**
 * Process device health data
 */
exports.processDeviceHealth = async (deviceId, deviceStatus) => {
    try {
        const device = await IoT.findOne({ deviceId });
        if (!device || !device.vehicleId) return;

        const updateData = {
            'deviceStatus.lastSeen': new Date(),
            'deviceStatus.online': true
        };

        if (deviceStatus.batteryLevel !== undefined) {
            updateData['deviceStatus.batteryLevel'] = deviceStatus.batteryLevel;
        }

        if (deviceStatus.signalStrength !== undefined) {
            updateData['deviceStatus.signalStrength'] = deviceStatus.signalStrength;
        }

        await Vehicle.findByIdAndUpdate(device.vehicleId, updateData);

        // Generate alerts if needed
        const alerts = [];

        if (deviceStatus.batteryLevel < 20) {
            alerts.push({
                type: 'LOW_BATTERY',
                severity: deviceStatus.batteryLevel < 10 ? 'CRITICAL' : 'HIGH',
                message: `Device battery is critically low: ${deviceStatus.batteryLevel}%`,
                deviceId,
                vehicleId: device.vehicleId
            });
        }

        if (deviceStatus.signalStrength < 2) {
            alerts.push({
                type: 'POOR_SIGNAL',
                severity: 'MEDIUM',
                message: `Device signal strength is poor: ${deviceStatus.signalStrength}/5`,
                deviceId,
                vehicleId: device.vehicleId
            });
        }

        return alerts;
    } catch (error) {
        console.error('Error processing device health:', error);
        return [];
    }
};
