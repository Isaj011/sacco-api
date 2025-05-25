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
const Course = require('../models/Course');

// Apply advanced results middleware to GET all courses
router.get('/', advancedResults(Course, [
  { path: 'stops' },
  { path: 'schedule' },
  { path: 'fare' },
  { path: 'performance' },
  { path: 'assignedVehicles', select: 'plateNumber vehicleModel driverName seatingCapacity' },
  { path: 'user', select: 'name email' }
]), getCourses);

router.post('/', protect, authorize('admin'), createCourse);

router
  .route('/:id')
  .get(advancedResults(Course, [
    { path: 'stops' },
    { path: 'schedule' },
    { path: 'fare' },
    { path: 'performance' },
    { path: 'assignedVehicles', select: 'plateNumber vehicleModel driverName seatingCapacity' },
    { path: 'user', select: 'name email' }
  ]), getCourse)
  .put(protect, authorize('admin'), updateCourse)
  .delete(protect, authorize('admin'), deleteCourse);

module.exports = router;
