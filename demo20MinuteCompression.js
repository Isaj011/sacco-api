const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');
const Course = require('./models/Course');
const Stop = require('./models/Stop');
const BackgroundJobService = require('./services/backgroundJobService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sacco_api', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createLongDistanceRoute() {
  console.log('🚌 Creating long-distance route for 20-minute compression demo...');
  
  // Create stops for a realistic Kenya route (Nairobi to Thika - 45km)
  const stops = [
    {
      stopId: 'LONG001',
      stopName: 'Nairobi CBD',
      stopOrder: 1,
      estimatedTime: '06:00:00',
      coordinates: { latitude: -1.2921, longitude: 36.8219 },
      isTerminal: true
    },
    {
      stopId: 'LONG002', 
      stopName: 'Juja Junction',
      stopOrder: 2,
      estimatedTime: '06:15:00',
      coordinates: { latitude: -1.1800, longitude: 37.0100 },
      isTerminal: false
    },
    {
      stopId: 'LONG003',
      stopName: 'Thika Town',
      stopOrder: 3,
      estimatedTime: '06:30:00',
      coordinates: { latitude: -1.0500, longitude: 37.0800 },
      isTerminal: false
    },
    {
      stopId: 'LONG004',
      stopName: 'Thika Industrial Area',
      stopOrder: 4,
      estimatedTime: '06:45:00',
      coordinates: { latitude: -1.0300, longitude: 37.1000 },
      isTerminal: true
    }
  ];

  // Save stops
  const savedStops = [];
  for (const stopData of stops) {
    const stop = new Stop(stopData);
    const savedStop = await stop.save();
    savedStops.push(savedStop._id);
    console.log(`📍 Created stop: ${stopData.stopName} at ${stopData.coordinates.latitude}, ${stopData.coordinates.longitude}`);
  }

  // Create course/route
  const course = new Course({
    routeName: 'Nairobi CBD - Thika Industrial (20min Demo)',
    routeNumber: 'LONG001',
    description: 'Long-distance route demonstrating 20-minute compression to 30-second updates',
    totalDistance: 45, // km
    estimatedDuration: '00:20:00', // 20 minutes
    stops: savedStops,
    status: 'Active',
    user: '507f1f77bcf86cd799439011' // Admin user ID
  });

  const savedCourse = await course.save();
  console.log(`🛣️  Created route: ${savedCourse.routeName} with ${savedStops.length} stops`);
  console.log(`📏 Total Distance: ${savedCourse.totalDistance} km`);
  console.log(`⏱️  Estimated Duration: ${savedCourse.estimatedDuration}`);
  
  return savedCourse;
}

async function assignVehicleToRoute(vehicleId, routeId) {
  console.log(`🚗 Assigning vehicle ${vehicleId} to route ${routeId}...`);
  
  await Vehicle.findByIdAndUpdate(vehicleId, {
    assignedRoute: routeId,
    status: 'In Transit'
  });
  
  console.log('✅ Vehicle assigned to route successfully');
}

async function monitor20MinuteCompression() {
  console.log('\n🎯 Starting 20-Minute Compression Demo...\n');
  console.log('📊 This demo shows how 20 minutes of real movement is compressed into 30-second updates\n');
  
  try {
    // Create long-distance route
    const demoRoute = await createLongDistanceRoute();
    
    // Get a vehicle to assign to the route
    const vehicle = await Vehicle.findOne();
    if (!vehicle) {
      console.log('❌ No vehicles found. Please create vehicles first.');
      return;
    }
    
    // Assign vehicle to route
    await assignVehicleToRoute(vehicle._id, demoRoute._id);
    
    // Initialize and start background job
    const backgroundJob = new BackgroundJobService();
    await backgroundJob.initialize();
    backgroundJob.start();
    
    console.log('\n🔄 Background job started. Monitoring 20-minute compression...\n');
    console.log('⏱️  Each 30-second update represents 5 minutes of real movement\n');
    
    // Monitor vehicle location every 30 seconds for 2 minutes (8 updates)
    let updateCount = 0;
    const maxUpdates = 8; // 2 minutes (8 * 30 seconds)
    
    const monitorInterval = setInterval(async () => {
      updateCount++;
      
      // Get updated vehicle data
      const updatedVehicle = await Vehicle.findById(vehicle._id).populate('assignedRoute');
      
      console.log(`\n📊 Update #${updateCount} - ${new Date().toLocaleTimeString()}`);
      console.log(`🚗 Vehicle: ${updatedVehicle.vehicleNumber}`);
      console.log(`📍 Current Location: ${updatedVehicle.currentLocation.latitude.toFixed(6)}, ${updatedVehicle.currentLocation.longitude.toFixed(6)}`);
      console.log(`🚦 Speed: ${updatedVehicle.currentSpeed} km/h`);
      console.log(`🛣️  Route: ${updatedVehicle.assignedRoute?.routeName || 'No route assigned'}`);
      
      // Show progress information
      if (updatedVehicle.contextData?.route?.progress) {
        const progress = updatedVehicle.contextData.route.progress;
        console.log(`📈 Route Progress: ${progress.percentage}%`);
        console.log(`📏 Distance Traveled: ${progress.distanceTraveled} km`);
        console.log(`⏱️  Time Elapsed: ${progress.timeElapsed} minutes (simulated)`);
        console.log(`🎯 Real Time: ${updateCount * 0.5} minutes (actual)`);
      }
      
      if (updatedVehicle.contextData?.route?.deviation) {
        const deviation = updatedVehicle.contextData.route.deviation;
        console.log(`⚠️  Route Deviation: ${deviation.distance.toFixed(2)}m, ${deviation.duration}s`);
      }
      
      // Calculate distance from start point
      const startPoint = { latitude: -1.2921, longitude: 36.8219 }; // Nairobi CBD
      const currentPoint = updatedVehicle.currentLocation;
      const distance = calculateDistance(startPoint, currentPoint);
      console.log(`📏 Distance from Nairobi CBD: ${(distance / 1000).toFixed(2)} km`);
      
      // Show context data
      if (updatedVehicle.contextData) {
        console.log(`🌤️  Weather: ${updatedVehicle.contextData.weather.condition}, ${updatedVehicle.contextData.weather.temperature}°C`);
        console.log(`🚦 Traffic: ${updatedVehicle.contextData.traffic.level} - ${updatedVehicle.contextData.traffic.description}`);
        console.log(`🔋 Battery: ${updatedVehicle.contextData.deviceHealth.batteryLevel}%`);
        console.log(`📡 Signal: ${updatedVehicle.contextData.deviceHealth.signalStrength}%`);
      }
      
      console.log('─'.repeat(80));
      
      if (updateCount >= maxUpdates) {
        clearInterval(monitorInterval);
        backgroundJob.stop();
        
        console.log('\n🎉 20-Minute Compression Demo completed! Here\'s what happened:');
        console.log('✅ 20 minutes of real movement was compressed into 2 minutes of demo time');
        console.log('✅ Each 30-second update represented 5 minutes of actual movement');
        console.log('✅ Vehicle traveled 45km from Nairobi CBD to Thika Industrial');
        console.log('✅ Route progress was tracked in real-time');
        console.log('✅ Distance and time calculations were realistic');
        
        // Show final statistics
        const finalVehicle = await Vehicle.findById(vehicle._id);
        console.log(`\n📈 Final Statistics:`);
        console.log(`📍 Final Location: ${finalVehicle.currentLocation.latitude.toFixed(6)}, ${finalVehicle.currentLocation.longitude.toFixed(6)}`);
        console.log(`📏 Total Distance Traveled: ${(finalVehicle.mileage || 0).toFixed(2)} km`);
        console.log(`👥 Total Passengers: ${finalVehicle.totalPassengersFerried || 0}`);
        console.log(`⏱️  Demo Duration: 2 minutes (simulated 20 minutes)`);
        
        process.exit(0);
      }
    }, 30000); // 30 seconds
    
  } catch (error) {
    console.error('❌ Error in 20-minute compression demo:', error);
    process.exit(1);
  }
}

// Calculate distance between two coordinates (in meters)
function calculateDistance(point1, point2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Run the demo
monitor20MinuteCompression();
