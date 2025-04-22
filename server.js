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
const mongoose = require('mongoose')

//Load env vars
dotenv.config({ path: './config/config.env' })

// Debug logging
console.log('Environment Variables Debug:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT:', process.env.PORT)
console.log('MONGO_URI exists:', !!process.env.MONGO_URI)
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET)

//connect to database
connectDB()

//route files
const vehicles = require('./routes/vehicles')
const courses = require('./routes/courses')
const auth = require('./routes/auth')
const users = require('./routes/users')

const app = express()

const allowedOrigins = ['http://localhost:5173', 'https://sacco-3mhcvjas5-isajs-projects.vercel.app'];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware before any routes
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

//body parser
app.use(express.json())

//body parser
app.use(express.json())

// Cookie parser
app.use(cookieParser())

//dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

//file uploading
app.use(fileupload())

//set static folder
app.use(express.static(path.join(__dirname, 'public')))

// Debug route with enhanced MongoDB status
app.get('/debug', async (req, res) => {
  let mongoStatus = 'Not Connected';
  let mongoError = null;
  
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    mongoStatus = dbState === 1 ? 'Connected' : 'Not Connected';
    
    // Try to connect if not connected
    if (dbState !== 1) {
      console.log('Attempting to reconnect to MongoDB...');
      await connectDB();
      mongoStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected';
    }
  } catch (err) {
    mongoStatus = 'Error';
    mongoError = err.message;
    console.error('MongoDB connection error:', err);
  }

  res.json({
    environment: process.env.NODE_ENV,
    mongoConnected: mongoStatus,
    mongoError: mongoError,
    jwtConfigured: !!process.env.JWT_SECRET,
    uploadPath: process.env.FILE_UPLOAD_PATH,
    envVars: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      mongoUriExists: !!process.env.MONGO_URI,
      mongoUriLength: process.env.MONGO_URI ? process.env.MONGO_URI.length : 0,
      jwtSecretExists: !!process.env.JWT_SECRET,
      smtpHostExists: !!process.env.SMTP_HOST,
      fileUploadPathExists: !!process.env.FILE_UPLOAD_PATH
    },
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  })
})

//mount routers
app.use('/api/v1/vehicles', vehicles)
app.use('/api/v1/courses', courses)
app.use('/api/v1/auth', auth)
app.use('/api/v1/users', users)

app.use(errorHandler)

const PORT = process.env.PORT || 5000

const server = app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.rainbow
      .bold.italic
  )
)

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Error:', err.message)
  console.log('Full error:', err)
  // Close server & exit process
  server.close(() => process.exit(1))
})
