const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const SchoolVehicle = require('../models/SchoolVehicle');
const School = require('../models/School');
const SchoolDriver = require('../models/SchoolDriver');
const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs');

// @desc    Get all vehicles
// @route   GET /api/v1/schools/:schoolId/vehicles
// @access  Private
const getVehicles = asyncHandler(async (req, res, next) => {
    if (req.params.schoolId) {
        const vehicles = await SchoolVehicle.find({ school: req.params.schoolId })
            .populate('school', 'name code')
            .populate('currentAssignment.driver', 'firstName lastName license')
            .populate('currentAssignment.route', 'name');

        return res.status(200).json({
            success: true,
            count: vehicles.length,
            data: vehicles
        });
    } else {
        res.status(200).json(res.advancedResults);
    }
});

// @desc    Get single vehicle
// @route   GET /api/v1/vehicles/:id
// @access  Private
const getVehicle = asyncHandler(async (req, res, next) => {
    const vehicle = await SchoolVehicle.findById(req.params.id)
        .populate('school', 'name code')
        .populate('currentAssignment.driver', 'firstName lastName license')
        .populate('currentAssignment.route', 'name');

    if (!vehicle) {
        return next(
            new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or has access to the school
    if (vehicle.school._id.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to access this vehicle`, 401)
        );
    }

    res.status(200).json({
        success: true,
        data: vehicle
    });
});

// @desc    Create new vehicle
// @route   POST /api/v1/schools/:schoolId/vehicles
// @access  Private
const createVehicle = asyncHandler(async (req, res, next) => {
    // Add school to req.body
    req.body.school = req.params.schoolId;

    // Check if school exists
    const school = await School.findById(req.params.schoolId);
    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.schoolId}`, 404)
        );
    }

    // Check for existing vehicle with same registration number
    if (req.body.registrationNumber) {
        const existingVehicle = await SchoolVehicle.findOne({
            registrationNumber: req.body.registrationNumber.toUpperCase()
        });

        if (existingVehicle) {
            return next(
                new ErrorResponse(`Vehicle with registration number ${req.body.registrationNumber} already exists`, 400)
            );
        }
    }

    // Set createdBy
    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;

    const vehicle = await SchoolVehicle.create(req.body);

    // Update school's vehicle count
    await School.findByIdAndUpdate(
        req.params.schoolId,
        { $inc: { vehicleCount: 1 } },
        { new: true, runValidators: true }
    );

    res.status(201).json({
        success: true,
        data: vehicle
    });
});

