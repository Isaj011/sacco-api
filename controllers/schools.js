const School = require('../models/School');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary } = require('../utils/cloudinary');

// @desc    Get all schools
// @route   GET /api/v1/schools
// @access  Private/Admin
const getSchools = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults);
});

// @desc    Get single school
// @route   GET /api/v1/schools/:id
// @access  Private/Admin
const getSchool = asyncHandler(async (req, res, next) => {
    const school = await School.findById(req.params.id);

    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({ success: true, data: school });
});

// @desc    Create new school
// @route   POST /api/v1/schools
// @access  Private/Admin
const createSchool = asyncHandler(async (req, res, next) => {
    // Check if school with same code already exists
    const existingSchool = await School.findOne({ code: req.body.code });
    if (existingSchool) {
        return next(
            new ErrorResponse(`School with code ${req.body.code} already exists`, 400)
        );
    }

    const school = await School.create(req.body);

    res.status(201).json({
        success: true,
        data: school
    });
});

// @desc    Update school
// @route   PUT /api/v1/schools/:id
// @access  Private/Admin
const updateSchool = asyncHandler(async (req, res, next) => {
    let school = await School.findById(req.params.id);

    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.id}`, 404)
        );
    }

    // Prevent changing school code if it's being used
    if (req.body.code && req.body.code !== school.code) {
        const existingSchool = await School.findOne({ code: req.body.code });
        if (existingSchool) {
            return next(
                new ErrorResponse(`School with code ${req.body.code} already exists`, 400)
            );
        }
    }

    school = await School.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({ success: true, data: school });
});

// @desc    Delete school
// @route   DELETE /api/v1/schools/:id
// @access  Private/Admin
const deleteSchool = asyncHandler(async (req, res, next) => {
    const school = await School.findById(req.params.id);

    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.id}`, 404)
        );
    }

    // TODO: Check if school has associated data before deleting
    // const studentsCount = await Student.countDocuments({ school: school._id });
    // if (studentsCount > 0) {
    //   return next(
    //     new ErrorResponse(
    //       `Cannot delete school with ${studentsCount} students. Please delete or transfer students first.`,
    //       400
    //     )
    //   );
    // }

    await school.remove();

    res.status(200).json({ success: true, data: {} });
});

// @desc    Upload school logo
// @route   PUT /api/v1/schools/:id/logo
// @access  Private/Admin
const uploadSchoolLogo = asyncHandler(async (req, res, next) => {
    const school = await School.findById(req.params.id);

    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.id}`, 404)
        );
    }

    if (!req.files) {
        return next(new ErrorResponse(`Please upload a file`, 400));
    }

    const file = req.files.file;

    // Check if the file is an image
    if (!file.mimetype.startsWith('image')) {
        return next(new ErrorResponse(`Please upload an image file`, 400));
    }

    // Check file size
    const maxSize = process.env.MAX_FILE_UPLOAD || 1000000; // 1MB default
    if (file.size > maxSize) {
        return next(
            new ErrorResponse(
                `Please upload an image less than ${maxSize / 1000}KB`,
                400
            )
        );
    }

    try {
        // Upload file to Cloudinary
        const result = await uploadToCloudinary(file.tempFilePath, {
            folder: 'school-logos',
            public_id: `school-${school._id}-logo`,
            overwrite: true
        });

        // Update school with new logo URL
        school.logo = result.secure_url;
        await school.save();

        // Remove temp file
        fs.unlinkSync(file.tempFilePath);

        res.status(200).json({
            success: true,
            data: school
        });
    } catch (err) {
        return next(new ErrorResponse(`Problem with file upload: ${err.message}`, 500));
    }
});

// @desc    Get school statistics
// @route   GET /api/v1/schools/:id/stats
// @access  Private/Admin
const getSchoolStats = asyncHandler(async (req, res, next) => {
    const school = await School.findById(req.params.id);

    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.id}`, 404)
        );
    }

    // TODO: Implement actual statistics
    // const stats = await School.aggregate([
    //   { $match: { _id: school._id } },
    //   {
    //     $lookup: {
    //       from: 'students',
    //       localField: '_id',
    //       foreignField: 'school',
    //       as: 'students'
    //     }
    //   },
    //   // Add more aggregations as needed
    // ]);

    res.status(200).json({
        success: true,
        data: {
            // stats,
            message: 'School statistics will be implemented here'
        }
    });
});

// @desc    Toggle school status (active/inactive)
// @route   PUT /api/v1/schools/:id/status
// @access  Private/Admin
const toggleSchoolStatus = asyncHandler(async (req, res, next) => {
    const school = await School.findById(req.params.id);

    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.id}`, 404)
        );
    }

    school.isActive = !school.isActive;
    await school.save();

    res.status(200).json({
        success: true,
        data: school
    });
});

module.exports = {
    getSchools,
    getSchool,
    createSchool,
    updateSchool,
    deleteSchool,
    uploadSchoolLogo,
    getSchoolStats,
    toggleSchoolStatus
};
