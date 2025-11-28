const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const SchoolDriver = require('../models/SchoolDriver');
const School = require('../models/School');
const SchoolVehicle = require('../models/SchoolVehicle');
const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs');
const path = require('path');

// @desc    Get all drivers
// @route   GET /api/v1/schools/:schoolId/drivers
// @access  Private
const getDrivers = asyncHandler(async (req, res, next) => {
    if (req.params.schoolId) {
        const drivers = await SchoolDriver.find({ school: req.params.schoolId })
            .populate('school', 'name code')
            .populate('assignedVehicle', 'registrationNumber make model')
            .populate('assignedRoute', 'name');

        return res.status(200).json({
            success: true,
            count: drivers.length,
            data: drivers
        });
    }
    res.status(200).json(res.advancedResults);
});

// @desc    Get single driver
// @route   GET /api/v1/drivers/:id
// @access  Private
const getDriver = asyncHandler(async (req, res, next) => {
    const driver = await SchoolDriver.findById(req.params.id)
        .populate('school', 'name code')
        .populate('assignedVehicle', 'registrationNumber make model')
        .populate('assignedRoute', 'name');

    if (!driver) {
        return next(
            new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404)
        );
    }

    // Authorization check
    if (driver.school._id.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to access this driver`, 401)
        );
    }

    res.status(200).json({
        success: true,
        data: driver
    });
});

// @desc    Create new driver
// @route   POST /api/v1/schools/:schoolId/drivers
// @access  Private
const createDriver = asyncHandler(async (req, res, next) => {
    // Add school to req.body
    req.body.school = req.params.schoolId;

    // Check if school exists
    const school = await School.findById(req.params.schoolId);
    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.schoolId}`, 404)
        );
    }

    // Check for existing driver with same license or phone
    if (req.body.license?.number) {
        const existingDriver = await SchoolDriver.findOne({
            'license.number': req.body.license.number
        });

        if (existingDriver) {
            return next(
                new ErrorResponse(`Driver with license number ${req.body.license.number} already exists`, 400)
            );
        }
    }

    // Set createdBy and updatedBy
    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;

    const driver = await SchoolDriver.create(req.body);

    // Update school's driver count
    await School.findByIdAndUpdate(
        req.params.schoolId,
        { $inc: { driverCount: 1 } },
        { new: true, runValidators: true }
    );

    res.status(201).json({
        success: true,
        data: driver
    });
});

// @desc    Update driver
// @route   PUT /api/v1/drivers/:id
// @access  Private
const updateDriver = asyncHandler(async (req, res, next) => {
    let driver = await SchoolDriver.findById(req.params.id);

    if (!driver) {
        return next(
            new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404)
        );
    }

    // Authorization check
    if (driver.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to update this driver`, 401)
        );
    }

    // Check for duplicate license number
    if (req.body.license?.number && req.body.license.number !== driver.license?.number) {
        const existingDriver = await SchoolDriver.findOne({
            'license.number': req.body.license.number
        });

        if (existingDriver) {
            return next(
                new ErrorResponse(`Driver with license number ${req.body.license.number} already exists`, 400)
            );
        }
    }

    // Handle vehicle assignment
    if (req.body.assignedVehicle) {
        // Unassign from previous vehicle if any
        if (driver.assignedVehicle) {
            await SchoolVehicle.findByIdAndUpdate(
                driver.assignedVehicle,
                { $unset: { 'currentAssignment.driver': '' } },
                { new: true, runValidators: true }
            );
        }

        // Update new vehicle's driver assignment
        await SchoolVehicle.findByIdAndUpdate(
            req.body.assignedVehicle,
            { 'currentAssignment.driver': req.params.id },
            { new: true, runValidators: true }
        );
    }

    // Set updatedBy
    req.body.updatedBy = req.user.id;

    driver = await SchoolDriver.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: driver
    });
});

// @desc    Delete driver
// @route   DELETE /api/v1/drivers/:id
// @access  Private
const deleteDriver = asyncHandler(async (req, res, next) => {
    const driver = await SchoolDriver.findById(req.params.id);

    if (!driver) {
        return next(
            new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404)
        );
    }

    // Authorization check
    if (driver.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to delete this driver`, 401)
        );
    }

    // Check if driver is assigned to any vehicle
    if (driver.assignedVehicle) {
        return next(
            new ErrorResponse('Cannot delete driver assigned to a vehicle. Please unassign first.', 400)
        );
    }

    await driver.remove();

    // Update school's driver count
    await School.findByIdAndUpdate(
        driver.school,
        { $inc: { driverCount: -1 } },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Upload driver documents
// @route   PUT /api/v1/drivers/:id/documents
// @access  Private
const uploadDriverDocuments = asyncHandler(async (req, res, next) => {
    const driver = await SchoolDriver.findById(req.params.id);

    if (!driver) {
        return next(
            new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404)
        );
    }

    // Authorization check
    if (driver.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to update this driver`, 401)
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
                folder: `drivers/${driver._id}/documents`,
                resource_type: 'auto'
            });

            uploadedDocuments.push({
                type: req.body.documentType || 'other',
                name: file.name || path.parse(file.originalname).name,
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

        // Add documents to driver
        driver.documents = [...driver.documents, ...uploadedDocuments];
        driver.updatedBy = req.user.id;
        await driver.save();

        res.status(200).json({
            success: true,
            count: uploadedDocuments.length,
            data: driver
        });
    } catch (err) {
        return next(new ErrorResponse(`Problem with file upload: ${err.message}`, 500));
    }
});

// @desc    Get driver's upcoming document expirations
// @route   GET /api/v1/drivers/:id/upcoming-expirations
// @access  Private
const getUpcomingExpirations = asyncHandler(async (req, res, next) => {
    const driver = await SchoolDriver.findById(req.params.id);

    if (!driver) {
        return next(
            new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404)
        );
    }

    // Authorization check
    if (driver.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to access this driver`, 401)
        );
    }

    const upcomingExpirations = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Check license expiry
    if (driver.license?.expiryDate) {
        const expiryDate = new Date(driver.license.expiryDate);
        if (expiryDate <= thirtyDaysFromNow) {
            upcomingExpirations.push({
                type: 'license',
                name: 'Driver License',
                expiryDate: expiryDate,
                daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)),
                document: driver.license
            });
        }
    }

    // Check other documents
    driver.documents.forEach(doc => {
        if (doc.expiryDate) {
            const expiryDate = new Date(doc.expiryDate);
            if (expiryDate <= thirtyDaysFromNow) {
                upcomingExpirations.push({
                    type: 'document',
                    documentType: doc.type,
                    name: doc.name || `${doc.type} document`,
                    expiryDate: expiryDate,
                    daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)),
                    document: doc
                });
            }
        }
    });

    // Sort by days remaining (ascending)
    upcomingExpirations.sort((a, b) => a.daysRemaining - b.daysRemaining);

    res.status(200).json({
        success: true,
        count: upcomingExpirations.length,
        data: upcomingExpirations
    });
});

module.exports = {
    getDrivers,
    getDriver,
    createDriver,
    updateDriver,
    deleteDriver,
    uploadDriverDocuments,
    getUpcomingExpirations
};