// @desc    Update vehicle
// @route   PUT /api/v1/vehicles/:id
// @access  Private
const updateVehicle = asyncHandler(async (req, res, next) => {
    let vehicle = await SchoolVehicle.findById(req.params.id);

    if (!vehicle) {
        return next(
            new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or has access to the school
    if (vehicle.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to update this vehicle`, 401)
        );
    }

    // Check for duplicate registration number
    if (req.body.registrationNumber &&
        req.body.registrationNumber.toUpperCase() !== vehicle.registrationNumber) {
        const existingVehicle = await SchoolVehicle.findOne({
            registrationNumber: req.body.registrationNumber.toUpperCase()
        });

        if (existingVehicle) {
            return next(
                new ErrorResponse(`Vehicle with registration number ${req.body.registrationNumber} already exists`, 400)
            );
        }
    }

    // Set updatedBy
    req.body.updatedBy = req.user.id;

    // Handle assignment changes
    if (req.body.currentAssignment) {
        // If driver is being assigned
        if (req.body.currentAssignment.driver) {
            // Unassign from previous vehicle if any
            await SchoolVehicle.updateMany(
                { 'currentAssignment.driver': req.body.currentAssignment.driver },
                { $unset: { 'currentAssignment.driver': '' } }
            );

            // Update driver's assigned vehicle
            await SchoolDriver.findByIdAndUpdate(
                req.body.currentAssignment.driver,
                { assignedVehicle: vehicle._id },
                { new: true, runValidators: true }
            );
        }

        // If route is being assigned
        if (req.body.currentAssignment.route) {
            // Unassign from previous vehicle if any
            await SchoolVehicle.updateMany(
                { 'currentAssignment.route': req.body.currentAssignment.route },
                { $unset: { 'currentAssignment.route': '' } }
            );

            // Update route's assigned vehicle
            // This assumes you have a Route model with an assignedVehicle field
            // await Route.findByIdAndUpdate(
            //   req.body.currentAssignment.route,
            //   { assignedVehicle: vehicle._id },
            //   { new: true, runValidators: true }
            // );
        }
    }

    vehicle = await SchoolVehicle.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: vehicle
    });
});

// @desc    Delete vehicle
// @route   DELETE /api/v1/vehicles/:id
// @access  Private
const deleteVehicle = asyncHandler(async (req, res, next) => {
    const vehicle = await SchoolVehicle.findById(req.params.id);

    if (!vehicle) {
        return next(
            new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or has access to the school
    if (vehicle.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to delete this vehicle`, 401)
        );
    }

    // Check if vehicle is assigned to any active routes or drivers
    if (vehicle.currentAssignment.status === 'active') {
        return next(
            new ErrorResponse('Cannot delete a vehicle that is currently assigned to a route or driver', 400)
        );
    }

    await vehicle.remove();

    // Update school's vehicle count
    await School.findByIdAndUpdate(
        vehicle.school,
        { $inc: { vehicleCount: -1 } },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Upload vehicle documents
// @route   PUT /api/v1/vehicles/:id/documents
// @access  Private
const uploadVehicleDocuments = asyncHandler(async (req, res, next) => {
    const vehicle = await SchoolVehicle.findById(req.params.id);

    if (!vehicle) {
        return next(
            new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or has access to the school
    if (vehicle.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to update this vehicle`, 401)
        );
    }

    if (!req.files || Object.keys(req.files).length === 0) {
        return next(new ErrorResponse(`Please upload at least one file`, 400));
    }

    const uploadedDocuments = [];
    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

    try {
        for (const file of files) {
            // Check file type and size
            const maxSize = process.env.MAX_FILE_UPLOAD || 5000000; // 5MB default
            if (file.size > maxSize) {
                continue; // Skip this file
            }

            // Upload to Cloudinary
            const result = await uploadToCloudinary(file.tempFilePath, {
                folder: `vehicles/${vehicle._id}/documents`,
                resource_type: 'auto'
            });

            uploadedDocuments.push({
                name: file.name || path.parse(file.originalname).name,
                type: req.body.documentType || 'other',
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                size: result.bytes,
                uploadedBy: req.user.id,
                uploadedAt: Date.now()
            });

            // Remove temp file
            fs.unlinkSync(file.tempFilePath);
        }

        // Add documents to vehicle
        vehicle.documents = [...vehicle.documents, ...uploadedDocuments];
        vehicle.updatedBy = req.user.id;
        await vehicle.save();

        res.status(200).json({
            success: true,
            count: uploadedDocuments.length,
            data: vehicle
        });
    } catch (err) {
        return next(new ErrorResponse(`Problem with file upload: ${err.message}`, 500));
    }
});

// @desc    Get vehicle maintenance history
// @route   GET /api/v1/vehicles/:id/maintenance
// @access  Private
const getVehicleMaintenance = asyncHandler(async (req, res, next) => {
    const vehicle = await SchoolVehicle.findById(req.params.id)
        .select('maintenance')
        .populate('maintenance.serviceHistory.servicedBy', 'name email');

    if (!vehicle) {
        return next(
            new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or has access to the school
    if (vehicle.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to access this vehicle`, 401)
        );
    }

    res.status(200).json({
        success: true,
        data: vehicle.maintenance
    });
});

// @desc    Add maintenance record
// @route   POST /api/v1/vehicles/:id/maintenance
// @access  Private
const addMaintenanceRecord = asyncHandler(async (req, res, next) => {
    const { serviceType, description, cost, serviceProvider, nextServiceDate, nextServiceMileage } = req.body;

    const vehicle = await SchoolVehicle.findById(req.params.id);

    if (!vehicle) {
        return next(
            new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or has access to the school
    if (vehicle.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to update this vehicle`, 401)
        );
    }

    const maintenanceRecord = {
        date: new Date(),
        mileage: vehicle.maintenance.currentMileage,
        serviceType,
        description,
        cost,
        serviceProvider,
        servicedBy: req.user.id,
        nextServiceDate: nextServiceDate || null,
        nextServiceMileage: nextServiceMileage || null
    };

    // Add to service history
    vehicle.maintenance.serviceHistory.unshift(maintenanceRecord);

    // Update last service info
    vehicle.maintenance.schedule.lastService = {
        date: maintenanceRecord.date,
        mileage: maintenanceRecord.mileage,
        serviceType: maintenanceRecord.serviceType,
        notes: maintenanceRecord.description,
        serviceProvider: maintenanceRecord.serviceProvider,
        cost: maintenanceRecord.cost
    };

    // Update next service info if provided
    if (nextServiceDate || nextServiceMileage) {
        vehicle.maintenance.schedule.nextService = {
            date: nextServiceDate ? new Date(nextServiceDate) : vehicle.maintenance.schedule.nextService.date,
            mileage: nextServiceMileage || vehicle.maintenance.schedule.nextService.mileage
        };
    }

    vehicle.updatedBy = req.user.id;
    await vehicle.save();

    res.status(201).json({
        success: true,
        data: maintenanceRecord
    });
});

// @desc    Get vehicles due for maintenance
// @route   GET /api/v1/schools/:schoolId/vehicles/maintenance/due
// @access  Private
const getVehiclesDueForMaintenance = asyncHandler(async (req, res, next) => {
    const { days = 30 } = req.query;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() + parseInt(days));

    const vehicles = await SchoolVehicle.find({
        school: req.params.schoolId,
        $or: [
            { 'maintenance.schedule.nextService.date': { $lte: dateThreshold } },
            { 'maintenance.schedule.nextService.mileage': { $lte: { $add: ['$maintenance.currentMileage', 500] } } }
        ]
    }).select('registrationNumber make model maintenance.schedule.nextService maintenance.currentMileage');

    res.status(200).json({
        success: true,
        count: vehicles.length,
        data: vehicles
    });
});

module.exports = {
    getVehicles,
    getVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    uploadVehicleDocuments,
    getVehicleMaintenance,
    addMaintenanceRecord,
    getVehiclesDueForMaintenance
};
