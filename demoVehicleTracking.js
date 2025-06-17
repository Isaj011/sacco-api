const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');

// Load env vars
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

// Connect to DB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

// Demo Vehicle Tracking System
const demoVehicleTracking = async () => {
  try {
    await connectDB();
    
    console.log('\n🗺️ Kenya Sacco Vehicle Tracking & Analytics Demo'.cyan.bold);
    console.log('================================================'.cyan);
    
    // Get a sample vehicle
    const vehicle = await Vehicle.findOne({ status: { $in: ['in_use', 'available'] } });
    if (!vehicle) {
      console.log('❌ No vehicles found! Please run the seeder first:'.red);
      console.log('   node seeder.js -i'.gray);
      process.exit(1);
    }
    
    console.log(`\n🚗 Tracking Vehicle: ${vehicle.plateNumber}`.yellow);
    
    // 1. REAL-TIME TRACKING (Frontend Map)
    console.log('\n📍 1. REAL-TIME TRACKING (Frontend Map)'.yellow);
    console.log('   ===================================='.yellow);
    
    const realTimeData = await VehicleLocationHistory.find({ vehicleId: vehicle._id })
      .sort({ timestamp: -1 })
      .limit(10);
    
    console.log(`   Last 10 tracking points (every 30 seconds):`.white);
    realTimeData.forEach((point, index) => {
      console.log(`   ${index + 1}. ${point.timestamp.toLocaleTimeString()} - ${point.location.latitude.toFixed(4)}, ${point.location.longitude.toFixed(4)} - ${point.speed.current.toFixed(1)} km/h`.gray);
    });
    
    // 2. JOURNEY RECONSTRUCTION
    console.log('\n🛣️ 2. JOURNEY RECONSTRUCTION'.yellow);
    console.log('   ========================='.yellow);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const journeyData = await VehicleLocationHistory.find({
      vehicleId: vehicle._id,
      timestamp: { $gte: today }
    }).sort({ timestamp: 1 });
    
    console.log(`   Today's journey (${journeyData.length} points):`.white);
    
    if (journeyData.length > 0) {
      const startPoint = journeyData[0];
      const endPoint = journeyData[journeyData.length - 1];
      
      console.log(`   🚀 Start: ${startPoint.timestamp.toLocaleTimeString()} at ${startPoint.location.latitude.toFixed(4)}, ${startPoint.location.longitude.toFixed(4)}`.white);
      console.log(`   🏁 End: ${endPoint.timestamp.toLocaleTimeString()} at ${endPoint.location.latitude.toFixed(4)}, ${endPoint.location.longitude.toFixed(4)}`.white);
      
      // Calculate total distance
      let totalDistance = 0;
      for (let i = 1; i < journeyData.length; i++) {
        const prev = journeyData[i - 1];
        const curr = journeyData[i];
        const distance = Math.sqrt(
          Math.pow(curr.location.latitude - prev.location.latitude, 2) +
          Math.pow(curr.location.longitude - prev.location.longitude, 2)
        ) * 111; // Rough conversion to km
        totalDistance += distance;
      }
      
      console.log(`   📏 Total Distance: ${totalDistance.toFixed(2)} km`.white);
      console.log(`   ⏱️ Duration: ${((endPoint.timestamp - startPoint.timestamp) / (1000 * 60)).toFixed(1)} minutes`.white);
    }
    
    // 3. TREND ANALYSIS
    console.log('\n📊 3. TREND ANALYSIS'.yellow);
    console.log('   ================='.yellow);
    
    const trendData = await VehicleLocationHistory.aggregate([
      {
        $match: {
          vehicleId: vehicle._id,
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          avgSpeed: { $avg: '$speed.current' },
          maxSpeed: { $max: '$speed.current' },
          totalPoints: { $sum: 1 },
          avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
          weatherConditions: { $addToSet: '$context.conditions.weather.condition' },
          trafficLevels: { $addToSet: '$context.conditions.traffic.level' }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]);
    
    console.log(`   Last 7 days trends:`.white);
    trendData.forEach(day => {
      console.log(`   📅 ${day._id.date}:`.white);
      console.log(`      Avg Speed: ${day.avgSpeed.toFixed(1)} km/h, Max: ${day.maxSpeed.toFixed(1)} km/h`.gray);
      console.log(`      Fuel Efficiency: ${day.avgFuelEfficiency.toFixed(1)} km/l`.gray);
      console.log(`      Tracking Points: ${day.totalPoints}`.gray);
      console.log(`      Weather: ${day.weatherConditions.join(', ')}`.gray);
      console.log(`      Traffic: ${day.trafficLevels.join(', ')}`.gray);
    });
    
    // 4. NTSA COMPLIANCE & INSURANCE REPORTS
    console.log('\n🚨 4. NTSA COMPLIANCE & INSURANCE REPORTS'.yellow);
    console.log('   ====================================='.yellow);
    
    const complianceData = await VehicleLocationHistory.aggregate([
      {
        $match: {
          vehicleId: vehicle._id,
          timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      {
        $group: {
          _id: null,
          totalSpeedViolations: {
            $sum: { $cond: [{ $gt: ['$speed.current', 80] }, 1, 0] } // Count speeds > 80 km/h
          },
          totalRouteDeviations: {
            $sum: { $cond: [{ $gt: ['$context.route.deviation.distance', 100] }, 1, 0] } // Count deviations > 100m
          },
          avgSpeed: { $avg: '$speed.current' },
          maxSpeed: { $max: '$speed.current' },
          totalDistance: { $sum: { $multiply: ['$speed.current', 0.00833] } }, // km per 30 seconds
          totalOperatingTime: { $sum: 1 }, // 30-second intervals
          avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
          totalIdleTime: { $sum: '$context.performance.idleTime' }
        }
      }
    ]);
    
    if (complianceData.length > 0) {
      const compliance = complianceData[0];
      console.log(`   📋 30-Day Compliance Report for ${vehicle.plateNumber}:`.white);
      console.log(`      🚨 Speed Violations (>80 km/h): ${compliance.totalSpeedViolations}`.white);
      console.log(`      🛣️ Route Deviations (>100m): ${compliance.totalRouteDeviations}`.white);
      console.log(`      📏 Total Distance: ${compliance.totalDistance.toFixed(1)} km`.white);
      console.log(`      ⏱️ Operating Time: ${(compliance.totalOperatingTime * 30 / 60).toFixed(1)} hours`.white);
      console.log(`      🚗 Average Speed: ${compliance.avgSpeed.toFixed(1)} km/h`.white);
      console.log(`      🏃 Max Speed: ${compliance.maxSpeed.toFixed(1)} km/h`.white);
      console.log(`      ⛽ Fuel Efficiency: ${compliance.avgFuelEfficiency.toFixed(1)} km/l`.white);
      console.log(`      🛑 Total Idle Time: ${(compliance.totalIdleTime / 60).toFixed(1)} minutes`.white);
      
      // Compliance status
      const speedViolationRate = (compliance.totalSpeedViolations / compliance.totalOperatingTime) * 100;
      const routeDeviationRate = (compliance.totalRouteDeviations / compliance.totalOperatingTime) * 100;
      
      console.log(`\n      📊 Compliance Status:`.white);
      console.log(`         Speed Violation Rate: ${speedViolationRate.toFixed(2)}% ${speedViolationRate < 5 ? '✅' : '❌'} (NTSA Standard: <5%)`.white);
      console.log(`         Route Deviation Rate: ${routeDeviationRate.toFixed(2)}% ${routeDeviationRate < 10 ? '✅' : '❌'} (Insurance Standard: <10%)`.white);
    }
    
    // 5. EVENT DETECTION (Speeding, Route Deviation)
    console.log('\n🚨 5. EVENT DETECTION'.yellow);
    console.log('   ================='.yellow);
    
    const events = await VehicleLocationHistory.find({
      vehicleId: vehicle._id,
      $or: [
        { 'speed.current': { $gt: 80 } }, // Speeding
        { 'context.route.deviation.distance': { $gt: 100 } }, // Route deviation
        { 'context.events': { $in: ['maintenance', 'status_change'] } } // Other events
      ],
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ timestamp: -1 }).limit(10);
    
    console.log(`   Recent Events (Last 24 hours):`.white);
    events.forEach((event, index) => {
      let eventType = 'Unknown';
      if (event.speed.current > 80) eventType = '🚨 SPEEDING';
      if (event.context.route.deviation.distance > 100) eventType = '🛣️ ROUTE DEVIATION';
      if (event.context.events.includes('maintenance')) eventType = '🔧 MAINTENANCE';
      
      console.log(`   ${index + 1}. ${event.timestamp.toLocaleString()} - ${eventType}`.white);
      console.log(`      Location: ${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`.gray);
      console.log(`      Speed: ${event.speed.current.toFixed(1)} km/h`.gray);
      if (event.context.route.deviation.distance > 100) {
        console.log(`      Deviation: ${event.context.route.deviation.distance}m, ${event.context.route.deviation.duration}s`.gray);
      }
    });
    
    // 6. BUSINESS INTELLIGENCE
    console.log('\n📈 6. BUSINESS INTELLIGENCE'.yellow);
    console.log('   ======================='.yellow);
    
    const businessData = await VehicleLocationHistory.aggregate([
      {
        $match: {
          vehicleId: vehicle._id,
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' }
          },
          avgSpeed: { $avg: '$speed.current' },
          totalPoints: { $sum: 1 },
          avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
          trafficLevels: { $addToSet: '$context.conditions.traffic.level' }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);
    
    console.log(`   Hourly Performance Analysis (Last 7 days):`.white);
    businessData.forEach(hour => {
      const trafficLevel = hour.trafficLevels.includes('heavy') ? '🚦 Heavy' : 
                          hour.trafficLevels.includes('moderate') ? '🚦 Moderate' : '🚦 Light';
      
      console.log(`   ${hour._id.hour.toString().padStart(2, '0')}:00 - Avg Speed: ${hour.avgSpeed.toFixed(1)} km/h, Fuel: ${hour.avgFuelEfficiency.toFixed(1)} km/l ${trafficLevel}`.gray);
    });
    
    console.log('\n✅ Vehicle Tracking & Analytics Demo Complete!'.green);
    console.log('\n🎯 Key Benefits for Kenya Saccos:'.cyan);
    console.log('   📍 Real-time tracking every 30 seconds'.white);
    console.log('   📊 Complete journey reconstruction'.white);
    console.log('   🚨 Automatic event detection (speeding, deviations)'.white);
    console.log('   📋 NTSA compliance reports'.white);
    console.log('   🏢 Insurance and business intelligence'.white);
    console.log('   📈 Trend analysis and optimization'.white);
    
  } catch (error) {
    console.error('❌ Error in demo:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the demo
demoVehicleTracking(); 