const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const driverController = require('../controllers/driverController');
const driverAssignmentController = require('../controllers/driverAssignmentController');
const { protect, authorize } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
  }
});

// Get all driver assignments - Moved to top to prevent route parameter conflict
router.get('/assignments', 
  protect, 
  authorize('admin', 'manager'), 
  driverAssignmentController.getAllAssignments
);

// Driver Profile Routes
router.post('/register', 
  protect, 
  authorize('admin', 'manager'),
  upload.single('photo'),
  driverController.registerDriver
);

router.get('/', 
  protect, 
  authorize('admin', 'manager', 'supervisor'),
  driverController.getAllDrivers
);

router.get('/:id', 
  protect, 
  authorize('admin', 'manager', 'supervisor'),
  driverController.getDriverById
);

router.put('/:id', 
  protect, 
  authorize('admin', 'manager'),
  upload.single('photo'),
  driverController.updateDriver
);

router.delete('/:id', 
  protect, 
  authorize('admin'),
  driverController.deleteDriver
);

// Document Management Routes
router.post('/:id/documents',
  protect,
  authorize('admin', 'manager'),
  upload.single('document'),
  driverController.uploadDocuments
);

router.get('/:id/documents',
  protect,
  authorize('admin', 'manager', 'supervisor'),
  driverController.getDocuments
);

router.delete('/:id/documents/:documentType/:documentId',
  protect,
  authorize('admin', 'manager'),
  driverController.deleteDocument
);

// Assignment Routes
router.post('/:id/assign',
  protect,
  authorize('admin', 'manager'),
  driverAssignmentController.createAssignment
);

router.put('/:id/assign',
  protect,
  authorize('admin', 'manager'),
  driverAssignmentController.updateAssignment
);

router.get('/:id/assign',
  protect,
  authorize('admin', 'manager', 'supervisor'),
  driverAssignmentController.getAssignment
);

// Leave Management Routes
router.post('/:id/leaves',
  protect,
  authorize('admin', 'manager', 'driver'),
  driverAssignmentController.createLeaveRequest
);

router.put('/:id/leaves/:leaveId',
  protect,
  authorize('admin', 'manager'),
  driverAssignmentController.updateLeaveStatus
);

router.get('/:id/leaves',
  protect,
  authorize('admin', 'manager', 'supervisor'),
  driverAssignmentController.getLeaveHistory
);

// Disciplinary Records Routes
router.post('/:id/disciplinary',
  protect,
  authorize('admin', 'manager'),
  driverAssignmentController.addDisciplinaryRecord
);

router.get('/:id/disciplinary',
  protect,
  authorize('admin', 'manager', 'supervisor'),
  driverAssignmentController.getDisciplinaryRecords
);

// Grievance Management Routes
router.post('/:id/grievances',
  protect,
  authorize('admin', 'manager', 'driver'),
  driverAssignmentController.createGrievance
);

router.put('/:id/grievances/:grievanceId',
  protect,
  authorize('admin', 'manager'),
  driverAssignmentController.updateGrievanceStatus
);

router.get('/:id/grievances',
  protect,
  authorize('admin', 'manager', 'supervisor'),
  driverAssignmentController.getGrievanceHistory
);

module.exports = router; 