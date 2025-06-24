const Vehicle = require('../models/Vehicle');
const LocationTrigger = require('../models/LocationTrigger');
const LocationTriggerService = require('./locationTriggerService');
const Course = require('../models/Course');

class VehicleDataSimulator {
  constructor() {
    this.sampleDataSets = [
      // Dataset 1: Morning rush hour simulation (6:00-9:00 AM)
      {
        name: 'Morning Rush Hour',
        duration: 120000, // 2 minutes
        interval: 30000,  // 30 seconds
        dataPoints: [
          {
            location: { latitude: -1.2921, longitude: 36.8219 }, // Nairobi CBD
            context: {
              currentSpeed: 15,
              averageSpeed: 20,
              maxSpeed: 45,
              heading: 90,
              events: ['trip_start'],
              weather: { condition: 'clear', severity: 'normal', temperature: 22 },
              traffic: { level: 'heavy', description: 'Rush hour traffic' },
              performance: { fuelEfficiency: 8.5, idleTime: 120, stopDuration: 30 },
              route: { routeId: null, deviation: { distance: 0, duration: 0 } },
              source: 'gps',
              accuracy: 5,
              batteryLevel: 85,
              signalStrength: 90
            }
          },
          {
            location: { latitude: -1.2950, longitude: 36.8250 },
            context: {
              currentSpeed: 25,
              averageSpeed: 22,
              maxSpeed: 45,
              heading: 95,
              events: ['stop_arrival'],
              weather: { condition: 'clear', severity: 'normal', temperature: 23 },
              traffic: { level: 'moderate', description: 'Moving traffic' },
              performance: { fuelEfficiency: 9.2, idleTime: 60, stopDuration: 45 },
              route: { routeId: null, deviation: { distance: 50, duration: 30 } },
              source: 'gps',
              accuracy: 3,
              batteryLevel: 84,
              signalStrength: 88
            }
          },
          {
            location: { latitude: -1.2980, longitude: 36.8280 },
            context: {
              currentSpeed: 35,
              averageSpeed: 28,
              maxSpeed: 50,
              heading: 100,
              events: ['stop_departure'],
              weather: { condition: 'partly_cloudy', severity: 'normal', temperature: 24 },
              traffic: { level: 'light', description: 'Free flowing' },
              performance: { fuelEfficiency: 10.1, idleTime: 30, stopDuration: 20 },
              route: { routeId: null, deviation: { distance: 25, duration: 15 } },
              source: 'gps',
              accuracy: 4,
              batteryLevel: 83,
              signalStrength: 92
            }
          },
          {
            location: { latitude: -1.3010, longitude: 36.8310 },
            context: {
              currentSpeed: 40,
              averageSpeed: 32,
              maxSpeed: 55,
              heading: 105,
              events: ['status_change'],
              weather: { condition: 'clear', severity: 'normal', temperature: 25 },
              traffic: { level: 'light', description: 'Highway traffic' },
              performance: { fuelEfficiency: 11.5, idleTime: 15, stopDuration: 10 },
              route: { routeId: null, deviation: { distance: 10, duration: 5 } },
              source: 'gps',
              accuracy: 2,
              batteryLevel: 82,
              signalStrength: 95
            }
          }
        ]
      },
      // Dataset 2: Afternoon normal operation (10:00-4:00 PM)
      {
        name: 'Afternoon Normal',
        duration: 120000,
        interval: 30000,
        dataPoints: [
          {
            location: { latitude: -1.3040, longitude: 36.8340 },
            context: {
              currentSpeed: 30,
              averageSpeed: 35,
              maxSpeed: 60,
              heading: 110,
              events: ['trip_start'],
              weather: { condition: 'sunny', severity: 'normal', temperature: 28 },
              traffic: { level: 'normal', description: 'Regular traffic flow' },
              performance: { fuelEfficiency: 12.0, idleTime: 45, stopDuration: 25 },
              route: { routeId: null, deviation: { distance: 0, duration: 0 } },
              source: 'gps',
              accuracy: 3,
              batteryLevel: 80,
              signalStrength: 87
            }
          },
          {
            location: { latitude: -1.3070, longitude: 36.8370 },
            context: {
              currentSpeed: 45,
              averageSpeed: 38,
              maxSpeed: 65,
              heading: 115,
              events: ['stop_arrival'],
              weather: { condition: 'sunny', severity: 'normal', temperature: 29 },
              traffic: { level: 'moderate', description: 'Steady traffic' },
              performance: { fuelEfficiency: 11.8, idleTime: 90, stopDuration: 60 },
              route: { routeId: null, deviation: { distance: 75, duration: 45 } },
              source: 'gps',
              accuracy: 4,
              batteryLevel: 79,
              signalStrength: 85
            }
          },
          {
            location: { latitude: -1.3100, longitude: 36.8400 },
            context: {
              currentSpeed: 50,
              averageSpeed: 42,
              maxSpeed: 70,
              heading: 120,
              events: ['stop_departure'],
              weather: { condition: 'clear', severity: 'normal', temperature: 30 },
              traffic: { level: 'light', description: 'Smooth traffic' },
              performance: { fuelEfficiency: 13.2, idleTime: 20, stopDuration: 15 },
              route: { routeId: null, deviation: { distance: 30, duration: 20 } },
              source: 'gps',
              accuracy: 2,
              batteryLevel: 78,
              signalStrength: 90
            }
          },
          {
            location: { latitude: -1.3130, longitude: 36.8430 },
            context: {
              currentSpeed: 55,
              averageSpeed: 45,
              maxSpeed: 75,
              heading: 125,
              events: ['trip_end'],
              weather: { condition: 'sunny', severity: 'normal', temperature: 31 },
              traffic: { level: 'light', description: 'Free flowing' },
              performance: { fuelEfficiency: 14.0, idleTime: 10, stopDuration: 5 },
              route: { routeId: null, deviation: { distance: 5, duration: 2 } },
              source: 'gps',
              accuracy: 1,
              batteryLevel: 77,
              signalStrength: 93
            }
          }
        ]
      },
      // Dataset 3: Evening rush hour (5:00-8:00 PM)
      {
        name: 'Evening Rush Hour',
        duration: 120000,
        interval: 30000,
        dataPoints: [
          {
            location: { latitude: -1.3160, longitude: 36.8460 },
            context: {
              currentSpeed: 20,
              averageSpeed: 18,
              maxSpeed: 40,
              heading: 130,
              events: ['trip_start'],
              weather: { condition: 'cloudy', severity: 'normal', temperature: 26 },
              traffic: { level: 'heavy', description: 'Evening rush hour' },
              performance: { fuelEfficiency: 7.5, idleTime: 180, stopDuration: 90 },
              route: { routeId: null, deviation: { distance: 100, duration: 60 } },
              source: 'gps',
              accuracy: 5,
              batteryLevel: 75,
              signalStrength: 82
            }
          },
          {
            location: { latitude: -1.3190, longitude: 36.8490 },
            context: {
              currentSpeed: 15,
              averageSpeed: 16,
              maxSpeed: 35,
              heading: 135,
              events: ['stop_arrival'],
              weather: { condition: 'cloudy', severity: 'normal', temperature: 25 },
              traffic: { level: 'very_heavy', description: 'Gridlock traffic' },
              performance: { fuelEfficiency: 6.8, idleTime: 240, stopDuration: 120 },
              route: { routeId: null, deviation: { distance: 150, duration: 90 } },
              source: 'gps',
              accuracy: 6,
              batteryLevel: 74,
              signalStrength: 80
            }
          },
          {
            location: { latitude: -1.3220, longitude: 36.8520 },
            context: {
              currentSpeed: 25,
              averageSpeed: 20,
              maxSpeed: 45,
              heading: 140,
              events: ['stop_departure'],
              weather: { condition: 'partly_cloudy', severity: 'normal', temperature: 24 },
              traffic: { level: 'heavy', description: 'Slow moving traffic' },
              performance: { fuelEfficiency: 8.2, idleTime: 120, stopDuration: 75 },
              route: { routeId: null, deviation: { distance: 80, duration: 45 } },
              source: 'gps',
              accuracy: 4,
              batteryLevel: 73,
              signalStrength: 85
            }
          },
          {
            location: { latitude: -1.3250, longitude: 36.8550 },
            context: {
              currentSpeed: 30,
              averageSpeed: 25,
              maxSpeed: 50,
              heading: 145,
              events: ['trip_end'],
              weather: { condition: 'clear', severity: 'normal', temperature: 23 },
              traffic: { level: 'moderate', description: 'Improving traffic' },
              performance: { fuelEfficiency: 9.5, idleTime: 60, stopDuration: 30 },
              route: { routeId: null, deviation: { distance: 40, duration: 25 } },
              source: 'gps',
              accuracy: 3,
              batteryLevel: 72,
              signalStrength: 88
            }
          }
        ]
      }
    ];
    
    this.currentDataSetIndex = 0;
    this.currentDataPointIndex = 0;
    this.isRunning = false;
    this.vehicles = [];
    this.courses = [];
  }

