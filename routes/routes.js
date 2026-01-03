const express = require('express');
const {
    createSchoolRoute,
    getSchoolRoutes,
    getSchoolRoute,
    updateSchoolRoute,
    deleteSchoolRoute
} = require('../controllers/schoolRouteController');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .post(authorize('admin', 'manager'), createSchoolRoute)
    .get(authorize('admin', 'manager', 'supervisor'), getSchoolRoutes);

router.route('/:routeId')
    .get(authorize('admin', 'manager', 'supervisor'), getSchoolRoute)
    .put(authorize('admin', 'manager'), updateSchoolRoute)
    .delete(authorize('admin'), deleteSchoolRoute);

module.exports = router;
