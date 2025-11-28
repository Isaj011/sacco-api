const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
    getSchools,
    getSchool,
    createSchool,
    updateSchool,
    deleteSchool,
    uploadSchoolLogo,
    getSchoolStats,
    toggleSchoolStatus
} = require('../controllers/schools');
const { getRealTimeUpdates, sendNotification } = require('../controllers/realtimeController');

const School = require('../models/School');
const advancedResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');
const fileUpload = require('express-fileupload');

// Middleware for file upload
const upload = fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
});

// Validation rules
const schoolValidationRules = [
    body('name').notEmpty().withMessage('Name is required'),
    body('code').notEmpty().withMessage('Code is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('contactEmail').isEmail().withMessage('Please include a valid email'),
    body('contactPhone').notEmpty().withMessage('Phone number is required')
];

// Include other resource routers
const studentRouter = require('./students');
const vehicleRouter = require('./vehicles');
const driverRouter = require('./driverRoutes');
const routeRouter = require('./routes');
const parentRouter = require('./parents');
const tripRouter = require('./schoolTrips');
const notificationRouter = require('./schoolNotifications');

// Re-route into other resource routers
router.use('/:schoolId/students', studentRouter);
router.use('/:schoolId/vehicles', vehicleRouter);
router.use('/:schoolId/drivers', driverRouter);
router.use('/:schoolId/routes', routeRouter);
router.use('/:schoolId/parents', parentRouter);
router.use('/:schoolId/trips', tripRouter);
router.use('/:schoolId/notifications', notificationRouter);

// Apply protect and authorize middleware to all routes
router.use(protect);
router.use(authorize('admin'));

// Routes
router
    .route('/')
    .get(
        advancedResults(School, 'studentsCount vehiclesCount driversCount'),
        getSchools
    )
    .post(schoolValidationRules, validate, createSchool);

router
    .route('/:id')
    .get(getSchool)
    .put(schoolValidationRules, validate, updateSchool)
    .delete(deleteSchool);

// Real-time endpoints
router.get('/:id/real-time', getRealTimeUpdates);
router.post('/:id/notifications', sendNotification);

// Upload school logo
router.put('/:id/logo', upload, uploadSchoolLogo);

// Get school statistics
router.get('/:id/stats', getSchoolStats);

// Toggle school status
router.put('/:id/status', toggleSchoolStatus);

module.exports = router;
