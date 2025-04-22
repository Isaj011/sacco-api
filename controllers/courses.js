const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')
const Course = require('../models/Course')

// @desc      Get all courses
// @route     GET  /api/v1/courses
// @route     GET  /api/v1/vehicles/:vehicleId/courses
// @access    public
exports.getCourses = asyncHandler(async (req, res, next) => {
  if (req.params.vehicleId) {
    const courses = await Course.find({ vehicle: req.params.vehicleId })
    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    })
  } else {
    res.status(200).json(res.advancedResults)
  }
})

// @desc      Get a single courses
// @route     GET  /api/v1/courses

// @access    public
exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id).populate({
    path: 'vehicle',
    select: 'plate description',
  })

  if (!course) {
    return next(
      new ErrorResponse(`No route with the id of ${(req, params.id)}`),
      404
    )
  }

  res.status(200).json({
    success: true,
    data: course,
  })
})

// @desc      add course
// @route     GET  /api/v1/courses

// @access    public

exports.createCourse = asyncHandler(async (req, res, next) => {
  // req.body.vehicle = req.params.vehicleId
  req.body.user = req.user.id

  // const vehicle = await Vehicle.findById(req.params.vehicleId)

  // if (!vehicle) {
  //   return next(
  //     new ErrorResponse(`No vehicle with id of ${req.params.vehicleId}`)
  //   )
  // }

  //make sure user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to add a route `,
        401
      )
    )
  }
  const course = await Course.create(req.body)
  res.status(201).json({
    success: true,
    data: course,
  })
})

// @desc      update  course
// @route     PUT  /api/v1/course/:id
// @access    Private
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findByIdAndUpdate(req.params.id)

  if (!course) {
    return next(
      new ErrorResponse(`Route not found with id of ${req.params.id}`, 404)
    )
  }
  //make sure user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this route `,
        401
      )
    )
  }

   course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({ success: true, data: course })
})

// @desc      delete course
// @route     POST  /api/v1/course/:id
// @access    Private
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id)

  if (!course) {
    return next(
      new ErrorResponse(`Route not found with id of ${req.params.id}`, 404)
    )
  }

   //make sure user is admin
   if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this route `,
        401
      )
    )
  }

   course = await Course.findByIdAndDelete(req.params.id)
  
  res.status(200).json({ success: true, data: {} })
})
