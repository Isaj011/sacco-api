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
    .post(authorize('admin', 'staff'), createSchoolRoute)
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSchoolRoutes);

router.route('/:routeId')
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSchoolRoute)
    .put(authorize('admin', 'staff'), updateSchoolRoute)
    .delete(authorize('admin'), deleteSchoolRoute);

module.exports = router;
