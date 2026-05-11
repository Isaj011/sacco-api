// @route /api/v1/routes
const express = require('express');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const scopeToSacco = require('../middleware/scopeToSacco');
const Route = require('../models/Route');

// Apply advanced results middleware to GET all courses
router.get('/', protect, scopeToSacco, advancedResults(Route, [
  { path: 'stops' },
  { path: 'fare' },
  { path: 'assignedVehicles', select: 'plateNumber vehicleModel driverName seatingCapacity currentLocation' },
  { path: 'user', select: 'name email' }
]), getCourses);

router.post('/', protect, authorize('admin'), createCourse);

router
  .route('/:id')
  .get(advancedResults(Route, [
    { path: 'stops' },
    { path: 'fare' },
    { path: 'assignedVehicles', select: 'plateNumber vehicleModel driverName seatingCapacity currentLocation' },
    { path: 'user', select: 'name email' }
  ]), getCourse)
  .put(protect, authorize('admin'), updateCourse)
  .delete(protect, authorize('admin'), deleteCourse);

module.exports = router;
