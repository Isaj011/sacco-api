/**
 * Kenya Sacco Fleet Management System
 * 
 * This example demonstrates how the background job system works for a real Kenya Sacco:
 * 
 * 1. Background Job updates Vehicle model with rich context data
 * 2. Vehicle model automatically creates VehicleLocationHistory entries
 * 3. Frontend can access real-time and historical data
 * 
 * Perfect for:
 * - Matatu Saccos (Nairobi, Mombasa, Kisumu)
 * - Bus Companies (KBS, Citi Hoppa, etc.)
 * - Transport Companies
 * - Government Transport Monitoring
 */

const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');
const BackgroundJobService = require('../services/backgroundJobService');

class KenyaSaccoSystem {
  constructor() {
    this.backgroundJobService = new BackgroundJobService();
  }

  // Initialize the system
  async initialize() {
    console.log('🚌 Initializing Kenya Sacco Fleet Management System...');
    
    // Initialize background job service
    const initialized = await this.backgroundJobService.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize background job service');
    }
    
    console.log('✅ Kenya Sacco System initialized successfully');
  }

  // Start the system (simulates real GPS devices)
  async startSystem() {
    console.log('🔄 Starting Kenya Sacco Fleet Tracking...');
    
    // Start background job simulation
    this.backgroundJobService.startSimulationJob();
    
    console.log('✅ Fleet tracking system started');
    console.log('📱 GPS devices are now sending data every 30 seconds');
    console.log('🗺️ Real-time tracking available on dashboard');
  }

  // Get real-time fleet status (for dashboard)
  async getRealTimeFleetStatus() {
    const vehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } })
      .populate('currentDriver', 'driverName nationalId')
      .populate('assignedRoute', 'routeName routeNumber');
    
    return vehicles.map(vehicle => ({
      vehicleId: vehicle._id,
      plateNumber: vehicle.plateNumber,
      vehicleModel: vehicle.vehicleModel,
      status: vehicle.status,
      currentLocation: vehicle.currentLocation,
      currentSpeed: vehicle.currentSpeed,
      averageSpeed: vehicle.averageSpeed,
      estimatedArrivalTime: vehicle.estimatedArrivalTime,
      driver: vehicle.currentDriver,
      route: vehicle.assignedRoute,
      contextData: vehicle.contextData, // Rich context from background job
      totalPassengersFerried: vehicle.totalPassengersFerried,
      mileage: vehicle.mileage
    }));
  }

  // Get vehicle performance analytics (for compliance reports)
  async getVehiclePerformanceAnalytics(vehicleId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const analytics = await VehicleLocationHistory.aggregate([
      {
        $match: {
          vehicleId: mongoose.Types.ObjectId(vehicleId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          totalDistance: { $sum: { $multiply: ['$speed.current', 0.00833] } },
          avgSpeed: { $avg: '$speed.current' },
          maxSpeed: { $max: '$speed.current' },
          speedViolations: {
            $sum: { $cond: [{ $gt: ['$speed.current', 80] }, 1, 0] }
          },
          avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
          totalIdleTime: { $sum: '$context.performance.idleTime' },
          routeDeviations: {
            $sum: { $cond: [{ $gt: ['$context.route.deviation.distance', 100] }, 1, 0] }
          },
          weatherConditions: { $addToSet: '$context.conditions.weather.condition' },
          trafficLevels: { $addToSet: '$context.conditions.traffic.level' }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]);
    
    return analytics;
  }

  // Get route compliance report (for NTSA compliance)
  async getRouteComplianceReport(routeId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const compliance = await VehicleLocationHistory.aggregate([
      {
        $match: {
          'context.route.routeId': mongoose.Types.ObjectId(routeId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$vehicleId',
          totalTrips: { $sum: 1 },
          avgSpeed: { $avg: '$speed.current' },
          maxSpeed: { $max: '$speed.current' },
          speedViolations: {
            $sum: { $cond: [{ $gt: ['$speed.current', 80] }, 1, 0] }
          },
          routeDeviations: {
            $sum: { $cond: [{ $gt: ['$context.route.deviation.distance', 100] }, 1, 0] }
          },
          avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
          weatherConditions: { $addToSet: '$context.conditions.weather.condition' }
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      {
        $unwind: '$vehicle'
      }
    ]);
    
    return compliance;
  }

  // Get driver performance report (for HR management)
  async getDriverPerformanceReport(driverId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get vehicles assigned to this driver
    const vehicles = await Vehicle.find({ currentDriver: driverId });
    const vehicleIds = vehicles.map(v => v._id);
    
    const performance = await VehicleLocationHistory.aggregate([
      {
        $match: {
          vehicleId: { $in: vehicleIds },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            vehicleId: '$vehicleId'
          },
          totalDistance: { $sum: { $multiply: ['$speed.current', 0.00833] } },
          avgSpeed: { $avg: '$speed.current' },
          maxSpeed: { $max: '$speed.current' },
          speedViolations: {
            $sum: { $cond: [{ $gt: ['$speed.current', 80] }, 1, 0] }
          },
          routeDeviations: {
            $sum: { $cond: [{ $gt: ['$context.route.deviation.distance', 100] }, 1, 0] }
          },
          avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
          totalIdleTime: { $sum: '$context.performance.idleTime' }
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id.vehicleId',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      {
        $unwind: '$vehicle'
      }
    ]);
    
    return performance;
  }

  // Get maintenance alerts (for fleet management)
  async getMaintenanceAlerts() {
    const alerts = await VehicleLocationHistory.aggregate([
      {
        $match: {
          'context.events': { $in: ['maintenance'] },
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }
      },
      {
        $group: {
          _id: '$vehicleId',
          latestAlert: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      {
        $unwind: '$vehicle'
      }
    ]);
    
    return alerts.map(alert => ({
      vehicleId: alert._id,
      plateNumber: alert.vehicle.plateNumber,
      vehicleModel: alert.vehicle.vehicleModel,
      alertType: 'maintenance',
      timestamp: alert.latestAlert.timestamp,
      location: alert.latestAlert.location,
      context: alert.latestAlert.context
    }));
  }

  // Get revenue analytics (for business intelligence)
  async getRevenueAnalytics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const revenue = await Vehicle.aggregate([
      {
        $match: {
          updatedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }
          },
          totalPassengers: { $sum: '$totalPassengersFerried' },
          totalTrips: { $sum: '$totalTrips' },
          totalIncome: { $sum: '$totalIncome' },
          avgDailyIncome: { $avg: '$averageDailyIncome' },
          totalMileage: { $sum: '$mileage' }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]);
    
    return revenue;
  }

  // Stop the system
  async stopSystem() {
    console.log('⏹️ Stopping Kenya Sacco Fleet Tracking...');
    this.backgroundJobService.stopSimulationJob();
    console.log('✅ Fleet tracking system stopped');
  }

  // Get system status
  getSystemStatus() {
    const jobStatus = this.backgroundJobService.getJobStatus();
    return {
      isRunning: jobStatus.simulatorStatus.isRunning,
      activeVehicles: jobStatus.simulatorStatus.activeVehicles,
      activeRoutes: jobStatus.simulatorStatus.activeRoutes,
      currentDataSet: jobStatus.simulatorStatus.currentDataSet,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Example usage for a Kenya Sacco
async function runKenyaSaccoExample() {
  const saccoSystem = new KenyaSaccoSystem();
  
  try {
    // Initialize the system
    await saccoSystem.initialize();
    
    // Start tracking
    await saccoSystem.startSystem();
    
    // Simulate dashboard updates
    setInterval(async () => {
      const fleetStatus = await saccoSystem.getRealTimeFleetStatus();
      console.log(`\n📊 Real-time Fleet Status (${fleetStatus.length} vehicles):`);
      
      fleetStatus.forEach(vehicle => {
        console.log(`🚗 ${vehicle.plateNumber}: ${vehicle.currentSpeed} km/h at ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`);
        console.log(`   Weather: ${vehicle.contextData?.weather?.condition}, Traffic: ${vehicle.contextData?.traffic?.level}`);
        console.log(`   Fuel Efficiency: ${vehicle.contextData?.performance?.fuelEfficiency} km/l, Battery: ${vehicle.contextData?.deviceHealth?.batteryLevel}%`);
      });
    }, 30000); // Update every 30 seconds
    
    // Simulate compliance report generation
    setTimeout(async () => {
      console.log('\n📋 Generating NTSA Compliance Report...');
      const vehicles = await Vehicle.find({ status: 'in_use' }).limit(1);
      if (vehicles.length > 0) {
        const analytics = await saccoSystem.getVehiclePerformanceAnalytics(vehicles[0]._id, 7);
        console.log('📊 7-Day Performance Analytics:', analytics);
      }
    }, 60000); // After 1 minute
    
  } catch (error) {
    console.error('❌ Error running Kenya Sacco example:', error);
  }
}

// Export for use in other files
module.exports = {
  KenyaSaccoSystem,
  runKenyaSaccoExample
};

// Run example if this file is executed directly
if (require.main === module) {
  runKenyaSaccoExample();
} 