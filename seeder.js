const mongoose = require('mongoose')
const colors = require('colors')
const dotenv = require('dotenv')
const fs = require('fs')

// load env vars

dotenv.config({ path: './config/config.env' })

// //load models
const Vehicle = require('./models/Vehicle')
const Course = require('./models/Course')
const User = require('./models/User')
const Stop = require('./models/Stop')
const Schedule = require('./models/Schedule')
const Fare = require('./models/Fare')
const Performance = require('./models/Performance')
const AssignedVehicle = require('./models/AssignedVehicle')

// connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

//read json files
const vehicles = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/vehicles.json`, 'utf-8')
)
const courses = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/courses.json`, 'utf-8')
)
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8')
)

// Sample data
const stops = [
  {
    stopId: 'STOP001',
    stopName: 'Downtown Terminal',
    stopOrder: 1,
    estimatedTime: '2023-01-01T08:00:00Z',
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    isTerminal: true,
    isDestination: false,
    waitingTime: 5
  },
  {
    stopId: 'STOP002',
    stopName: 'Central Station',
    stopOrder: 2,
    estimatedTime: '2023-01-01T08:15:00Z',
    coordinates: { latitude: 40.7589, longitude: -73.9851 },
    isTerminal: false,
    isDestination: false,
    waitingTime: 3
  },
  {
    stopId: 'STOP003',
    stopName: 'West End',
    stopOrder: 3,
    estimatedTime: '2023-01-01T08:30:00Z',
    coordinates: { latitude: 40.7829, longitude: -73.9654 },
    isTerminal: false,
    isDestination: false,
    waitingTime: 4
  },
  {
    stopId: 'STOP004',
    stopName: 'East Side',
    stopOrder: 4,
    estimatedTime: '2023-01-01T08:45:00Z',
    coordinates: { latitude: 40.7282, longitude: -73.7949 },
    isTerminal: false,
    isDestination: false,
    waitingTime: 3
  },
  {
    stopId: 'STOP005',
    stopName: 'North Terminal',
    stopOrder: 5,
    estimatedTime: '2023-01-01T09:00:00Z',
    coordinates: { latitude: 40.7829, longitude: -73.9654 },
    isTerminal: false,
    isDestination: false,
    waitingTime: 5
  },
  {
    stopId: 'STOP006',
    stopName: 'South End',
    stopOrder: 6,
    estimatedTime: '2023-01-01T09:15:00Z',
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    isTerminal: false,
    isDestination: true,
    waitingTime: 4
  }
]

const schedules = [
  {
    startTime: '08:00',
    endTime: '18:00',
    frequency: 30,
    isActive: true
  },
  {
    startTime: '09:00',
    endTime: '19:00',
    frequency: 45,
    isActive: true
  }
]

const fares = [
  {
    baseFare: 2.50,
    distanceFare: 0.50,
    peakHourMultiplier: 1.5,
    discountPercentage: 10
  },
  {
    baseFare: 3.00,
    distanceFare: 0.75,
    peakHourMultiplier: 1.2,
    discountPercentage: 5
  }
]

const performances = [
  {
    averageSpeed: 35,
    onTimePercentage: 95,
    passengerSatisfaction: 4.5,
    totalTrips: 100
  },
  {
    averageSpeed: 30,
    onTimePercentage: 90,
    passengerSatisfaction: 4.0,
    totalTrips: 80
  }
]

const assignedVehicles = [
  {
    vehicleId: new mongoose.Types.ObjectId(),
    plateNumber: 'ABC123',
    model: 'Toyota Coaster',
    driverName: 'John Doe',
    seatingCapacity: 30
  },
  {
    vehicleId: new mongoose.Types.ObjectId(),
    plateNumber: 'XYZ789',
    model: 'Mercedes Sprinter',
    driverName: 'Jane Smith',
    seatingCapacity: 25
  },
  {
    vehicleId: new mongoose.Types.ObjectId(),
    plateNumber: 'DEF456',
    model: 'Ford Transit',
    driverName: 'Mike Johnson',
    seatingCapacity: 20
  },
  {
    vehicleId: new mongoose.Types.ObjectId(),
    plateNumber: 'GHI789',
    model: 'Nissan Urvan',
    driverName: 'Sarah Williams',
    seatingCapacity: 28
  }
]

const sampleCourses = [
  {
    routeName: 'Downtown Express',
    routeNumber: 'R001',
    description: 'Express route from Downtown to West End',
    totalDistance: 15,
    estimatedDuration: '45 minutes',
    status: 'Active',
    maxCapacity: 30,
    currentLocation: {
      latitude: 40.7128,
      longitude: -74.0060,
      lastUpdated: new Date().toISOString()
    },
    totalPassengersFerried: 150,
    user: new mongoose.Types.ObjectId()
  },
  {
    routeName: 'Central Loop',
    routeNumber: 'R002',
    description: 'Circular route around Central Station',
    totalDistance: 10,
    estimatedDuration: '30 minutes',
    status: 'Active',
    maxCapacity: 25,
    currentLocation: {
      latitude: 40.7589,
      longitude: -73.9851,
      lastUpdated: new Date().toISOString()
    },
    totalPassengersFerried: 100,
    user: new mongoose.Types.ObjectId()
  }
]

//Improt into DB
const importData = async () => {
  try {
    // Clear existing data
    await Stop.deleteMany()
    await Schedule.deleteMany()
    await Fare.deleteMany()
    await Performance.deleteMany()
    await AssignedVehicle.deleteMany()
    await Course.deleteMany()

    // Insert new data
    const createdStops = await Stop.insertMany(stops)
    const createdSchedules = await Schedule.insertMany(schedules)
    const createdFares = await Fare.insertMany(fares)
    const createdPerformances = await Performance.insertMany(performances)
    const createdAssignedVehicles = await AssignedVehicle.insertMany(assignedVehicles)

    // Update courses with references
    const updatedCourses = sampleCourses.map((course, index) => ({
      ...course,
      stops: [createdStops[0]._id, createdStops[1]._id, createdStops[2]._id, createdStops[3]._id, createdStops[4]._id, createdStops[5]._id],
      schedule: createdSchedules[index]._id,
      fare: createdFares[index]._id,
      performance: createdPerformances[index]._id,
      assignedVehicles: [createdAssignedVehicles[0]._id, createdAssignedVehicles[1]._id, createdAssignedVehicles[2]._id, createdAssignedVehicles[3]._id],
      terminalStop: createdStops[0]._id, // Downtown Terminal
      destinationStop: createdStops[5]._id // South End
    }))

    await Course.insertMany(updatedCourses)

    console.log('Data Imported...'.green.inverse)
    process.exit()
  } catch (err) {
    console.error(err) 
  }
}

//Delete data
const deleteData = async () => {
  try {
    await Stop.deleteMany()
    await Schedule.deleteMany()
    await Fare.deleteMany()
    await Performance.deleteMany()
    await AssignedVehicle.deleteMany()
    await Course.deleteMany()

    console.log('Data Destroyed...'.red.inverse)
    process.exit()
  } catch (err) {
    console.error(err)
  }
}

if (process.argv[2] === '-i') {
  importData()
} else if (process.argv[2] === '-d') {
  deleteData()
}
