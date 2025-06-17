const mongoose = require('mongoose')
const colors = require('colors')
const dotenv = require('dotenv')
const fs = require('fs')
const { createSampleTriggers, getTriggerStats } = require('./utils/sampleLocationTriggers');
require('./models/LocationTrigger');
require('./models/VehicleLocationHistory');

// Load env vars
dotenv.config({ path: './config/config.env' })

// Load models
const User = require('./models/User')
const Driver = require('./models/Driver')
const Vehicle = require('./models/Vehicle')
const Course = require('./models/Course')
const DriverAssignment = require('./models/DriverAssignment')
const Stop = require('./models/Stop')
const Schedule = require('./models/Schedule')
const Fare = require('./models/Fare')
const Performance = require('./models/Performance')

// Read JSON files
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8')
)
const drivers = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/drivers.json`, 'utf-8')
)
const vehicles = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/vehicles.json`, 'utf-8')
)
const courses = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/courses.json`, 'utf-8')
)
const stops = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/stops.json`, 'utf-8')
)
const schedules = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/schedules.json`, 'utf-8')
)
const fares = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/fares.json`, 'utf-8')
)
const performances = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/performance.json`, 'utf-8')
)

// Connect to DB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

// Import into DB
const importData = async () => {
  try {
    await connectDB();
    
    // Clear existing data
    await User.deleteMany()
    await Driver.deleteMany()
    await Vehicle.deleteMany()
    await Course.deleteMany()
    await DriverAssignment.deleteMany()
    await Stop.deleteMany()
    await Schedule.deleteMany()
    await Fare.deleteMany()
    await Performance.deleteMany()

    // Create users (admins/managers)
    const createdUsers = await User.create(users)
    console.log('Users created...'.green.inverse)

    // Create stops
    const createdStops = await Stop.create(stops)
    console.log('Stops created...'.green.inverse)

    // Create schedules
    const createdSchedules = await Schedule.create(schedules)
    console.log('Schedules created...'.green.inverse)

    // Create fares
    const createdFares = await Fare.create(fares)
    console.log('Fares created...'.green.inverse)

    // Create performance records
    const createdPerformances = await Performance.create(performances)
    console.log('Performance records created...'.green.inverse)

    // Create courses with references
    const createdCourses = await Course.create(
      courses.map((course, index) => {
        // Get stops for this route based on stopId ranges
        const routeStops = createdStops.filter(stop => {
          const stopId = parseInt(stop.stopId.replace('STOP', ''))
          if (index === 0) return stopId >= 1 && stopId <= 4    // Route 1: STOP001-STOP004
          if (index === 1) return stopId >= 5 && stopId <= 7    // Route 2: STOP005-STOP007
          return stopId >= 8 && stopId <= 10                   // Route 3: STOP008-STOP010
        })

        // Sort stops by stopOrder to maintain route sequence
        const sortedStops = routeStops.sort((a, b) => a.stopOrder - b.stopOrder)
        const routeStopIds = sortedStops.map(stop => stop._id)

        return {
          ...course,
          user: createdUsers[0]._id,
          stops: routeStopIds,
          schedule: createdSchedules[index % createdSchedules.length]._id,
          fare: createdFares[index % createdFares.length]._id,
          performance: createdPerformances[index % createdPerformances.length]._id
        }
      })
    )
    console.log('Courses created...'.green.inverse)

    // Create drivers first
    const createdDrivers = await Driver.create(
      drivers.map(driver => ({
        ...driver,
        status: driver.status || 'registered'
        // employeeId will be undefined by default
      }))
    )
    console.log('Drivers created...'.green.inverse)

    // Create vehicles first
    const createdVehicles = await Vehicle.create(
      vehicles.map((vehicle, index) => {
        const course = createdCourses[index % createdCourses.length];

        return {
          ...vehicle,
          user: createdUsers[0]._id,
          assignedRoute: course._id,
          status: 'available'  // Set initial status to available
        }
      })
    )
    console.log('Vehicles created...'.green.inverse)

    // Create driver assignments with vehicle references
    const assignments = await Promise.all(createdDrivers
      .filter(driver => ['active', 'assigned'].includes(driver.status))
      .map(async (driver, index) => {
        const course = createdCourses[index % createdCourses.length];
        const vehicle = createdVehicles[index % createdVehicles.length];
        const year = new Date().getFullYear().toString().slice(-2);
        const employeeId = `EMP-${year}-${(index + 1).toString().padStart(4, '0')}`;

        // Ensure vehicle has route assigned
        if (!vehicle.assignedRoute) {
          await Vehicle.findByIdAndUpdate(vehicle._id, {
            assignedRoute: course._id,
            status: 'in_use'
          });
        }

        return {
          driverId: driver._id,
          employeeId,
          isActive: true,
          salary: {
            amount: 50000 + (index * 5000),
            currency: 'KES',
            paymentFrequency: 'monthly'
          },
          vehicleAssignment: {
            busNumber: vehicle._id,
            vehicleType: vehicle.vehicleModel,
            routeAssigned: course._id,
            assignmentDate: new Date(),
            assignedBy: createdUsers[0]._id
          }
        };
      }));

    const createdAssignments = await DriverAssignment.create(assignments);
    console.log('Driver assignments created...'.green.inverse);

    // Update drivers with their employeeIds and status
    for (const assignment of createdAssignments) {
      await Driver.findByIdAndUpdate(assignment.driverId, {
        employeeId: assignment.employeeId,
        status: 'assigned'
      });
    }

    // Update vehicles with driver assignment references
    for (let i = 0; i < createdVehicles.length; i++) {
      const assignment = createdAssignments[i % createdAssignments.length];
      await Vehicle.findByIdAndUpdate(createdVehicles[i]._id, {
        currentAssignment: assignment._id,
        currentDriver: assignment.driverId,
        status: 'in_use'
      });
    }

    // Update courses with vehicle references
    for (let i = 0; i < createdCourses.length; i++) {
      const courseVehicles = createdVehicles.filter(
        vehicle => vehicle.assignedRoute.toString() === createdCourses[i]._id.toString()
      )
      await Course.findByIdAndUpdate(createdCourses[i]._id, {
        assignedVehicles: courseVehicles.map(vehicle => vehicle._id)
      })
    }
    console.log('Course-vehicle relationships created...'.green.inverse)

    // --- SEED LOCATION TRIGGERS ---
    console.log('🌱 Seeding location triggers...'.yellow)
    const adminUserId = createdUsers[0]._id;
    const createdTriggers = await createSampleTriggers(adminUserId);
    if (createdTriggers && createdTriggers.length > 0) {
      console.log(`✅ Successfully created ${createdTriggers.length} location triggers`.green)
    } else {
      console.log('ℹ️ No new triggers created (they may already exist)'.blue)
    }
    // Show trigger stats
    const stats = await getTriggerStats();
    console.log('\n📊 Location Trigger Statistics:'.cyan)
    console.log(`Total Triggers: ${stats.total}`.white)
    console.log(`Active Triggers: ${stats.active}`.green)
    console.log('\nBy Type:'.yellow)
    stats.byType.forEach(type => {
      console.log(`  ${type._id}: ${type.count} total, ${type.activeCount} active`.white)
    })
    console.log('\nBy Vehicle:'.yellow)
    if (stats.byVehicle && stats.byVehicle.length > 0) {
      stats.byVehicle.forEach(vehicle => {
        console.log(`  ${vehicle._id}: ${vehicle.triggerCount} triggers, ${vehicle.activeTriggers} active`.white)
      })
    } else {
      console.log('  No vehicle-specific triggers found'.gray)
    }
    // --- END SEED LOCATION TRIGGERS ---

    console.log('All data imported successfully!'.green.inverse)
    process.exit()
  } catch (err) {
    console.error('Error importing data:'.red.inverse, err)
    process.exit(1)
  }
}

// Delete data
const deleteData = async () => {
  try {
    await connectDB();
    
    await User.deleteMany()
    await Driver.deleteMany()
    await Vehicle.deleteMany()
    await Course.deleteMany()
    await DriverAssignment.deleteMany()
    await Stop.deleteMany()
    await Schedule.deleteMany()
    await Fare.deleteMany()
    await Performance.deleteMany()

    console.log('All data destroyed!'.red.inverse)
    process.exit()
  } catch (err) {
    console.error('Error destroying data:'.red.inverse, err)
    process.exit(1)
  }
}

if (process.argv[2] === '-i') {
  importData()
} else if (process.argv[2] === '-d') {
  deleteData()
}
