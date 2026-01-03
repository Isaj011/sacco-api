const Student = require('../models/Student');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc      Get all students
// @route     GET /api/v1/students
// @route     GET /api/v1/schools/:schoolId/students
// @access    Public
exports.getStudents = asyncHandler(async (req, res, next) => {
    if (req.params.schoolId) {
        const students = await Student.find({ school: req.params.schoolId });
        return res.status(200).json({ success: true, count: students.length, data: students });
    } else {
        res.status(200).json(res.advancedResults);
    }
});

// @desc      Get single student
// @route     GET /api/v1/students/:id
// @access    Public
exports.getStudent = asyncHandler(async (req, res, next) => {
    const student = await Student.findById(req.params.id);
    if (!student) {
        return next(new ErrorResponse(`Student not found with id of ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: student });
});

// @desc      Create new student
// @route     POST /api/v1/schools/:schoolId/students
// @access    Private
exports.createStudent = asyncHandler(async (req, res, next) => {
    req.body.school = req.params.schoolId;
    const student = await Student.create(req.body);
    res.status(201).json({ success: true, data: student });
});

// @desc      Update student
// @route     PUT /api/v1/students/:id
// @access    Private
exports.updateStudent = asyncHandler(async (req, res, next) => {
    let student = await Student.findById(req.params.id);
    if (!student) {
        return next(new ErrorResponse(`Student not found with id of ${req.params.id}`, 404));
    }
    student = await Student.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    res.status(200).json({ success: true, data: student });
});

// @desc      Delete student
// @route     DELETE /api/v1/students/:id
// @access    Private
exports.deleteStudent = asyncHandler(async (req, res, next) => {
    const student = await Student.findById(req.params.id);
    if (!student) {
        return next(new ErrorResponse(`Student not found with id of ${req.params.id}`, 404));
    }
    await student.remove();
    res.status(200).json({ success: true, data: {} });
});
