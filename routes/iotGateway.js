const express = require('express');
const { ingest, health } = require('../controllers/iotGatewayController');
const { optionalDeviceAuth } = require('../middleware/simpleDeviceAuth');

const router = express.Router();

/**
 * POST /api/v1/gateway/ingest
 * Main event ingestion endpoint — receives batches from Android IoT devices.
 * Uses optionalDeviceAuth so devices can send during development without
 * a registered device key; swap for authenticateDevice in production.
 */
router.post('/ingest', optionalDeviceAuth, ingest);

/**
 * GET /api/v1/gateway/health
 * Connectivity check — Android device pings on startup to confirm API is reachable.
 */
router.get('/health', health);

module.exports = router;