  // Initialize the simulator with available vehicles and their routes
  async initialize() {
    try {
      // Get vehicles with their assigned routes and drivers
      this.vehicles = await Vehicle.find({ 
        status: { $in: ['in_use', 'available'] } 
      }).populate('assignedRoute currentDriver');
      
      // Get all courses for route information
      this.courses = await Course.find({ status: 'Active' });
      
      console.log(`VehicleDataSimulator initialized with ${this.vehicles.length} vehicles`);
      console.log(`Found ${this.courses.length} active routes/courses`);
      
      return this.vehicles.length > 0;
    } catch (error) {
      console.error('Error initializing VehicleDataSimulator:', error);
      return false;
    }
  }

  // Get current dataset
  getCurrentDataSet() {
    return this.sampleDataSets[this.currentDataSetIndex];
  }

  // Get next data point
  getNextDataPoint() {
    const dataSet = this.getCurrentDataSet();
    const dataPoint = dataSet.dataPoints[this.currentDataPointIndex];
    
    // Move to next data point
    this.currentDataPointIndex = (this.currentDataPointIndex + 1) % dataSet.dataPoints.length;
    
    // If we've completed the dataset, move to next dataset
    if (this.currentDataPointIndex === 0) {
      this.currentDataSetIndex = (this.currentDataSetIndex + 1) % this.sampleDataSets.length;
    }
    
    return dataPoint;
  }

