const SchoolVehicle = require('../models/SchoolVehicle');
const SchoolDriver = require('../models/SchoolDriver');
const SchoolRoute = require('../models/SchoolRoute');
const SchoolTrip = require('../models/SchoolTrip');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const School = require('../models/School');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Course = require('../models/Course');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

// @desc    Get vehicle compliance status
// @route   GET /api/v1/ntsa/vehicles/compliance-status
// @access  Private (NTSA)
exports.getVehicleComplianceStatus = asyncHandler(async (req, res, next) => {
    const { schoolId, status, page = 1, limit = 100 } = req.query;

    // Build query
    const query = {};
    if (schoolId) query.school = schoolId;
    if (status) query.status = status;

    const vehicles = await SchoolVehicle.find(query)
        .populate('school', 'name code')
        .populate('currentAssignment.driver', 'firstName lastName driverId')
        .populate('currentAssignment.route', 'name routeId')
        .sort({ registrationNumber: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    // Calculate compliance metrics
    const complianceData = vehicles.map(vehicle => {
        const now = new Date();
        const insuranceExpiry = vehicle.insurance?.expiryDate ? new Date(vehicle.insurance.expiryDate) : null;
        const registrationExpiry = vehicle.registration?.expiryDate ? new Date(vehicle.registration.expiryDate) : null;
        const lastInspection = vehicle.safety?.lastInspection ? new Date(vehicle.safety.lastInspection) : null;

        // Calculate compliance score (0-100)
        let score = 100;
        const issues = [];

        // Insurance compliance
        if (!insuranceExpiry || insuranceExpiry < now) {
            score -= 30;
            issues.push('Insurance expired or missing');
        } else if (insuranceExpiry < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            score -= 10;
            issues.push('Insurance expiring soon');
        }

        // Registration compliance
        if (!registrationExpiry || registrationExpiry < now) {
            score -= 25;
            issues.push('Registration expired or missing');
        } else if (registrationExpiry < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            score -= 5;
            issues.push('Registration expiring soon');
        }

        // Safety inspection compliance
        if (!lastInspection) {
            score -= 20;
            issues.push('No inspection record');
        } else if (lastInspection < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)) {
            score -= 15;
            issues.push('Annual inspection overdue');
        }

        // Safety features compliance
        const requiredSafetyFeatures = ['firstAidKit', 'fireExtinguisher', 'emergencyExit', 'seatBelts'];
        const missingFeatures = requiredSafetyFeatures.filter(feature => !vehicle.safety[feature]);
        if (missingFeatures.length > 0) {
            score -= missingFeatures.length * 5;
            issues.push(`Missing safety features: ${missingFeatures.join(', ')}`);
        }

        return {
            vehicleId: vehicle._id,
            registrationNumber: vehicle.registrationNumber,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            vehicleType: vehicle.vehicleType,
            school: vehicle.school,
            currentAssignment: vehicle.currentAssignment,
            complianceScore: Math.max(0, score),
            complianceStatus: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
            issues,
            insuranceStatus: insuranceExpiry ? (insuranceExpiry < now ? 'Expired' : 'Valid') : 'Missing',
            registrationStatus: registrationExpiry ? (registrationExpiry < now ? 'Expired' : 'Valid') : 'Missing',
            inspectionStatus: lastInspection ? (lastInspection < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) ? 'Overdue' : 'Valid') : 'Missing',
            safetyFeatures: {
                gpsEnabled: vehicle.safety.gpsEnabled,
                speedGovernor: vehicle.safety.speedGovernor,
                firstAidKit: vehicle.safety.firstAidKit,
                fireExtinguisher: vehicle.safety.fireExtinguisher,
                emergencyExit: vehicle.safety.emergencyExit,
                seatBelts: vehicle.safety.seatBelts,
                cctv: vehicle.safety.cctv,
                panicButton: vehicle.safety.panicButton
            }
        };
    });

    const total = await SchoolVehicle.countDocuments(query);

    res.status(200).json({
        success: true,
        count: complianceData.length,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        data: complianceData
    });
});

