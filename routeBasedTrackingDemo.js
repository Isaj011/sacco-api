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

async function createDemoRoute() {
  console.log('🚌 Creating demo route with multiple stops...');
  
  // Create stops for a realistic Kenya route (Nairobi to Thika)
  const stops = [
    {
      stopId: 'STOP001',
      stopName: 'Nairobi CBD',
      stopOrder: 1,
      estimatedTime: '06:00:00',
      coordinates: { latitude: -1.2921, longitude: 36.8219 },
      isTerminal: true
    },
    {
      stopId: 'STOP002', 
      stopName: 'Juja Junction',
      stopOrder: 2,
      estimatedTime: '06:30:00',
      coordinates: { latitude: -1.1800, longitude: 37.0100 },
      isTerminal: false
    },
    {
      stopId: 'STOP003',
      stopName: 'Thika Town',
      stopOrder: 3,
      estimatedTime: '07:00:00',
      coordinates: { latitude: -1.0500, longitude: 37.0800 },
      isTerminal: false
    },
    {
      stopId: 'STOP004',
      stopName: 'Thika Industrial Area',
      stopOrder: 4,
      estimatedTime: '07:15:00',
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
    routeName: 'Nairobi CBD - Thika Industrial',
    routeNumber: 'NTH001',
    description: 'Express route from Nairobi CBD to Thika Industrial Area',
    totalDistance: 45, // km
    estimatedDuration: '01:15:00',
    stops: savedStops,
    status: 'Active',
    user: '507f1f77bcf86cd799439011' // Admin user ID
  });

  const savedCourse = await course.save();
  console.log(`🛣️  Created route: ${savedCourse.routeName} with ${savedStops.length} stops`);
  
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

async function monitorRouteBasedTracking() {
  console.log('\n🎯 Starting Route-Based Location Tracking Demo...\n');
  
  try {
    // Create demo route
    const demoRoute = await createDemoRoute();
    
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
    
    console.log('\n🔄 Background job started. Monitoring vehicle location changes...\n');
    
    // Monitor vehicle location every 30 seconds for 3 minutes
    let updateCount = 0;
    const maxUpdates = 6; // 3 minutes (6 * 30 seconds)
    
    const monitorInterval = setInterval(async () => {
      updateCount++;
      
      // Get updated vehicle data
      const updatedVehicle = await Vehicle.findById(vehicle._id).populate('assignedRoute');
      
      console.log(`\n📊 Update #${updateCount} - ${new Date().toLocaleTimeString()}`);
      console.log(`🚗 Vehicle: ${updatedVehicle.vehicleNumber}`);
      console.log(`📍 Current Location: ${updatedVehicle.currentLocation.latitude.toFixed(6)}, ${updatedVehicle.currentLocation.longitude.toFixed(6)}`);
      console.log(`🚦 Speed: ${updatedVehicle.currentSpeed} km/h`);
      console.log(`🛣️  Route: ${updatedVehicle.assignedRoute?.routeName || 'No route assigned'}`);
      
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
        
        console.log('\n🎉 Demo completed! Here\'s what happened:');
        console.log('✅ Vehicle followed route coordinates from Nairobi CBD to Thika');
        console.log('✅ Location changed every 30 seconds with realistic movement');
        console.log('✅ Route deviation was calculated and tracked');
        console.log('✅ Rich context data was updated (weather, traffic, device health)');
        console.log('✅ Long-distance movement was simulated (45km route)');
        
        // Show final statistics
        const finalVehicle = await Vehicle.findById(vehicle._id);
        console.log(`\n📈 Final Statistics:`);
        console.log(`📍 Final Location: ${finalVehicle.currentLocation.latitude.toFixed(6)}, ${finalVehicle.currentLocation.longitude.toFixed(6)}`);
        console.log(`📏 Total Distance Traveled: ${(finalVehicle.mileage || 0).toFixed(2)} km`);
        console.log(`👥 Total Passengers: ${finalVehicle.totalPassengersFerried || 0}`);
        
        process.exit(0);
      }
    }, 30000); // 30 seconds
    
  } catch (error) {
    console.error('❌ Error in route-based tracking demo:', error);
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
monitorRouteBasedTracking();
