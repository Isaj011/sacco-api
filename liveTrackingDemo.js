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

async function liveTrackingDemo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // 1. LIVE TRACKING - Current positions of all vehicles
    console.log('\n📍 1. LIVE TRACKING - Current Vehicle Positions');
    console.log('   =============================================');
    
    // Get all active vehicles with their current positions
    const liveVehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } })
      .populate('currentDriver', 'driverName')
      .populate('assignedRoute', 'routeName');
    
    console.log(`   🚗 Live vehicles: ${liveVehicles.length}`);
    
    liveVehicles.forEach((vehicle, index) => {
      console.log(`\n   Vehicle ${index + 1}: ${vehicle.plateNumber}`);
      console.log(`      Driver: ${vehicle.currentDriver?.driverName || 'Unassigned'}`);
      console.log(`      Route: ${vehicle.assignedRoute?.routeName || 'No route'}`);
      console.log(`      Current Location: ${vehicle.currentLocation?.latitude?.toFixed(4)}, ${vehicle.currentLocation?.longitude?.toFixed(4)}`);
      console.log(`      Current Speed: ${vehicle.currentSpeed || 0} km/h`);
      console.log(`      Last Updated: ${vehicle.currentLocation?.updatedAt?.toLocaleTimeString() || 'Never'}`);
      
      // Show rich context data
      if (vehicle.contextData) {
        console.log(`      Weather: ${vehicle.contextData.weather?.condition || 'N/A'}`);
        console.log(`      Traffic: ${vehicle.contextData.traffic?.level || 'N/A'}`);
        console.log(`      Fuel Efficiency: ${vehicle.contextData.performance?.fuelEfficiency || 'N/A'} km/l`);
        console.log(`      Battery: ${vehicle.contextData.deviceHealth?.batteryLevel || 'N/A'}%`);
      }
    });
    
    // 2. COMPLETE VEHICLE HISTORY PATH
    console.log('\n🛣️ 2. COMPLETE VEHICLE HISTORY PATH');
    console.log('   ===============================');
    
    if (liveVehicles.length > 0) {
      const sampleVehicle = liveVehicles[0];
      console.log(`   📊 Complete history path for: ${sampleVehicle.plateNumber}`);
      
      // Get all history entries for this vehicle (last 24 hours)
      const historyPath = await VehicleLocationHistory.find({
        vehicleId: sampleVehicle._id,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).sort({ timestamp: 1 }); // Oldest to newest
      
      console.log(`   📍 Total tracking points: ${historyPath.length}`);
      console.log(`   ⏱️ Time range: ${historyPath[0]?.timestamp.toLocaleString()} to ${historyPath[historyPath.length - 1]?.timestamp.toLocaleString()}`);
      
      // Show path coordinates (first 10 and last 10 points)
      console.log(`\n   🗺️ Path Coordinates:`);
      
      // First 10 points
      console.log(`   🚀 Start of journey (first 10 points):`);
      historyPath.slice(0, 10).forEach((point, i) => {
        console.log(`      ${i + 1}. ${point.timestamp.toLocaleTimeString()} - ${point.location.latitude.toFixed(4)}, ${point.location.longitude.toFixed(4)} - ${point.speed.current.toFixed(1)} km/h`);
      });
      
      // Last 10 points
      if (historyPath.length > 10) {
        console.log(`   🏁 End of journey (last 10 points):`);
        historyPath.slice(-10).forEach((point, i) => {
          const index = historyPath.length - 10 + i;
          console.log(`      ${index + 1}. ${point.timestamp.toLocaleTimeString()} - ${point.location.latitude.toFixed(4)}, ${point.location.longitude.toFixed(4)} - ${point.speed.current.toFixed(1)} km/h`);
        });
      }
      
      // Calculate total distance
      let totalDistance = 0;
      for (let i = 1; i < historyPath.length; i++) {
        const prev = historyPath[i - 1];
        const curr = historyPath[i];
        const distance = Math.sqrt(
          Math.pow(curr.location.latitude - prev.location.latitude, 2) +
          Math.pow(curr.location.longitude - prev.location.longitude, 2)
        ) * 111; // Rough conversion to km
        totalDistance += distance;
      }
      
      console.log(`\n   📏 Total distance covered: ${totalDistance.toFixed(2)} km`);
      console.log(`   ⏱️ Total time: ${((historyPath[historyPath.length - 1].timestamp - historyPath[0].timestamp) / (1000 * 60)).toFixed(1)} minutes`);
    }
    
    // 3. REAL-TIME TRACKING DATA (Latest entries)
    console.log('\n🔄 3. REAL-TIME TRACKING DATA (Latest 30 seconds)');
    console.log('   =============================================');
    
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const recentTracking = await VehicleLocationHistory.find({
      timestamp: { $gte: thirtySecondsAgo }
    }).populate('vehicleId', 'plateNumber').sort({ timestamp: -1 });
    
    console.log(`   📍 Recent tracking points (last 30 seconds): ${recentTracking.length}`);
    
    recentTracking.slice(0, 5).forEach((point, i) => {
      console.log(`   ${i + 1}. ${point.vehicleId.plateNumber} - ${point.timestamp.toLocaleTimeString()} - ${point.location.latitude.toFixed(4)}, ${point.location.longitude.toFixed(4)} - ${point.speed.current.toFixed(1)} km/h`);
    });
    
    // 4. COLLECTIONS AND DATA STRUCTURE
    console.log('\n📋 4. COLLECTIONS AND DATA STRUCTURE');
    console.log('   ================================');
    
    // Count documents in each collection
    const vehicleCount = await Vehicle.countDocuments();
    const historyCount = await VehicleLocationHistory.countDocuments();
    
    console.log(`   📊 Database Collections:`);
    console.log(`      🚗 Vehicle collection: ${vehicleCount} vehicles`);
    console.log(`      📝 VehicleLocationHistory collection: ${historyCount} tracking points`);
    
    // Show data structure
    console.log(`\n   📋 Data Structure:`);
    console.log(`      Vehicle collection: Contains current state of all vehicles`);
    console.log(`      VehicleLocationHistory collection: Contains complete tracking history`);
    console.log(`      Each tracking point includes: location, speed, context, metadata`);
    
    // 5. API ENDPOINTS FOR FRONTEND
    console.log('\n🌐 5. API ENDPOINTS FOR FRONTEND');
    console.log('   =============================');
    
    console.log(`   📍 Live Tracking Endpoints:`);
    console.log(`      GET /api/v1/vehicles?status=in_use - Get all active vehicles with current positions`);
    console.log(`      GET /api/v1/vehicle-location-history/realtime - Get latest positions of all vehicles`);
    console.log(`      GET /api/v1/vehicle-location-history/vehicle/:id - Get complete history for specific vehicle`);
    console.log(`      GET /api/v1/vehicle-location-history/vehicle/:id?days=7 - Get last 7 days history`);
    
    console.log(`\n   📊 Analytics Endpoints:`);
    console.log(`      GET /api/v1/vehicle-location-history/analytics - Get performance analytics`);
    console.log(`      GET /api/v1/vehicle-location-history/performance - Get compliance metrics`);
    console.log(`      GET /api/v1/vehicle-location-history/triggers - Get speed violations and alerts`);
    
    // 6. FRONTEND INTEGRATION EXAMPLE
    console.log('\n💻 6. FRONTEND INTEGRATION EXAMPLE');
    console.log('   ===============================');
    
    console.log(`   📍 Real-time map update (every 30 seconds):`);
    console.log(`   \`\`\`javascript`);
    console.log(`   // Update map every 30 seconds`);
    console.log(`   setInterval(async () => {`);
    console.log(`     const response = await fetch('/api/v1/vehicle-location-history/realtime');`);
    console.log(`     const data = await response.json();`);
    console.log(`     `);
    console.log(`     data.data.forEach(vehicle => {`);
    console.log(`       updateMapMarker(vehicle.vehicleId, vehicle.location, vehicle.speed.current);`);
    console.log(`     });`);
    console.log(`   }, 30000);`);
    console.log(`   \`\`\``);
    
    console.log(`\n   🛣️ Journey path reconstruction:`);
    console.log(`   \`\`\`javascript`);
    console.log(`   // Get complete journey path`);
    console.log(`   const journey = await fetch('/api/v1/vehicle-location-history/vehicle/${vehicleId}?days=1');`);
    console.log(`   const pathPoints = journey.data;`);
    console.log(`   drawJourneyPath(pathPoints); // Draw on map`);
    console.log(`   \`\`\``);
    
    console.log('\n✅ Live Tracking Demo Complete!');
    console.log('\n🎯 Key Points:');
    console.log('   📍 Vehicle collection: Current positions (updated every 30 seconds)');
    console.log('   📝 VehicleLocationHistory collection: Complete tracking history');
    console.log('   🔄 Real-time updates: Every 30 seconds via background job');
    console.log('   🗺️ Frontend maps: Use real-time endpoints for live tracking');
    console.log('   📊 Analytics: Use history endpoints for journey reconstruction');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

liveTrackingDemo(); 