// @desc    Get vehicles with insurance expiring soon
// @route   GET /api/v1/ntsa/vehicles/insurance-expiry
// @access  Private (NTSA)
exports.getInsuranceExpiry = asyncHandler(async (req, res, next) => {
    const { days = 90, schoolId } = req.query;
    const cutoffDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const query = {
        'insurance.expiryDate': { $lte: cutoffDate, $gte: new Date() }
    };
    if (schoolId) query.school = schoolId;

    const vehicles = await SchoolVehicle.find(query)
        .populate('school', 'name code')
        .sort({ 'insurance.expiryDate': 1 });

    const expiryData = vehicles.map(vehicle => ({
        vehicleId: vehicle._id,
        registrationNumber: vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        school: vehicle.school,
        insurance: {
            provider: vehicle.insurance.provider,
            policyNumber: vehicle.insurance.policyNumber,
            type: vehicle.insurance.type,
            expiryDate: vehicle.insurance.expiryDate,
            daysUntilExpiry: Math.ceil((vehicle.insurance.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
        }
    }));

    res.status(200).json({
        success: true,
        count: expiryData.length,
        data: expiryData
    });
});

// @desc    Get vehicle inspection status
// @route   GET /api/v1/ntsa/vehicles/inspection-status
// @access  Private (NTSA)
exports.getInspectionStatus = asyncHandler(async (req, res, next) => {
    const { schoolId, status } = req.query;

    const query = {};
    if (schoolId) query.school = schoolId;
    if (status) query['safety.inspectionStatus'] = status;

    const vehicles = await SchoolVehicle.find(query)
        .populate('school', 'name code')
        .sort({ 'safety.lastInspection': -1 });

    const inspectionData = vehicles.map(vehicle => {
        const lastInspection = vehicle.safety.lastInspection;
        const isOverdue = lastInspection ? new Date(lastInspection) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) : true;

        return {
            vehicleId: vehicle._id,
            registrationNumber: vehicle.registrationNumber,
            make: vehicle.make,
            model: vehicle.model,
            school: vehicle.school,
            lastInspection: vehicle.safety.lastInspection,
            inspectionStatus: vehicle.safety.inspectionStatus,
            isOverdue,
            daysSinceInspection: lastInspection ? Math.floor((Date.now() - new Date(lastInspection)) / (1000 * 60 * 60 * 24)) : null,
            nextInspectionDue: lastInspection ? new Date(new Date(lastInspection).getTime() + 365 * 24 * 60 * 60 * 1000) : null
        };
    });

    res.status(200).json({
        success: true,
        count: inspectionData.length,
        data: inspectionData
    });
});

// @desc    Get vehicle safety features compliance
// @route   GET /api/v1/ntsa/vehicles/safety-features
// @access  Private (NTSA)
exports.getSafetyFeaturesCompliance = asyncHandler(async (req, res, next) => {
    const { schoolId, feature } = req.query;

    const query = {};
    if (schoolId) query.school = schoolId;
    if (feature) query[`safety.${feature}`] = false;

    const vehicles = await SchoolVehicle.find(query)
        .populate('school', 'name code')
        .sort({ registrationNumber: 1 });

    const safetyData = vehicles.map(vehicle => ({
        vehicleId: vehicle._id,
        registrationNumber: vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        school: vehicle.school,
        safetyFeatures: {
            gpsEnabled: vehicle.safety.gpsEnabled,
            speedGovernor: vehicle.safety.speedGovernor,
            speedLimit: vehicle.safety.speedLimit,
            firstAidKit: vehicle.safety.firstAidKit,
            fireExtinguisher: vehicle.safety.fireExtinguisher,
            emergencyExit: vehicle.safety.emergencyExit,
            seatBelts: vehicle.safety.seatBelts,
            cctv: vehicle.safety.cctv,
            panicButton: vehicle.safety.panicButton,
            lastInspection: vehicle.safety.lastInspection,
            inspectionStatus: vehicle.safety.inspectionStatus
        },
        complianceScore: calculateSafetyComplianceScore(vehicle.safety)
    }));

    // Calculate overall compliance statistics
    const totalVehicles = safetyData.length;
    const compliantVehicles = safetyData.filter(v => v.complianceScore >= 80).length;
    const partialCompliance = safetyData.filter(v => v.complianceScore >= 60 && v.complianceScore < 80).length;
    const nonCompliant = safetyData.filter(v => v.complianceScore < 60).length;

    res.status(200).json({
        success: true,
        count: safetyData.length,
        statistics: {
            totalVehicles,
            compliantVehicles,
            partialCompliance,
            nonCompliant,
            overallComplianceRate: totalVehicles > 0 ? Math.round((compliantVehicles / totalVehicles) * 100) : 0
        },
        data: safetyData
    });
});

// @desc    Get driver license status
// @route   GET /api/v1/ntsa/drivers/license-status
// @access  Private (NTSA)
exports.getDriverLicenseStatus = asyncHandler(async (req, res, next) => {
    const { schoolId, status, page = 1, limit = 100 } = req.query;

    const query = {};
    if (schoolId) query.school = schoolId;
    if (status) query.status = status;

    const drivers = await SchoolDriver.find(query)
        .populate('school', 'name code')
        .populate('assignedVehicle', 'registrationNumber make model')
        .populate('assignedRoute', 'name routeId')
        .sort({ lastName: 1, firstName: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const licenseData = drivers.map(driver => {
        const licenseExpiry = driver.license.expiryDate ? new Date(driver.license.expiryDate) : null;
        const now = new Date();
        const isExpired = licenseExpiry && licenseExpiry < now;
        const expiringSoon = licenseExpiry && licenseExpiry < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        return {
            driverId: driver._id,
            driverIdNumber: driver.driverId,
            firstName: driver.firstName,
            lastName: driver.lastName,
            fullName: `${driver.firstName} ${driver.lastName}`,
            school: driver.school,
            license: {
                number: driver.license.number,
                type: driver.license.type,
                issueDate: driver.license.issueDate,
                expiryDate: driver.license.expiryDate,
                authority: driver.license.authority,
                status: isExpired ? 'Expired' : expiringSoon ? 'Expiring Soon' : 'Valid',
                daysUntilExpiry: licenseExpiry ? Math.ceil((licenseExpiry - now) / (1000 * 60 * 60 * 24)) : null
            },
            contact: {
                phone: driver.contact.phone,
                email: driver.contact.email
            },
            employment: {
                employeeId: driver.employment.employeeId,
                position: driver.employment.position,
                status: driver.employment.status,
                hireDate: driver.employment.hireDate
            },
            currentAssignment: {
                vehicle: driver.assignedVehicle,
                route: driver.assignedRoute
            }
        };
    });

    const total = await SchoolDriver.countDocuments(query);

    res.status(200).json({
        success: true,
        count: licenseData.length,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        data: licenseData
    });
});

// @desc    Get driver medical clearance status
// @route   GET /api/v1/ntsa/drivers/medical-clearance
// @access  Private (NTSA)
exports.getDriverMedicalClearance = asyncHandler(async (req, res, next) => {
    const { schoolId, status } = req.query;

    const query = {};
    if (schoolId) query.school = schoolId;

    const drivers = await SchoolDriver.find(query)
        .populate('school', 'name code')
        .sort({ lastName: 1, firstName: 1 });

    const medicalData = drivers.map(driver => {
        const lastMedicalCheckup = driver.medical.lastMedicalCheckup ? new Date(driver.medical.lastMedicalCheckup) : null;
        const nextMedicalCheckup = driver.medical.nextMedicalCheckup ? new Date(driver.medical.nextMedicalCheckup) : null;
        const now = new Date();
        const isOverdue = nextMedicalCheckup && nextMedicalCheckup < now;
        const dueSoon = nextMedicalCheckup && nextMedicalCheckup < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        return {
            driverId: driver._id,
            driverIdNumber: driver.driverId,
            firstName: driver.firstName,
            lastName: driver.lastName,
            fullName: `${driver.firstName} ${driver.lastName}`,
            school: driver.school,
            medical: {
                bloodGroup: driver.medical.bloodGroup,
                conditions: driver.medical.conditions || [],
                allergies: driver.medical.allergies || [],
                medications: driver.medical.medications || [],
                doctorName: driver.medical.doctorName,
                doctorPhone: driver.medical.doctorPhone,
                lastMedicalCheckup: driver.medical.lastMedicalCheckup,
                nextMedicalCheckup: driver.medical.nextMedicalCheckup,
                status: isOverdue ? 'Overdue' : dueSoon ? 'Due Soon' : 'Valid',
                daysUntilDue: nextMedicalCheckup ? Math.ceil((nextMedicalCheckup - now) / (1000 * 60 * 60 * 24)) : null
            }
        };
    });

    res.status(200).json({
        success: true,
        count: medicalData.length,
        data: medicalData
    });
});

// @desc    Get driver training certificates
// @route   GET /api/v1/ntsa/drivers/training-certificates
// @access  Private (NTSA)
exports.getDriverTrainingCertificates = asyncHandler(async (req, res, next) => {
    const { schoolId, expiringSoon } = req.query;

    const query = { school: schoolId };
    const drivers = await SchoolDriver.find(query)
        .populate('school', 'name code')
        .sort({ lastName: 1, firstName: 1 });

    const trainingData = [];
    const now = new Date();

    drivers.forEach(driver => {
        driver.training.forEach(training => {
            const expiryDate = training.expiryDate ? new Date(training.expiryDate) : null;
            const isExpired = expiryDate && expiryDate < now;
            const expiringSoon = expiryDate && expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            // Filter if only expiring soon requested
            if (expiringSoon && !isExpired && !expiringSoon) return;

            trainingData.push({
                driverId: driver._id,
                driverIdNumber: driver.driverId,
                driverName: `${driver.firstName} ${driver.lastName}`,
                school: driver.school,
                training: {
                    name: training.name,
                    provider: training.provider,
                    completionDate: training.completionDate,
                    expiryDate: training.expiryDate,
                    certificateUrl: training.certificateUrl,
                    status: isExpired ? 'Expired' : expiringSoon ? 'Expiring Soon' : 'Valid',
                    daysUntilExpiry: expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null
                }
            });
        });
    });

    res.status(200).json({
        success: true,
        count: trainingData.length,
        data: trainingData
    });
});

// @desc    Get driver performance metrics
// @route   GET /api/v1/ntsa/drivers/performance-metrics
// @access  Private (NTSA)
exports.getDriverPerformanceMetrics = asyncHandler(async (req, res, next) => {
    const { schoolId, startDate, endDate } = req.query;

    // Build date range
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.date = {};
        if (startDate) dateFilter.date.$gte = new Date(startDate);
        if (endDate) dateFilter.date.$lte = new Date(endDate);
    } else {
        // Default to last 90 days
        dateFilter.date = {
            $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        };
    }

    // Get trips for the period
    const tripQuery = { ...dateFilter };
    if (schoolId) tripQuery.school = schoolId;

    const trips = await SchoolTrip.find(tripQuery)
        .populate('driver', 'firstName lastName driverId')
        .populate('vehicle', 'registrationNumber');

    // Calculate performance metrics per driver
    const driverMetrics = {};

    trips.forEach(trip => {
        if (!trip.driver) return;

        const driverKey = trip.driver._id.toString();
        if (!driverMetrics[driverKey]) {
            driverMetrics[driverKey] = {
                driverId: trip.driver._id,
                driverIdNumber: trip.driver.driverId,
                driverName: `${trip.driver.firstName} ${trip.driver.lastName}`,
                totalTrips: 0,
                completedTrips: 0,
                cancelledTrips: 0,
                delayedTrips: 0,
                totalDistance: 0,
                totalDuration: 0,
                totalStudentsTransported: 0,
                incidents: 0,
                delays: 0,
                onTimeRate: 0,
                completionRate: 0,
                safetyScore: 100
            };
        }

        const metrics = driverMetrics[driverKey];
        metrics.totalTrips++;

        if (trip.status === 'completed') {
            metrics.completedTrips++;
            metrics.totalDistance += trip.metrics.totalDistance || 0;
            metrics.totalDuration += trip.metrics.totalDuration || 0;
            metrics.totalStudentsTransported += trip.attendance.totalDroppedOff || 0;
        } else if (trip.status === 'cancelled') {
            metrics.cancelledTrips++;
        } else if (trip.status === 'delayed') {
            metrics.delayedTrips++;
            metrics.delays += trip.metrics.delays?.length || 0;
        }

        metrics.incidents += trip.incidents?.length || 0;
    });

    // Calculate rates and scores
    Object.values(driverMetrics).forEach(metrics => {
        metrics.onTimeRate = metrics.totalTrips > 0 ?
            Math.round(((metrics.totalTrips - metrics.delayedTrips) / metrics.totalTrips) * 100) : 0;
        metrics.completionRate = metrics.totalTrips > 0 ?
            Math.round((metrics.completedTrips / metrics.totalTrips) * 100) : 0;

        // Calculate safety score based on incidents and delays
        if (metrics.totalTrips > 0) {
            const incidentRate = metrics.incidents / metrics.totalTrips;
            const delayRate = metrics.delays / metrics.totalTrips;
            metrics.safetyScore = Math.max(0, 100 - (incidentRate * 50) - (delayRate * 10));
        }
    });

    const performanceData = Object.values(driverMetrics);

    res.status(200).json({
        success: true,
        count: performanceData.length,
        data: performanceData
    });
});

// @desc    Get route safety analysis
// @route   GET /api/v1/ntsa/routes/safety-analysis
// @access  Private (NTSA)
exports.getRouteSafetyAnalysis = asyncHandler(async (req, res, next) => {
    const { schoolId, startDate, endDate } = req.query;

    // Build date range
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.date = {};
        if (startDate) dateFilter.date.$gte = new Date(startDate);
        if (endDate) dateFilter.date.$lte = new Date(endDate);
    } else {
        // Default to last 90 days
        dateFilter.date = {
            $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        };
    }

    // Get routes
    const routeQuery = schoolId ? { school: schoolId } : {};
    const routes = await SchoolRoute.find(routeQuery)
        .populate('school', 'name code')
        .populate('assignedVehicle', 'registrationNumber')
        .populate('assignedDriver', 'firstName lastName');

    // Get trips for analysis
    const tripQuery = { ...dateFilter };
    if (schoolId) tripQuery.school = schoolId;

    const trips = await SchoolTrip.find(tripQuery);

    // Calculate safety metrics per route
    const safetyData = routes.map(route => {
        const routeTrips = trips.filter(trip => trip.route.toString() === route._id.toString());
        const totalTrips = routeTrips.length;
        const completedTrips = routeTrips.filter(trip => trip.status === 'completed').length;
        const incidents = routeTrips.reduce((sum, trip) => sum + (trip.incidents?.length || 0), 0);
        const delays = routeTrips.reduce((sum, trip) => sum + (trip.metrics.delays?.length || 0), 0);
        const totalStudents = routeTrips.reduce((sum, trip) => sum + (trip.attendance.totalDroppedOff || 0), 0);

        // Calculate safety score
        let safetyScore = 100;
        if (totalTrips > 0) {
            const incidentRate = incidents / totalTrips;
            const delayRate = delays / totalTrips;
            safetyScore = Math.max(0, 100 - (incidentRate * 50) - (delayRate * 10));
        }

        return {
            routeId: route._id,
            routeIdNumber: route.routeId,
            name: route.name,
            school: route.school,
            type: route.type,
            status: route.status,
            distance: route.distance,
            duration: route.duration,
            capacity: route.capacity,
            currentOccupancy: route.currentOccupancy,
            utilizationRate: route.capacity > 0 ? Math.round((route.currentOccupancy / route.capacity) * 100) : 0,
            assignedVehicle: route.assignedVehicle,
            assignedDriver: route.assignedDriver,
            safetyMetrics: {
                totalTrips,
                completedTrips,
                incidents,
                delays,
                totalStudents,
                completionRate: totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0,
                safetyScore: Math.round(safetyScore),
                riskLevel: safetyScore >= 80 ? 'Low' : safetyScore >= 60 ? 'Medium' : 'High'
            },
            stops: route.stops.map(stop => ({
                name: stop.name,
                type: stop.type,
                sequence: stop.sequence,
                studentsCount: stop.students?.length || 0
            }))
        };
    });

    res.status(200).json({
        success: true,
        count: safetyData.length,
        data: safetyData
    });
});

// @desc    Get overcrowding reports
// @route   GET /api/v1/ntsa/routes/overcrowding-reports
// @access  Private (NTSA)
exports.getOvercrowdingReports = asyncHandler(async (req, res, next) => {
    const { schoolId, startDate, endDate } = req.query;

    // Build date range
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.date = {};
        if (startDate) dateFilter.date.$gte = new Date(startDate);
        if (endDate) dateFilter.date.$lte = new Date(endDate);
    } else {
        // Default to last 30 days
        dateFilter.date = {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };
    }

    const tripQuery = { ...dateFilter };
    if (schoolId) tripQuery.school = schoolId;

    const trips = await SchoolTrip.find(tripQuery)
        .populate('route', 'name routeId capacity')
        .populate('vehicle', 'registrationNumber capacity')
        .populate('driver', 'firstName lastName');

    const overcrowdingData = [];

    trips.forEach(trip => {
        if (!trip.route || !trip.route.capacity) return;

        const utilizationRate = trip.route.capacity > 0 ?
            (trip.currentOccupancy / trip.route.capacity) * 100 : 0;

        const isOvercrowded = utilizationRate > 100;
        const isAtRisk = utilizationRate > 90 && utilizationRate <= 100;

        if (isOvercrowded || isAtRisk) {
            overcrowdingData.push({
                tripId: trip._id,
                date: trip.date,
                route: trip.route,
                vehicle: trip.vehicle,
                driver: trip.driver,
                capacity: trip.route.capacity,
                currentOccupancy: trip.currentOccupancy,
                utilizationRate: Math.round(utilizationRate),
                status: isOvercrowded ? 'Overcrowded' : 'At Risk',
                enrolledStudents: trip.attendance.totalEnrolled,
                pickedUpStudents: trip.attendance.totalPickedUp,
                droppedOffStudents: trip.attendance.totalDroppedOff
            });
        }
    });

    res.status(200).json({
        success: true,
        count: overcrowdingData.length,
        data: overcrowdingData
    });
});

