const path = require('path')
const express = require('express')
const dotenv = require('dotenv')
const morgan = require('morgan')
const colors = require('colors')
const fileupload = require('express-fileupload')
const cookieParser = require('cookie-parser')
const errorHandler = require('./middleware/error')
const connectDB = require('./config/db')
const cors = require('cors')

//Load env vars

dotenv.config({ path: './config/config.env' })

//connect to database
connectDB()

//route files
const vehicles = require('./routes/vehicles')
const courses = require('./routes/courses')
const auth = require('./routes/auth')
const users = require('./routes/users')

const app = express()

// Enable CORS
app.use(cors()) // Add this line

//body parser
app.use(express.json())

//body parser
app.use(express.json())

// Cookie parser
app.use(cookieParser())
//dev logging middleware
if ((process.env.NODE_ENV = 'development')) {
  app.use(morgan('dev'))
}

//file uploading
app.use(fileupload())

//set static folder
app.use(express.static(path.join(__dirname, 'public')))

//mount routers
app.use('/api/v1/vehicles', vehicles)
app.use('/api/v1/courses', courses)
app.use('/api/v1/auth', auth)
app.use('/api/v1/users', users)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString()
  })
})

app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.rainbow
      .bold.italic
  )
)

// //handle unhandled promise  rejections
// process.on('unhandledRejection', (err, promise)=>{
//   console.log(`Error: ${err.message}`)
//   //close server & exit process
//   server.close(()=> process.exit(1))
// })
