const path = require('path')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')
const Vehicle = require('../models/Vehicle')
const Course = require('../models/Course')
const Driver = require('../models/Driver')
const VehicleLocationHistory = require('../models/VehicleLocationHistory')
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
    .populate('currentDriver', 'driverName nationalId contactDetails driverLicense psvLicense status')
    .populate('assignedRoute', 'routeName routeNumber')

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
  // Add User to req.body
  req.body.user = req.user.id

  // Check for listed vehicles
  const listedVehicle = await Vehicle.findOne({ user: req.user.id })

  // If user is not admin, they can only add one vehicle
  if (listedVehicle && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `The user with id ${req.user.id} has already listed a vehicle`,
        400
      )
    )
  }

  // Validate required fields
  const requiredFields = [
    'plateNumber',
    'vehicleModel',
    'vehicleCondition',
    'seatingCapacity',
    'averageSpeed'
  ]

  // Remove system fields from req.body
  const systemFields = [
    'assignedRoute',
    'currentDriver',
    'currentAssignment',
    'estimatedArrivalTime',
    'totalPassengersFerried',
    'averageDailyIncome',
    'totalIncome',
    'totalTrips',
    'mileage'
  ];
  systemFields.forEach(field => delete req.body[field]);

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return next(
        new ErrorResponse(`Please provide ${field}`, 400)
      )
    }
  }

  // Validate numeric fields
  const numericFields = [
    'seatingCapacity',
    'averageSpeed',
    'totalPassengersFerried',
    'averageDailyIncome',
    'totalIncome',
    'totalTrips',
    'mileage'
  ]

  for (const field of numericFields) {
    if (req.body[field] && isNaN(req.body[field])) {
      return next(
        new ErrorResponse(`${field} must be a number`, 400)
      )
    }
  }

  // Validate vehicle condition
  const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Maintenance']
  if (req.body.vehicleCondition && !validConditions.includes(req.body.vehicleCondition)) {
    return next(
      new ErrorResponse(`Invalid vehicle condition. Must be one of: ${validConditions.join(', ')}`, 400)
    )
  }

  // Validate fuel type
  const validFuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid']
  if (req.body.fuelType && !validFuelTypes.includes(req.body.fuelType)) {
    return next(
      new ErrorResponse(`Invalid fuel type. Must be one of: ${validFuelTypes.join(', ')}`, 400)
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

  // Validate numeric fields if provided
  const numericFields = [
    'seatingCapacity',
    'averageSpeed',
    'totalPassengersFerried',
    'averageDailyIncome',
    'totalIncome',
    'totalTrips',
    'mileage'
  ]

  for (const field of numericFields) {
    if (req.body[field] && isNaN(req.body[field])) {
      return next(
        new ErrorResponse(`${field} must be a number`, 400)
      )
    }
  }

  // Validate vehicle condition if provided
  const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Maintenance']
  if (req.body.vehicleCondition && !validConditions.includes(req.body.vehicleCondition)) {
    return next(
      new ErrorResponse(`Invalid vehicle condition. Must be one of: ${validConditions.join(', ')}`, 400)
    )
  }

  // Validate fuel type if provided
  const validFuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid']
  if (req.body.fuelType && !validFuelTypes.includes(req.body.fuelType)) {
    return next(
      new ErrorResponse(`Invalid fuel type. Must be one of: ${validFuelTypes.join(', ')}`, 400)
    )
  }

  // Validate assignedRoute exists if provided
  if (req.body.assignedRoute) {
    const course = await Course.findById(req.body.assignedRoute);
    if (!course) {
      return next(
        new ErrorResponse(`Course with ID ${req.body.assignedRoute} not found`, 404)
      )
    }
  }

  // If currentLocation is being updated, also add to VehicleLocationHistory
  if (req.body.currentLocation && req.body.currentLocation.latitude !== undefined && req.body.currentLocation.longitude !== undefined) {
    // Update the updatedAt field
    req.body.currentLocation.updatedAt = new Date();
    
    // If contextData is provided, include it in the update
    if (req.body.contextData) {
      // Validate contextData structure
      if (req.body.contextData.weather) {
        const validWeatherConditions = ['clear', 'sunny', 'cloudy', 'partly_cloudy', 'rainy', 'stormy'];
        if (req.body.contextData.weather.condition && !validWeatherConditions.includes(req.body.contextData.weather.condition)) {
          return next(
            new ErrorResponse(`Invalid weather condition. Must be one of: ${validWeatherConditions.join(', ')}`, 400)
          );
        }
      }
      
      if (req.body.contextData.traffic) {
        const validTrafficLevels = ['light', 'moderate', 'heavy', 'normal'];
        if (req.body.contextData.traffic.level && !validTrafficLevels.includes(req.body.contextData.traffic.level)) {
          return next(
            new ErrorResponse(`Invalid traffic level. Must be one of: ${validTrafficLevels.join(', ')}`, 400)
          );
        }
      }
      
      if (req.body.contextData.source) {
        const validSources = ['gps', 'manual', 'system'];
        if (!validSources.includes(req.body.contextData.source)) {
          return next(
            new ErrorResponse(`Invalid source. Must be one of: ${validSources.join(', ')}`, 400)
          );
        }
      }
    }
  }

  vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
  res.status(200).json({ success: true, data: vehicle })
})
// @desc      delete vehicle
// @route     DELETE  /api/v1/vehicles/:id
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
  await vehicle.deleteOne()
 
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

// Manual vehicle location update for testing
exports.manualUpdateVehicleLocation = asyncHandler(async (req, res, next) => {
  const { vehicleId } = req.params;
  const { latitude, longitude, speed } = req.body;

  // Validate input
  if (!latitude || !longitude) {
    return next(new ErrorResponse('Latitude and longitude are required', 400));
  }

  // Find and update vehicle
  const vehicle = await Vehicle.findByIdAndUpdate(
    vehicleId,
    {
      currentLocation: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        updatedAt: new Date()
      },
      currentSpeed: speed || 40,
      averageSpeed: speed || 40
    },
    { new: true }
  );

  if (!vehicle) {
    return next(new ErrorResponse(`Vehicle not found with id of ${vehicleId}`, 404));
  }

  res.status(200).json({
    success: true,
    data: vehicle,
    message: 'Vehicle location updated manually'
  });
});

// Get vehicle location update status
exports.getVehicleUpdateStatus = asyncHandler(async (req, res, next) => {
  const vehicles = await Vehicle.find().select('plateNumber currentLocation currentSpeed contextData');
  
  const status = {
    totalVehicles: vehicles.length,
    lastUpdate: new Date(),
    vehicles: vehicles.map(v => ({
      id: v._id,
      plateNumber: v.plateNumber,
      location: v.currentLocation,
      speed: v.currentSpeed,
      hasRoute: !!v.contextData?.route?.routeId,
      progress: v.contextData?.route?.progress
    }))
  };

  res.status(200).json({
    success: true,
    data: status
  });
});
