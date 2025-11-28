const SchoolVehicle = require('../models/SchoolVehicle');
const SchoolDriver = require('../models/SchoolDriver');
const SchoolRoute = require('../models/SchoolRoute');
const SchoolTrip = require('../models/SchoolTrip');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const School = require('../models/School');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

// @desc    Get NTSA dashboard overview
// @route   GET /api/v1/ntsa/dashboard
// @access  Private (NTSA)
exports.getDashboardOverview = asyncHandler(async (req, res, next) => {
    const { schoolId, startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    } else {
        // Default to last 30 days
        dateFilter.createdAt = {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };
    }

    // Get basic counts
    const schoolFilter = schoolId ? { school: schoolId } : {};

    const [
        totalSchools,
        totalVehicles,
        totalDrivers,
        totalRoutes,
        recentTrips,
        recentIncidents,
        activeAlerts
    ] = await Promise.all([
        School.countDocuments(schoolId ? { _id: schoolId } : {}),
        SchoolVehicle.countDocuments(schoolFilter),
        SchoolDriver.countDocuments(schoolFilter),
        SchoolRoute.countDocuments(schoolFilter),
        SchoolTrip.countDocuments({ ...schoolFilter, ...dateFilter }),
        Incident.countDocuments({ ...schoolFilter, ...dateFilter }),
        Alert.countDocuments({ ...schoolFilter, status: 'active' })
    ]);

    // Get compliance statistics
    const vehicleCompliance = await calculateVehicleCompliance(schoolFilter);
    const driverCompliance = await calculateDriverCompliance(schoolFilter);
    const routeCompliance = await calculateRouteCompliance(schoolFilter);

    // Get incident trends
    const incidentTrends = await calculateIncidentTrends(schoolFilter, dateFilter);

    // Get safety metrics
    const safetyMetrics = await calculateSafetyMetrics(schoolFilter, dateFilter);

    res.status(200).json({
        success: true,
        data: {
            overview: {
                totalSchools,
                totalVehicles,
                totalDrivers,
                totalRoutes,
                recentTrips,
                recentIncidents,
                activeAlerts
            },
            compliance: {
                vehicles: vehicleCompliance,
                drivers: driverCompliance,
                routes: routeCompliance
            },
            trends: {
                incidents: incidentTrends
            },
            safety: safetyMetrics
        }
    });
});

