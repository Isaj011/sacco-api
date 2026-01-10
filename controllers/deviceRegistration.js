const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const IoT = require('../models/IoT');
const Vehicle = require('../models/Vehicle');
const PassengerEvent = require('../models/PassengerEvent');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');

// @desc    Register new IoT device and link to vehicle
// @route   POST /api/v1/iot/devices/register
// @access  Private
exports.registerDevice = asyncHandler(async (req, res, next) => {
    const { deviceId, deviceType, vehicleId, deviceName, capabilities, configuration } = req.body;

    // Check if device already exists
    const existingDevice = await IoT.findOne({ deviceId });
    if (existingDevice) {
        return next(new ErrorResponse('Device already registered', 400));
    }

    // Validate vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }

    // Check if vehicle already has a device
    if (vehicle.deviceId) {
        return next(new ErrorResponse('Vehicle already has a registered device', 400));
    }

    // Create device registration
    const device = await IoT.create({
        deviceId,
        deviceType,
        vehicleId,
        deviceName: deviceName || `${deviceType}_${deviceId}`,
        capabilities: capabilities || [],
        configuration: configuration || {},
        deviceStatus: {
            online: false,
            batteryLevel: 100,
            signalStrength: 5,
            lastSeen: new Date()
        },
        dataSource: 'DEVICE_REGISTRATION'
    });

    // Update vehicle with device information
    await Vehicle.findByIdAndUpdate(vehicleId, {
        deviceId,
        deviceType,
        deviceCapabilities: capabilities || [],
        deviceConfiguration: configuration || {},
        deviceStatus: {
            online: false,
            lastSeen: new Date()
        }
    });

    res.status(201).json({
        success: true,
        message: 'Device registered successfully',
        data: {
            device,
            vehicle: {
                id: vehicle._id,
                plateNumber: vehicle.plateNumber,
                model: vehicle.vehicleModel
            }
        }
    });
});

// @desc    Get all registered devices
// @route   GET /api/v1/iot/devices
// @access  Private
exports.getRegisteredDevices = asyncHandler(async (req, res, next) => {
    const devices = await IoT.find({ vehicleId: { $exists: true } })
        .populate('vehicleId', 'plateNumber vehicleModel operationalStatus')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: devices.length,
        data: devices
    });
});

// @desc    Get device details
// @route   GET /api/v1/iot/devices/:deviceId
// @access  Private
exports.getDeviceDetails = asyncHandler(async (req, res, next) => {
    const { deviceId } = req.params;

    const device = await IoT.findOne({ deviceId })
        .populate('vehicleId', 'plateNumber vehicleModel operationalStatus currentLocation');

    if (!device) {
        return next(new ErrorResponse('Device not found', 404));
    }

    res.status(200).json({
        success: true,
        data: device
    });
});

// @desc    Update device configuration
// @route   PUT /api/v1/iot/devices/:deviceId/config
// @access  Private
exports.updateDeviceConfig = asyncHandler(async (req, res, next) => {
    const { deviceId } = req.params;
    const { configuration } = req.body;

    const device = await IoT.findOne({ deviceId });
    if (!device) {
        return next(new ErrorResponse('Device not found', 404));
    }

    // Update device configuration
    device.configuration = { ...device.configuration, ...configuration };
    await device.save();

    // Update vehicle device configuration
    if (device.vehicleId) {
        await Vehicle.findByIdAndUpdate(device.vehicleId, {
            deviceConfiguration: device.configuration
        });
    }

    res.status(200).json({
        success: true,
        message: 'Device configuration updated successfully',
        data: device
    });
});

// @desc    Unlink device from vehicle
// @route   DELETE /api/v1/iot/devices/:deviceId/unlink
// @access  Private
exports.unlinkDevice = asyncHandler(async (req, res, next) => {
    const { deviceId } = req.params;

    const device = await IoT.findOne({ deviceId });
    if (!device) {
        return next(new ErrorResponse('Device not found', 404));
    }

    if (!device.vehicleId) {
        return next(new ErrorResponse('Device is not linked to any vehicle', 400));
    }

    // Remove device from vehicle
    await Vehicle.findByIdAndUpdate(device.vehicleId, {
        $unset: {
            deviceId: 1,
            deviceType: 1,
            deviceCapabilities: 1,
            deviceConfiguration: 1
        },
        deviceStatus: {
            online: false,
            lastSeen: new Date()
        }
    });

    // Remove vehicle from device
    device.vehicleId = undefined;
    await device.save();

    res.status(200).json({
        success: true,
        message: 'Device unlinked from vehicle successfully'
    });
});

// @desc    Get vehicles with active IoT devices
// @route   GET /api/v1/vehicles/iot-active
// @access  Private
exports.getVehiclesWithActiveDevices = asyncHandler(async (req, res, next) => {
    const vehicles = await Vehicle.find({ deviceId: { $exists: true } })
        .populate('assignedRoute', 'routeName routeNumber')
        .populate('currentDriver', 'driverName contactDetails')
        .sort({ 'deviceStatus.lastSeen': -1 });

    res.status(200).json({
        success: true,
        count: vehicles.length,
        data: vehicles
    });
});

// @desc    Get vehicle IoT status
// @route   GET /api/v1/vehicles/:vehicleId/iot-status
// @access  Private
exports.getVehicleIoTStatus = asyncHandler(async (req, res, next) => {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId)
        .populate('assignedRoute', 'routeName routeNumber');

    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }

    let deviceData = null;
    if (vehicle.deviceId) {
        deviceData = await IoT.findOne({ deviceId: vehicle.deviceId });
    }

    // Get recent IoT data
    const recentData = await IoT.find({
        deviceId: vehicle.deviceId
    })
        .sort({ timestamp: -1 })
        .limit(10);

    // Get recent passenger events
    const recentEvents = await PassengerEvent.find({
        vehicleId: vehicle._id
    })
        .sort({ timestamp: -1 })
        .limit(5);

    res.status(200).json({
        success: true,
        data: {
            vehicle: {
                id: vehicle._id,
                plateNumber: vehicle.plateNumber,
                model: vehicle.vehicleModel,
                status: vehicle.status,
                currentLocation: vehicle.currentLocation,
                deviceType: vehicle.deviceType,
                deviceCapabilities: vehicle.deviceCapabilities,
                deviceStatus: vehicle.deviceStatus,
                currentMetrics: vehicle.currentMetrics,
                lastIoTUpdate: vehicle.lastIoTUpdate
            },
            device: deviceData,
            recentIoTData: recentData,
            recentPassengerEvents: recentEvents
        }
    });
});

// @desc    Get vehicle location history
// @route   GET /api/v1/vehicles/:vehicleId/location-history
// @access  Private
exports.getVehicleLocationHistory = asyncHandler(async (req, res, next) => {
    const { vehicleId } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    // Build query
    const query = { vehicleId };

    // Add date range filter
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const locationHistory = await VehicleLocationHistory.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        count: locationHistory.length,
        data: locationHistory
    });
});
