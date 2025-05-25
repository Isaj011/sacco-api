const mongoose = require('mongoose')
const colors = require('colors')
const dotenv = require('dotenv')
const fs = require('fs')

// Load env vars
dotenv.config({ path: './config/config.env' })

// Load models
const Driver = require('./models/Driver')
const DriverAssignment = require('./models/DriverAssignment')
const Vehicle = require('./models/Vehicle')
const Course = require('./models/Course')
const User = require('./models/User')

// Connect to DB
mongoose.connect(process.env.MONGO_URI)

// Read JSON files
const drivers = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/drivers.json`, 'utf-8')
)

// Import into DB
const importData = async () => {
  try {
    // Clear existing data
    await Driver.deleteMany()
    await DriverAssignment.deleteMany()

    // Get existing users (managers/admins) for assignment
    const users = await User.find({ role: { $in: ['admin', 'manager'] } })
    if (users.length === 0) {
      throw new Error('No admin/manager users found. Please run the main seeder first.')
    }

    // Get existing vehicles and courses for assignment
    const vehicles = await Vehicle.find({ operationalStatus: true })
    const courses = await Course.find()

    if (vehicles.length === 0 || courses.length === 0) {
      throw new Error('No vehicles or courses found. Please run the main seeder first.')
    }

    // Create drivers
    const createdDrivers = await Driver.create(
      drivers.map(driver => ({
        ...driver,
        status: 'registered',
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    )
    console.log('Drivers created...'.green.inverse)

    // Create driver assignments
    const assignments = createdDrivers.map((driver, index) => {
      // Assign vehicle and course in a round-robin fashion
      const vehicle = vehicles[index % vehicles.length]
      const course = courses[index % courses.length]
      const assignedBy = users[0]._id // Assign first admin/manager as the assigner

      return {
        driverId: driver._id,
        employeeId: `EMP${String(index + 1).padStart(3, '0')}`,
        salary: {
          amount: 50000 + (index * 5000), // Varying salary amounts
          currency: 'KES',
          paymentFrequency: 'monthly'
        },
        vehicleAssignment: {
          busNumber: vehicle._id,
          routeAssigned: course._id,
          vehicleType: vehicle.vehicleModel,
          assignmentDate: new Date(),
          assignedBy: assignedBy
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    const createdAssignments = await DriverAssignment.create(assignments)
    console.log('Driver assignments created...'.green.inverse)

    // Update driver statuses to 'assigned'
    await Driver.updateMany(
      { _id: { $in: createdDrivers.map(d => d._id) } },
      { $set: { status: 'assigned' } }
    )
    console.log('Driver statuses updated...'.green.inverse)

    // Update vehicle operationalStatus to false for assigned vehicles
    await Vehicle.updateMany(
      { _id: { $in: vehicles.slice(0, createdDrivers.length).map(v => v._id) } },
      { $set: { operationalStatus: false } }
    )
    console.log('Vehicle statuses updated...'.green.inverse)

    console.log('All driver data imported successfully!'.green.inverse)
    process.exit()
  } catch (err) {
    console.error('Error importing driver data:'.red.inverse, err)
    process.exit(1)
  }
}

// Delete data
const deleteData = async () => {
  try {
    // Get all driver assignments to update vehicle statuses
    const assignments = await DriverAssignment.find()
    const vehicleIds = assignments.map(a => a.vehicleAssignment.busNumber)

    // Update vehicle statuses back to available
    await Vehicle.updateMany(
      { _id: { $in: vehicleIds } },
      { $set: { operationalStatus: true } }
    )

    // Delete driver assignments and drivers
    await DriverAssignment.deleteMany()
    await Driver.deleteMany()

    console.log('All driver data destroyed...'.red.inverse)
    process.exit()
  } catch (err) {
    console.error('Error deleting driver data:'.red.inverse, err)
    process.exit(1)
  }
}

if (process.argv[2] === '-i') {
  importData()
} else if (process.argv[2] === '-d') {
  deleteData()
} 