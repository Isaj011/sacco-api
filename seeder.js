const mongoose = require('mongoose')
const colors = require('colors')
const dotenv = require('dotenv')
const fs = require('fs')

// Load env vars
dotenv.config({ path: './config/config.env' })

// Load models
const Vehicle = require('./models/Vehicle')
const Course = require('./models/Course')
const User = require('./models/User')
const Stop = require('./models/Stop')
const Schedule = require('./models/Schedule')
const Fare = require('./models/Fare')
const Performance = require('./models/Performance')

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// Read JSON files
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8')
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

// Import into DB
const importData = async () => {
  try {
    // Clear existing data
    await Course.deleteMany()
    await Vehicle.deleteMany()
    await User.deleteMany()
    await Stop.deleteMany()
    await Schedule.deleteMany()
    await Fare.deleteMany()
    await Performance.deleteMany()

    // Create users first
    const createdUsers = await User.create(users)
    console.log('Users created...'.green.inverse)

    // Create stops
    const createdStops = await Stop.create(stops)
    console.log('Stops created...'.green.inverse)

    // Group stops by route (based on stopOrder starting from 1)
    const routeStops = {}
    createdStops.forEach(stop => {
      if (!routeStops[stop.stopOrder]) {
        routeStops[stop.stopOrder] = []
      }
      routeStops[stop.stopOrder].push(stop)
    })

    // Create performance metrics
    const performance = await Performance.create({
      averageSpeed: 60,
      onTimePercentage: 95,
      passengerSatisfaction: 4.5,
      totalTrips: 0
    })
    console.log('Performance metrics created...'.green.inverse)

    // Create fare structure
    const fare = await Fare.create({
      baseFare: 50,
      distanceFare: 5,
      peakHourMultiplier: 1.2,
      discountPercentage: 0
    })
    console.log('Fare structure created...'.green.inverse)

    // Create schedule
    const schedule = await Schedule.create({
      startTime: '06:00',
      endTime: '22:00',
      frequency: 15,
      isActive: true
    })
    console.log('Schedule created...'.green.inverse)

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

        // Verify each route has exactly one terminal and one destination
        const terminalStops = routeStops.filter(stop => stop.isTerminal)
        const destinationStops = routeStops.filter(stop => stop.isDestination)

        if (terminalStops.length !== 1) {
          throw new Error(`Route ${index + 1} must have exactly one terminal stop`)
        }
        if (destinationStops.length !== 1) {
          throw new Error(`Route ${index + 1} must have exactly one destination stop`)
        }

        // Sort stops by stopOrder to maintain route sequence
        const sortedStops = routeStops.sort((a, b) => a.stopOrder - b.stopOrder)
        const routeStopIds = sortedStops.map(stop => stop._id)

        return {
          ...course,
          user: createdUsers[0]._id,
          stops: routeStopIds,
          schedule: schedule._id,
          fare: fare._id,
          performance: performance._id,
          terminalStop: terminalStops[0]._id,
          destinationStop: destinationStops[0]._id
        }
      })
    )
    console.log('Courses created...'.green.inverse)

    // Create vehicles with course references
    const createdVehicles = await Vehicle.create(
      vehicles.map((vehicle, index) => ({
        ...vehicle,
        user: createdUsers[0]._id,
        assignedRoute: createdCourses[index % createdCourses.length]._id
      }))
    )
    console.log('Vehicles created...'.green.inverse)

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
    await Course.deleteMany()
    await Vehicle.deleteMany()
    await User.deleteMany()
    await Stop.deleteMany()
    await Schedule.deleteMany()
    await Fare.deleteMany()
    await Performance.deleteMany()

    console.log('All data destroyed...'.red.inverse)
    process.exit()
  } catch (err) {
    console.error('Error deleting data:'.red.inverse, err)
    process.exit(1)
  }
}

if (process.argv[2] === '-i') {
  importData()
} else if (process.argv[2] === '-d') {
  deleteData()
}
