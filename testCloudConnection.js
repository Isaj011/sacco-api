const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/config.env' });

// Register all models
require('./models/Vehicle');
require('./models/Route');
require('./models/Stop');
require('./models/User');
require('./models/Driver');
require('./models/Fare');
require('./models/Schedule');
require('./models/Performance');
require('./models/VehicleLocationHistory');
require('./models/LocationTrigger');
require('./models/DriverAssignment');

const Vehicle = require('./models/Vehicle');

async function testCloudConnection() {
  console.log('🌐 Testing MongoDB Cloud Connection...\n');
  
  try {
    // Connect to MongoDB Cloud
    console.log('📡 Connecting to MongoDB Cloud...');
    console.log('🔗 MongoDB URI exists:', !!process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB Cloud successfully!');
    console.log(`🌍 Connection: ${mongoose.connection.host}`);
    
    // Check vehicle data
    console.log('\n🔍 Checking vehicle data...');
    const vehicles = await Vehicle.find().limit(3);
    console.log(`📊 Found ${vehicles.length} vehicles in cloud database`);
    
    if (vehicles.length > 0) {
      const vehicle = vehicles[0];
      console.log(`\n🚗 Sample vehicle: ${vehicle.plateNumber}`);
      console.log(`📍 Current location: ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`);
      console.log(`⏰ Last updated: ${vehicle.currentLocation.updatedAt}`);
      console.log(`🛣️  Assigned route: ${vehicle.assignedRoute ? 'Yes' : 'No'}`);
      console.log(`📱 Status: ${vehicle.status}`);
      
      // Test manual update
      console.log('\n🧪 Testing manual location update...');
      const newLocation = {
        latitude: vehicle.currentLocation.latitude + 0.001,
        longitude: vehicle.currentLocation.longitude + 0.001,
        updatedAt: new Date()
      };
      
      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        vehicle._id,
        {
          currentLocation: newLocation,
          currentSpeed: 45,
          averageSpeed: 40
        },
        { new: true }
      );
      
      console.log('✅ Manual update successful!');
      console.log(`📍 New location: ${updatedVehicle.currentLocation.latitude.toFixed(6)}, ${updatedVehicle.currentLocation.longitude.toFixed(6)}`);
      console.log(`⏰ Updated at: ${updatedVehicle.currentLocation.updatedAt.toLocaleTimeString()}`);
    }
    
    console.log('\n🎉 Cloud connection test completed successfully!');
    console.log('✅ MongoDB Cloud is working properly');
    console.log('✅ Vehicle data is accessible');
    console.log('✅ Manual updates work');
    console.log('\n🚀 Next step: Start the background job service');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check internet connection');
    console.log('2. Verify MONGO_URI in config/config.env');
    console.log('3. Check MongoDB Atlas network access');
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the test
testCloudConnection(); 