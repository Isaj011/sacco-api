const express = require('express')
const {
  getVehicle,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  vehiclePhotoUpload,
} = require('../controllers/vehicles')

const Vehicle = require('../models/Vehicle')

//include other resource routers
const courseRouter = require('./courses')

const router = express.Router()

const advancedResults = require('../middleware/advancedResults')
const { protect, authorize } = require('../middleware/auth')

//re-route into other resource routers
router.use('/:vehicleId/courses', courseRouter)

router
  .route('/')
  .get(advancedResults(Vehicle), getVehicles)
  .post(protect, authorize('publisher', 'admin'), createVehicle)

router
  .route('/:id/photo')
  .put(protect, authorize('publisher', 'admin'), vehiclePhotoUpload)

router
  .route('/:id')
  .get(getVehicle)
  .put(protect, authorize('publisher', 'admin'), updateVehicle)
  .delete(protect, authorize('publisher', 'admin'), deleteVehicle)
module.exports = router
