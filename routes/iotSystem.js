const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getIoTPerformanceAnalytics,
    getIoTDashboardData
} = require('../controllers/iotAnalytics');
const {
    getIoTAlerts,
    processIoTAlerts,
    getAlertStatistics,
    resolveAlert,
    getActiveAlerts
} = require('../controllers/iotAlerts');
const {
    runIoTMaintenanceCheck,
    generateIoTPerformanceReport,
    optimizeRoutesFromIoT,
    cleanupOldIoTData,
    syncIoTDataWithAnalytics,
    scheduleIoTJobs
} = require('../controllers/iotBackgroundJobs');

// IoT Analytics Routes
router.route('/analytics/performance')
    .get(protect, getIoTPerformanceAnalytics);

router.route('/analytics/dashboard')
    .get(protect, getIoTDashboardData);

// IoT Alerts Routes
router.route('/alerts')
    .get(protect, getIoTAlerts)
    .post(protect, processIoTAlerts);

router.route('/alerts/statistics')
    .get(protect, getAlertStatistics);

router.route('/alerts/active')
    .get(protect, getActiveAlerts);

router.route('/alerts/:alertId/resolve')
    .put(protect, resolveAlert);

// IoT Background Jobs Routes
router.route('/jobs/maintenance-check')
    .post(protect, runIoTMaintenanceCheck);

router.route('/jobs/performance-report')
    .post(protect, generateIoTPerformanceReport);

router.route('/jobs/route-optimization')
    .post(protect, optimizeRoutesFromIoT);

router.route('/jobs/data-cleanup')
    .post(protect, cleanupOldIoTData);

router.route('/jobs/analytics-sync')
    .post(protect, syncIoTDataWithAnalytics);

router.route('/jobs/schedule')
    .post(protect, scheduleIoTJobs);

module.exports = router;
