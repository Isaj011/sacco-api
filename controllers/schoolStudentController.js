const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const SchoolStudent = require('../models/SchoolStudent');
const School = require('../models/School');
const { uploadToCloudinary } = require('../utils/cloudinary');
const path = require('path');
const fs = require('fs');

// @desc    Get all students
// @route   GET /api/v1/schools/:schoolId/students
// @access  Private
const getStudents = asyncHandler(async (req, res, next) => {
    if (req.params.schoolId) {
        const students = await SchoolStudent.find({ school: req.params.schoolId })
            .populate('school', 'name code')
            .populate('userId', 'email role');

        return res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } else {
        res.status(200).json(res.advancedResults);
    }
});

// @desc    Get single student
// @route   GET /api/v1/students/:id
// @access  Private
const getStudent = asyncHandler(async (req, res, next) => {
    const student = await SchoolStudent.findById(req.params.id)
        .populate('school', 'name code')
        .populate('userId', 'email role');

    if (!student) {
        return next(
            new ErrorResponse(`Student not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or owner of the student
    if (student.school._id.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to access this student`, 401)
        );
    }

    res.status(200).json({
        success: true,
        data: student
    });
});

// @desc    Create new student
// @route   POST /api/v1/schools/:schoolId/students
// @access  Private
const createStudent = asyncHandler(async (req, res, next) => {
    // Add school to req.body
    req.body.school = req.params.schoolId;

    // Check if school exists
    const school = await School.findById(req.params.schoolId);
    if (!school) {
        return next(
            new ErrorResponse(`School not found with id of ${req.params.schoolId}`, 404)
        );
    }

    // Check for existing student with same admission number
    if (req.body.admissionNumber) {
        const existingStudent = await SchoolStudent.findOne({
            school: req.params.schoolId,
            admissionNumber: req.body.admissionNumber
        });

        if (existingStudent) {
            return next(
                new ErrorResponse(`Student with admission number ${req.body.admissionNumber} already exists`, 400)
            );
        }
    }

    // Set createdBy
    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;

    const student = await SchoolStudent.create(req.body);

    // Update school's student count
    await School.findByIdAndUpdate(
        req.params.schoolId,
        { $inc: { studentCount: 1 } },
        { new: true, runValidators: true }
    );

    res.status(201).json({
        success: true,
        data: student
    });
});

// @desc    Update student
// @route   PUT /api/v1/students/:id
// @access  Private
const updateStudent = asyncHandler(async (req, res, next) => {
    let student = await SchoolStudent.findById(req.params.id);

    if (!student) {
        return next(
            new ErrorResponse(`Student not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or owner of the student
    if (student.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to update this student`, 401)
        );
    }

    // Check for duplicate admission number
    if (req.body.admissionNumber && req.body.admissionNumber !== student.admissionNumber) {
        const existingStudent = await SchoolStudent.findOne({
            school: student.school,
            admissionNumber: req.body.admissionNumber
        });

        if (existingStudent) {
            return next(
                new ErrorResponse(`Student with admission number ${req.body.admissionNumber} already exists`, 400)
            );
        }
    }

    // Set updatedBy
    req.body.updatedBy = req.user.id;

    student = await SchoolStudent.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: student
    });
});

// @desc    Delete student
// @route   DELETE /api/v1/students/:id
// @access  Private
const deleteStudent = asyncHandler(async (req, res, next) => {
    const student = await SchoolStudent.findById(req.params.id);

    if (!student) {
        return next(
            new ErrorResponse(`Student not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or owner of the student
    if (student.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to delete this student`, 401)
        );
    }

    await student.remove();

    // Update school's student count
    await School.findByIdAndUpdate(
        student.school,
        { $inc: { studentCount: -1 } },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Upload student photo
// @route   PUT /api/v1/students/:id/photo
// @access  Private
const uploadStudentPhoto = asyncHandler(async (req, res, next) => {
    const student = await SchoolStudent.findById(req.params.id);

    if (!student) {
        return next(
            new ErrorResponse(`Student not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or owner of the student
    if (student.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to update this student`, 401)
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
            folder: 'student-photos',
            public_id: `student-${student._id}-photo`,
            overwrite: true
        });

        // Update student with photo URL
        student.photo = result.secure_url;
        await student.save();

        // Remove temp file
        fs.unlinkSync(file.tempFilePath);

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (err) {
        return next(new ErrorResponse(`Problem with file upload: ${err.message}`, 500));
    }
});

// @desc    Get students by class/grade
// @route   GET /api/v1/schools/:schoolId/students/class/:grade
// @access  Private
const getStudentsByGrade = asyncHandler(async (req, res, next) => {
    const students = await SchoolStudent.find({
        school: req.params.schoolId,
        grade: req.params.grade,
        status: 'active'
    }).select('studentId firstName lastName gender photo');

    res.status(200).json({
        success: true,
        count: students.length,
        data: students
    });
});

// @desc    Update student transportation details
// @route   PUT /api/v1/students/:id/transportation
// @access  Private
const updateStudentTransportation = asyncHandler(async (req, res, next) => {
    let student = await SchoolStudent.findById(req.params.id);

    if (!student) {
        return next(
            new ErrorResponse(`Student not found with id of ${req.params.id}`, 404)
        );
    }

    // Make sure user is school admin or owner of the student
    if (student.school.toString() !== req.user.school && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(`Not authorized to update this student`, 401)
        );
    }

    // Update transportation details
    student.transportation = {
        ...student.transportation.toObject(),
        ...req.body,
        updatedBy: req.user.id,
        updatedAt: Date.now()
    };

    await student.save();

    res.status(200).json({
        success: true,
        data: student
    });
});

module.exports = {
    getStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    uploadStudentPhoto,
    getStudentsByGrade,
    updateStudentTransportation
};
