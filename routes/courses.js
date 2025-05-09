const express = require('express');
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courses');

const Course = require('../models/Course');

const router = express.Router({ mergeParams: true });

const advancedResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(
    advancedResults(Course, {
      path: 'assignedVehicles.vehicleId',  // Corrected path for population
      select: 'plateNumber model seatingCapacity', // Select fields to populate
    }),
    getCourses
  )
  .post(protect, authorize('publisher', 'admin'), createCourse);

router
  .route('/:id')
  .get(getCourse)
  .put(protect, authorize('publisher', 'admin'), updateCourse)
  .delete(protect, authorize('publisher', 'admin'), deleteCourse);

module.exports = router;