// @desc    Get incident hotspots
// @route   GET /api/v1/ntsa/routes/incident-hotspots
// @access  Private (NTSA)
exports.getIncidentHotspots = asyncHandler(async (req, res, next) => {
    const { schoolId, startDate, endDate } = req.query;

    // Build date range
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    } else {
        // Default to last 6 months
        dateFilter.createdAt = {
            $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        };
    }

    const incidentQuery = { ...dateFilter };
    if (schoolId) incidentQuery.school = schoolId;

    const incidents = await Incident.find(incidentQuery)
        .populate('school', 'name code')
        .populate('vehicle', 'registrationNumber')
        .populate('driver', 'firstName lastName')
        .populate('route', 'name routeId');

    // Group incidents by location
    const locationGroups = {};

    incidents.forEach(incident => {
        if (!incident.location || !incident.location.coordinates) return;

        const lat = incident.location.coordinates[1];
        const lng = incident.location.coordinates[0];
        const locationKey = `${lat.toFixed(4)},${lng.toFixed(4)}`; // Group by approximate location

        if (!locationGroups[locationKey]) {
            locationGroups[locationKey] = {
                coordinates: [lng, lat],
                incidents: [],
                severityCounts: { low: 0, medium: 0, high: 0, critical: 0 },
                typeCounts: {},
                totalIncidents: 0
            };
        }

        const group = locationGroups[locationKey];
        group.incidents.push({
            incidentId: incident._id,
            date: incident.createdAt,
            type: incident.type,
            severity: incident.severity,
            description: incident.description,
            vehicle: incident.vehicle,
            driver: incident.driver,
            route: incident.route
        });

        group.severityCounts[incident.severity]++;
        group.typeCounts[incident.type] = (group.typeCounts[incident.type] || 0) + 1;
        group.totalIncidents++;
    });

    // Calculate risk score for each location
    const hotspots = Object.values(locationGroups).map(group => {
        let riskScore = 0;
        riskScore += group.severityCounts.critical * 10;
        riskScore += group.severityCounts.high * 5;
        riskScore += group.severityCounts.medium * 2;
        riskScore += group.severityCounts.low * 1;

        return {
            ...group,
            riskScore,
            riskLevel: riskScore >= 20 ? 'Critical' : riskScore >= 10 ? 'High' : riskScore >= 5 ? 'Medium' : 'Low'
        };
    });

    // Sort by risk score
    hotspots.sort((a, b) => b.riskScore - a.riskScore);

    res.status(200).json({
        success: true,
        count: hotspots.length,
        data: hotspots
    });
});

