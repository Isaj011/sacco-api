const BackgroundJobService = require('../services/backgroundJobService');

// Initialize background job service instance
const backgroundJobService = new BackgroundJobService();

// Middleware to handle new vehicle creation
const handleNewVehicle = async (req, res, next) => {
  try {
    // Store original send function
    const originalSend = res.send;
    
    // Override send function to capture response
    res.send = function(data) {
      // Restore original send
      res.send = originalSend;
      
      // Parse response data
      let responseData;
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (error) {
        responseData = data;
      }
      
      // If vehicle was created successfully, handle it in background
      if (responseData && responseData.success && responseData.data && responseData.data._id) {
        const vehicleId = responseData.data._id;
        
        // Handle new vehicle asynchronously (don't block response)
        setImmediate(async () => {
          try {
            if (backgroundJobService.isInitialized) {
              await backgroundJobService.handleNewVehicle(vehicleId);
              console.log(`🆕 Auto-handled new vehicle: ${vehicleId}`);
            }
          } catch (error) {
            console.error('❌ Error auto-handling new vehicle:', error);
          }
        });
      }
      
      // Send original response
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('❌ Error in handleNewVehicle middleware:', error);
    next();
  }
};

// Middleware to handle new course creation
const handleNewCourse = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      res.send = originalSend;
      
      let responseData;
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (error) {
        responseData = data;
      }
      
      if (responseData && responseData.success && responseData.data && responseData.data._id) {
        const courseId = responseData.data._id;
        
        setImmediate(async () => {
          try {
            if (backgroundJobService.isInitialized) {
              await backgroundJobService.handleNewCourse(courseId);
              console.log(`🆕 Auto-handled new course: ${courseId}`);
            }
          } catch (error) {
            console.error('❌ Error auto-handling new course:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('❌ Error in handleNewCourse middleware:', error);
    next();
  }
};

// Middleware to handle new driver creation
const handleNewDriver = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      res.send = originalSend;
      
      let responseData;
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (error) {
        responseData = data;
      }
      
      if (responseData && responseData.success && responseData.data && responseData.data._id) {
        const driverId = responseData.data._id;
        
        setImmediate(async () => {
          try {
            if (backgroundJobService.isInitialized) {
              await backgroundJobService.handleNewDriver(driverId);
              console.log(`🆕 Auto-handled new driver: ${driverId}`);
            }
          } catch (error) {
            console.error('❌ Error auto-handling new driver:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('❌ Error in handleNewDriver middleware:', error);
    next();
  }
};

// Middleware to handle vehicle assignment changes
const handleVehicleAssignment = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      res.send = originalSend;
      
      let responseData;
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (error) {
        responseData = data;
      }
      
      // If assignment was updated successfully, refresh data
      if (responseData && responseData.success) {
        setImmediate(async () => {
          try {
            if (backgroundJobService.isInitialized) {
              await backgroundJobService.refreshData();
              console.log('🔄 Auto-refreshed data after vehicle assignment change');
            }
          } catch (error) {
            console.error('❌ Error auto-refreshing after assignment:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('❌ Error in handleVehicleAssignment middleware:', error);
    next();
  }
};

// Middleware to handle vehicle status changes
const handleVehicleStatusChange = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      res.send = originalSend;
      
      let responseData;
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (error) {
        responseData = data;
      }
      
      // If vehicle status was updated, refresh data
      if (responseData && responseData.success && responseData.data) {
        const vehicle = responseData.data;
        
        setImmediate(async () => {
          try {
            if (backgroundJobService.isInitialized) {
              // If vehicle became active, create triggers
              if (vehicle.status === 'in_use' || vehicle.status === 'available') {
                await backgroundJobService.handleNewVehicle(vehicle._id);
                console.log(`🆕 Auto-handled vehicle status change: ${vehicle.plateNumber || vehicle._id}`);
              }
              
              // Always refresh data
              await backgroundJobService.refreshData();
              console.log('🔄 Auto-refreshed data after vehicle status change');
            }
          } catch (error) {
            console.error('❌ Error auto-handling vehicle status change:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('❌ Error in handleVehicleStatusChange middleware:', error);
    next();
  }
};

// Initialize background job service
const initializeBackgroundJobService = async () => {
  try {
    await backgroundJobService.initialize();
    console.log('✅ Background job middleware initialized');
  } catch (error) {
    console.error('❌ Error initializing background job middleware:', error);
  }
};

// Export middleware functions
module.exports = {
  handleNewVehicle,
  handleNewCourse,
  handleNewDriver,
  handleVehicleAssignment,
  handleVehicleStatusChange,
  initializeBackgroundJobService,
  backgroundJobService
}; 