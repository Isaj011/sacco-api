const express = require('express');
const {
  getComplianceSummary,
  getDomainCompliance,
  getEntityCompliance,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  getNTSAPending,
  runComplianceJob,
  runAnalyticsJob,
  getEntityAnalytics
} = require('../controllers/monitoringController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All monitoring routes require authentication
router.use(protect);

// ── Compliance overview ───────────────────────────────────────────────
router.get('/compliance',                   authorize('admin'), getComplianceSummary);
router.get('/compliance/:domain',           authorize('admin'), getDomainCompliance);
router.get('/compliance/entity/:entityId',  getEntityCompliance);

// Manual job trigger (admin only)
router.post('/compliance/run', authorize('admin'), runComplianceJob);

// ── Alerts ────────────────────────────────────────────────────────────
router.get('/alerts',                           getAlerts);
router.patch('/alerts/:id/acknowledge',         acknowledgeAlert);
router.patch('/alerts/:id/resolve',             resolveAlert);

// ── NTSA feed ─────────────────────────────────────────────────────────
router.get('/ntsa/pending', authorize('admin'), getNTSAPending);

// ── Analytics ─────────────────────────────────────────────────────────
router.post('/analytics/run',           authorize('admin'), runAnalyticsJob);
router.get('/analytics/:entityId',      getEntityAnalytics);

module.exports = router;
