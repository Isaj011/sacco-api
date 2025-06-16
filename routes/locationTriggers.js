const express = require('express');
const {
  createTrigger,
  getTriggers,
  getTrigger,
  updateTrigger,
  deleteTrigger,
  updateLocation,
  getAllTriggers
} = require('../controllers/locationTriggerController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Development route to get all triggers
router.get('/triggers', protect, authorize('admin'), getAllTriggers);

// Vehicle location update route
router.post('/vehicles/:vehicleId/location', protect, updateLocation);

// Trigger management routes
router
  .route('/vehicles/:vehicleId/triggers')
  .get(protect, getTriggers)
  .post(protect, authorize('admin'), createTrigger);

router
  .route('/triggers/:id')
  .get(protect, getTrigger)
  .put(protect, authorize('admin'), updateTrigger)
  .delete(protect, authorize('admin'), deleteTrigger);

module.exports = router; 