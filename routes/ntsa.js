const express = require('express');
const {
    getVehicleComplianceStatus,
    getInsuranceExpiry,
    getInspectionStatus,
    getSafetyFeaturesCompliance,
    getDriverLicenseStatus,
    getDriverMedicalClearance,
    getDriverTrainingCertificates,
    getDriverPerformanceMetrics,
    getRouteSafetyAnalysis,
    getOvercrowdingReports,
    getIncidentHotspots,
    getRouteComplianceMetrics,
    getAllVehiclesCompliance,
    getVehicleByPlateNumber,
    getAllDriversCompliance,
    getDriverByNationalId,
    getCoursesCompliance,
    getCourseByRouteNumber,
    getFleetOverview
} = require('../controllers/ntsaController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// NTSA authentication middleware (you may want to create specific NTSA auth)
router.use(protect);
router.use(authorize('admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'));

// Vehicle compliance endpoints
router.route('/vehicles/compliance-status')
    .get(getVehicleComplianceStatus);

router.route('/vehicles/insurance-expiry')
    .get(getInsuranceExpiry);

router.route('/vehicles/inspection-status')
    .get(getInspectionStatus);

router.route('/vehicles/safety-features')
    .get(getSafetyFeaturesCompliance);

// NEW: Combined vehicle compliance endpoints
router.route('/vehicles/all-compliance')
    .get(getAllVehiclesCompliance);

router.route('/vehicles/plate/:plateNumber')
    .get(getVehicleByPlateNumber);

// Driver compliance endpoints
router.route('/drivers/license-status')
    .get(getDriverLicenseStatus);

router.route('/drivers/medical-clearance')
    .get(getDriverMedicalClearance);

router.route('/drivers/training-certificates')
    .get(getDriverTrainingCertificates);

router.route('/drivers/performance-metrics')
    .get(getDriverPerformanceMetrics);

// NEW: Combined driver compliance endpoints
router.route('/drivers/all-compliance')
    .get(getAllDriversCompliance);

router.route('/drivers/national-id/:nationalId')
    .get(getDriverByNationalId);

// Route safety analysis endpoints
router.route('/routes/safety-analysis')
    .get(getRouteSafetyAnalysis);

router.route('/routes/overcrowding-reports')
    .get(getOvercrowdingReports);

router.route('/routes/incident-hotspots')
    .get(getIncidentHotspots);

router.route('/routes/compliance-metrics')
    .get(getRouteComplianceMetrics);

// NEW: Course compliance endpoints
router.route('/courses/compliance')
    .get(getCoursesCompliance);

router.route('/courses/route/:routeNumber')
    .get(getCourseByRouteNumber);

// NEW: Fleet overview endpoint
router.route('/fleet/overview')
    .get(getFleetOverview);

module.exports = router;
