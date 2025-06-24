const express = require('express');
const {
  getAlerts,
  getAlert,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  getAlertStatistics,
  getAlertsByType,
  getAlertsBySeverity,
  getActiveAlerts,
  generateAlerts,
  deleteAlert,
  bulkAcknowledgeAlerts,
  getAlertTrends
} = require('../controllers/alertsController');

const router = express.Router();

// Protect all routes
const { protect, authorize } = require('../middleware/auth');

// Apply protection to all routes
router.use(protect);

// Main alerts routes
router.route('/')
  .get(authorize('admin', 'publisher'), getAlerts);

router.route('/generate')
  .post(authorize('admin'), generateAlerts);

router.route('/stats')
  .get(authorize('admin', 'publisher'), getAlertStatistics);

router.route('/trends')
  .get(authorize('admin', 'publisher'), getAlertTrends);

router.route('/active')
  .get(authorize('admin', 'publisher'), getActiveAlerts);

router.route('/bulk/acknowledge')
  .put(authorize('admin', 'publisher'), bulkAcknowledgeAlerts);

// Type and severity specific routes
router.route('/type/:type')
  .get(authorize('admin', 'publisher'), getAlertsByType);

router.route('/severity/:severity')
  .get(authorize('admin', 'publisher'), getAlertsBySeverity);

// Individual alert routes
router.route('/:id')
  .get(authorize('admin', 'publisher'), getAlert)
  .delete(authorize('admin'), deleteAlert);

router.route('/:id/acknowledge')
  .put(authorize('admin', 'publisher'), acknowledgeAlert);

router.route('/:id/resolve')
  .put(authorize('admin', 'publisher'), resolveAlert);

router.route('/:id/dismiss')
  .put(authorize('admin', 'publisher'), dismissAlert);

module.exports = router; 