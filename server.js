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
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')
const xss = require('xss-clean')
const rateLimit = require('express-rate-limit')
const hpp = require('hpp')

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
const stops = require('./routes/stops')
const schedules = require('./routes/schedules')
const fares = require('./routes/fares')
const performances = require('./routes/performances')

const app = express()

// Enable CORS for all environments
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5173'  // During development, only allow localhost
    : [
        'http://localhost:5173',
        'https://sacco-3mhcvjas5-isajs-projects.vercel.app',
        'https://fare-rari.netlify.app'
      ],
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
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware before other middleware
app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// File uploading
app.use(fileupload())

// Sanitize data
app.use(mongoSanitize())

// Set security headers
app.use(helmet())

// Prevent XSS attacks
app.use(xss())

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // More requests allowed in development
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV === 'development' && req.path === '/api/v1/auth/login' // Skip rate limiting for login in development
})
app.use(limiter)

// Prevent http param pollution
app.use(hpp())

// Set static folder
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
app.use('/api/v1/stops', stops)
app.use('/api/v1/schedules', schedules)
app.use('/api/v1/fares', fares)
app.use('/api/v1/performances', performances)

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