// @desc    Get route compliance metrics
// @route   GET /api/v1/ntsa/routes/compliance-metrics
// @access  Private (NTSA)
exports.getRouteComplianceMetrics = asyncHandler(async (req, res, next) => {
    const { schoolId } = req.query;

    const routeQuery = schoolId ? { school: schoolId } : {};
    const routes = await SchoolRoute.find(routeQuery)
        .populate('school', 'name code')
        .populate('assignedVehicle', 'registrationNumber safety')
        .populate('assignedDriver', 'firstName lastName license');

    const complianceData = routes.map(route => {
        let complianceScore = 100;
        const issues = [];

        // Check if route has assigned vehicle and driver
        if (!route.assignedVehicle) {
            complianceScore -= 30;
            issues.push('No vehicle assigned');
        }

        if (!route.assignedDriver) {
            complianceScore -= 30;
            issues.push('No driver assigned');
        }

        // Check vehicle safety compliance
        if (route.assignedVehicle && route.assignedVehicle.safety) {
            const vehicle = route.assignedVehicle;
            const requiredFeatures = ['firstAidKit', 'fireExtinguisher', 'emergencyExit', 'seatBelts'];
            const missingFeatures = requiredFeatures.filter(feature => !vehicle.safety[feature]);

            if (missingFeatures.length > 0) {
                complianceScore -= missingFeatures.length * 5;
                issues.push(`Vehicle missing safety features: ${missingFeatures.join(', ')}`);
            }
        }

        // Check driver license validity
        if (route.assignedDriver && route.assignedDriver.license) {
            const licenseExpiry = new Date(route.assignedDriver.license.expiryDate);
            if (licenseExpiry < new Date()) {
                complianceScore -= 40;
                issues.push('Driver license expired');
            }
        }

        // Check route capacity utilization
        if (route.capacity > 0) {
            const utilizationRate = (route.currentOccupancy / route.capacity) * 100;
            if (utilizationRate > 100) {
                complianceScore -= 20;
                issues.push('Route overcrowded');
            } else if (utilizationRate > 90) {
                complianceScore -= 10;
                issues.push('Route at capacity risk');
            }
        }

        return {
            routeId: route._id,
            routeIdNumber: route.routeId,
            name: route.name,
            school: route.school,
            type: route.type,
            status: route.status,
            assignedVehicle: route.assignedVehicle,
            assignedDriver: route.assignedDriver,
            capacity: route.capacity,
            currentOccupancy: route.currentOccupancy,
            utilizationRate: route.capacity > 0 ? Math.round((route.currentOccupancy / route.capacity) * 100) : 0,
            complianceScore: Math.max(0, complianceScore),
            complianceStatus: complianceScore >= 80 ? 'Compliant' : complianceScore >= 60 ? 'Partial' : 'Non-Compliant',
            issues,
            stopsCount: route.stops?.length || 0,
            studentsCount: route.students?.length || 0
        };
    });

    // Calculate overall compliance statistics
    const totalRoutes = complianceData.length;
    const compliantRoutes = complianceData.filter(r => r.complianceScore >= 80).length;
    const partialCompliance = complianceData.filter(r => r.complianceScore >= 60 && r.complianceScore < 80).length;
    const nonCompliant = complianceData.filter(r => r.complianceScore < 60).length;

    res.status(200).json({
        success: true,
        count: complianceData.length,
        statistics: {
            totalRoutes,
            compliantRoutes,
            partialCompliance,
            nonCompliant,
            overallComplianceRate: totalRoutes > 0 ? Math.round((compliantRoutes / totalRoutes) * 100) : 0
        },
        data: complianceData
    });
});

