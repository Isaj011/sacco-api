const express = require('express');
const {
  getVehicleLocationHistory,
  getVehicleLocationHistoryByVehicle,
  getLocationHistoryAnalytics,
  getRealTimeVehicleStatus,
  getTriggerAlertsHistory,
  getPerformanceMetrics
} = require('../controllers/vehicleLocationHistory');

const router = express.Router();

// Get vehicle location history with filters
router.route('/')
  .get(getVehicleLocationHistory);

// Get vehicle location history by vehicle ID
router.route('/vehicle/:vehicleId')
  .get(getVehicleLocationHistoryByVehicle);

// Get location history analytics
router.route('/analytics')
  .get(getLocationHistoryAnalytics);

// Get real-time vehicle status
router.route('/realtime')
  .get(getRealTimeVehicleStatus);

// Get trigger alerts history
router.route('/triggers')
  .get(getTriggerAlertsHistory);

// Get performance metrics
router.route('/performance')
  .get(getPerformanceMetrics);

module.exports = router; 