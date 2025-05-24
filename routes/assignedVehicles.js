const express = require('express');
const {
  getAssignedVehicles,
  getAssignedVehicle,
  createAssignedVehicle,
  updateAssignedVehicle,
  deleteAssignedVehicle
} = require('../controllers/assignedVehicleController');

const router = express.Router();

router
  .route('/')
  .get(getAssignedVehicles)
  .post(createAssignedVehicle);

router
  .route('/:id')
  .get(getAssignedVehicle)
  .put(updateAssignedVehicle)
  .delete(deleteAssignedVehicle);

module.exports = router; 