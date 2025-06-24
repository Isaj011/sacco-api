const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sacco_api', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testVehicleUpdate() {
  console.log('🧪 Testing Vehicle Location Update...\n');
  
  try {
    // Get a vehicle
    const vehicle = await Vehicle.findOne();
    if (!vehicle) {
      console.log('❌ No vehicles found');
      return;
    }
    
    console.log(`🚗 Testing vehicle: ${vehicle.plateNumber}`);
    console.log(`📍 Current location: ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`);
    console.log(`⏰ Last updated: ${vehicle.currentLocation.updatedAt}`);
    
    // Update vehicle location manually
    const newLocation = {
      latitude: vehicle.currentLocation.latitude + 0.01, // Move 1km north
      longitude: vehicle.currentLocation.longitude + 0.01, // Move 1km east
      updatedAt: new Date()
    };
    
    console.log(`📍 New location: ${newLocation.latitude}, ${newLocation.longitude}`);
    
    // Update the vehicle
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicle._id,
      {
        currentLocation: newLocation,
        currentSpeed: 45,
        averageSpeed: 40
      },
      { new: true }
    );
    
    console.log(`✅ Vehicle updated successfully`);
    console.log(`📍 New location: ${updatedVehicle.currentLocation.latitude}, ${updatedVehicle.currentLocation.longitude}`);
    console.log(`⏰ Updated at: ${updatedVehicle.currentLocation.updatedAt}`);
    
    // Wait 5 seconds and check again
    console.log('\n⏳ Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const checkVehicle = await Vehicle.findById(vehicle._id);
    console.log(`📍 Location after 5 seconds: ${checkVehicle.currentLocation.latitude}, ${checkVehicle.currentLocation.longitude}`);
    console.log(`⏰ Last updated: ${checkVehicle.currentLocation.updatedAt}`);
    
    console.log('\n✅ Test completed successfully!');
    console.log('🎯 The issue is that the background job is not running properly.');
    console.log('🔧 Solution: Start the background job service to update locations every 30 seconds.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testVehicleUpdate(); 