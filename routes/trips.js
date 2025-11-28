const express = require('express');
const {
    getSchoolTrip,
    startTrip,
    endTrip,
    pickupStudent,
    dropOffStudent,
    addTripEvent,
    addTripDelay
} = require('../controllers/schoolTripController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Individual trip routes (accessible by drivers for their assigned trips)
router.route('/:id')
    .get(authorize('admin', 'manager', 'supervisor', 'driver'), getSchoolTrip);

// Trip actions (driver accessible)
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
