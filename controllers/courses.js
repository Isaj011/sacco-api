const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Course = require('../models/Course');
const Vehicle = require('../models/Vehicle'); // Make sure this path is correct

// @desc      Get all courses
// @route     GET  /api/v1/courses
// @route     GET  /api/v1/vehicles/:vehicleId/courses
// @access    Public
exports.getCourses = asyncHandler(async (req, res, next) => {
  if (req.params.vehicleId) {
    // If vehicleId is provided, filter courses based on assigned vehicle
    const courses = await Course.find({ 'assignedVehicles.vehicleId': req.params.vehicleId })
      .populate('assignedVehicles.vehicleId', 'plateNumber model seatingCapacity');  // Populate vehicle info

    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } else {
    // Otherwise, use advancedResults middleware for pagination and other features
    res.status(200).json(res.advancedResults);
  }
});

// @desc      Get a single course
// @route     GET  /api/v1/courses/:id
// @access    Public
exports.getCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id).populate('user', 'name email');

  if (!course) {
    return next(new ErrorResponse(`No route with the ID of ${req.params.id}`, 404));
  }

  // Manually populate each assigned vehicle with relevant details
  const populatedVehicles = await Promise.all(
    course.assignedVehicles.map(async (assignment) => {
      const vehicleData = await Vehicle.findById(assignment.vehicleId).select('plateNumber model seatingCapacity');
      return {
        ...assignment._doc, // Spread assignment fields into the result
        vehicle: vehicleData, // Add the populated vehicle details
      };
    })
  );

  // Convert to plain object and inject the populated vehicles
  course = course.toObject();
  course.assignedVehicles = populatedVehicles;

  res.status(200).json({
    success: true,
    data: course,
  });
});

// @desc      Create a new course
// @route     POST  /api/v1/courses
// @access    Private/Admin
exports.createCourse = asyncHandler(async (req, res, next) => {
  req.body.user = req.user.id;

  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to add a route`, 401)
    );
  }

  const course = await Course.create(req.body);

  res.status(201).json({
    success: true,
    data: course,
  });
});

// @desc      Update a course
// @route     PUT  /api/v1/courses/:id
// @access    Private/Admin
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ErrorResponse(`Route not found with ID ${req.params.id}`, 404));
  }

  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to update this route`, 401)
    );
  }

  course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: course,
  });
});

// @desc      Delete a course
// @route     DELETE  /api/v1/courses/:id
// @access    Private/Admin
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ErrorResponse(`Route not found with ID ${req.params.id}`, 404));
  }

  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to delete this route`, 401)
    );
  }

  await course.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