  // Simulate data for all vehicles
  async simulateData() {
    if (!this.isRunning || this.vehicles.length === 0) {
      return;
    }

    const dataPoint = this.getNextDataPoint();
    console.log(`\n🔄 Simulating ${this.getCurrentDataSet().name} - Data Point ${this.currentDataPointIndex + 1}/${this.getCurrentDataSet().dataPoints.length}`);
    console.log(`📍 Location: ${dataPoint.location.latitude}, ${dataPoint.location.longitude}`);
    console.log(`🚗 Speed: ${dataPoint.context.currentSpeed} km/h | 🧭 Heading: ${dataPoint.context.heading}°`);
    console.log(`🌤️ Weather: ${dataPoint.context.weather.condition} | 🚦 Traffic: ${dataPoint.context.traffic.level}`);

    // Process each vehicle
    for (const vehicle of this.vehicles) {
      try {
        // Add some randomization to make each vehicle slightly different
        const randomizedDataPoint = this.randomizeDataPoint(dataPoint, vehicle);
        
        // Add route information if vehicle has assigned route
        if (vehicle.assignedRoute) {
          randomizedDataPoint.context.route.routeId = vehicle.assignedRoute._id;
        }
        
        // Update Vehicle model with comprehensive data
        await this.updateVehicleWithFullContext(vehicle._id, randomizedDataPoint);
        
        // Check triggers and create history entries (this will now use the updated vehicle data)
        const result = await LocationTriggerService.checkTrigger(
          vehicle._id,
          randomizedDataPoint.location,
          randomizedDataPoint.context
        );

        if (result.activatedTriggers.length > 0) {
          console.log(`🚨 Vehicle ${vehicle.plateNumber || vehicle._id}: ${result.activatedTriggers.length} triggers activated`);
          result.activatedTriggers.forEach(trigger => {
            console.log(`   - ${trigger.type} trigger: ${trigger.name || trigger._id}`);
          });
        }

        if (result.historyEntries.length > 0) {
          console.log(`📝 Vehicle ${vehicle.plateNumber || vehicle._id}: ${result.historyEntries.length} history entries created`);
        }

      } catch (error) {
        console.error(`Error processing vehicle ${vehicle.plateNumber || vehicle._id}:`, error);
      }
    }
  }

