const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');
const Course = require('./models/Course');
const Stop = require('./models/Stop');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sacco_api', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testRouteBasedLocation() {
  console.log('🎯 Testing Route-Based Location Changes...\n');
  
  try {
    // Create a simple route with 3 stops (Nairobi to Thika)
    const stops = [
      {
        stopId: 'TEST001',
        stopName: 'Nairobi CBD',
        stopOrder: 1,
        estimatedTime: '06:00:00',
        coordinates: { latitude: -1.2921, longitude: 36.8219 },
        isTerminal: true
      },
      {
        stopId: 'TEST002',
        stopName: 'Juja Junction', 
        stopOrder: 2,
        estimatedTime: '06:30:00',
        coordinates: { latitude: -1.1800, longitude: 37.0100 },
        isTerminal: false
      },
      {
        stopId: 'TEST003',
        stopName: 'Thika Town',
        stopOrder: 3,
        estimatedTime: '07:00:00',
        coordinates: { latitude: -1.0500, longitude: 37.0800 },
        isTerminal: true
      }
    ];

    // Save stops
    const savedStops = [];
    for (const stopData of stops) {
      const stop = new Stop(stopData);
      const savedStop = await stop.save();
      savedStops.push(savedStop._id);
      console.log(`📍 Created stop: ${stopData.stopName}`);
    }

    // Create route
    const course = new Course({
      routeName: 'Nairobi - Thika Test Route',
      routeNumber: 'TEST001',
      description: 'Test route for location simulation',
      totalDistance: 35, // km
      estimatedDuration: '01:00:00',
      stops: savedStops,
      status: 'Active',
      user: '507f1f77bcf86cd799439011'
    });

    const savedCourse = await course.save();
    console.log(`🛣️  Created route: ${savedCourse.routeName}\n`);

    // Get a vehicle and assign it to the route
    const vehicle = await Vehicle.findOne();
    if (!vehicle) {
      console.log('❌ No vehicles found. Please create vehicles first.');
      return;
    }

    await Vehicle.findByIdAndUpdate(vehicle._id, {
      assignedRoute: savedCourse._id,
      status: 'In Transit'
    });

    console.log(`🚗 Vehicle ${vehicle.vehicleNumber} assigned to route\n`);

    // Simulate location changes along the route
    console.log('🔄 Simulating location changes along the route...\n');
    
    for (let i = 0; i < 5; i++) {
      // Calculate progress along route (0 to 1)
      const progress = i / 4; // 0, 0.25, 0.5, 0.75, 1
      
      // Get current and next stop
      const currentStopIndex = Math.floor(progress * (stops.length - 1));
      const nextStopIndex = Math.min(currentStopIndex + 1, stops.length - 1);
      
      const currentStop = stops[currentStopIndex];
      const nextStop = stops[nextStopIndex];
      
      // Interpolate between stops
      const stopProgress = (progress * (stops.length - 1)) % 1;
      const interpolatedLocation = {
        latitude: currentStop.coordinates.latitude + (nextStop.coordinates.latitude - currentStop.coordinates.latitude) * stopProgress,
        longitude: currentStop.coordinates.longitude + (nextStop.coordinates.longitude - currentStop.coordinates.longitude) * stopProgress
      };

      // Update vehicle location
      await Vehicle.findByIdAndUpdate(vehicle._id, {
        currentLocation: {
          latitude: interpolatedLocation.latitude,
          longitude: interpolatedLocation.longitude,
          updatedAt: new Date()
        },
        currentSpeed: 40 + Math.random() * 20, // 40-60 km/h
        contextData: {
          weather: { condition: 'clear', temperature: 25 },
          traffic: { level: 'normal', description: 'Smooth traffic' },
          route: { routeId: savedCourse._id, deviation: { distance: 0, duration: 0 } },
          deviceHealth: { batteryLevel: 85, signalStrength: 90 }
        }
      });

      console.log(`📊 Update ${i + 1}:`);
      console.log(`📍 Location: ${interpolatedLocation.latitude.toFixed(6)}, ${interpolatedLocation.longitude.toFixed(6)}`);
      console.log(`🛣️  Progress: ${(progress * 100).toFixed(1)}% along route`);
      console.log(`📏 Distance from start: ${calculateDistance(stops[0].coordinates, interpolatedLocation).toFixed(2)} km`);
      console.log('─'.repeat(50));
      
      // Wait 2 seconds between updates
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('✅ Route-based location simulation completed!');
    console.log('🎯 The background job will now use this route for realistic movement.');
    console.log('📱 Frontend can track vehicles following actual route coordinates.');
    console.log('🚀 Long-distance movement (35km) was simulated successfully.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Calculate distance between coordinates
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
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

// Run the test
testRouteBasedLocation(); 