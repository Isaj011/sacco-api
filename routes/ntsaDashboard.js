const express = require('express');
const {
    getDashboardOverview,
    getComplianceAlerts,
    getFleetAnalytics,
    getMonthlyReports,
    getVehicleByRegistration,
    getDriverByLicense,
    getInspectionReport,
    getSchoolComplianceCheck
} = require('../controllers/ntsaDashboardController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// NTSA authentication middleware
router.use(protect);
router.use(authorize('admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'));

// Dashboard endpoints
router.route('/dashboard')
    .get(getDashboardOverview);

router.route('/compliance-alerts')
    .get(getComplianceAlerts);

router.route('/fleet-analytics')
    .get(getFleetAnalytics);

router.route('/monthly-reports')
    .get(getMonthlyReports);

// Field officer access endpoints
router.route('/vehicle-scan/:registrationNumber')
    .get(getVehicleByRegistration);

router.route('/driver-verify/:licenseNumber')
    .get(getDriverByLicense);

router.route('/inspection-report/:vehicleId')
    .get(getInspectionReport);

router.route('/compliance-check/:schoolId')
    .get(getSchoolComplianceCheck);

module.exports = router;