// Helper function to calculate safety compliance score
function calculateSafetyComplianceScore(safety) {
    if (!safety) return 0;

    let score = 100;
    const requiredFeatures = ['firstAidKit', 'fireExtinguisher', 'emergencyExit', 'seatBelts'];

    // Check required safety features
    const missingFeatures = requiredFeatures.filter(feature => !safety[feature]);
    score -= missingFeatures.length * 10;

    // Check optional safety features
    const optionalFeatures = ['gpsEnabled', 'speedGovernor', 'cctv', 'panicButton'];
    const presentOptional = optionalFeatures.filter(feature => safety[feature]);
    score += presentOptional.length * 5;

    // Check inspection status
    if (safety.inspectionStatus === 'failed') {
        score -= 30;
    } else if (safety.inspectionStatus === 'pending') {
        score -= 15;
    }

    return Math.max(0, Math.min(100, score));
}

// ==============================
// EXISTING VEHICLE MODEL NTSA ENDPOINTS
// ==============================

// @desc    Get all vehicles compliance status (including existing Vehicle model)
// @route   GET /api/v1/ntsa/vehicles/all-compliance
// @access  Private (NTSA)
exports.getAllVehiclesCompliance = asyncHandler(async (req, res, next) => {
    const { status, page = 1, limit = 100 } = req.query;

    // Get both SchoolVehicle and existing Vehicle data
    const schoolQuery = {};
    const vehicleQuery = {};

    if (status) {
        schoolQuery.status = status;
        vehicleQuery.status = status;
    }

    const [schoolVehicles, regularVehicles] = await Promise.all([
        SchoolVehicle.find(schoolQuery)
            .populate('school', 'name code')
            .populate('currentAssignment.driver', 'firstName lastName driverId')
            .populate('currentAssignment.route', 'name routeId'),
        Vehicle.find(vehicleQuery)
            .populate('assignedRoute', 'routeName routeNumber')
            .populate('currentDriver', 'driverName nationalId contactDetails')
    ]);

    // Process SchoolVehicle compliance
    const schoolCompliance = schoolVehicles.map(vehicle => {
        const now = new Date();
        const insuranceExpiry = vehicle.insurance?.expiryDate ? new Date(vehicle.insurance.expiryDate) : null;
        const registrationExpiry = vehicle.registration?.expiryDate ? new Date(vehicle.registration.expiryDate) : null;

        let score = 100;
        const issues = [];

        // Insurance compliance
        if (!insuranceExpiry || insuranceExpiry < now) {
            score -= 30;
            issues.push('Insurance expired or missing');
        } else if (insuranceExpiry < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            score -= 10;
            issues.push('Insurance expiring soon');
        }

        // Registration compliance
        if (!registrationExpiry || registrationExpiry < now) {
            score -= 25;
            issues.push('Registration expired or missing');
        }

        // Safety features compliance
        const requiredSafetyFeatures = ['firstAidKit', 'fireExtinguisher', 'emergencyExit', 'seatBelts'];
        const missingFeatures = requiredSafetyFeatures.filter(feature => !vehicle.safety[feature]);
        if (missingFeatures.length > 0) {
            score -= missingFeatures.length * 5;
            issues.push(`Missing safety features: ${missingFeatures.join(', ')}`);
        }

        return {
            vehicleId: vehicle._id,
            registrationNumber: vehicle.registrationNumber,
            vehicleType: 'School Vehicle',
            make: vehicle.make,
            model: vehicle.model,
            school: vehicle.school,
            complianceScore: Math.max(0, score),
            complianceStatus: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
            issues,
            insuranceStatus: insuranceExpiry ? (insuranceExpiry < now ? 'Expired' : 'Valid') : 'Missing',
            status: vehicle.status
        };
    });

    // Process existing Vehicle compliance
    const regularCompliance = regularVehicles.map(vehicle => {
        let score = 100;
        const issues = [];

        // Check insurance expiry
        if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < new Date()) {
            score -= 40;
            issues.push('Insurance expired');
        }

        // Check maintenance status
        if (vehicle.nextMaintenance && vehicle.nextMaintenance < new Date()) {
            score -= 30;
            issues.push('Maintenance overdue');
        }

        // Check operational status
        if (!vehicle.operationalStatus) {
            score -= 20;
            issues.push('Vehicle not operational');
        }

        return {
            vehicleId: vehicle._id,
            registrationNumber: vehicle.plateNumber,
            vehicleType: 'Regular Vehicle',
            make: vehicle.vehicleModel,
            model: vehicle.vehicleModel,
            complianceScore: Math.max(0, score),
            complianceStatus: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
            issues,
            insuranceStatus: vehicle.insuranceExpiry ? (vehicle.insuranceExpiry < new Date() ? 'Expired' : 'Valid') : 'Missing',
            status: vehicle.status,
            currentDriver: vehicle.currentDriver,
            assignedRoute: vehicle.assignedRoute
        };
    });

    const allCompliance = [...schoolCompliance, ...regularCompliance];

    res.status(200).json({
        success: true,
        count: allCompliance.length,
        data: allCompliance
    });
});

