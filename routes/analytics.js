const express = require('express');
const {
  getBusinessAnalytics,
  getFinancialMetrics,
  getOperationalEfficiency,
  getComplianceData,
  getServiceQualityMetrics,
  getPassengerExperience,
  getLiveOperationsData,
  getPredictiveAnalytics,
  getDashboardData,
  exportAnalytics,
  getRealTimeAlerts,
  acknowledgeAlert,
  getAlertStatistics,
  getHistoricalTrends,
  getDemandAnalysis,
  getRiskAssessment,
  getMarketIntelligence
} = require('../controllers/analyticsController');

const router = express.Router();

// Protect all routes
const { protect, authorize } = require('../middleware/auth');

// Apply protection to all routes
router.use(protect);

// Business Analytics Routes
router.route('/business')
  .get(authorize('admin', 'publisher'), getBusinessAnalytics);

router.route('/financial')
  .get(authorize('admin', 'publisher'), getFinancialMetrics);

router.route('/operational')
  .get(authorize('admin', 'publisher'), getOperationalEfficiency);

// Compliance Routes
router.route('/compliance')
  .get(authorize('admin', 'publisher'), getComplianceData);

// Service Quality Routes
router.route('/service-quality')
  .get(authorize('admin', 'publisher'), getServiceQualityMetrics);

router.route('/passenger-experience')
  .get(authorize('admin', 'publisher'), getPassengerExperience);

// Real-time Monitoring Routes
router.route('/live-operations')
  .get(authorize('admin', 'publisher'), getLiveOperationsData);

router.route('/predictive')
  .get(authorize('admin', 'publisher'), getPredictiveAnalytics);

// Dashboard Routes
router.route('/dashboard')
  .get(authorize('admin', 'publisher'), getDashboardData);

// Export Routes
router.route('/export')
  .get(authorize('admin'), exportAnalytics);

// Alerts and Trends Routes
router.route('/alerts')
  .get(authorize('admin', 'publisher'), getRealTimeAlerts);

router.route('/alerts/stats')
  .get(authorize('admin', 'publisher'), getAlertStatistics);

router.route('/alerts/:id/acknowledge')
  .put(authorize('admin', 'publisher'), acknowledgeAlert);

router.route('/trends')
  .get(authorize('admin', 'publisher'), getHistoricalTrends);

// Additional Analytics Routes
router.route('/demand-analysis')
  .get(authorize('admin', 'publisher'), getDemandAnalysis);

router.route('/risk-assessment')
  .get(authorize('admin', 'publisher'), getRiskAssessment);

router.route('/market-intelligence')
  .get(authorize('admin', 'publisher'), getMarketIntelligence);

module.exports = router; 