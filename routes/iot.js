const express = require('express');
const {
    receiveIoTData,
    getDeviceData,
    getAllDevices,
    getIoTAnalytics,
    getDeviceAlerts,
    updateDeviceConfig
} = require('../controllers/iot');

const router = express.Router();

// Main IoT data ingestion endpoint
router
    .route('/data')
    .post(receiveIoTData);

// Device management
router
    .route('/devices')
    .get(getAllDevices);

router
    .route('/device/:deviceId')
    .get(getDeviceData);

router
    .route('/device/:deviceId/config')
    .put(updateDeviceConfig);

// Analytics and monitoring
router
    .route('/analytics')
    .get(getIoTAnalytics);

router
    .route('/alerts')
    .get(getDeviceAlerts);

module.exports = router;
