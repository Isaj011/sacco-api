const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');
const BackgroundJobService = require('../services/backgroundJobService');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Driver = require('../models/Driver');

// Load env vars
dotenv.config();

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

// Example: Demonstrate how the system handles newly created data
const demonstrateNewDataHandling = async () => {
  try {
    await connectDB();
    
    console.log('\n🚀 Demonstrating New Data Handling'.cyan.bold);
    console.log('====================================='.cyan);
    
    // Initialize background job service
    const backgroundJobService = new BackgroundJobService();
    await backgroundJobService.initialize();
    backgroundJobService.startSimulationJob();
    
    console.log('\n📊 Initial System Status:'.yellow);
    const initialStatus = backgroundJobService.getSimulationStatus();
    console.log(`   Vehicles: ${initialStatus.activeVehicles}`.white);
    console.log(`   Routes: ${initialStatus.activeRoutes}`.white);
    
    // Wait for initial simulation cycle
    console.log('\n⏳ Waiting for initial simulation cycle...'.yellow);
    await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
    
    // Example 1: Create a new vehicle
    console.log('\n🆕 Example 1: Creating a new vehicle...'.cyan);
    
    const newVehicle = await Vehicle.create({
      plateNumber: 'KAA 999Z',
      vehicleModel: 'Toyota Hiace',
      vehicleCondition: 'Excellent',
      operationalStatus: true,
      currentLocation: { 
        latitude: -1.2921, 
        longitude: 36.8219, 
        updatedAt: new Date() 
      },
      driverName: 'Test Driver',
      seatingCapacity: 33,
      averageSpeed: 40,
      estimatedArrivalTime: '08:00',
      totalPassengersFerried: 0,
      averageDailyIncome: 8000,
      totalIncome: 0,
      totalTrips: 0,
      mileage: 0,
      lastMaintenance: new Date(),
      nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      fuelType: 'Diesel',
      insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      photo: 'no-photo.jpg',
      status: 'available'
    });
    
    console.log(`✅ Created new vehicle: ${newVehicle.plateNumber}`.green);
    
    // Handle the new vehicle
    console.log('🔄 Handling new vehicle in background job system...'.yellow);
    await backgroundJobService.handleNewVehicle(newVehicle._id);
    
    // Wait for simulation cycle
    console.log('⏳ Waiting for simulation cycle with new vehicle...'.yellow);
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    // Check updated status
    const statusAfterVehicle = backgroundJobService.getSimulationStatus();
    console.log(`📊 Status after new vehicle: ${statusAfterVehicle.activeVehicles} vehicles`.white);
    
    // Example 2: Create a new course/route
    console.log('\n🆕 Example 2: Creating a new course...'.cyan);
    
    const newCourse = await Route.create({
      routeName: 'Nairobi CBD - Test Route',
      routeNumber: 'NT001',
      description: 'Test route for demonstration',
      totalDistance: 20,
      estimatedDuration: '1 hour',
      status: 'Active',
      maxCapacity: 30,
      currentLocation: 'Nairobi CBD',
      totalPassengersFerried: 0,
      user: new mongoose.Types.ObjectId() // You'll need a valid user ID
    });
    
    console.log(`✅ Created new course: ${newCourse.routeName}`.green);
    
    // Handle the new course
    console.log('🔄 Handling new course in background job system...'.yellow);
    await backgroundJobService.handleNewCourse(newCourse._id);
    
    // Wait for simulation cycle
    console.log('⏳ Waiting for simulation cycle with new course...'.yellow);
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    // Example 3: Assign vehicle to route
    console.log('\n🆕 Example 3: Assigning vehicle to route...'.cyan);
    
    await Vehicle.findByIdAndUpdate(newVehicle._id, {
      assignedRoute: newCourse._id,
      status: 'in_use'
    });
    
    console.log(`✅ Assigned vehicle ${newVehicle.plateNumber} to route ${newCourse.routeName}`.green);
    
    // Refresh data to include assignment
    console.log('🔄 Refreshing data after assignment...'.yellow);
    await backgroundJobService.refreshData();
    
    // Wait for simulation cycle
    console.log('⏳ Waiting for simulation cycle with assignment...'.yellow);
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    // Example 4: Create a new driver
    console.log('\n🆕 Example 4: Creating a new driver...'.cyan);
    
    const newDriver = await Driver.create({
      driverName: 'John Test Driver',
      nationalId: '99999999',
      contactDetails: {
        phone: '+254799999999',
        email: 'john.test@example.com',
        address: 'Test Address, Nairobi'
      },
      bloodType: 'O+',
      medicalConditions: ['None'],
      allergies: ['None'],
      driverLicense: {
        number: 'DL99999999',
        expiryDate: '2025-12-31'
      },
      psvLicense: {
        number: 'PSV99999999',
        expiryDate: '2025-12-31'
      },
      medicalCertificate: {
        expiryDate: '2024-12-31'
      },
      emergencyContacts: [
        {
          name: 'Jane Test',
          relationship: 'Spouse',
          phone: '+254788888888',
          isPrimary: true
        }
      ],
      status: 'active'
    });
    
    console.log(`✅ Created new driver: ${newDriver.driverName}`.green);
    
    // Handle the new driver
    console.log('🔄 Handling new driver in background job system...'.yellow);
    await backgroundJobService.handleNewDriver(newDriver._id);
    
    // Wait for simulation cycle
    console.log('⏳ Waiting for simulation cycle with new driver...'.yellow);
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    // Example 5: Assign driver to vehicle
    console.log('\n🆕 Example 5: Assigning driver to vehicle...'.cyan);
    
    await Vehicle.findByIdAndUpdate(newVehicle._id, {
      currentDriver: newDriver._id
    });
    
    console.log(`✅ Assigned driver ${newDriver.driverName} to vehicle ${newVehicle.plateNumber}`.green);
    
    // Refresh data
    console.log('🔄 Refreshing data after driver assignment...'.yellow);
    await backgroundJobService.refreshData();
    
    // Wait for final simulation cycle
    console.log('⏳ Waiting for final simulation cycle...'.yellow);
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    // Final status
    console.log('\n📊 Final System Status:'.cyan);
    const finalStatus = backgroundJobService.getSimulationStatus();
    console.log(`   Vehicles: ${finalStatus.activeVehicles}`.white);
    console.log(`   Routes: ${finalStatus.activeRoutes}`.white);
    console.log(`   Current Dataset: ${finalStatus.currentDataSet}`.white);
    
    // Check trigger statistics
    const { getTriggerStats } = require('../utils/sampleLocationTriggers');
    const triggerStats = await getTriggerStats();
    
    console.log('\n📊 Trigger Statistics:'.cyan);
    console.log(`   Total Triggers: ${triggerStats.total}`.white);
    console.log(`   Active Triggers: ${triggerStats.active}`.white);
    
    console.log('\nBy Vehicle:'.yellow);
    if (triggerStats.byVehicle && triggerStats.byVehicle.length > 0) {
      triggerStats.byVehicle.forEach(vehicle => {
        console.log(`   ${vehicle._id}: ${vehicle.triggerCount} triggers, ${vehicle.activeTriggers} active`.white);
      });
    }
    
    // Check VehicleLocationHistory for new vehicle
    const VehicleLocationHistory = require('../models/VehicleLocationHistory');
    const newVehicleHistory = await VehicleLocationHistory.find({ vehicleId: newVehicle._id })
      .sort({ timestamp: -1 })
      .limit(5);
    
    console.log(`\n📝 New Vehicle History Entries: ${newVehicleHistory.length}`.white);
    if (newVehicleHistory.length > 0) {
      console.log('Recent entries:'.yellow);
      newVehicleHistory.forEach(entry => {
        console.log(`   ${entry.timestamp.toLocaleTimeString()}: ${entry.context.triggerType || 'Location update'}`.white);
      });
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...'.yellow);
    await Vehicle.findByIdAndDelete(newVehicle._id);
    await Route.findByIdAndDelete(newCourse._id);
    await Driver.findByIdAndDelete(newDriver._id);
    
    // Stop background jobs
    backgroundJobService.stopAllJobs();
    
    console.log('\n✅ New data handling demonstration completed!'.green);
    console.log('\n💡 Key Features Demonstrated:'.cyan);
    console.log('   ✅ Automatic trigger creation for new vehicles'.white);
    console.log('   ✅ Route-specific trigger generation'.white);
    console.log('   ✅ Real-time data refresh'.white);
    console.log('   ✅ Assignment tracking'.white);
    console.log('   ✅ VehicleLocationHistory updates'.white);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error in new data handling demonstration:'.red, error);
    process.exit(1);
  }
};

// Run the demonstration
demonstrateNewDataHandling(); 