// @desc    Get existing vehicle by plate number for NTSA
// @route   GET /api/v1/ntsa/vehicles/plate/:plateNumber
// @access  Private (NTSA)
exports.getVehicleByPlateNumber = asyncHandler(async (req, res, next) => {
    const { plateNumber } = req.params;

    const vehicle = await Vehicle.findOne({
        plateNumber: plateNumber.toUpperCase()
    })
        .populate('assignedRoute', 'routeName routeNumber stops')
        .populate('currentDriver', 'driverName nationalId contactDetails driverLicense psvLicense')
        .populate('user', 'firstName lastName email');

    if (!vehicle) {
        return next(new ErrorResponse(`Vehicle not found with plate number ${plateNumber}`, 404));
    }

    // Calculate compliance status
    const complianceStatus = await calculateRegularVehicleCompliance(vehicle);

    // Get recent performance data
    const performance = {
        totalTrips: vehicle.totalTrips,
        totalPassengersFerried: vehicle.totalPassengersFerried,
        averageDailyIncome: vehicle.averageDailyIncome,
        totalIncome: vehicle.totalIncome,
        mileage: vehicle.mileage,
        averageSpeed: vehicle.averageSpeed,
        operationalStatus: vehicle.operationalStatus,
        vehicleCondition: vehicle.vehicleCondition
    };

    res.status(200).json({
        success: true,
        data: {
            vehicle,
            complianceStatus,
            performance,
            currentLocation: vehicle.currentLocation,
            contextData: vehicle.contextData,
            maintenanceInfo: {
                lastMaintenance: vehicle.lastMaintenance,
                nextMaintenance: vehicle.nextMaintenance,
                fuelType: vehicle.fuelType
            }
        }
    });
});

