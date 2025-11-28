const Parent = require('../models/Parent');
const Student = require('../models/Student');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all parents for a school
// @route   GET /api/v1/schools/:schoolId/parents
// @access  Private
exports.getParents = asyncHandler(async (req, res, next) => {
    const parents = await Parent.find({ school: req.params.schoolId }).populate('children.student');
    res.status(200).json({ success: true, count: parents.length, data: parents });
});

// @desc    Get a single parent
// @route   GET /api/v1/parents/:id
// @access  Private
exports.getParent = asyncHandler(async (req, res, next) => {
    const parent = await Parent.findById(req.params.id).populate('children.student');
    if (!parent) {
        return next(new ErrorResponse(`Parent not found with id of ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: parent });
});

// @desc    Create a parent
// @route   POST /api/v1/schools/:schoolId/parents
// @access  Private
exports.createParent = asyncHandler(async (req, res, next) => {
    req.body.school = req.params.schoolId;
    const parent = await Parent.create(req.body);
    res.status(201).json({ success: true, data: parent });
});

// @desc    Update a parent
// @route   PUT /api/v1/parents/:id
// @access  Private
exports.updateParent = asyncHandler(async (req, res, next) => {
    let parent = await Parent.findById(req.params.id);
    if (!parent) {
        return next(new ErrorResponse(`Parent not found with id of ${req.params.id}`, 404));
    }
    parent = await Parent.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    res.status(200).json({ success: true, data: parent });
});

// @desc    Delete a parent
// @route   DELETE /api/v1/parents/:id
// @access  Private
exports.deleteParent = asyncHandler(async (req, res, next) => {
    const parent = await Parent.findById(req.params.id);
    if (!parent) {
        return next(new ErrorResponse(`Parent not found with id of ${req.params.id}`, 404));
    }
    await parent.remove();
    res.status(200).json({ success: true, data: {} });
});
