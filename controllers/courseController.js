const Course = require('../models/Course');
const Stop = require('../models/Stop');
const Schedule = require('../models/Schedule');
const Fare = require('../models/Fare');
const Performance = require('../models/Performance');
const Vehicle = require('../models/Vehicle');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const mongoose = require('mongoose');

// @desc    Get all courses
// @route   GET /api/v1/courses
// @access  Public
exports.getCourses = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single course
// @route   GET /api/v1/courses/:id
// @access  Public
exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = res.advancedResults.data;

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: course
  });
});

// @desc    Create new course
// @route   POST /api/v1/courses
// @access  Private/Admin
exports.createCourse = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Validate vehicle IDs if provided
  if (req.body.assignedVehicles && req.body.assignedVehicles.length > 0) {
    const validVehicleIds = req.body.assignedVehicles.filter(id => 
      mongoose.Types.ObjectId.isValid(id)
    );
    
    if (validVehicleIds.length !== req.body.assignedVehicles.length) {
      return next(
        new ErrorResponse('One or more invalid vehicle IDs provided', 400)
      );
    }

    // Verify all vehicles exist
    const vehicles = await Vehicle.find({ _id: { $in: validVehicleIds } });
    if (vehicles.length !== validVehicleIds.length) {
      return next(
        new ErrorResponse('One or more vehicles not found', 404)
      );
    }
  }

  const systemFields = [
    'maxCapacity',
    'schedule',
    'performance'
  ];
  systemFields.forEach(field => delete req.body[field]);

  const course = await Course.create(req.body);

  res.status(201).json({
    success: true,
    data: course
  });
});

// @desc    Update course
// @route   PUT /api/v1/courses/:id
// @access  Private/Admin
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  // Validate vehicle IDs if provided
  if (req.body.assignedVehicles && req.body.assignedVehicles.length > 0) {
    const validVehicleIds = req.body.assignedVehicles.filter(id => 
      mongoose.Types.ObjectId.isValid(id)
    );
    
    if (validVehicleIds.length !== req.body.assignedVehicles.length) {
      return next(
        new ErrorResponse('One or more invalid vehicle IDs provided', 400)
      );
    }

    // Verify all vehicles exist
    const vehicles = await Vehicle.find({ _id: { $in: validVehicleIds } });
    if (vehicles.length !== validVehicleIds.length) {
      return next(
        new ErrorResponse('One or more vehicles not found', 404)
      );
    }
  }

  const systemFields = [
    'maxCapacity',
    'schedule',
    'performance'
  ];
  systemFields.forEach(field => delete req.body[field]);

  course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: course
  });
});

// @desc    Delete course
// @route   DELETE /api/v1/courses/:id
// @access  Private/Admin
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
    );
  }

  await course.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
}); 