  // Add randomization to data points to make each vehicle unique
  randomizeDataPoint(dataPoint, vehicle) {
    const randomFactor = 0.1; // 10% variation
    
    // Use vehicle's existing average speed as base if available
    const baseSpeed = vehicle.averageSpeed || dataPoint.context.currentSpeed;
    const speedVariation = (Math.random() - 0.5) * 10; // ±5 km/h variation
    
    return {
      location: {
        latitude: dataPoint.location.latitude + (Math.random() - 0.5) * randomFactor,
        longitude: dataPoint.location.longitude + (Math.random() - 0.5) * randomFactor
      },
      context: {
        ...dataPoint.context,
        currentSpeed: Math.max(0, baseSpeed + speedVariation),
        averageSpeed: baseSpeed,
        maxSpeed: Math.max(baseSpeed + 15, dataPoint.context.maxSpeed),
        heading: (dataPoint.context.heading + (Math.random() - 0.5) * 10) % 360,
        batteryLevel: Math.max(0, Math.min(100, dataPoint.context.batteryLevel + (Math.random() - 0.5) * 5)),
        signalStrength: Math.max(0, Math.min(100, dataPoint.context.signalStrength + (Math.random() - 0.5) * 5))
      }
    };
  }

  // Update vehicle statistics (compatible with seeder data structure)
  async updateVehicleStats(vehicleId, dataPoint) {
    try {
      const updateData = {
        currentLocation: {
          latitude: dataPoint.location.latitude,
          longitude: dataPoint.location.longitude,
          updatedAt: new Date()
        },
        currentSpeed: dataPoint.context.currentSpeed,
        averageSpeed: dataPoint.context.averageSpeed,
        estimatedArrivalTime: this.calculateEstimatedArrivalTime(dataPoint.context.currentSpeed)
      };

      // Update total passengers ferried (simulate passenger pickup)
      if (dataPoint.context.events.includes('stop_arrival')) {
        const passengers = Math.floor(Math.random() * 10) + 1; // 1-10 passengers
        updateData.$inc = {
          totalPassengersFerried: passengers,
          totalTrips: 0.1 // Increment trip counter gradually
        };
      }

      // Update mileage based on speed and time
      const mileageIncrement = (dataPoint.context.currentSpeed * 30) / 3600; // km per 30 seconds
      updateData.$inc = {
        ...updateData.$inc,
        mileage: mileageIncrement
      };

      await Vehicle.findByIdAndUpdate(vehicleId, updateData);

    } catch (error) {
      console.error('Error updating vehicle stats:', error);
    }
  }

  // Calculate estimated arrival time based on current speed
  calculateEstimatedArrivalTime(currentSpeed) {
    const now = new Date();
    const estimatedMinutes = Math.floor(30 / (currentSpeed / 60)); // Assuming 30km average trip
    const arrivalTime = new Date(now.getTime() + estimatedMinutes * 60000);
    return arrivalTime.toTimeString().slice(0, 5); // HH:MM format
  }

