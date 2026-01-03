const express = require('express');
const {
    receiveEvent,
    getTripEvents,
    getRecentEvents,
    getTripStatistics,
    getActiveTrips,
    getPassengerAnalytics,
    getEventsHealth
} = require('../controllers/passengerEvents');
const { authenticateDevice, validateEventData } = require('../middleware/simpleDeviceAuth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Main event ingestion endpoint (matches your simple requirements)
// Apply device authentication and data validation
router
    .route('/')
    .post(authenticateDevice, validateEventData, receiveEvent)
    .get(protect, getRecentEvents);

// Health check endpoint
router
    .route('/health')
    .get(getEventsHealth);

// Trip-specific routes (require authentication)
router
    .route('/trip/:tripId')
    .get(protect, getTripEvents);

router
    .route('/trip/:tripId/stats')
    .get(protect, getTripStatistics);

// Analytics and monitoring (require authentication)
router
    .route('/trips/active')
    .get(protect, getActiveTrips);

router
    .route('/analytics/passengers')
    .get(protect, getPassengerAnalytics);

module.exports = router;
