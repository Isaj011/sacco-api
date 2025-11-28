const express = require('express');
const {
    getSchoolTrips,
    getSchoolTrip,
    createSchoolTrip,
    updateSchoolTrip,
    deleteSchoolTrip,
    startTrip,
    endTrip,
    pickupStudent,
    dropOffStudent,
    addTripEvent,
    addTripDelay,
    getTripStatistics,
    getActiveTrips
} = require('../controllers/schoolTripController');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Main trip routes
router.route('/')
    .get(authorize('admin', 'manager', 'supervisor', 'driver'), getSchoolTrips)
    .post(authorize('admin', 'manager'), createSchoolTrip);

// Statistics and active trips
router.route('/stats')
    .get(authorize('admin', 'manager', 'supervisor'), getTripStatistics);

router.route('/active')
    .get(authorize('admin', 'manager', 'supervisor', 'driver'), getActiveTrips);

// Individual trip routes
router.route('/:id')
    .get(authorize('admin', 'manager', 'supervisor', 'driver'), getSchoolTrip)
    .put(authorize('admin', 'manager'), updateSchoolTrip)
    .delete(authorize('admin'), deleteSchoolTrip);

// Trip actions
router.route('/:id/start')
    .post(authorize('admin', 'manager', 'driver'), startTrip);

router.route('/:id/end')
    .post(authorize('admin', 'manager', 'driver'), endTrip);

router.route('/:id/pickup')
    .post(authorize('admin', 'manager', 'driver'), pickupStudent);

router.route('/:id/dropoff')
    .post(authorize('admin', 'manager', 'driver'), dropOffStudent);

router.route('/:id/events')
    .post(authorize('admin', 'manager', 'driver'), addTripEvent);

router.route('/:id/delay')
    .post(authorize('admin', 'manager', 'driver'), addTripDelay);

module.exports = router;
