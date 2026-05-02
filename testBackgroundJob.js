const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');
const BackgroundJobService = require('./services/backgroundJobService');
const { createSampleTriggers, getTriggerStats } = require('./utils/sampleLocationTriggers');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Register all models to avoid MissingSchemaError
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
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

// Test the background job system
const testBackgroundJobSystem = async () => {
  try {
    await connectDB();
    
    console.log('\n🚀 Testing Background Job System'.cyan.bold);
    console.log('====================================='.cyan);
    
    // Step 1: Check if we have vehicles and routes
    const Vehicle = require('./models/Vehicle');
    const Route = require('./models/Route');
    const Driver = require('./models/Driver');
    
    const vehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } }).populate('assignedRoute currentDriver');
    const courses = await Route.find({ status: 'Active' });
    const drivers = await Driver.find({ status: { $in: ['active', 'assigned'] } });
    
    console.log('\n📊 Current System Status:'.yellow);
    console.log(`🚗 Vehicles: ${vehicles.length} (in_use/available)`.white);
    console.log(`🛣️ Routes/Courses: ${courses.length} (active)`.white);
    console.log(`👨‍💼 Drivers: ${drivers.length} (active/assigned)`.white);
    
    if (vehicles.length === 0) {
      console.log('\n❌ No vehicles found! Please run the seeder first:'.red);
      console.log('   node seeder.js -i'.gray);
      process.exit(1);
    }
    
    // Step 2: Create location triggers
    console.log('\n🌱 Creating location triggers...'.yellow);
    
    // Get admin user for createdBy field
    const User = require('./models/User');
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('❌ No admin user found! Please run the seeder first:'.red);
      console.log('   node seeder.js -i'.gray);
      process.exit(1);
    }
    
    const createdTriggers = await createSampleTriggers(adminUser._id);
    
    if (createdTriggers && createdTriggers.length > 0) {
      console.log(`✅ Created ${createdTriggers.length} triggers`.green);
    } else {
      console.log('ℹ️ Triggers already exist'.blue);
    }
    
    // Step 3: Initialize background job service
    console.log('\n⚙️ Initializing background job service...'.yellow);
    const backgroundJobService = new BackgroundJobService();
    const initialized = await backgroundJobService.initialize();
    
    if (!initialized) {
      console.log('❌ Failed to initialize background job service'.red);
      process.exit(1);
    }
    
    console.log('✅ Background job service initialized'.green);
    
    // Step 4: Show initial status
    const initialStatus = backgroundJobService.getJobStatus();
    console.log('\n📈 Initial Status:'.yellow);
    console.log(`   Running: ${initialStatus.simulatorStatus.isRunning ? 'Yes' : 'No'}`.white);
    console.log(`   Active Vehicles: ${initialStatus.simulatorStatus.activeVehicles}`.white);
    console.log(`   Active Routes: ${initialStatus.simulatorStatus.activeRoutes}`.white);
    
    // Step 5: Start simulation
    console.log('\n🔄 Starting vehicle data simulation...'.yellow);
    backgroundJobService.startSimulationJob();
    
    // Step 6: Run simulation for a few cycles
    console.log('\n⏱️ Running simulation for 2 minutes (4 cycles)...'.yellow);
    console.log('   This will demonstrate the 30-second intervals and 2-minute dataset cycles'.gray);
    
    let cycleCount = 0;
    const maxCycles = 4; // 2 minutes total (4 × 30 seconds)
    
    const simulationInterval = setInterval(async () => {
      cycleCount++;
      
      const status = backgroundJobService.getSimulationStatus();
      console.log(`\n🔄 Cycle ${cycleCount}/${maxCycles} - ${status.currentDataSet}`.cyan);
      console.log(`   Data Point: ${status.currentDataPoint}/${status.totalDataPoints}`.white);
      
      // Get trigger stats every cycle
      const triggerStats = await getTriggerStats();
      const activatedTriggers = triggerStats.byType.find(t => t._id === 'speed_based')?.activeCount || 0;
      console.log(`   Active Triggers: ${triggerStats.active}/${triggerStats.total}`.white);
      
      if (cycleCount >= maxCycles) {
        clearInterval(simulationInterval);
        
        // Step 7: Stop simulation and show final stats
        console.log('\n⏹️ Stopping simulation...'.yellow);
        backgroundJobService.stopSimulationJob();
        
        // Final statistics
        console.log('\n📊 Final Statistics:'.cyan);
        const finalTriggerStats = await getTriggerStats();
        console.log(`   Total Triggers: ${finalTriggerStats.total}`.white);
        console.log(`   Active Triggers: ${finalTriggerStats.active}`.white);
        
        console.log('\nBy Type:'.yellow);
        finalTriggerStats.byType.forEach(type => {
          console.log(`   ${type._id}: ${type.count} total, ${type.activeCount} active`.white);
        });
        
        console.log('\nBy Vehicle:'.yellow);
        if (finalTriggerStats.byVehicle && finalTriggerStats.byVehicle.length > 0) {
          finalTriggerStats.byVehicle.forEach(vehicle => {
            console.log(`   ${vehicle._id}: ${vehicle.triggerCount} triggers, ${vehicle.activeTriggers} active`.white);
          });
        }
        
        // Check VehicleLocationHistory entries
        const VehicleLocationHistory = require('./models/VehicleLocationHistory');
        const historyCount = await VehicleLocationHistory.countDocuments();
        console.log(`\n📝 Vehicle Location History Entries: ${historyCount}`.white);
        
        // Show recent entries
        const recentEntries = await VehicleLocationHistory.find()
          .sort({ timestamp: -1 })
          .limit(5)
          .populate('vehicleId', 'plateNumber');
        
        if (recentEntries.length > 0) {
          console.log('\nRecent History Entries:'.yellow);
          recentEntries.forEach(entry => {
            const vehiclePlate = entry.vehicleId?.plateNumber || 'Unknown';
            console.log(`   ${vehiclePlate}: ${entry.context.triggerType || 'Location update'} at ${entry.timestamp.toLocaleTimeString()}`.white);
          });
        }
        
        console.log('\n✅ Background job system test completed successfully!'.green);
        console.log('\n💡 The system is now ready for production use.'.cyan);
        console.log('   You can start/stop the simulation using the API endpoints:'.gray);
        console.log('   - POST /api/v1/background-jobs/start-simulation'.gray);
        console.log('   - POST /api/v1/background-jobs/stop-simulation'.gray);
        console.log('   - GET /api/v1/background-jobs/simulation-status'.gray);
        
        process.exit(0);
      }
    }, 30000); // 30 seconds
    
  } catch (error) {
    console.error('❌ Error testing background job system:'.red, error);
    process.exit(1);
  }
};

// Run the test
testBackgroundJobSystem(); 