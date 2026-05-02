const express = require('express')
const {
  getVehicle,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  vehiclePhotoUpload,
  manualUpdateVehicleLocation,
  getVehicleUpdateStatus,
} = require('../controllers/vehicles')

const Vehicle = require('../models/Vehicle')

//include other resource routers
const courseRouter = require('./courses')

const router = express.Router()

const advancedResults = require('../middleware/advancedResults')
const { protect, authorize } = require('../middleware/auth')
const scopeToSacco = require('../middleware/scopeToSacco')

//re-route into other resource routers
router.use('/:vehicleId/courses', courseRouter)

router
  .route('/')
  .get(protect, scopeToSacco, advancedResults(Vehicle, [
    { path: 'currentDriver', select: 'driverName phone' },
    { path: 'saccoOperator', select: 'name' },
    { path: 'assignedRoute', select: 'routeName routeNumber' },
  ]), getVehicles)
  .post(protect, authorize('publisher', 'admin'), createVehicle)

router
  .route('/:id/photo')
  .put(protect, authorize('publisher', 'admin'), vehiclePhotoUpload)

router
  .route('/:id')
  .get(getVehicle)
  .put(protect, authorize('publisher', 'admin'), updateVehicle)
  .delete(protect, authorize('publisher', 'admin'), deleteVehicle)

// Manual update routes for testing
router
  .route('/:vehicleId/location')
  .put(manualUpdateVehicleLocation)

router
  .route('/status/updates')
  .get(getVehicleUpdateStatus)

module.exports = router
