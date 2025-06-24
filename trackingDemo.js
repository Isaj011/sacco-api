const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config/config.env' });

// Register all models
require('./models/User');
require('./models/Driver');
require('./models/Course');
require('./models/Stop');
require('./models/DriverAssignment');
require('./models/LocationTrigger');
require('./models/Vehicle');
require('./models/VehicleLocationHistory');

const Vehicle = require('./models/Vehicle');
const VehicleLocationHistory = require('./models/VehicleLocationHistory');

async function trackingDemo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get a sample vehicle
    const vehicle = await Vehicle.findOne({ status: { $in: ['in_use', 'available'] } });
    if (!vehicle) {
      console.log('❌ No vehicles found!');
      return;
    }
    
    console.log(`\n🚗 Tracking Demo for: ${vehicle.plateNumber}`);
    
    // 1. REAL-TIME TRACKING (Every 30 seconds)
    console.log('\n📍 1. REAL-TIME TRACKING (Frontend Map)');
    console.log('   =====================================');
    
    const recentPoints = await VehicleLocationHistory.find({ vehicleId: vehicle._id })
      .sort({ timestamp: -1 })
      .limit(5);
    
    console.log(`   Last 5 tracking points (every 30 seconds):`);
    recentPoints.forEach((point, i) => {
      console.log(`   ${i + 1}. ${point.timestamp.toLocaleTimeString()} - ${point.location.latitude.toFixed(4)}, ${point.location.longitude.toFixed(4)} - ${point.speed.current.toFixed(1)} km/h`);
    });
    
    // 2. JOURNEY RECONSTRUCTION
    console.log('\n🛣️ 2. JOURNEY RECONSTRUCTION');
    console.log('   =========================');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayJourney = await VehicleLocationHistory.find({
      vehicleId: vehicle._id,
      timestamp: { $gte: today }
    }).sort({ timestamp: 1 });
    
    console.log(`   Today's journey: ${todayJourney.length} tracking points`);
    
    if (todayJourney.length > 0) {
      const start = todayJourney[0];
      const end = todayJourney[todayJourney.length - 1];
      
      console.log(`   🚀 Start: ${start.timestamp.toLocaleTimeString()} at ${start.location.latitude.toFixed(4)}, ${start.location.longitude.toFixed(4)}`);
      console.log(`   🏁 End: ${end.timestamp.toLocaleTimeString()} at ${end.location.latitude.toFixed(4)}, ${end.location.longitude.toFixed(4)}`);
      console.log(`   ⏱️ Duration: ${((end.timestamp - start.timestamp) / (1000 * 60)).toFixed(1)} minutes`);
    }
    
    // 3. NTSA COMPLIANCE (Speed Violations)
    console.log('\n🚨 3. NTSA COMPLIANCE (Speed Violations)');
    console.log('   ====================================');
    
    const speedViolations = await VehicleLocationHistory.find({
      vehicleId: vehicle._id,
      'speed.current': { $gt: 80 }, // Speeding > 80 km/h
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 });
    
    console.log(`   Speed violations (>80 km/h) in last 24 hours: ${speedViolations.length}`);
    
    speedViolations.slice(0, 3).forEach((violation, i) => {
      console.log(`   ${i + 1}. ${violation.timestamp.toLocaleTimeString()} - Speed: ${violation.speed.current.toFixed(1)} km/h at ${violation.location.latitude.toFixed(4)}, ${violation.location.longitude.toFixed(4)}`);
    });
    
    // 4. ROUTE DEVIATION DETECTION
    console.log('\n🛣️ 4. ROUTE DEVIATION DETECTION');
    console.log('   =============================');
    
    const routeDeviations = await VehicleLocationHistory.find({
      vehicleId: vehicle._id,
      'context.route.deviation.distance': { $gt: 100 }, // Deviation > 100m
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 });
    
    console.log(`   Route deviations (>100m) in last 24 hours: ${routeDeviations.length}`);
    
    routeDeviations.slice(0, 3).forEach((deviation, i) => {
      console.log(`   ${i + 1}. ${deviation.timestamp.toLocaleTimeString()} - Deviation: ${deviation.context.route.deviation.distance}m, ${deviation.context.route.deviation.duration}s at ${deviation.location.latitude.toFixed(4)}, ${deviation.location.longitude.toFixed(4)}`);
    });
    
    // 5. BUSINESS INTELLIGENCE
    console.log('\n📊 5. BUSINESS INTELLIGENCE');
    console.log('   =======================');
    
    const analytics = await VehicleLocationHistory.aggregate([
      {
        $match: {
          vehicleId: vehicle._id,
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      },
      {
        $group: {
          _id: null,
          avgSpeed: { $avg: '$speed.current' },
          maxSpeed: { $max: '$speed.current' },
          totalPoints: { $sum: 1 },
          avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
          totalDistance: { $sum: { $multiply: ['$speed.current', 0.00833] } } // km per 30 seconds
        }
      }
    ]);
    
    if (analytics.length > 0) {
      const data = analytics[0];
      console.log(`   📈 7-Day Performance Summary:`);
      console.log(`      Average Speed: ${data.avgSpeed.toFixed(1)} km/h`);
      console.log(`      Maximum Speed: ${data.maxSpeed.toFixed(1)} km/h`);
      console.log(`      Total Tracking Points: ${data.totalPoints}`);
      console.log(`      Average Fuel Efficiency: ${data.avgFuelEfficiency.toFixed(1)} km/l`);
      console.log(`      Estimated Total Distance: ${data.totalDistance.toFixed(1)} km`);
    }
    
    console.log('\n✅ Tracking Demo Complete!');
    console.log('\n🎯 How This Helps Kenya Saccos:');
    console.log('   📍 Real-time tracking every 30 seconds for maps');
    console.log('   📊 Complete journey reconstruction for reports');
    console.log('   🚨 Automatic detection of speeding and route deviations');
    console.log('   📋 NTSA compliance data for authorities');
    console.log('   🏢 Insurance reports with detailed analytics');
    console.log('   📈 Business intelligence for optimization');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

trackingDemo(); 