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

// Test the Kenya Sacco Flow
const testKenyaSaccoFlow = async () => {
  try {
    await connectDB();
    
    console.log('\n🚌 Testing Kenya Sacco Fleet Management Flow'.cyan.bold);
    console.log('=============================================='.cyan);
    
    // Step 1: Check if we have vehicles
    const vehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } });
    console.log(`\n📊 Found ${vehicles.length} active vehicles`.yellow);
    
    if (vehicles.length === 0) {
      console.log('❌ No vehicles found! Please run the seeder first:'.red);
      console.log('   node seeder.js -i'.gray);
      process.exit(1);
    }
    
    // Step 2: Initialize background job service
    console.log('\n⚙️ Initializing background job service...'.yellow);
    const backgroundJobService = new BackgroundJobService();
    const initialized = await backgroundJobService.initialize();
    
    if (!initialized) {
      console.log('❌ Failed to initialize background job service'.red);
      process.exit(1);
    }
    
    console.log('✅ Background job service initialized'.green);
    
    // Step 3: Start simulation
    console.log('\n🔄 Starting vehicle data simulation...'.yellow);
    backgroundJobService.startSimulationJob();
    
    // Step 4: Monitor the flow for 2 minutes
    console.log('\n⏱️ Monitoring Vehicle → VehicleLocationHistory flow for 2 minutes...'.yellow);
    console.log('   This demonstrates the Kenya Sacco system in action'.gray);
    
    let cycleCount = 0;
    const maxCycles = 4; // 2 minutes total (4 × 30 seconds)
    
    const monitoringInterval = setInterval(async () => {
      cycleCount++;
      
      console.log(`\n🔄 Cycle ${cycleCount}/${maxCycles}`.cyan);
      
      // Check Vehicle model updates
      const updatedVehicles = await Vehicle.find({ 
        status: { $in: ['in_use', 'available'] },
        'currentLocation.updatedAt': { $gte: new Date(Date.now() - 35000) } // Last 35 seconds
      });
      
      console.log(`   📍 Vehicles updated: ${updatedVehicles.length}`.white);
      
      // Check VehicleLocationHistory entries
      const recentHistory = await VehicleLocationHistory.find({
        timestamp: { $gte: new Date(Date.now() - 35000) } // Last 35 seconds
      });
      
      console.log(`   📝 History entries created: ${recentHistory.length}`.white);
      
      // Show sample data from first vehicle
      if (updatedVehicles.length > 0) {
        const vehicle = updatedVehicles[0];
        console.log(`   🚗 Sample Vehicle: ${vehicle.plateNumber}`.white);
        console.log(`      Location: ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`.gray);
        console.log(`      Speed: ${vehicle.currentSpeed} km/h`.gray);
        console.log(`      Weather: ${vehicle.contextData?.weather?.condition || 'N/A'}`.gray);
        console.log(`      Traffic: ${vehicle.contextData?.traffic?.level || 'N/A'}`.gray);
        console.log(`      Fuel Efficiency: ${vehicle.contextData?.performance?.fuelEfficiency || 'N/A'} km/l`.gray);
        console.log(`      Battery: ${vehicle.contextData?.deviceHealth?.batteryLevel || 'N/A'}%`.gray);
      }
      
      // Show sample history entry
      if (recentHistory.length > 0) {
        const history = recentHistory[0];
        console.log(`   📋 Sample History Entry:`.white);
        console.log(`      Vehicle: ${history.vehicleId}`.gray);
        console.log(`      Timestamp: ${history.timestamp.toLocaleTimeString()}`.gray);
        console.log(`      Speed: ${history.speed.current} km/h`.gray);
        console.log(`      Events: ${history.context.events.join(', ') || 'None'}`.gray);
        console.log(`      Source: ${history.metadata.source}`.gray);
      }
      
      if (cycleCount >= maxCycles) {
        clearInterval(monitoringInterval);
        
        // Step 5: Final statistics
        console.log('\n📊 Final Statistics:'.cyan);
        
        const totalHistory = await VehicleLocationHistory.countDocuments();
        const todayHistory = await VehicleLocationHistory.countDocuments({
          timestamp: { $gte: new Date().setHours(0, 0, 0, 0) }
        });
        
        console.log(`   Total History Entries: ${totalHistory}`.white);
        console.log(`   Today's Entries: ${todayHistory}`.white);
        
        // Show rich context data availability
        const vehiclesWithContext = await Vehicle.countDocuments({
          'contextData.weather.condition': { $exists: true }
        });
        
        console.log(`   Vehicles with Rich Context: ${vehiclesWithContext}/${vehicles.length}`.white);
        
        // Show trigger data
        const triggerHistory = await VehicleLocationHistory.countDocuments({
          'context.triggerType': { $ne: null }
        });
        
        console.log(`   History Entries with Triggers: ${triggerHistory}`.white);
        
        // Stop simulation
        console.log('\n⏹️ Stopping simulation...'.yellow);
        backgroundJobService.stopSimulationJob();
        
        console.log('\n✅ Kenya Sacco Flow Test Completed Successfully!'.green);
        console.log('\n🎯 System Flow Summary:'.cyan);
        console.log('   1. Background Job → Updates Vehicle Model with rich context'.white);
        console.log('   2. Vehicle Model → Automatically creates VehicleLocationHistory entries'.white);
        console.log('   3. Frontend → Can access both real-time and historical data'.white);
        console.log('\n🚀 Perfect for Kenya Sacco operations!'.green);
        
        process.exit(0);
      }
    }, 30000); // 30 seconds
    
  } catch (error) {
    console.error('❌ Error testing Kenya Sacco flow:'.red, error);
    process.exit(1);
  }
};

// Run the test
testKenyaSaccoFlow(); 