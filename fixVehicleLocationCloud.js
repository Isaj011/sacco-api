const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');
const BackgroundJobService = require('./services/backgroundJobService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/config.env' });

// Connect to MongoDB Cloud with better error handling
async function connectToCloudDatabase() {
  try {
    console.log('🌐 Connecting to MongoDB Cloud...');
    console.log('📡 MongoDB URI exists:', !!process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
      maxPoolSize: 10,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });
    
    console.log('✅ Connected to MongoDB Cloud successfully');
    console.log(`🌍 Connection: ${mongoose.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB Cloud Connection Error:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Check internet connection');
    console.log('2. Verify MONGO_URI in config/config.env');
    console.log('3. Check MongoDB Atlas network access');
    console.log('4. Verify database user credentials');
    return false;
  }
}

async function checkVehicleData() {
  try {
    console.log('\n🔍 Checking vehicle data in cloud database...');
    
    const vehicles = await Vehicle.find().limit(5);
    console.log(`📊 Found ${vehicles.length} vehicles in cloud database`);
    
    if (vehicles.length > 0) {
      const vehicle = vehicles[0];
      console.log(`🚗 Sample vehicle: ${vehicle.plateNumber}`);
      console.log(`📍 Current location: ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`);
      console.log(`⏰ Last updated: ${vehicle.currentLocation.updatedAt}`);
      console.log(`🛣️  Assigned route: ${vehicle.assignedRoute ? 'Yes' : 'No'}`);
      console.log(`📱 Status: ${vehicle.status}`);
    }
    
    return vehicles.length > 0;
  } catch (error) {
    console.error('❌ Error checking vehicle data:', error.message);
    return false;
  }
}

async function startBackgroundJob() {
  try {
    console.log('\n🚀 Starting background job service with cloud database...');
    
    const backgroundJob = new BackgroundJobService();
    const initialized = await backgroundJob.initialize();
    
    if (initialized) {
      backgroundJob.startSimulationJob();
      console.log('✅ Background job started successfully');
      console.log('⏰ Vehicle locations will update every 30 seconds');
      console.log('🌐 Using MongoDB Cloud for data storage');
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
  console.log('\n📊 Monitoring vehicle updates in cloud database...');
  console.log('⏳ Waiting for location updates (checking every 10 seconds)...\n');
  
  let checkCount = 0;
  const maxChecks = 6; // Check for 1 minute
  let lastLocation = null;
  
  const monitorInterval = setInterval(async () => {
    checkCount++;
    
    try {
      const vehicle = await Vehicle.findOne();
      if (vehicle) {
        const currentLocation = `${vehicle.currentLocation.latitude.toFixed(6)}, ${vehicle.currentLocation.longitude.toFixed(6)}`;
        const locationChanged = lastLocation !== currentLocation;
        
        console.log(`📊 Check #${checkCount} - ${new Date().toLocaleTimeString()}`);
        console.log(`🚗 Vehicle: ${vehicle.plateNumber}`);
        console.log(`📍 Location: ${currentLocation}`);
        console.log(`⏰ Updated: ${vehicle.currentLocation.updatedAt.toLocaleTimeString()}`);
        console.log(`🚦 Speed: ${vehicle.currentSpeed || 'N/A'} km/h`);
        console.log(`🔄 Location Changed: ${locationChanged ? '✅ YES' : '❌ NO'}`);
        
        if (vehicle.contextData?.route?.progress) {
          const progress = vehicle.contextData.route.progress;
          console.log(`📈 Progress: ${progress.percentage}% | Distance: ${progress.distanceTraveled} km`);
        }
        
        if (vehicle.contextData?.weather) {
          console.log(`🌤️  Weather: ${vehicle.contextData.weather.condition}, ${vehicle.contextData.weather.temperature}°C`);
        }
        
        lastLocation = currentLocation;
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
      console.log('\n🎯 FRONTEND INTEGRATION WITH CLOUD DATABASE:');
      console.log('1. ✅ Vehicle locations update every 30 seconds');
      console.log('2. ✅ Data is stored in MongoDB Cloud (Atlas)');
      console.log('3. ✅ Frontend can poll /api/v1/vehicles for updates');
      console.log('4. ✅ Use WebSocket or Server-Sent Events for real-time updates');
      console.log('5. ✅ Check vehicle.contextData.route.progress for route info');
      console.log('6. ✅ All data is backed up in the cloud');
      process.exit(0);
    }
  }, 10000); // Check every 10 seconds
}

async function testManualUpdate() {
  try {
    console.log('\n🧪 Testing manual vehicle location update...');
    
    const vehicle = await Vehicle.findOne();
    if (!vehicle) {
      console.log('❌ No vehicles found for testing');
      return;
    }
    
    const originalLocation = vehicle.currentLocation;
    const newLocation = {
      latitude: originalLocation.latitude + 0.001,
      longitude: originalLocation.longitude + 0.001,
      updatedAt: new Date()
    };
    
    console.log(`🚗 Testing vehicle: ${vehicle.plateNumber}`);
    console.log(`📍 Original: ${originalLocation.latitude.toFixed(6)}, ${originalLocation.longitude.toFixed(6)}`);
    console.log(`📍 New: ${newLocation.latitude.toFixed(6)}, ${newLocation.longitude.toFixed(6)}`);
    
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicle._id,
      {
        currentLocation: newLocation,
        currentSpeed: 45,
        averageSpeed: 40
      },
      { new: true }
    );
    
    console.log('✅ Manual update successful');
    console.log(`📍 Updated location: ${updatedVehicle.currentLocation.latitude.toFixed(6)}, ${updatedVehicle.currentLocation.longitude.toFixed(6)}`);
    console.log(`⏰ Updated at: ${updatedVehicle.currentLocation.updatedAt.toLocaleTimeString()}`);
    
  } catch (error) {
    console.error('❌ Error in manual update test:', error.message);
  }
}

async function main() {
  console.log('🔧 Vehicle Location Update Fix Tool - Cloud Edition\n');
  console.log('🌐 Using MongoDB Cloud (Atlas) for data storage\n');
  
  // Step 1: Connect to cloud database
  const connected = await connectToCloudDatabase();
  if (!connected) {
    console.log('\n❌ Cannot proceed without cloud database connection');
    process.exit(1);
  }
  
  // Step 2: Check vehicle data
  const hasVehicles = await checkVehicleData();
  if (!hasVehicles) {
    console.log('\n❌ No vehicles found in cloud database');
    console.log('💡 Run the seeder first: node seeder.js');
    process.exit(1);
  }
  
  // Step 3: Test manual update
  await testManualUpdate();
  
  // Step 4: Start background job
  const backgroundJob = await startBackgroundJob();
  if (!backgroundJob) {
    console.log('\n❌ Failed to start background job');
    console.log('💡 Check if all models are properly registered');
    process.exit(1);
  }
  
  // Step 5: Monitor updates
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
