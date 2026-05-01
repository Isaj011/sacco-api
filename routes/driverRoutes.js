const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const driverController = require('../controllers/driverController');
const driverAssignmentController = require('../controllers/driverAssignmentController');
const { protect, authorize } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/') },
  filename:    function (req, file, cb) { cb(null, `${Date.now()}-${file.originalname}`) }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ok = /jpeg|jpg|png|pdf/.test(file.mimetype) &&
               /jpeg|jpg|png|pdf/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
  }
});

// Read roles — admin + all staff/regulatory roles
const READERS = ['admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'];
// Write roles — admin only (no phantom 'manager'/'supervisor' roles)
const WRITERS = ['admin'];
// Self-service — driver can submit their own requests
const SELF    = ['admin', 'driver'];

// Assignments list — before /:id to avoid conflict
router.get('/assignments', protect, authorize(...READERS), driverAssignmentController.getAllAssignments);

// Driver Profile
router.post('/register', protect, authorize(...WRITERS), upload.single('photo'), driverController.registerDriver);
router.get('/',          protect, authorize(...READERS), driverController.getAllDrivers);
router.get('/:id',       protect, authorize(...READERS), driverController.getDriverById);
router.put('/:id',       protect, authorize(...WRITERS), upload.single('photo'), driverController.updateDriver);
router.delete('/:id',    protect, authorize(...WRITERS), driverController.deleteDriver);

// Documents
router.post('/:id/documents',                          protect, authorize(...WRITERS), upload.single('document'), driverController.uploadDocuments);
router.get('/:id/documents',                           protect, authorize(...READERS), driverController.getDocuments);
router.delete('/:id/documents/:documentType/:documentId', protect, authorize(...WRITERS), driverController.deleteDocument);

// Assignment
router.post('/:id/assign', protect, authorize(...WRITERS), driverAssignmentController.createAssignment);
router.put('/:id/assign',  protect, authorize(...WRITERS), driverAssignmentController.updateAssignment);
router.get('/:id/assign',  protect, authorize(...READERS), driverAssignmentController.getAssignment);

// Leave
router.post('/:id/leaves',           protect, authorize(...SELF),    driverAssignmentController.createLeaveRequest);
router.put('/:id/leaves/:leaveId',   protect, authorize(...WRITERS), driverAssignmentController.updateLeaveStatus);
router.get('/:id/leaves',            protect, authorize(...READERS), driverAssignmentController.getLeaveHistory);

// Disciplinary
router.post('/:id/disciplinary', protect, authorize(...WRITERS), driverAssignmentController.addDisciplinaryRecord);
router.get('/:id/disciplinary',  protect, authorize(...READERS), driverAssignmentController.getDisciplinaryRecords);

// Grievances
router.post('/:id/grievances',                protect, authorize(...SELF),    driverAssignmentController.createGrievance);
router.put('/:id/grievances/:grievanceId',    protect, authorize(...WRITERS), driverAssignmentController.updateGrievanceStatus);
router.get('/:id/grievances',                 protect, authorize(...READERS), driverAssignmentController.getGrievanceHistory);

module.exports = router;
