const express = require('express');
const {
  initializeBackgroundJobs,
  startAllJobs,
  stopAllJobs,
  startSimulationJob,
  stopSimulationJob,
  getJobStatus,
  getSimulationStatus,
  triggerSimulation,
  refreshData,
  handleNewVehicle,
  handleNewCourse,
  handleNewDriver
} = require('../controllers/backgroundJobController');

const router = express.Router();

// Initialize background job service
router.post('/initialize', initializeBackgroundJobs);

// Start/Stop all jobs
router.post('/start', startAllJobs);
router.post('/stop', stopAllJobs);

// Start/Stop simulation job only
router.post('/start-simulation', startSimulationJob);
router.post('/stop-simulation', stopSimulationJob);

// Get status
router.get('/status', getJobStatus);
router.get('/simulation-status', getSimulationStatus);

// Manually trigger simulation
router.post('/trigger-simulation', triggerSimulation);

// Data refresh
router.post('/refresh-data', refreshData);

// Handle newly created data
router.post('/handle-new-vehicle/:vehicleId', handleNewVehicle);
router.post('/handle-new-course/:courseId', handleNewCourse);
router.post('/handle-new-driver/:driverId', handleNewDriver);

module.exports = router; 