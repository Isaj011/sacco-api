const fs = require('fs')
const mongoose = require('mongoose')
const colors = require('colors')
const dotenv = require('dotenv')

// load env vars

dotenv.config({ path: './config/config.env' })

// //load models
const Vehicle = require('./models/Vehicle')
const Course = require('./models/Course')
const User = require('./models/User')

// connect to DB
mongoose.connect(process.env.MONGO_URI)

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

//Improt into DB
const importData = async () => {
  try {
    await Vehicle.create(vehicles)
    await Course.create(courses)
    await User.create(users)
    console.log('Data Imported...'.green.inverse)
    process.exit()
  } catch (err) {
    console.error(err) 
  }
}

//Delete data
const deleteData = async () => {
  try {
    await Vehicle.deleteMany()
    await Course.deleteMany()
    await User.deleteMany()
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
