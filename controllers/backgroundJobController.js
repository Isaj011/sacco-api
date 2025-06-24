const BackgroundJobService = require('../services/backgroundJobService');

// Initialize the background job service
const backgroundJobService = new BackgroundJobService();

// @desc    Initialize background job service
// @route   POST /api/background-jobs/initialize
// @access  Private
exports.initializeBackgroundJobs = async (req, res) => {
  try {
    const success = await backgroundJobService.initialize();
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Background job service initialized successfully',
        data: backgroundJobService.getJobStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to initialize background job service - no vehicles found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Start all background jobs
// @route   POST /api/background-jobs/start
// @access  Private
exports.startAllJobs = async (req, res) => {
  try {
    const success = backgroundJobService.startAllJobs();
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'All background jobs started successfully',
        data: backgroundJobService.getJobStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to start background jobs - service not initialized'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Stop all background jobs
// @route   POST /api/background-jobs/stop
// @access  Private
exports.stopAllJobs = async (req, res) => {
  try {
    backgroundJobService.stopAllJobs();
    
    res.status(200).json({
      success: true,
      message: 'All background jobs stopped successfully',
      data: backgroundJobService.getJobStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Start simulation job only
// @route   POST /api/background-jobs/start-simulation
// @access  Private
exports.startSimulationJob = async (req, res) => {
  try {
    const success = backgroundJobService.startSimulationJob();
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Vehicle data simulation job started successfully',
        data: backgroundJobService.getSimulationStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to start simulation job - service not initialized'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Stop simulation job only
// @route   POST /api/background-jobs/stop-simulation
// @access  Private
exports.stopSimulationJob = async (req, res) => {
  try {
    backgroundJobService.stopSimulationJob();
    
    res.status(200).json({
      success: true,
      message: 'Vehicle data simulation job stopped successfully',
      data: backgroundJobService.getSimulationStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Get job status
// @route   GET /api/background-jobs/status
// @access  Private
exports.getJobStatus = async (req, res) => {
  try {
    const status = backgroundJobService.getJobStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Get simulation status
// @route   GET /api/background-jobs/simulation-status
// @access  Private
exports.getSimulationStatus = async (req, res) => {
  try {
    const status = backgroundJobService.getSimulationStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Manually trigger simulation
// @route   POST /api/background-jobs/trigger-simulation
// @access  Private
exports.triggerSimulation = async (req, res) => {
  try {
    const status = await backgroundJobService.triggerSimulation();
    
    res.status(200).json({
      success: true,
      message: 'Simulation triggered successfully',
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Manually refresh data
// @route   POST /api/background-jobs/refresh-data
// @access  Private
exports.refreshData = async (req, res) => {
  try {
    const success = await backgroundJobService.manualRefresh();
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Data refreshed successfully',
        data: backgroundJobService.getJobStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to refresh data'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Handle new vehicle creation
// @route   POST /api/background-jobs/handle-new-vehicle/:vehicleId
// @access  Private
exports.handleNewVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const triggers = await backgroundJobService.handleNewVehicle(vehicleId);
    
    res.status(200).json({
      success: true,
      message: 'New vehicle handled successfully',
      data: {
        vehicleId,
        triggersCreated: triggers.length,
        triggers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Handle new course creation
// @route   POST /api/background-jobs/handle-new-course/:courseId
// @access  Private
exports.handleNewCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const vehiclesUpdated = await backgroundJobService.handleNewCourse(courseId);
    
    res.status(200).json({
      success: true,
      message: 'New course handled successfully',
      data: {
        courseId,
        vehiclesUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

// @desc    Handle new driver creation
// @route   POST /api/background-jobs/handle-new-driver/:driverId
// @access  Private
exports.handleNewDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    await backgroundJobService.handleNewDriver(driverId);
    
    res.status(200).json({
      success: true,
      message: 'New driver handled successfully',
      data: {
        driverId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
}; 