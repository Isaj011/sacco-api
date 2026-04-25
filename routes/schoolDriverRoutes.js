const express = require('express');
const {
    getDrivers,
    getDriver,
    createDriver,
    updateDriver,
    deleteDriver,
    uploadDriverDocuments,
    getUpcomingExpirations
} = require('../controllers/schoolDriverController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
    .get(authorize('admin', 'staff'), getDrivers)
    .post(authorize('admin'), createDriver);

router.route('/expirations')
    .get(authorize('admin', 'staff'), getUpcomingExpirations);

router.route('/:driverId')
    .get(authorize('admin', 'staff'), getDriver)
    .put(authorize('admin'), updateDriver)
    .delete(authorize('admin'), deleteDriver);

router.route('/:driverId/documents')
    .put(authorize('admin'), uploadDriverDocuments);

module.exports = router;
