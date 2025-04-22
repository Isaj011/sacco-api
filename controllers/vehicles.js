const path = require('path')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')
const Vehicle = require('../models/Vehicle')
// @desc      Get all vehicles
// @route     GET  /api/v1/vehicles
// @access    public
exports.getVehicles = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults)
})

// @desc      Get single vehicle
// @route     GET  /api/v1/vehicles/:id
// @access    public
exports.getVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findById(req.params.id)

  if (!vehicle) {
    return next(
      new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
    )
  }

  res.status(200).json({ success: true, data: vehicle })
})

// @desc      create new vehicle
// @route     POST  /api/v1/vehicles
// @access    Private
exports.createVehicle = asyncHandler(async (req, res, next) => {
  //Add User to req.body
  req.body.user = req.user.id

  //check for listed vehicles
  const listedVehicle = await Vehicle.findOne({ user: req.user.id })

  // if user is not admin, they can only add one vehicle

  if (listedVehicle && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `The user with id ${req.user.id} has already listed a vehicle`,
        400
      )
    )
  }

  const vehicle = await Vehicle.create(req.body)
  res.status(201).json({
    success: true,
    data: vehicle,
  })
})
// @desc      update  vehicle
// @route     PUT  /api/v1/vehicles/:id
// @access    Private
exports.updateVehicle = asyncHandler(async (req, res, next) => {
  let vehicle = await Vehicle.findById(req.params.id)

  if (!vehicle) {
    return next(
      new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
    )
  }

  //make sure user is vehicle owner
  if (vehicle.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.params.id} is not authorized to update this vehicle`,
        401
      )
    )
  }

  vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
  res.status(200).json({ success: true, data: vehicle })
})
// @desc      delete vehicle
// @route     POST  /api/v1/vehicles/:id
// @access    Private
exports.deleteVehicle = asyncHandler(async (req, res, next) => {
  let vehicle = await Vehicle.findById(req.params.id)

  if (!vehicle) {
    return next(
      new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
    )
  }

  //make sure user is vehicle owner
  if (vehicle.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.params.id} is not authorized to delete this vehicle`,
        401
      )
    )
  }
  vehicle = await Vehicle.findByIdAndDelete(req.params.id)
 
  // vehicle.remove()

  res.status(200).json({ success: true, data: {} })
})

// @desc      upload vehicle photo
// @route     PUT  /api/v1/vehicles/:id/photo
// @access    Private
exports.vehiclePhotoUpload = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findById(req.params.id)

  if (!vehicle) {
    return next(
      new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404)
    )
  }

    //make sure user is vehicle owner
    if (vehicle.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.params.id} is not authorized to delete this vehicle`,
          401
        )
      ) 
    }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 404))
  }

  const file = req.files.File

  //make sure image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 404))
  }

  //check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD} `,
        404
      )
    )
  }

  //Create custom file name
  file.name = `photo_${vehicle._id}${path.parse(file.name).ext}`

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
    if (err) {
      console.error(err)
      return next(new ErrorResponse(`Problem with file upload `, 500))
    }

    await Vehicle.findByIdAndUpdate(req.params.id, { photo: file.name })

    res.status(200).json({
      success: true,
      data: file.name,
    })
  })
})
