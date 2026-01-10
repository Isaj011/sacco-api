const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    registerDevice,
    getRegisteredDevices,
    getDeviceDetails,
    updateDeviceConfig,
    unlinkDevice,
    getVehiclesWithActiveDevices,
    getVehicleIoTStatus,
    getVehicleLocationHistory
} = require('../controllers/deviceRegistration');

// Device registration and management
router.route('/register')
    .post(protect, registerDevice);

router.route('/')
    .get(protect, getRegisteredDevices);

router.route('/:deviceId')
    .get(protect, getDeviceDetails);

router.route('/:deviceId/config')
    .put(protect, updateDeviceConfig);

router.route('/:deviceId/unlink')
    .delete(protect, unlinkDevice);

// Vehicle IoT status endpoints
router.route('/vehicles/iot-active')
    .get(protect, getVehiclesWithActiveDevices);

router.route('/vehicles/:vehicleId/iot-status')
    .get(protect, getVehicleIoTStatus);

router.route('/vehicles/:vehicleId/location-history')
    .get(protect, getVehicleLocationHistory);

module.exports = router;
