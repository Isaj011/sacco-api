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

async function showCollections() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🗺️ LIVE TRACKING COLLECTIONS & DATA');
    console.log('====================================');
    
    // 1. VEHICLE COLLECTION (Current Positions)
    console.log('\n🚗 1. VEHICLE COLLECTION (Current Positions)');
    console.log('   ========================================');
    
    const vehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } }).limit(3);
    console.log(`   Active vehicles: ${vehicles.length}`);
    
    vehicles.forEach((vehicle, i) => {
      console.log(`\n   Vehicle ${i + 1}: ${vehicle.plateNumber}`);
      console.log(`      Current Location: ${vehicle.currentLocation?.latitude?.toFixed(4)}, ${vehicle.currentLocation?.longitude?.toFixed(4)}`);
      console.log(`      Current Speed: ${vehicle.currentSpeed || 0} km/h`);
      console.log(`      Last Updated: ${vehicle.currentLocation?.updatedAt?.toLocaleTimeString() || 'Never'}`);
      console.log(`      Has contextData: ${!!vehicle.contextData}`);
    });
    
    // 2. VEHICLELOCATIONHISTORY COLLECTION (Complete History)
    console.log('\n📝 2. VEHICLELOCATIONHISTORY COLLECTION (Complete History)');
    console.log('   =====================================================');
    
    const totalHistory = await VehicleLocationHistory.countDocuments();
    const todayHistory = await VehicleLocationHistory.countDocuments({
      timestamp: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    
    console.log(`   Total history entries: ${totalHistory}`);
    console.log(`   Today's entries: ${todayHistory}`);
    
    // Show sample history entries
    const recentHistory = await VehicleLocationHistory.find()
      .populate('vehicleId', 'plateNumber')
      .sort({ timestamp: -1 })
      .limit(3);
    
    console.log(`\n   Recent history entries:`);
    recentHistory.forEach((entry, i) => {
      console.log(`\n   Entry ${i + 1}:`);
      console.log(`      Vehicle: ${entry.vehicleId?.plateNumber}`);
      console.log(`      Timestamp: ${entry.timestamp.toLocaleString()}`);
      console.log(`      Location: ${entry.location.latitude.toFixed(4)}, ${entry.location.longitude.toFixed(4)}`);
      console.log(`      Speed: ${entry.speed.current.toFixed(1)} km/h`);
      console.log(`      Has context: ${!!entry.context}`);
    });
    
    // 3. COMPLETE VEHICLE PATH
    console.log('\n🛣️ 3. COMPLETE VEHICLE PATH');
    console.log('   =======================');
    
    if (vehicles.length > 0) {
      const vehicle = vehicles[0];
      console.log(`   Complete path for: ${vehicle.plateNumber}`);
      
      // Get all history for this vehicle
      const vehiclePath = await VehicleLocationHistory.find({ vehicleId: vehicle._id })
        .sort({ timestamp: 1 }); // Oldest to newest
      
      console.log(`   Total tracking points: ${vehiclePath.length}`);
      
      if (vehiclePath.length > 0) {
        console.log(`   Time range: ${vehiclePath[0].timestamp.toLocaleString()} to ${vehiclePath[vehiclePath.length - 1].timestamp.toLocaleString()}`);
        
        // Show path coordinates
        console.log(`\n   Path coordinates (first 5 and last 5):`);
        
        // First 5 points
        console.log(`   🚀 Start:`);
        vehiclePath.slice(0, 5).forEach((point, i) => {
          console.log(`      ${i + 1}. ${point.timestamp.toLocaleTimeString()} - ${point.location.latitude.toFixed(4)}, ${point.location.longitude.toFixed(4)}`);
        });
        
        // Last 5 points
        if (vehiclePath.length > 5) {
          console.log(`   🏁 End:`);
          vehiclePath.slice(-5).forEach((point, i) => {
            const index = vehiclePath.length - 5 + i;
            console.log(`      ${index + 1}. ${point.timestamp.toLocaleTimeString()} - ${point.location.latitude.toFixed(4)}, ${point.location.longitude.toFixed(4)}`);
          });
        }
      }
    }
    
    // 4. API ENDPOINTS
    console.log('\n🌐 4. API ENDPOINTS FOR FRONTEND');
    console.log('   =============================');
    
    console.log(`   📍 Live Tracking:`);
    console.log(`      GET /api/v1/vehicles?status=in_use`);
    console.log(`      GET /api/v1/vehicle-location-history/realtime`);
    
    console.log(`\n   🛣️ Complete History:`);
    console.log(`      GET /api/v1/vehicle-location-history/vehicle/:vehicleId`);
    console.log(`      GET /api/v1/vehicle-location-history/vehicle/:vehicleId?days=7`);
    
    console.log(`\n   📊 Analytics:`);
    console.log(`      GET /api/v1/vehicle-location-history/analytics`);
    console.log(`      GET /api/v1/vehicle-location-history/performance`);
    
    // 5. DATA STRUCTURE
    console.log('\n📋 5. DATA STRUCTURE');
    console.log('   =================');
    
    console.log(`   🚗 Vehicle Collection:`);
    console.log(`      - currentLocation: { latitude, longitude, updatedAt }`);
    console.log(`      - currentSpeed: Number`);
    console.log(`      - contextData: { weather, traffic, performance, deviceHealth, events }`);
    
    console.log(`\n   📝 VehicleLocationHistory Collection:`);
    console.log(`      - vehicleId: Reference to Vehicle`);
    console.log(`      - timestamp: Date`);
    console.log(`      - location: { latitude, longitude }`);
    console.log(`      - speed: { current, average, max }`);
    console.log(`      - context: { events, conditions, performance, route }`);
    console.log(`      - metadata: { source, batteryLevel, signalStrength }`);
    
    console.log('\n✅ Collections Overview Complete!');
    console.log('\n🎯 Summary:');
    console.log('   📍 Vehicle collection = Current positions (updated every 30 seconds)');
    console.log('   📝 VehicleLocationHistory collection = Complete tracking history');
    console.log('   🔄 Real-time tracking = Query Vehicle collection for live positions');
    console.log('   🛣️ Journey path = Query VehicleLocationHistory for complete history');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

showCollections(); 