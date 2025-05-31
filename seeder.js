const mongoose = require('mongoose')
const colors = require('colors')
const dotenv = require('dotenv')
const fs = require('fs')

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
mongoose.connect(process.env.MONGO_URI)

// Import into DB
const importData = async () => {
  try {
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
        status: 'registered'
      }))
    )
    console.log('Drivers created...'.green.inverse)

    // Create vehicles first
    const createdVehicles = await Vehicle.create(
      vehicles.map((vehicle, index) => {
        const driver = createdDrivers[index % createdDrivers.length]
        const course = createdCourses[index % createdCourses.length]

        return {
          ...vehicle,
          user: createdUsers[0]._id,
          driver: driver._id,
          assignedRoute: course._id
        }
      })
    )
    console.log('Vehicles created...'.green.inverse)

    // Create driver assignments with vehicle references
    const assignments = createdDrivers.map((driver, index) => {
      const course = createdCourses[index % createdCourses.length]
      const vehicle = createdVehicles[index % createdVehicles.length]

      return {
        driverId: driver._id,
        employeeId: `EMP${String(index + 1).padStart(3, '0')}`,
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
      }
    })

    const createdAssignments = await DriverAssignment.create(assignments)
    console.log('Driver assignments created...'.green.inverse)

    // Update vehicles with driver assignment references
    for (let i = 0; i < createdVehicles.length; i++) {
      await Vehicle.findByIdAndUpdate(createdVehicles[i]._id, {
        driverAssignment: createdAssignments[i % createdAssignments.length]._id
      })
    }
    console.log('Vehicles updated with driver assignments...'.green.inverse)

    // Update driver statuses to 'assigned'
    await Driver.updateMany(
      { _id: { $in: createdDrivers.map(d => d._id) } },
      { $set: { status: 'assigned' } }
    )
    console.log('Driver statuses updated...'.green.inverse)

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
