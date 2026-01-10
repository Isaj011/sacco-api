const express = require('express');
const {
    receiveIoTData,
    getDeviceData,
    getAllDevices,
    getIoTAnalytics,
    getDeviceAlerts,
    updateDeviceConfig
} = require('../controllers/iot');
const { protect, authorize } = require('../middleware/auth');
const { authenticateDevice, optionalDeviceAuth } = require('../middleware/simpleDeviceAuth');

const router = express.Router();

// Main IoT data ingestion endpoint
router
    .route('/data')
    .post(optionalDeviceAuth, receiveIoTData);

// Device management
router
    .route('/devices')
    .get(protect, getAllDevices);

router
    .route('/device/:deviceId')
    .get(protect, getDeviceData);

router
    .route('/device/:deviceId/config')
    .put(protect, updateDeviceConfig);

// Analytics and monitoring
router
    .route('/analytics')
    .get(protect, getIoTAnalytics);

router
    .route('/alerts')
    .get(protect, getDeviceAlerts);

module.exports = router;