// @desc    Get existing driver compliance status
// @route   GET /api/v1/ntsa/drivers/all-compliance
// @access  Private (NTSA)
exports.getAllDriversCompliance = asyncHandler(async (req, res, next) => {
    const { status, page = 1, limit = 100 } = req.query;

    // Get both SchoolDriver and existing Driver data
    const schoolQuery = {};
    const driverQuery = {};

    if (status) {
        schoolQuery.status = status;
        driverQuery.status = status;
    }

    const [schoolDrivers, regularDrivers] = await Promise.all([
        SchoolDriver.find(schoolQuery)
            .populate('school', 'name code')
            .populate('assignedVehicle', 'registrationNumber make model')
            .populate('assignedRoute', 'name routeId'),
        Driver.find(driverQuery)
    ]);

    // Process SchoolDriver compliance
    const schoolCompliance = schoolDrivers.map(driver => {
        const licenseExpiry = driver.license.expiryDate ? new Date(driver.license.expiryDate) : null;
        const now = new Date();
        const isExpired = licenseExpiry && licenseExpiry < now;
        const expiringSoon = licenseExpiry && licenseExpiry < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        return {
            driverId: driver._id,
            driverIdNumber: driver.driverId,
            firstName: driver.firstName,
            lastName: driver.lastName,
            fullName: `${driver.firstName} ${driver.lastName}`,
            driverType: 'School Driver',
            school: driver.school,
            license: {
                number: driver.license.number,
                expiryDate: driver.license.expiryDate,
                status: isExpired ? 'Expired' : expiringSoon ? 'Expiring Soon' : 'Valid'
            },
            complianceScore: isExpired ? 50 : expiringSoon ? 75 : 100,
            complianceStatus: isExpired ? 'Non-Compliant' : expiringSoon ? 'At Risk' : 'Compliant'
        };
    });

    // Process existing Driver compliance
    const regularCompliance = regularDrivers.map(driver => {
        const now = new Date();
        let score = 100;
        const issues = [];

        // Check driver license expiry
        if (driver.driverLicense.expiryDate < now) {
            score -= 50;
            issues.push('Driver license expired');
        }

        // Check PSV license expiry
        if (driver.psvLicense.expiryDate < now) {
            score -= 30;
            issues.push('PSV license expired');
        }

        // Check medical certificate
        if (driver.medicalCertificate?.expiryDate && driver.medicalCertificate.expiryDate < now) {
            score -= 20;
            issues.push('Medical certificate expired');
        }

        // Check police clearance
        if (driver.policeClearance?.expiryDate && driver.policeClearance.expiryDate < now) {
            score -= 15;
            issues.push('Police clearance expired');
        }

        // Check training certificates
        driver.trainingCertificates.forEach(cert => {
            if (cert.expiryDate && cert.expiryDate < now) {
                score -= 10;
                issues.push(`${cert.certificateType} certificate expired`);
            }
        });

        return {
            driverId: driver._id,
            driverIdNumber: driver.employeeId,
            firstName: driver.driverName.split(' ')[0] || driver.driverName,
            lastName: driver.driverName.split(' ').slice(1).join(' ') || '',
            fullName: driver.driverName,
            driverType: 'Regular Driver',
            nationalId: driver.nationalId,
            license: {
                number: driver.driverLicense.number,
                expiryDate: driver.driverLicense.expiryDate,
                status: driver.driverLicense.expiryDate < now ? 'Expired' : 'Valid'
            },
            psvLicense: {
                number: driver.psvLicense.number,
                expiryDate: driver.psvLicense.expiryDate,
                status: driver.psvLicense.expiryDate < now ? 'Expired' : 'Valid'
            },
            complianceScore: Math.max(0, score),
            complianceStatus: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
            issues,
            status: driver.status,
            contactDetails: driver.contactDetails,
            bloodType: driver.bloodType,
            medicalConditions: driver.medicalConditions,
            allergies: driver.allergies
        };
    });

    const allCompliance = [...schoolCompliance, ...regularCompliance];

    res.status(200).json({
        success: true,
        count: allCompliance.length,
        data: allCompliance
    });
});

// @desc    Get existing driver by national ID for NTSA
// @route   GET /api/v1/ntsa/drivers/national-id/:nationalId
// @access  Private (NTSA)
exports.getDriverByNationalId = asyncHandler(async (req, res, next) => {
    const { nationalId } = req.params;

    const driver = await Driver.findOne({
        nationalId: nationalId
    });

    if (!driver) {
        return next(new ErrorResponse(`Driver not found with national ID ${nationalId}`, 404));
    }

    // Calculate compliance status
    const complianceStatus = await calculateRegularDriverCompliance(driver);

    // Get expiring documents
    const expiringDocuments = driver.checkExpiringDocuments();

    res.status(200).json({
        success: true,
        data: {
            driver,
            complianceStatus,
            expiringDocuments,
            documentation: {
                driverLicense: driver.driverLicense,
                psvLicense: driver.psvLicense,
                medicalCertificate: driver.medicalCertificate,
                policeClearance: driver.policeClearance,
                trainingCertificates: driver.trainingCertificates
            },
            emergencyContacts: driver.emergencyContacts,
            bankDetails: driver.bankDetails
        }
    });
});

