const express = require('express');
const {
  getAlerts,
  getAlert,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  escalateAlert,
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

// Read roles shared across all GET-only alert routes
const READ_ROLES = ['admin', 'publisher', 'staff', 'ntsa_officer', 'ntsa_analyst', 'ntsa_inspector'];

// Main alerts routes
router.route('/')
  .get(authorize(...READ_ROLES), getAlerts);

router.route('/generate')
  .post(authorize('admin'), generateAlerts);

router.route('/stats')
  .get(authorize(...READ_ROLES), getAlertStatistics);

router.route('/trends')
  .get(authorize(...READ_ROLES), getAlertTrends);

router.route('/active')
  .get(authorize(...READ_ROLES), getActiveAlerts);

router.route('/bulk/acknowledge')
  .put(authorize('admin', 'publisher'), bulkAcknowledgeAlerts);

// Type and severity specific routes
router.route('/type/:type')
  .get(authorize(...READ_ROLES), getAlertsByType);

router.route('/severity/:severity')
  .get(authorize(...READ_ROLES), getAlertsBySeverity);

// Individual alert routes
router.route('/:id')
  .get(authorize(...READ_ROLES), getAlert)
  .delete(authorize('admin'), deleteAlert);

router.route('/:id/acknowledge')
  .put(authorize('admin', 'publisher'), acknowledgeAlert);

router.route('/:id/resolve')
  .put(authorize('admin', 'publisher'), resolveAlert);

router.route('/:id/dismiss')
  .put(authorize('admin', 'publisher'), dismissAlert);

router.route('/:id/escalate')
  .put(authorize('admin', 'publisher'), escalateAlert);

module.exports = router; 