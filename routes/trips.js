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
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst', 'driver'), getSchoolTrip);

// Trip actions (driver accessible)
router.route('/:id/start')
    .post(authorize('admin', 'staff', 'driver'), startTrip);

router.route('/:id/end')
    .post(authorize('admin', 'staff', 'driver'), endTrip);

router.route('/:id/pickup')
    .post(authorize('admin', 'staff', 'driver'), pickupStudent);

router.route('/:id/dropoff')
    .post(authorize('admin', 'staff', 'driver'), dropOffStudent);

router.route('/:id/events')
    .post(authorize('admin', 'staff', 'driver'), addTripEvent);

router.route('/:id/delay')
    .post(authorize('admin', 'staff', 'driver'), addTripDelay);

module.exports = router;