  // Start the simulation
  start() {
    if (this.isRunning) {
      console.log('VehicleDataSimulator is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 VehicleDataSimulator started');
    console.log(`📊 Total datasets: ${this.sampleDataSets.length}`);
    console.log(`🚗 Active vehicles: ${this.vehicles.length}`);
    console.log(`🛣️ Active routes: ${this.courses.length}`);
  }

  // Stop the simulation
  stop() {
    this.isRunning = false;
    console.log('⏹️ VehicleDataSimulator stopped');
  }

  // Get simulation status
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentDataSet: this.getCurrentDataSet().name,
      currentDataPoint: this.currentDataPointIndex + 1,
      totalDataPoints: this.getCurrentDataSet().dataPoints.length,
      activeVehicles: this.vehicles.length,
      activeRoutes: this.courses.length,
      totalDatasets: this.sampleDataSets.length
    };
  }

  // Enhanced method to update vehicle with route-based location changes
  async updateVehicleWithFullContext(vehicleId, dataPoint) {
    try {
      // Get the vehicle with its assigned route
      const vehicle = await Vehicle.findById(vehicleId).populate('assignedRoute');
      
      // Calculate route-based location if vehicle has an assigned route
      let finalLocation = dataPoint.location;
      let routeDeviation = { distance: 0, duration: 0 };
      let routeProgress = null;
      
      if (vehicle.assignedRoute && vehicle.assignedRoute.stops && vehicle.assignedRoute.stops.length > 0) {
        // Get route stops
        const routeStops = await Course.findById(vehicle.assignedRoute._id).populate('stops');
        
        if (routeStops && routeStops.stops.length > 0) {
          // Calculate route-based location
          const routeLocation = this.calculateRouteBasedLocation(vehicle, routeStops.stops, dataPoint);
          finalLocation = routeLocation.location;
          routeDeviation = routeLocation.deviation;
          routeProgress = routeLocation.progress;
        }
      }
      
      const updateData = {
        // Location data (route-based or simulated)
        currentLocation: {
          latitude: finalLocation.latitude,
          longitude: finalLocation.longitude,
          updatedAt: new Date()
        },
        
        // Speed and performance data
        currentSpeed: dataPoint.context.currentSpeed,
        averageSpeed: dataPoint.context.averageSpeed,
        estimatedArrivalTime: this.calculateEstimatedArrivalTime(dataPoint.context.currentSpeed),
        
        // Rich context data for Kenya Sacco operations
        contextData: {
          // Environmental conditions
          weather: {
            condition: dataPoint.context.weather.condition,
            severity: dataPoint.context.weather.severity,
            temperature: dataPoint.context.weather.temperature
          },
          traffic: {
            level: dataPoint.context.traffic.level,
            description: dataPoint.context.traffic.description
          },
          
          // Performance metrics
          performance: {
            fuelEfficiency: dataPoint.context.performance.fuelEfficiency,
            idleTime: dataPoint.context.performance.idleTime,
            stopDuration: dataPoint.context.performance.stopDuration
          },
          
          // Route information with actual deviation and progress
          route: {
            routeId: vehicle.assignedRoute?._id || dataPoint.context.route.routeId,
            deviation: routeDeviation,
            progress: routeProgress // Include progress information
          },
          
          // Device health
          deviceHealth: {
            batteryLevel: dataPoint.context.batteryLevel,
            signalStrength: dataPoint.context.signalStrength,
            accuracy: dataPoint.context.accuracy
          },
          
          // Events and status
          events: dataPoint.context.events,
          heading: dataPoint.context.heading,
          source: dataPoint.context.source
        }
      };

      // Update total passengers ferried (simulate passenger pickup)
      if (dataPoint.context.events.includes('stop_arrival')) {
        const passengers = Math.floor(Math.random() * 10) + 1; // 1-10 passengers
        updateData.$inc = {
          totalPassengersFerried: passengers,
          totalTrips: 0.1 // Increment trip counter gradually
        };
      }

      // Update mileage based on speed and time (enhanced for demo)
      let mileageIncrement = (dataPoint.context.currentSpeed * 30) / 3600; // km per 30 seconds
      
      // If we have route progress, use realistic distance traveled
      if (routeProgress) {
        // Calculate distance traveled since last update (5 minutes of movement)
        const distanceTraveled = parseFloat(routeProgress.distanceTraveled);
        mileageIncrement = distanceTraveled / 24; // Divide by 24 (6 updates per 2 minutes = 24 updates per 20 minutes)
      }
      
      updateData.$inc = {
        ...updateData.$inc,
        mileage: mileageIncrement
      };

      await Vehicle.findByIdAndUpdate(vehicleId, updateData);

    } catch (error) {
      console.error('Error updating vehicle with full context:', error);
    }
  }

  // Calculate route-based location for realistic movement (20 minutes compressed to 30 seconds)
  calculateRouteBasedLocation(vehicle, routeStops, dataPoint) {
    // If no route stops, return original location
    if (!routeStops || routeStops.length === 0) {
      return {
        location: dataPoint.location,
        deviation: { distance: 0, duration: 0 }
      };
    }

    // Get current simulation time to determine progress along route
    const currentTime = new Date();
    
    // Calculate progress over 2 minutes (120 seconds) but compress 20 minutes of movement
    // 20 minutes = 1200 seconds, so we need to compress 1200 seconds into 120 seconds
    // This means each 30-second update represents 5 minutes of real movement
    const timeCompressionFactor = 1200 / 120; // 10x compression (20 min / 2 min)
    const simulationProgress = (currentTime.getSeconds() % 120) / 120; // 0 to 1 over 2 minutes
    
    // Apply time compression to get realistic progress along route
    const compressedProgress = simulationProgress * timeCompressionFactor;
    const normalizedProgress = Math.min(compressedProgress, 1); // Cap at 100%
    
    // Calculate which stop we should be approaching
    const totalStops = routeStops.length;
    const currentStopIndex = Math.floor(normalizedProgress * (totalStops - 1));
    const nextStopIndex = Math.min(currentStopIndex + 1, totalStops - 1);
    
    // Get current and next stop coordinates
    const currentStop = routeStops[currentStopIndex];
    const nextStop = routeStops[nextStopIndex];
    
    if (!currentStop || !nextStop) {
      return {
        location: dataPoint.location,
        deviation: { distance: 0, duration: 0 }
      };
    }

    // Calculate progress between current and next stop (0 to 1)
    const stopProgress = (normalizedProgress * (totalStops - 1)) % 1;
    
    // Interpolate between stops for smooth movement
    const interpolatedLocation = this.interpolateLocation(
      currentStop.coordinates,
      nextStop.coordinates,
      stopProgress
    );
    
    // Add some realistic variation (small random deviation)
    const variation = 0.001; // Small variation for realism
    const finalLocation = {
      latitude: interpolatedLocation.latitude + (Math.random() - 0.5) * variation,
      longitude: interpolatedLocation.longitude + (Math.random() - 0.5) * variation
    };
    
    // Calculate deviation from exact route
    const exactRouteLocation = this.interpolateLocation(
      currentStop.coordinates,
      nextStop.coordinates,
      stopProgress
    );
    
    const deviationDistance = this.calculateDistance(
      finalLocation,
      exactRouteLocation
    );
    
    // Calculate distance traveled (for demo purposes, show realistic progress)
    const totalRouteDistance = this.calculateTotalRouteDistance(routeStops);
    const distanceTraveled = totalRouteDistance * normalizedProgress;
    
    return {
      location: finalLocation,
      deviation: {
        distance: deviationDistance,
        duration: Math.floor(deviationDistance * 2) // Rough estimate
      },
      progress: {
        percentage: (normalizedProgress * 100).toFixed(1),
        distanceTraveled: distanceTraveled.toFixed(2),
        timeElapsed: (normalizedProgress * 20).toFixed(1) // 20 minutes total
      }
    };
  }

  // Calculate total route distance
  calculateTotalRouteDistance(routeStops) {
    let totalDistance = 0;
    for (let i = 0; i < routeStops.length - 1; i++) {
      totalDistance += this.calculateDistance(
        routeStops[i].coordinates,
        routeStops[i + 1].coordinates
      );
    }
    return totalDistance / 1000; // Convert to kilometers
  }

  // Interpolate between two coordinates
  interpolateLocation(start, end, progress) {
    return {
      latitude: start.latitude + (end.latitude - start.latitude) * progress,
      longitude: start.longitude + (end.longitude - start.longitude) * progress
    };
  }

  // Calculate distance between two coordinates (in meters)
  calculateDistance(point1, point2) {
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
}

module.exports = VehicleDataSimulator; 