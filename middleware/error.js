const ErrorResponse = require('../utils/errorResponse')

const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log to console for dev
  console.log('Error:', err)

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`
    error = new ErrorResponse(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered'
    error = new ErrorResponse(message, 400)
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message)
    error = new ErrorResponse(message, 400)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Not authorized to access this route'
    error = new ErrorResponse(message, 401)
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your session has expired. Please login again'
    error = new ErrorResponse(message, 401)
  }

  // Default error
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
}

module.exports = errorHandler
