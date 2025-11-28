const SchoolRoute = require('../models/SchoolRoute');
const School = require('../models/School');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create a school route
// @route   POST /api/v1/schools/:schoolId/routes
// @access  Private
exports.createSchoolRoute = asyncHandler(async (req, res, next) => {
    req.body.school = req.params.schoolId;
    const school = await School.findById(req.params.schoolId);
    if (!school) {
        return next(new ErrorResponse(`School not found with id of ${req.params.schoolId}`, 404));
    }
    const schoolRoute = await SchoolRoute.create(req.body);
    res.status(201).json({ success: true, data: schoolRoute });
});

// @desc    Get all school routes
// @route   GET /api/v1/schools/:schoolId/routes
// @access  Private
exports.getSchoolRoutes = asyncHandler(async (req, res, next) => {
    const routes = await SchoolRoute.find({ school: req.params.schoolId });
    res.status(200).json({ success: true, count: routes.length, data: routes });
});

// @desc    Get a single school route
// @route   GET /api/v1/schools/:schoolId/routes/:routeId
// @access  Private
exports.getSchoolRoute = asyncHandler(async (req, res, next) => {
    const route = await SchoolRoute.findById(req.params.routeId);
    if (!route) {
        return next(new ErrorResponse(`Route not found with id of ${req.params.routeId}`, 404));
    }
    res.status(200).json({ success: true, data: route });
});

// @desc    Update a school route
// @route   PUT /api/v1/schools/:schoolId/routes/:routeId
// @access  Private
exports.updateSchoolRoute = asyncHandler(async (req, res, next) => {
    let route = await SchoolRoute.findById(req.params.routeId);
    if (!route) {
        return next(new ErrorResponse(`Route not found with id of ${req.params.routeId}`, 404));
    }
    route = await SchoolRoute.findByIdAndUpdate(req.params.routeId, req.body, {
        new: true,
        runValidators: true
    });
    res.status(200).json({ success: true, data: route });
});

// @desc    Delete a school route
// @route   DELETE /api/v1/schools/:schoolId/routes/:routeId
// @access  Private
exports.deleteSchoolRoute = asyncHandler(async (req, res, next) => {
    const route = await SchoolRoute.findById(req.params.routeId);
    if (!route) {
        return next(new ErrorResponse(`Route not found with id of ${req.params.routeId}`, 404));
    }
    await route.remove();
    res.status(200).json({ success: true, data: {} });
});
