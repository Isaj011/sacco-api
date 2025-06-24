const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Register all models before using them
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

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check Vehicle data
    const vehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } }).limit(2);
    console.log(`\n🚗 Found ${vehicles.length} vehicles`);
    
    vehicles.forEach((vehicle, i) => {
      console.log(`\nVehicle ${i + 1}: ${vehicle.plateNumber}`);
      console.log(`  Location: ${vehicle.currentLocation?.latitude}, ${vehicle.currentLocation?.longitude}`);
      console.log(`  Speed: ${vehicle.currentSpeed} km/h`);
      console.log(`  Has contextData: ${!!vehicle.contextData}`);
      
      if (vehicle.contextData) {
        console.log(`  Weather: ${vehicle.contextData.weather?.condition}`);
        console.log(`  Traffic: ${vehicle.contextData.traffic?.level}`);
        console.log(`  Fuel Efficiency: ${vehicle.contextData.performance?.fuelEfficiency} km/l`);
        console.log(`  Battery: ${vehicle.contextData.deviceHealth?.batteryLevel}%`);
      }
    });
    
    // Check VehicleLocationHistory
    const historyCount = await VehicleLocationHistory.countDocuments();
    console.log(`\n📝 Found ${historyCount} history entries`);
    
    if (historyCount > 0) {
      const recentHistory = await VehicleLocationHistory.find()
        .populate('vehicleId', 'plateNumber')
        .sort({ timestamp: -1 })
        .limit(1);
      
      const entry = recentHistory[0];
      console.log(`\nLatest History Entry:`);
      console.log(`  Vehicle: ${entry.vehicleId?.plateNumber}`);
      console.log(`  Timestamp: ${entry.timestamp}`);
      console.log(`  Location: ${entry.location.latitude}, ${entry.location.longitude}`);
      console.log(`  Speed: ${entry.speed.current} km/h`);
      console.log(`  Has context: ${!!entry.context}`);
      
      if (entry.context) {
        console.log(`  Weather: ${entry.context.conditions?.weather?.condition}`);
        console.log(`  Traffic: ${entry.context.conditions?.traffic?.level}`);
        console.log(`  Fuel Efficiency: ${entry.context.performance?.fuelEfficiency} km/l`);
      }
    }
    
    console.log('\n✅ Data check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkData(); 