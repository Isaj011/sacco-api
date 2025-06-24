const cron = require('node-cron');
const VehicleDataSimulator = require('./vehicleDataSimulator');

class BackgroundJobService {
  constructor() {
    this.simulator = new VehicleDataSimulator();
    this.jobs = new Map();
    this.isInitialized = false;
    this.lastRefreshTime = null;
    this.refreshInterval = 5 * 60 * 1000; // 5 minutes
  }

  // Initialize the background job service
  async initialize() {
    try {
      const success = await this.simulator.initialize();
      if (success) {
        this.isInitialized = true;
        this.lastRefreshTime = Date.now();
        console.log('✅ BackgroundJobService initialized successfully');
        return true;
      } else {
        console.error('❌ Failed to initialize BackgroundJobService - no vehicles found');
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing BackgroundJobService:', error);
      return false;
    }
  }

  // Refresh data to include newly created items
  async refreshData() {
    try {
      console.log('🔄 Refreshing background job data...');
      
      // Re-initialize simulator to get new data
      const success = await this.simulator.initialize();
      
      if (success) {
        this.lastRefreshTime = Date.now();
        console.log('✅ Data refreshed successfully');
        
        // Log what was found
        const status = this.simulator.getStatus();
        console.log(`📊 Current Status: ${status.activeVehicles} vehicles, ${status.activeRoutes} routes`);
        
        return true;
      } else {
        console.warn('⚠️ No vehicles found during refresh');
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      return false;
    }
  }

  // Check if refresh is needed
  shouldRefresh() {
    if (!this.lastRefreshTime) return true;
    return (Date.now() - this.lastRefreshTime) > this.refreshInterval;
  }

  // Start the main simulation job
  startSimulationJob() {
    if (!this.isInitialized) {
      console.error('❌ BackgroundJobService not initialized');
      return false;
    }

    // Stop any existing simulation job
    this.stopSimulationJob();

    // Start the simulator
    this.simulator.start();

    // Schedule the data simulation to run every 30 seconds
    const simulationJob = cron.schedule('*/30 * * * * *', async () => {
      // Check if we need to refresh data (every 5 minutes)
      if (this.shouldRefresh()) {
        await this.refreshData();
      }
      
      await this.simulator.simulateData();
    }, {
      scheduled: false,
      timezone: 'Africa/Nairobi'
    });

    // Start the job
    simulationJob.start();
    this.jobs.set('simulation', simulationJob);

    console.log('🔄 Vehicle data simulation job started');
    console.log('⏰ Running every 30 seconds');
    console.log('🔄 Dataset repeats every 2 minutes (4 data points × 30 seconds)');
    console.log('🔄 Data refresh every 5 minutes');

    return true;
  }

  // Stop the simulation job
  stopSimulationJob() {
    const job = this.jobs.get('simulation');
    if (job) {
      job.stop();
      this.jobs.delete('simulation');
      this.simulator.stop();
      console.log('⏹️ Vehicle data simulation job stopped');
    }
  }

  // Start a maintenance job (runs daily at 2 AM)
  startMaintenanceJob() {
    const maintenanceJob = cron.schedule('0 2 * * *', async () => {
      console.log('🔧 Running daily maintenance job...');
      
      try {
        // Clean up old location history (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const VehicleLocationHistory = require('../models/VehicleLocationHistory');
        const result = await VehicleLocationHistory.deleteMany({
          timestamp: { $lt: thirtyDaysAgo }
        });
        
        console.log(`🧹 Cleaned up ${result.deletedCount} old location history records`);
        
        // Update vehicle statuses if needed
        const Vehicle = require('../models/Vehicle');
        const vehicles = await Vehicle.find({ status: 'in_use' });
        
        for (const vehicle of vehicles) {
          // Check if vehicle has been inactive for more than 24 hours
          const lastUpdate = vehicle.currentLocation?.updatedAt;
          if (lastUpdate) {
            const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceUpdate > 24) {
              await Vehicle.findByIdAndUpdate(vehicle._id, {
                status: 'maintenance',
                'currentLocation.updatedAt': new Date()
              });
              console.log(`🔧 Vehicle ${vehicle.plateNumber || vehicle._id} marked for maintenance`);
            }
          }
        }
        
        console.log('✅ Daily maintenance job completed');
      } catch (error) {
        console.error('❌ Error in maintenance job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Africa/Nairobi'
    });

    maintenanceJob.start();
    this.jobs.set('maintenance', maintenanceJob);
    console.log('🔧 Daily maintenance job scheduled (2 AM daily)');
  }

  // Start a health check job (runs every 5 minutes)
  startHealthCheckJob() {
    const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
      console.log('🏥 Running health check...');
      
      try {
        const Vehicle = require('../models/Vehicle');
        const LocationTrigger = require('../models/LocationTrigger');
        const VehicleLocationHistory = require('../models/VehicleLocationHistory');

        // Check vehicle statuses
        const vehicles = await Vehicle.find();
        const activeVehicles = vehicles.filter(v => v.status === 'in_use').length;
        const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
        
        // Check active triggers
        const activeTriggers = await LocationTrigger.countDocuments({ isActive: true });
        
        // Check recent location history
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentHistory = await VehicleLocationHistory.countDocuments({
          timestamp: { $gte: oneHourAgo }
        });

        console.log(`📊 Health Check Results:`);
        console.log(`   🚗 Total vehicles: ${vehicles.length}`);
        console.log(`   ✅ Active vehicles: ${activeVehicles}`);
        console.log(`   🔧 Maintenance vehicles: ${maintenanceVehicles}`);
        console.log(`   🚨 Active triggers: ${activeTriggers}`);
        console.log(`   📍 Recent location updates: ${recentHistory}`);
        
        // Alert if no recent activity
        if (recentHistory === 0 && this.simulator.isRunning) {
          console.warn('⚠️ No recent location updates detected - simulation may not be working properly');
        }
        
      } catch (error) {
        console.error('❌ Error in health check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Africa/Nairobi'
    });

    healthCheckJob.start();
    this.jobs.set('healthCheck', healthCheckJob);
    console.log('🏥 Health check job scheduled (every 5 minutes)');
  }

  // Start all jobs
  startAllJobs() {
    if (!this.isInitialized) {
      console.error('❌ BackgroundJobService not initialized');
      return false;
    }

    this.startSimulationJob();
    this.startMaintenanceJob();
    this.startHealthCheckJob();

    console.log('🚀 All background jobs started');
    return true;
  }

  // Stop all jobs
  stopAllJobs() {
    for (const [jobName, job] of this.jobs) {
      job.stop();
      console.log(`⏹️ Stopped ${jobName} job`);
    }
    this.jobs.clear();
    this.simulator.stop();
    console.log('⏹️ All background jobs stopped');
  }

  // Get job status
  getJobStatus() {
    const status = {
      isInitialized: this.isInitialized,
      activeJobs: Array.from(this.jobs.keys()),
      simulatorStatus: this.simulator.getStatus(),
      lastRefreshTime: this.lastRefreshTime,
      nextRefreshTime: this.lastRefreshTime ? this.lastRefreshTime + this.refreshInterval : null
    };

    return status;
  }

  // Get detailed simulation status
  getSimulationStatus() {
    return this.simulator.getStatus();
  }

  // Manually trigger a simulation cycle
  async triggerSimulation() {
    if (!this.isInitialized) {
      throw new Error('BackgroundJobService not initialized');
    }

    await this.simulator.simulateData();
    return this.simulator.getStatus();
  }

  // Manually refresh data
  async manualRefresh() {
    console.log('🔄 Manual data refresh requested...');
    return await this.refreshData();
  }

  // Handle new vehicle creation
  async handleNewVehicle(vehicleId) {
    try {
      console.log(`🆕 New vehicle detected: ${vehicleId}`);
      
      // Create triggers for the new vehicle
      const { createTriggersForVehicle } = require('../utils/sampleLocationTriggers');
      const triggers = await createTriggersForVehicle(vehicleId);
      
      console.log(`✅ Created ${triggers.length} triggers for new vehicle`);
      
      // Refresh simulator data to include new vehicle
      await this.refreshData();
      
      return triggers;
    } catch (error) {
      console.error('❌ Error handling new vehicle:', error);
      throw error;
    }
  }

  // Handle new course/route creation
  async handleNewCourse(courseId) {
    try {
      console.log(`🆕 New course detected: ${courseId}`);
      
      // Refresh simulator data to include new course
      await this.refreshData();
      
      // Create route-specific triggers for vehicles assigned to this course
      const Vehicle = require('../models/Vehicle');
      const vehicles = await Vehicle.find({ assignedRoute: courseId });
      
      for (const vehicle of vehicles) {
        await this.handleNewVehicle(vehicle._id);
      }
      
      console.log(`✅ Updated ${vehicles.length} vehicles for new course`);
      
      return vehicles.length;
    } catch (error) {
      console.error('❌ Error handling new course:', error);
      throw error;
    }
  }

  // Handle new driver creation
  async handleNewDriver(driverId) {
    try {
      console.log(`🆕 New driver detected: ${driverId}`);
      
      // Refresh simulator data to include new driver
      await this.refreshData();
      
      console.log('✅ Updated simulator data for new driver');
      
      return true;
    } catch (error) {
      console.error('❌ Error handling new driver:', error);
      throw error;
    }
  }
}

module.exports = BackgroundJobService; 