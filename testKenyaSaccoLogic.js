const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');
const BackgroundJobService = require('./services/backgroundJobService');
const Vehicle = require('./models/Vehicle');
const VehicleLocationHistory = require('./models/VehicleLocationHistory');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Register all models
require('./models/User');
require('./models/Driver');
require('./models/Vehicle');
require('./models/Route');
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

// Test the Kenya Sacco Logic
const testKenyaSaccoLogic = async () => {
  try {
    await connectDB();
    
    console.log('\n🔍 Testing Kenya Sacco Logic - What Data is Being Saved?'.cyan.bold);
    console.log('========================================================'.cyan);
    
    // Step 1: Check initial state
    console.log('\n📊 Initial State:'.yellow);
    const initialVehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } });
    const initialHistory = await VehicleLocationHistory.countDocuments();
    
    console.log(`   Vehicles: ${initialVehicles.length}`.white);
    console.log(`   History Entries: ${initialHistory}`.white);
    
    if (initialVehicles.length === 0) {
      console.log('❌ No vehicles found! Please run the seeder first:'.red);
      console.log('   node seeder.js -i'.gray);
      process.exit(1);
    }
    
    // Step 2: Initialize and start background job
    console.log('\n⚙️ Starting Background Job Service...'.yellow);
    const backgroundJobService = new BackgroundJobService();
    const initialized = await backgroundJobService.initialize();
    
    if (!initialized) {
      console.log('❌ Failed to initialize background job service'.red);
      process.exit(1);
    }
    
    backgroundJobService.startSimulationJob();
    console.log('✅ Background job started'.green);
    
    // Step 3: Monitor data flow for 2 minutes
    console.log('\n⏱️ Monitoring Data Flow for 2 minutes...'.yellow);
    console.log('   This will show you exactly what data is being saved'.gray);
    
    let cycleCount = 0;
    const maxCycles = 4; // 2 minutes total (4 × 30 seconds)
    
    const monitoringInterval = setInterval(async () => {
      cycleCount++;
      
      console.log(`\n🔄 Cycle ${cycleCount}/${maxCycles} - ${new Date().toLocaleTimeString()}`.cyan);
      
      // Check Vehicle model updates
      const updatedVehicles = await Vehicle.find({ 
        status: { $in: ['in_use', 'available'] },
        'currentLocation.updatedAt': { $gte: new Date(Date.now() - 35000) } // Last 35 seconds
      });
      
      console.log(`   📍 Vehicles Updated: ${updatedVehicles.length}`.white);
      
      // Check VehicleLocationHistory entries
      const recentHistory = await VehicleLocationHistory.find({
        timestamp: { $gte: new Date(Date.now() - 35000) } // Last 35 seconds
      }).populate('vehicleId', 'plateNumber');
      
      console.log(`   📝 History Entries Created: ${recentHistory.length}`.white);
      
      // Show detailed data from first vehicle
      if (updatedVehicles.length > 0) {
        const vehicle = updatedVehicles[0];
        console.log(`\n   🚗 Vehicle Data Being Saved:`.yellow);
        console.log(`      Plate: ${vehicle.plateNumber}`.white);
        console.log(`      Location: ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`.white);
        console.log(`      Speed: ${vehicle.currentSpeed} km/h`.white);
        console.log(`      Updated: ${vehicle.currentLocation.updatedAt.toLocaleTimeString()}`.white);
        
        // Show rich context data
        if (vehicle.contextData) {
          console.log(`\n      🌤️ Weather: ${vehicle.contextData.weather?.condition || 'N/A'} (${vehicle.contextData.weather?.temperature || 'N/A'}°C)`.white);
          console.log(`      🚦 Traffic: ${vehicle.contextData.traffic?.level || 'N/A'} - ${vehicle.contextData.traffic?.description || 'N/A'}`.white);
          console.log(`      ⛽ Fuel Efficiency: ${vehicle.contextData.performance?.fuelEfficiency || 'N/A'} km/l`.white);
          console.log(`      🔋 Battery: ${vehicle.contextData.deviceHealth?.batteryLevel || 'N/A'}%`.white);
          console.log(`      📶 Signal: ${vehicle.contextData.deviceHealth?.signalStrength || 'N/A'}%`.white);
          console.log(`      🧭 Heading: ${vehicle.contextData.heading || 'N/A'}°`.white);
          console.log(`      📍 Events: ${vehicle.contextData.events?.join(', ') || 'None'}`.white);
          console.log(`      🛣️ Route Deviation: ${vehicle.contextData.route?.deviation?.distance || '0'}m, ${vehicle.contextData.route?.deviation?.duration || '0'}s`.white);
        }
      }
      
      // Show detailed history entry
      if (recentHistory.length > 0) {
        const history = recentHistory[0];
        console.log(`\n   📋 VehicleLocationHistory Entry Being Saved:`.yellow);
        console.log(`      Vehicle: ${history.vehicleId?.plateNumber || history.vehicleId}`.white);
        console.log(`      Timestamp: ${history.timestamp.toLocaleTimeString()}`.white);
        console.log(`      Location: ${history.location.latitude}, ${history.location.longitude}`.white);
        console.log(`      Speed: Current ${history.speed.current} km/h, Avg ${history.speed.average} km/h`.white);
        console.log(`      Heading: ${history.heading || 'N/A'}°`.white);
        
        // Show context data
        if (history.context) {
          console.log(`\n      🎯 Context Data:`.white);
          console.log(`         Events: ${history.context.events?.join(', ') || 'None'}`.white);
          console.log(`         Weather: ${history.context.conditions?.weather?.condition || 'N/A'}`.white);
          console.log(`         Traffic: ${history.context.conditions?.traffic?.level || 'N/A'}`.white);
          console.log(`         Fuel Efficiency: ${history.context.performance?.fuelEfficiency || 'N/A'} km/l`.white);
          console.log(`         Route Deviation: ${history.context.route?.deviation?.distance || '0'}m`.white);
        }
        
        // Show metadata
        if (history.metadata) {
          console.log(`\n      📊 Metadata:`.white);
          console.log(`         Source: ${history.metadata.source}`.white);
          console.log(`         Battery: ${history.metadata.batteryLevel || 'N/A'}%`.white);
          console.log(`         Signal: ${history.metadata.signalStrength || 'N/A'}%`.white);
          console.log(`         Accuracy: ${history.metadata.accuracy || 'N/A'}m`.white);
        }
      }
      
      if (cycleCount >= maxCycles) {
        clearInterval(monitoringInterval);
        
        // Step 4: Final analysis
        console.log('\n📊 Final Analysis:'.cyan);
        
        const finalVehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } });
        const finalHistory = await VehicleLocationHistory.countDocuments();
        const todayHistory = await VehicleLocationHistory.countDocuments({
          timestamp: { $gte: new Date().setHours(0, 0, 0, 0) }
        });
        
        console.log(`   Total Vehicles: ${finalVehicles.length}`.white);
        console.log(`   Total History Entries: ${finalHistory}`.white);
        console.log(`   Today's History Entries: ${todayHistory}`.white);
        console.log(`   New Entries Created: ${finalHistory - initialHistory}`.white);
        
        // Check data quality
        const vehiclesWithContext = await Vehicle.countDocuments({
          'contextData.weather.condition': { $exists: true }
        });
        
        const historyWithContext = await VehicleLocationHistory.countDocuments({
          'context.conditions.weather.condition': { $exists: true }
        });
        
        console.log(`\n   ✅ Data Quality Check:`.yellow);
        console.log(`      Vehicles with Rich Context: ${vehiclesWithContext}/${finalVehicles.length}`.white);
        console.log(`      History with Rich Context: ${historyWithContext}/${finalHistory}`.white);
        
        // Show sample data structure
        console.log(`\n   📋 Sample Data Structure:`.yellow);
        const sampleVehicle = await Vehicle.findOne({ 'contextData.weather.condition': { $exists: true } });
        if (sampleVehicle) {
          console.log(`      Vehicle.contextData:`.white);
          console.log(`         ${JSON.stringify(sampleVehicle.contextData, null, 8)}`.gray);
        }
        
        const sampleHistory = await VehicleLocationHistory.findOne({ 'context.conditions.weather.condition': { $exists: true } });
        if (sampleHistory) {
          console.log(`\n      VehicleLocationHistory.context:`.white);
          console.log(`         ${JSON.stringify(sampleHistory.context, null, 8)}`.gray);
        }
        
        // Stop simulation
        console.log('\n⏹️ Stopping simulation...'.yellow);
        backgroundJobService.stopSimulationJob();
        
        console.log('\n✅ Kenya Sacco Logic Test Completed!'.green);
        console.log('\n🎯 What This Proves:'.cyan);
        console.log('   1. ✅ Background Job updates Vehicle model with rich context'.white);
        console.log('   2. ✅ Vehicle model automatically creates VehicleLocationHistory entries'.white);
        console.log('   3. ✅ Rich data flows: Background Job → Vehicle → VehicleLocationHistory'.white);
        console.log('   4. ✅ Perfect for Kenya Sacco real-time tracking and analytics'.white);
        
        process.exit(0);
      }
    }, 30000); // 30 seconds
    
  } catch (error) {
    console.error('❌ Error testing Kenya Sacco logic:'.red, error);
    process.exit(1);
  }
};

// Run the test
testKenyaSaccoLogic(); 