// @desc    Get all courses compliance status
// @route   GET /api/v1/ntsa/courses/compliance
// @access  Private (NTSA)
exports.getCoursesCompliance = asyncHandler(async (req, res, next) => {
    const { status, page = 1, limit = 100 } = req.query;

    const query = {};
    if (status) query.status = status;

    const courses = await Course.find(query)
        .populate('assignedVehicles', 'plateNumber vehicleModel seatingCapacity status')
        .populate('stops', 'stopName stopOrder coordinates')
        .populate('user', 'firstName lastName email')
        .sort({ routeNumber: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const complianceData = courses.map(course => {
        let score = 100;
        const issues = [];

        // Check if course has assigned vehicles
        if (!course.assignedVehicles || course.assignedVehicles.length === 0) {
            score -= 40;
            issues.push('No vehicles assigned to course');
        }

        // Check vehicle operational status
        if (course.assignedVehicles) {
            const nonOperationalVehicles = course.assignedVehicles.filter(v => !v.operationalStatus);
            if (nonOperationalVehicles.length > 0) {
                score -= nonOperationalVehicles.length * 10;
                issues.push(`${nonOperationalVehicles.length} vehicles not operational`);
            }
        }

        // Check if course is active
        if (course.status !== 'Active') {
            score -= 20;
            issues.push(`Course status: ${course.status}`);
        }

        // Check capacity utilization
        if (course.maxCapacity > 0) {
            const utilizationRate = (course.currentPassengers / course.maxCapacity) * 100;
            if (utilizationRate > 100) {
                score -= 15;
                issues.push('Course overcrowded');
            } else if (utilizationRate > 90) {
                score -= 5;
                issues.push('Course at capacity risk');
            }
        }

        // Check schedule
        if (!course.schedule || !course.schedule.isActive) {
            score -= 10;
            issues.push('No active schedule');
        }

        return {
            courseId: course._id,
            routeNumber: course.routeNumber,
            routeName: course.routeName,
            description: course.description,
            status: course.status,
            totalDistance: course.totalDistance,
            estimatedDuration: course.estimatedDuration,
            maxCapacity: course.maxCapacity,
            currentPassengers: course.currentPassengers,
            utilizationRate: course.maxCapacity > 0 ? Math.round((course.currentPassengers / course.maxCapacity) * 100) : 0,
            assignedVehicles: course.assignedVehicles,
            stops: course.stops,
            complianceScore: Math.max(0, score),
            complianceStatus: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
            issues,
            performance: course.performance,
            schedule: course.schedule,
            totalPassengersFerried: course.totalPassengersFerried
        };
    });

    const total = await Course.countDocuments(query);

    res.status(200).json({
        success: true,
        count: complianceData.length,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        data: complianceData
    });
});

// @desc    Get course by route number for NTSA
// @route   GET /api/v1/ntsa/courses/route/:routeNumber
// @access  Private (NTSA)
exports.getCourseByRouteNumber = asyncHandler(async (req, res, next) => {
    const { routeNumber } = req.params;

    const course = await Course.findOne({
        routeNumber: routeNumber.toUpperCase()
    })
        .populate('assignedVehicles', 'plateNumber vehicleModel seatingCapacity status currentLocation averageSpeed')
        .populate('stops', 'stopName stopOrder coordinates estimatedTime waitingTime')
        .populate('user', 'firstName lastName email');

    if (!course) {
        return next(new ErrorResponse(`Course not found with route number ${routeNumber}`, 404));
    }

    // Calculate compliance status
    const complianceStatus = await calculateCourseCompliance(course);

    // Get current location of all assigned vehicles
    const vehicleLocations = course.assignedVehicles.map(vehicle => ({
        plateNumber: vehicle.plateNumber,
        currentLocation: vehicle.currentLocation,
        averageSpeed: vehicle.averageSpeed,
        operationalStatus: vehicle.operationalStatus,
        status: vehicle.status
    }));

    res.status(200).json({
        success: true,
        data: {
            course,
            complianceStatus,
            vehicleLocations,
            scheduleInfo: course.schedule,
            performanceMetrics: course.performance,
            capacityInfo: {
                maxCapacity: course.maxCapacity,
                currentPassengers: course.currentPassengers,
                utilizationRate: course.maxCapacity > 0 ? Math.round((course.currentPassengers / course.maxCapacity) * 100) : 0
            },
            routeInfo: {
                totalDistance: course.totalDistance,
                estimatedDuration: course.estimatedDuration,
                stopsCount: course.stops?.length || 0
            }
        }
    });
});

// @desc    Get fleet overview including all vehicle types
// @route   GET /api/v1/ntsa/fleet/overview
// @access  Private (NTSA)
exports.getFleetOverview = asyncHandler(async (req, res, next) => {
    const { schoolId } = req.query;

    // Get counts for all vehicle types
    const [
        schoolVehicleCount,
        regularVehicleCount,
        activeSchoolVehicles,
        activeRegularVehicles,
        schoolDriverCount,
        regularDriverCount,
        courseCount
    ] = await Promise.all([
        SchoolVehicle.countDocuments(schoolId ? { school: schoolId } : {}),
        Vehicle.countDocuments({}),
        SchoolVehicle.countDocuments({ ...schoolId ? { school: schoolId } : {}, status: 'active' }),
        Vehicle.countDocuments({ operationalStatus: true }),
        SchoolDriver.countDocuments(schoolId ? { school: schoolId } : {}),
        Driver.countDocuments({ status: 'active' }),
        Course.countDocuments({ status: 'Active' })
    ]);

    // Get compliance statistics
    const [schoolVehicleCompliance, regularVehicleCompliance] = await Promise.all([
        calculateVehicleCompliance(schoolId ? { school: schoolId } : {}),
        calculateRegularVehicleComplianceStats()
    ]);

    const overview = {
        vehicles: {
            total: schoolVehicleCount + regularVehicleCount,
            schoolVehicles: schoolVehicleCount,
            regularVehicles: regularVehicleCount,
            active: activeSchoolVehicles + activeRegularVehicles,
            activeSchoolVehicles,
            activeRegularVehicles
        },
        drivers: {
            total: schoolDriverCount + regularDriverCount,
            schoolDrivers: schoolDriverCount,
            regularDrivers: regularDriverCount
        },
        courses: {
            total: courseCount
        },
        compliance: {
            schoolVehicles: schoolVehicleCompliance,
            regularVehicles: regularVehicleCompliance,
            overallComplianceRate: ((schoolVehicleCompliance.complianceRate + regularVehicleCompliance.complianceRate) / 2).toFixed(1)
        }
    };

    res.status(200).json({
        success: true,
        data: overview
    });
});

// Helper functions for existing models
async function calculateRegularVehicleCompliance(vehicle) {
    let score = 100;
    const issues = [];
    const now = new Date();

    if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < now) {
        score -= 40;
        issues.push('Insurance expired');
    }

    if (vehicle.nextMaintenance && vehicle.nextMaintenance < now) {
        score -= 30;
        issues.push('Maintenance overdue');
    }

    if (!vehicle.operationalStatus) {
        score -= 20;
        issues.push('Vehicle not operational');
    }

    return {
        score: Math.max(0, score),
        status: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
        issues
    };
}

async function calculateRegularDriverCompliance(driver) {
    let score = 100;
    const issues = [];
    const now = new Date();

    if (driver.driverLicense.expiryDate < now) {
        score -= 50;
        issues.push('Driver license expired');
    }

    if (driver.psvLicense.expiryDate < now) {
        score -= 30;
        issues.push('PSV license expired');
    }

    return {
        score: Math.max(0, score),
        status: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
        issues
    };
}

async function calculateCourseCompliance(course) {
    let score = 100;
    const issues = [];

    if (!course.assignedVehicles || course.assignedVehicles.length === 0) {
        score -= 40;
        issues.push('No vehicles assigned');
    }

    if (course.status !== 'Active') {
        score -= 20;
        issues.push(`Course status: ${course.status}`);
    }

    return {
        score: Math.max(0, score),
        status: score >= 80 ? 'Compliant' : score >= 60 ? 'Partial' : 'Non-Compliant',
        issues
    };
}

async function calculateRegularVehicleComplianceStats() {
    const vehicles = await Vehicle.find({});
    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;

    vehicles.forEach(vehicle => {
        let score = 100;
        const now = new Date();

        if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < now) score -= 40;
        if (vehicle.nextMaintenance && vehicle.nextMaintenance < now) score -= 30;
        if (!vehicle.operationalStatus) score -= 20;

        if (score >= 80) compliant++;
        else if (score >= 60) partial++;
        else nonCompliant++;
    });

    const total = vehicles.length;
    return {
        total,
        compliant,
        partial,
        nonCompliant,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0
    };
}
