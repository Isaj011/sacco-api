const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Register all models
require('./models/User');
require('./models/Driver');
require('./models/Vehicle');
require('./models/Course');
require('./models/Stop');
require('./models/DriverAssignment');
require('./models/LocationTrigger');
require('./models/VehicleLocationHistory');

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

// Verify Kenya Sacco Data
const verifyKenyaSaccoData = async () => {
  try {
    await connectDB();
    
    console.log('\n🔍 Verifying Kenya Sacco Data - What is Being Saved?'.cyan.bold);
    console.log('==================================================='.cyan);
    
    // Check Vehicle data
    console.log('\n🚗 Vehicle Model Data:'.yellow);
    const vehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } }).limit(3);
    
    if (vehicles.length === 0) {
      console.log('❌ No vehicles found! Please run the seeder first:'.red);
      console.log('   node seeder.js -i'.gray);
      process.exit(1);
    }
    
    vehicles.forEach((vehicle, index) => {
      console.log(`\n   Vehicle ${index + 1}: ${vehicle.plateNumber}`.white);
      console.log(`      Location: ${vehicle.currentLocation?.latitude}, ${vehicle.currentLocation?.longitude}`.gray);
      console.log(`      Speed: ${vehicle.currentSpeed} km/h`.gray);
      console.log(`      Updated: ${vehicle.currentLocation?.updatedAt?.toLocaleString() || 'Never'}`.gray);
      
      // Show contextData if exists
      if (vehicle.contextData) {
        console.log(`\n      🌤️ Weather: ${vehicle.contextData.weather?.condition || 'N/A'} (${vehicle.contextData.weather?.temperature || 'N/A'}°C)`.gray);
        console.log(`      🚦 Traffic: ${vehicle.contextData.traffic?.level || 'N/A'} - ${vehicle.contextData.traffic?.description || 'N/A'}`.gray);
        console.log(`      ⛽ Fuel Efficiency: ${vehicle.contextData.performance?.fuelEfficiency || 'N/A'} km/l`.gray);
        console.log(`      🔋 Battery: ${vehicle.contextData.deviceHealth?.batteryLevel || 'N/A'}%`.gray);
        console.log(`      📶 Signal: ${vehicle.contextData.deviceHealth?.signalStrength || 'N/A'}%`.gray);
        console.log(`      🧭 Heading: ${vehicle.contextData.heading || 'N/A'}°`.gray);
        console.log(`      📍 Events: ${vehicle.contextData.events?.join(', ') || 'None'}`.gray);
        console.log(`      🛣️ Route Deviation: ${vehicle.contextData.route?.deviation?.distance || '0'}m, ${vehicle.contextData.route?.deviation?.duration || '0'}s`.gray);
      } else {
        console.log(`      ❌ No contextData found - Background job not running`.red);
      }
    });
    
    // Check VehicleLocationHistory data
    console.log('\n📝 VehicleLocationHistory Data:'.yellow);
    const historyCount = await VehicleLocationHistory.countDocuments();
    console.log(`   Total History Entries: ${historyCount}`.white);
    
    if (historyCount > 0) {
      const recentHistory = await VehicleLocationHistory.find()
        .populate('vehicleId', 'plateNumber')
        .sort({ timestamp: -1 })
        .limit(3);
      
      recentHistory.forEach((entry, index) => {
        console.log(`\n   History Entry ${index + 1}:`.white);
        console.log(`      Vehicle: ${entry.vehicleId?.plateNumber || entry.vehicleId}`.gray);
        console.log(`      Timestamp: ${entry.timestamp.toLocaleString()}`.gray);
        console.log(`      Location: ${entry.location.latitude}, ${entry.location.longitude}`.gray);
        console.log(`      Speed: Current ${entry.speed.current} km/h, Avg ${entry.speed.average} km/h`.gray);
        console.log(`      Heading: ${entry.heading || 'N/A'}°`.gray);
        
        // Show context data
        if (entry.context) {
          console.log(`\n      🎯 Context:`.gray);
          console.log(`         Events: ${entry.context.events?.join(', ') || 'None'}`.gray);
          console.log(`         Weather: ${entry.context.conditions?.weather?.condition || 'N/A'}`.gray);
          console.log(`         Traffic: ${entry.context.conditions?.traffic?.level || 'N/A'}`.gray);
          console.log(`         Fuel Efficiency: ${entry.context.performance?.fuelEfficiency || 'N/A'} km/l`.gray);
          console.log(`         Route Deviation: ${entry.context.route?.deviation?.distance || '0'}m`.gray);
        }
        
        // Show metadata
        if (entry.metadata) {
          console.log(`\n      📊 Metadata:`.gray);
          console.log(`         Source: ${entry.metadata.source}`.gray);
          console.log(`         Battery: ${entry.metadata.batteryLevel || 'N/A'}%`.gray);
          console.log(`         Signal: ${entry.metadata.signalStrength || 'N/A'}%`.gray);
          console.log(`         Accuracy: ${entry.metadata.accuracy || 'N/A'}m`.gray);
        }
      });
    } else {
      console.log(`   ❌ No history entries found - System not running`.red);
    }
    
    // Check data flow
    console.log('\n🔄 Data Flow Analysis:'.yellow);
    
    const vehiclesWithContext = await Vehicle.countDocuments({
      'contextData.weather.condition': { $exists: true }
    });
    
    const historyWithContext = await VehicleLocationHistory.countDocuments({
      'context.conditions.weather.condition': { $exists: true }
    });
    
    const totalVehicles = await Vehicle.countDocuments({ status: { $in: ['in_use', 'available'] } });
    
    console.log(`   Vehicles with Rich Context: ${vehiclesWithContext}/${totalVehicles}`.white);
    console.log(`   History with Rich Context: ${historyWithContext}/${historyCount}`.white);
    
    if (vehiclesWithContext > 0 && historyWithContext > 0) {
      console.log(`   ✅ Data flow is working correctly!`.green);
      console.log(`   ✅ Background Job → Vehicle → VehicleLocationHistory`.green);
    } else {
      console.log(`   ❌ Data flow is not working`.red);
      console.log(`   ❌ Start background job: POST /api/v1/background-jobs/start-simulation`.red);
    }
    
    // Show sample JSON structure
    console.log('\n📋 Sample Data Structure:'.yellow);
    
    const sampleVehicle = await Vehicle.findOne({ 'contextData.weather.condition': { $exists: true } });
    if (sampleVehicle) {
      console.log(`\n   Vehicle.contextData:`.white);
      console.log(`   ${JSON.stringify(sampleVehicle.contextData, null, 2)}`.gray);
    }
    
    const sampleHistory = await VehicleLocationHistory.findOne({ 'context.conditions.weather.condition': { $exists: true } });
    if (sampleHistory) {
      console.log(`\n   VehicleLocationHistory.context:`.white);
      console.log(`   ${JSON.stringify(sampleHistory.context, null, 2)}`.gray);
    }
    
    console.log('\n✅ Verification Complete!'.green);
    console.log('\n💡 To start the system:'.cyan);
    console.log('   1. Start background job: POST /api/v1/background-jobs/start-simulation'.white);
    console.log('   2. Monitor data: GET /api/v1/vehicle-location-history/realtime'.white);
    console.log('   3. Check analytics: GET /api/v1/vehicle-location-history/analytics'.white);
    
  } catch (error) {
    console.error('❌ Error verifying Kenya Sacco data:'.red, error);
    process.exit(1);
  }
};

// Run verification
verifyKenyaSaccoData(); 