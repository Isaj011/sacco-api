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
      courses.map(course => ({
        ...course,
        user: createdUsers[0]._id,
        stops: createdStops.map(stop => stop._id),
        schedule: schedule._id,
        fare: fare._id,
        performance: performance._id
      }))
    )
    console.log('Courses created...'.green.inverse)

    // Create vehicles with course references
    const createdVehicles = await Vehicle.create(
      vehicles.map(vehicle => ({
        ...vehicle,
        user: createdUsers[0]._id,
        assignedRoute: createdCourses[0]._id
      }))
    )
    console.log('Vehicles created...'.green.inverse)

    // Update courses with vehicle references
    await Course.findByIdAndUpdate(createdCourses[0]._id, {
      assignedVehicles: [createdVehicles[0]._id]
    })
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
