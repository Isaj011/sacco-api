const express = require('express');
const {
    getVehicles,
    getVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    uploadVehicleDocuments,
    getVehicleMaintenance,
    addMaintenanceRecord
} = require('../controllers/schoolVehicleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
    .get(authorize('admin', 'staff'), getVehicles)
    .post(authorize('admin'), createVehicle);

router.route('/:vehicleId')
    .get(authorize('admin', 'staff'), getVehicle)
    .put(authorize('admin'), updateVehicle)
    .delete(authorize('admin'), deleteVehicle);

router.route('/:vehicleId/documents')
    .put(authorize('admin'), uploadVehicleDocuments);

router.route('/:vehicleId/maintenance')
    .get(authorize('admin', 'staff'), getVehicleMaintenance)
    .post(authorize('admin'), addMaintenanceRecord);

module.exports = router;
