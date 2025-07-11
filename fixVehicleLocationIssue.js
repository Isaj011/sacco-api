const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');
const BackgroundJobService = require('./services/backgroundJobService');

// Connect to MongoDB with better error handling
async function connectToDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sacco_api', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    });
    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('\n🔧 SOLUTIONS TO TRY:');
    console.log('1. Start MongoDB service:');
    console.log('   - Windows: Start MongoDB service from Services');
    console.log('   - Or run: mongod --dbpath C:\\data\\db');
    console.log('2. Check if MongoDB is installed');
    console.log('3. Verify MongoDB is running on port 27017');
    return false;
  }
}

async function checkVehicleData() {
  try {
    console.log('\n🔍 Checking vehicle data...');
    
    const vehicles = await Vehicle.find().limit(3);
    console.log(`📊 Found ${vehicles.length} vehicles`);
    
    if (vehicles.length > 0) {
      const vehicle = vehicles[0];
      console.log(`🚗 Sample vehicle: ${vehicle.plateNumber}`);
      console.log(`📍 Current location: ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`);
      console.log(`⏰ Last updated: ${vehicle.currentLocation.updatedAt}`);
      console.log(`🛣️  Assigned route: ${vehicle.assignedRoute ? 'Yes' : 'No'}`);
    }
    
    return vehicles.length > 0;
  } catch (error) {
    console.error('❌ Error checking vehicle data:', error.message);
    return false;
  }
}

async function startBackgroundJob() {
  try {
    console.log('\n🚀 Starting background job service...');
    
    const backgroundJob = new BackgroundJobService();
    const initialized = await backgroundJob.initialize();
    
    if (initialized) {
      backgroundJob.startSimulationJob();
      console.log('✅ Background job started successfully');
      console.log('⏰ Vehicle locations will update every 30 seconds');
      return backgroundJob;
    } else {
      console.log('❌ Failed to initialize background job');
      return null;
    }
  } catch (error) {
    console.error('❌ Error starting background job:', error.message);
    return null;
  }
}

async function monitorVehicleUpdates(backgroundJob) {
  console.log('\n📊 Monitoring vehicle updates...');
  console.log('⏳ Waiting for location updates (checking every 10 seconds)...\n');
  
  let checkCount = 0;
  const maxChecks = 6; // Check for 1 minute
  
  const monitorInterval = setInterval(async () => {
    checkCount++;
    
    try {
      const vehicle = await Vehicle.findOne();
      if (vehicle) {
        console.log(`📊 Check #${checkCount} - ${new Date().toLocaleTimeString()}`);
        console.log(`🚗 Vehicle: ${vehicle.plateNumber}`);
        console.log(`📍 Location: ${vehicle.currentLocation.latitude.toFixed(6)}, ${vehicle.currentLocation.longitude.toFixed(6)}`);
        console.log(`⏰ Updated: ${vehicle.currentLocation.updatedAt.toLocaleTimeString()}`);
        console.log(`🚦 Speed: ${vehicle.currentSpeed || 'N/A'} km/h`);
        
        if (vehicle.contextData?.route?.progress) {
          const progress = vehicle.contextData.route.progress;
          console.log(`📈 Progress: ${progress.percentage}% | Distance: ${progress.distanceTraveled} km`);
        }
        
        console.log('─'.repeat(60));
      }
    } catch (error) {
      console.error('❌ Error monitoring vehicle:', error.message);
    }
    
    if (checkCount >= maxChecks) {
      clearInterval(monitorInterval);
      if (backgroundJob) {
        backgroundJob.stopSimulationJob();
        console.log('\n⏹️ Background job stopped');
      }
      console.log('\n✅ Monitoring completed!');
      console.log('\n🎯 FRONTEND INTEGRATION:');
      console.log('1. Vehicle locations should now update every 30 seconds');
      console.log('2. Frontend can poll /api/vehicles to get updated locations');
      console.log('3. Use WebSocket or Server-Sent Events for real-time updates');
      console.log('4. Check vehicle.contextData.route.progress for route information');
      process.exit(0);
    }
  }, 10000); // Check every 10 seconds
}

async function main() {
  console.log('🔧 Vehicle Location Update Fix Tool\n');
  
  // Step 1: Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Step 2: Check vehicle data
  const hasVehicles = await checkVehicleData();
  if (!hasVehicles) {
    console.log('\n❌ No vehicles found in database');
    console.log('💡 Run the seeder first: node seeder.js');
    process.exit(1);
  }
  
  // Step 3: Start background job
  const backgroundJob = await startBackgroundJob();
  if (!backgroundJob) {
    console.log('\n❌ Failed to start background job');
    console.log('💡 Check if all models are properly registered');
    process.exit(1);
  }
  
  // Step 4: Monitor updates
  await monitorVehicleUpdates(backgroundJob);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Process interrupted by user');
  process.exit(0);
});

// Run the fix
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