// @desc    Get compliance alerts
// @route   GET /api/v1/ntsa/compliance-alerts
// @access  Private (NTSA)
exports.getComplianceAlerts = asyncHandler(async (req, res, next) => {
    const { schoolId, type, severity, page = 1, limit = 50 } = req.query;

    const alerts = [];
    const schoolFilter = schoolId ? { school: schoolId } : {};

    // Vehicle compliance alerts
    const vehicleAlerts = await getVehicleComplianceAlerts(schoolFilter, type, severity);
    alerts.push(...vehicleAlerts);

    // Driver compliance alerts
    const driverAlerts = await getDriverComplianceAlerts(schoolFilter, type, severity);
    alerts.push(...driverAlerts);

    // Route compliance alerts
    const routeAlerts = await getRouteComplianceAlerts(schoolFilter, type, severity);
    alerts.push(...routeAlerts);

    // Sort alerts by severity and date
    alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (severityOrder[b.severity] !== severityOrder[a.severity]) {
            return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedAlerts = alerts.slice(startIndex, endIndex);

    res.status(200).json({
        success: true,
        count: paginatedAlerts.length,
        total: alerts.length,
        pages: Math.ceil(alerts.length / limit),
        currentPage: page,
        data: paginatedAlerts
    });
});

// @desc    Get fleet compliance analytics
// @route   GET /api/v1/ntsa/fleet-analytics
// @access  Private (NTSA)
exports.getFleetAnalytics = asyncHandler(async (req, res, next) => {
    const { schoolId, startDate, endDate } = req.query;

    const schoolFilter = schoolId ? { school: schoolId } : {};
    const dateFilter = buildDateFilter(startDate, endDate);

    // Get fleet overview
    const fleetOverview = await getFleetOverview(schoolFilter);

    // Get compliance trends
    const complianceTrends = await getComplianceTrends(schoolFilter, dateFilter);

    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics(schoolFilter, dateFilter);

    // Get risk assessment
    const riskAssessment = await getRiskAssessment(schoolFilter, dateFilter);

    res.status(200).json({
        success: true,
        data: {
            overview: fleetOverview,
            trends: complianceTrends,
            performance: performanceMetrics,
            risk: riskAssessment
        }
    });
});

// @desc    Get monthly compliance reports
// @route   GET /api/v1/ntsa/monthly-reports
// @access  Private (NTSA)
exports.getMonthlyReports = asyncHandler(async (req, res, next) => {
    const { schoolId, year, month } = req.query;

    const targetDate = new Date();
    if (year) targetDate.setFullYear(parseInt(year));
    if (month) targetDate.setMonth(parseInt(month) - 1);

    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const schoolFilter = schoolId ? { school: schoolId } : {};
    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    // Generate monthly report data
    const reportData = await generateMonthlyReport(schoolFilter, dateFilter);

    res.status(200).json({
        success: true,
        data: reportData
    });
});

// @desc    Get vehicle scan by registration number
// @route   GET /api/v1/ntsa/vehicle-scan/:registrationNumber
// @access  Private (NTSA)
exports.getVehicleByRegistration = asyncHandler(async (req, res, next) => {
    const { registrationNumber } = req.params;

    const vehicle = await SchoolVehicle.findOne({
        registrationNumber: registrationNumber.toUpperCase()
    })
        .populate('school', 'name code address')
        .populate('currentAssignment.driver', 'firstName lastName driverId contact.phone')
        .populate('currentAssignment.route', 'name routeId')
        .populate('createdBy', 'firstName lastName');

    if (!vehicle) {
        return next(new ErrorResponse(`Vehicle not found with registration number ${registrationNumber}`, 404));
    }

    // Calculate compliance status
    const complianceStatus = await calculateVehicleComplianceStatus(vehicle);

    // Get recent trips
    const recentTrips = await SchoolTrip.find({
        vehicle: vehicle._id,
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
        .populate('route', 'name routeId')
        .populate('driver', 'firstName lastName')
        .sort({ date: -1 })
        .limit(10);

    // Get recent incidents
    const recentIncidents = await Incident.find({
        vehicle: vehicle._id,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
        .sort({ createdAt: -1 })
        .limit(10);

    res.status(200).json({
        success: true,
        data: {
            vehicle,
            complianceStatus,
            recentTrips,
            recentIncidents
        }
    });
});

// @desc    Get driver verification by license number
// @route   GET /api/v1/ntsa/driver-verify/:licenseNumber
// @access  Private (NTSA)
exports.getDriverByLicense = asyncHandler(async (req, res, next) => {
    const { licenseNumber } = req.params;

    const driver = await SchoolDriver.findOne({
        'license.number': licenseNumber.toUpperCase()
    })
        .populate('school', 'name code address')
        .populate('assignedVehicle', 'registrationNumber make model')
        .populate('assignedRoute', 'name routeId')
        .populate('createdBy', 'firstName lastName');

    if (!driver) {
        return next(new ErrorResponse(`Driver not found with license number ${licenseNumber}`, 404));
    }

    // Calculate compliance status
    const complianceStatus = await calculateDriverComplianceStatus(driver);

    // Get recent trips
    const recentTrips = await SchoolTrip.find({
        driver: driver._id,
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
        .populate('vehicle', 'registrationNumber make model')
        .populate('route', 'name routeId')
        .sort({ date: -1 })
        .limit(10);

    // Get recent incidents
    const recentIncidents = await Incident.find({
        driver: driver._id,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
        .sort({ createdAt: -1 })
        .limit(10);

    res.status(200).json({
        success: true,
        data: {
            driver,
            complianceStatus,
            recentTrips,
            recentIncidents
        }
    });
});

// @desc    Get inspection report for vehicle
// @route   GET /api/v1/ntsa/inspection-report/:vehicleId
// @access  Private (NTSA)
exports.getInspectionReport = asyncHandler(async (req, res, next) => {
    const { vehicleId } = req.params;

    const vehicle = await SchoolVehicle.findById(vehicleId)
        .populate('school', 'name code address')
        .populate('currentAssignment.driver', 'firstName lastName driverId')
        .populate('createdBy', 'firstName lastName');

    if (!vehicle) {
        return next(new ErrorResponse(`Vehicle not found`, 404));
    }

    // Generate comprehensive inspection report
    const inspectionReport = await generateInspectionReport(vehicle);

    res.status(200).json({
        success: true,
        data: inspectionReport
    });
});

// @desc    Get compliance check for school
// @route   GET /api/v1/ntsa/compliance-check/:schoolId
// @access  Private (NTSA)
exports.getSchoolComplianceCheck = asyncHandler(async (req, res, next) => {
    const { schoolId } = req.params;

    const school = await School.findById(schoolId);
    if (!school) {
        return next(new ErrorResponse(`School not found`, 404));
    }

    const schoolFilter = { school: schoolId };

    // Get comprehensive compliance data
    const [
        vehicleCompliance,
        driverCompliance,
        routeCompliance,
        safetyMetrics,
        recentIncidents
    ] = await Promise.all([
        calculateVehicleCompliance(schoolFilter),
        calculateDriverCompliance(schoolFilter),
        calculateRouteCompliance(schoolFilter),
        calculateSafetyMetrics(schoolFilter, buildDateFilter()),
        Incident.find({ ...schoolFilter, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
            .populate('vehicle', 'registrationNumber')
            .populate('driver', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(10)
    ]);

    // Calculate overall compliance score
    const overallScore = Math.round(
        (vehicleCompliance.complianceRate * 0.4) +
        (driverCompliance.complianceRate * 0.3) +
        (routeCompliance.complianceRate * 0.3)
    );

    const complianceCheck = {
        school,
        overallComplianceScore: overallScore,
        complianceStatus: overallScore >= 80 ? 'Compliant' : overallScore >= 60 ? 'Partial' : 'Non-Compliant',
        vehicleCompliance,
        driverCompliance,
        routeCompliance,
        safetyMetrics,
        recentIncidents,
        lastUpdated: new Date()
    };

    res.status(200).json({
        success: true,
        data: complianceCheck
    });
});

// Helper functions
function buildDateFilter(startDate, endDate) {
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    } else {
        // Default to last 30 days
        dateFilter.createdAt = {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };
    }
    return dateFilter;
}

async function calculateVehicleCompliance(filter) {
    const vehicles = await SchoolVehicle.find(filter);
    const total = vehicles.length;

    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;

    vehicles.forEach(vehicle => {
        const score = calculateSafetyComplianceScore(vehicle.safety);
        if (score >= 80) compliant++;
        else if (score >= 60) partial++;
        else nonCompliant++;
    });

    return {
        total,
        compliant,
        partial,
        nonCompliant,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0
    };
}

async function calculateDriverCompliance(filter) {
    const drivers = await SchoolDriver.find(filter);
    const total = drivers.length;

    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;

    drivers.forEach(driver => {
        let score = 100;
        const now = new Date();

        // Check license validity
        if (driver.license.expiryDate && new Date(driver.license.expiryDate) < now) {
            score -= 50;
        }

        // Check medical clearance
        if (driver.medical.nextMedicalCheckup && new Date(driver.medical.nextMedicalCheckup) < now) {
            score -= 30;
        }

        if (score >= 80) compliant++;
        else if (score >= 60) partial++;
        else nonCompliant++;
    });

    return {
        total,
        compliant,
        partial,
        nonCompliant,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0
    };
}

async function calculateRouteCompliance(filter) {
    const routes = await SchoolRoute.find(filter);
    const total = routes.length;

    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;

    routes.forEach(route => {
        let score = 100;

        if (!route.assignedVehicle) score -= 30;
        if (!route.assignedDriver) score -= 30;

        if (score >= 80) compliant++;
        else if (score >= 60) partial++;
        else nonCompliant++;
    });

    return {
        total,
        compliant,
        partial,
        nonCompliant,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0
    };
}

async function calculateIncidentTrends(filter, dateFilter) {
    const incidents = await Incident.find({ ...filter, ...dateFilter });

    // Group by day
    const dailyIncidents = {};
    incidents.forEach(incident => {
        const date = incident.createdAt.toISOString().split('T')[0];
        dailyIncidents[date] = (dailyIncidents[date] || 0) + 1;
    });

    return {
        totalIncidents: incidents.length,
        dailyIncidents,
        severityBreakdown: {
            critical: incidents.filter(i => i.severity === 'critical').length,
            high: incidents.filter(i => i.severity === 'high').length,
            medium: incidents.filter(i => i.severity === 'medium').length,
            low: incidents.filter(i => i.severity === 'low').length
        }
    };
}

async function calculateSafetyMetrics(filter, dateFilter) {
    const trips = await SchoolTrip.find({ ...filter, ...dateFilter });
    const incidents = await Incident.find({ ...filter, ...dateFilter });

    return {
        totalTrips: trips.length,
        completedTrips: trips.filter(t => t.status === 'completed').length,
        incidents: incidents.length,
        injuryRate: trips.length > 0 ? (incidents.filter(i => i.type === 'injury').length / trips.length) * 100 : 0,
        accidentRate: trips.length > 0 ? (incidents.filter(i => i.type === 'accident').length / trips.length) * 100 : 0
    };
}

async function getVehicleComplianceAlerts(filter, type, severity) {
    const vehicles = await SchoolVehicle.find(filter);
    const alerts = [];
    const now = new Date();

    vehicles.forEach(vehicle => {
        const issues = [];

        // Insurance expiry
        if (vehicle.insurance.expiryDate) {
            const expiryDate = new Date(vehicle.insurance.expiryDate);
            const daysUntil = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

            if (daysUntil <= 0) {
                issues.push({
                    type: 'insurance',
                    severity: 'critical',
                    message: `Insurance expired for vehicle ${vehicle.registrationNumber}`,
                    createdAt: expiryDate
                });
            } else if (daysUntil <= 30) {
                issues.push({
                    type: 'insurance',
                    severity: daysUntil <= 7 ? 'high' : 'medium',
                    message: `Insurance expiring in ${daysUntil} days for vehicle ${vehicle.registrationNumber}`,
                    createdAt: now
                });
            }
        }

        // Safety features
        const requiredFeatures = ['firstAidKit', 'fireExtinguisher', 'emergencyExit', 'seatBelts'];
        const missingFeatures = requiredFeatures.filter(feature => !vehicle.safety[feature]);

        if (missingFeatures.length > 0) {
            issues.push({
                type: 'safety',
                severity: 'high',
                message: `Missing safety features on vehicle ${vehicle.registrationNumber}: ${missingFeatures.join(', ')}`,
                createdAt: now
            });
        }

        alerts.push(...issues);
    });

    return alerts.filter(alert => {
        if (type && alert.type !== type) return false;
        if (severity && alert.severity !== severity) return false;
        return true;
    });
}

async function getDriverComplianceAlerts(filter, type, severity) {
    const drivers = await SchoolDriver.find(filter);
    const alerts = [];
    const now = new Date();

    drivers.forEach(driver => {
        const issues = [];

        // License expiry
        if (driver.license.expiryDate) {
            const expiryDate = new Date(driver.license.expiryDate);
            const daysUntil = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

            if (daysUntil <= 0) {
                issues.push({
                    type: 'license',
                    severity: 'critical',
                    message: `License expired for driver ${driver.firstName} ${driver.lastName}`,
                    createdAt: expiryDate
                });
            } else if (daysUntil <= 60) {
                issues.push({
                    type: 'license',
                    severity: daysUntil <= 7 ? 'high' : 'medium',
                    message: `License expiring in ${daysUntil} days for driver ${driver.firstName} ${driver.lastName}`,
                    createdAt: now
                });
            }
        }

        alerts.push(...issues);
    });

    return alerts.filter(alert => {
        if (type && alert.type !== type) return false;
        if (severity && alert.severity !== severity) return false;
        return true;
    });
}

async function getRouteComplianceAlerts(filter, type, severity) {
    const routes = await SchoolRoute.find(filter);
    const alerts = [];

    routes.forEach(route => {
        const issues = [];

        // Overcrowding
        if (route.capacity > 0 && route.currentOccupancy > route.capacity) {
            issues.push({
                type: 'overcrowding',
                severity: 'high',
                message: `Route ${route.name} is overcrowded: ${route.currentOccupancy}/${route.capacity}`,
                createdAt: new Date()
            });
        }

        alerts.push(...issues);
    });

    return alerts.filter(alert => {
        if (type && alert.type !== type) return false;
        if (severity && alert.severity !== severity) return false;
        return true;
    });
}

function calculateSafetyComplianceScore(safety) {
    if (!safety) return 0;

    let score = 100;
    const requiredFeatures = ['firstAidKit', 'fireExtinguisher', 'emergencyExit', 'seatBelts'];

    const missingFeatures = requiredFeatures.filter(feature => !safety[feature]);
    score -= missingFeatures.length * 10;

    const optionalFeatures = ['gpsEnabled', 'speedGovernor', 'cctv', 'panicButton'];
    const presentOptional = optionalFeatures.filter(feature => safety[feature]);
    score += presentOptional.length * 5;

    if (safety.inspectionStatus === 'failed') {
        score -= 30;
    } else if (safety.inspectionStatus === 'pending') {
        score -= 15;
    }

    return Math.max(0, Math.min(100, score));
}

async function calculateVehicleComplianceStatus(vehicle) {
    const score = calculateSafetyComplianceScore(vehicle.safety);
    const now = new Date();

    return {
        score,
        status: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
        insuranceStatus: vehicle.insurance.expiryDate ?
            (new Date(vehicle.insurance.expiryDate) < now ? 'Expired' : 'Valid') : 'Missing',
        registrationStatus: vehicle.registration.expiryDate ?
            (new Date(vehicle.registration.expiryDate) < now ? 'Expired' : 'Valid') : 'Missing',
        inspectionStatus: vehicle.safety.inspectionStatus
    };
}

async function calculateDriverComplianceStatus(driver) {
    let score = 100;
    const now = new Date();

    if (driver.license.expiryDate && new Date(driver.license.expiryDate) < now) {
        score -= 50;
    }

    if (driver.medical.nextMedicalCheckup && new Date(driver.medical.nextMedicalCheckup) < now) {
        score -= 30;
    }

    return {
        score: Math.max(0, score),
        status: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
        licenseStatus: driver.license.expiryDate ?
            (new Date(driver.license.expiryDate) < now ? 'Expired' : 'Valid') : 'Missing',
        medicalStatus: driver.medical.nextMedicalCheckup ?
            (new Date(driver.medical.nextMedicalCheckup) < now ? 'Overdue' : 'Valid') : 'Missing'
    };
}

// Additional helper functions for dashboard analytics
async function getFleetOverview(filter) {
    const vehicles = await SchoolVehicle.find(filter);
    const drivers = await SchoolDriver.find(filter);
    const routes = await SchoolRoute.find(filter);

    return {
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'active').length,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter(d => d.status === 'active').length,
        totalRoutes: routes.length,
        activeRoutes: routes.filter(r => r.status === 'active').length
    };
}

async function getComplianceTrends(filter, dateFilter) {
    // This would typically aggregate compliance data over time
    // For now, return placeholder data
    return {
        vehicleCompliance: [
            { date: '2024-01', rate: 85 },
            { date: '2024-02', rate: 87 },
            { date: '2024-03', rate: 89 }
        ],
        driverCompliance: [
            { date: '2024-01', rate: 92 },
            { date: '2024-02', rate: 90 },
            { date: '2024-03', rate: 93 }
        ]
    };
}

async function getPerformanceMetrics(filter, dateFilter) {
    const trips = await SchoolTrip.find({ ...filter, ...dateFilter });

    return {
        totalTrips: trips.length,
        completedTrips: trips.filter(t => t.status === 'completed').length,
        averageTripDuration: trips.reduce((sum, t) => sum + (t.metrics.totalDuration || 0), 0) / trips.length,
        onTimePerformance: trips.filter(t => t.status === 'completed').length / trips.length * 100
    };
}

async function getRiskAssessment(filter, dateFilter) {
    const incidents = await Incident.find({ ...filter, ...dateFilter });

    return {
        totalIncidents: incidents.length,
        highRiskIncidents: incidents.filter(i => i.severity === 'high' || i.severity === 'critical').length,
        riskScore: incidents.length > 0 ? Math.max(0, 100 - (incidents.length * 5)) : 100,
        riskFactors: [
            { factor: 'Vehicle Age', impact: 'Medium' },
            { factor: 'Driver Experience', impact: 'Low' },
            { factor: 'Route Complexity', impact: 'High' }
        ]
    };
}

async function generateMonthlyReport(filter, dateFilter) {
    // Generate comprehensive monthly report
    return {
        period: dateFilter.createdAt,
        summary: {
            totalVehicles: await SchoolVehicle.countDocuments(filter),
            totalDrivers: await SchoolDriver.countDocuments(filter),
            totalTrips: await SchoolTrip.countDocuments({ ...filter, ...dateFilter }),
            totalIncidents: await Incident.countDocuments({ ...filter, ...dateFilter })
        },
        compliance: {
            vehicles: await calculateVehicleCompliance(filter),
            drivers: await calculateDriverCompliance(filter),
            routes: await calculateRouteCompliance(filter)
        },
        safety: await calculateSafetyMetrics(filter, dateFilter)
    };
}

async function generateInspectionReport(vehicle) {
    return {
        vehicle: {
            registrationNumber: vehicle.registrationNumber,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            school: vehicle.school
        },
        inspection: {
            date: vehicle.safety.lastInspection || new Date(),
            status: vehicle.safety.inspectionStatus,
            score: calculateSafetyComplianceScore(vehicle.safety)
        },
        safetyFeatures: vehicle.safety,
        compliance: await calculateVehicleComplianceStatus(vehicle),
        recommendations: generateSafetyRecommendations(vehicle.safety)
    };
}

function generateSafetyRecommendations(safety) {
    const recommendations = [];

    if (!safety.gpsEnabled) {
        recommendations.push('Install GPS tracking system');
    }
    if (!safety.speedGovernor) {
        recommendations.push('Install speed governor');
    }
    if (!safety.firstAidKit) {
        recommendations.push('Equip vehicle with first aid kit');
    }
    if (!safety.fireExtinguisher) {
        recommendations.push('Equip vehicle with fire extinguisher');
    }
    if (!safety.cctv) {
        recommendations.push('Install CCTV system for monitoring');
    }

    return recommendations;
}
