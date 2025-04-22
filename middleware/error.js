const ErrorResponse = require('../utils/errorResponse')
const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = error.message
  //log to console for dev
  console.log(err)

  //mongoose bad objectId
  if (err.name === 'CastError') {
    const message = `Vehicle not found with id of ${err.value}`
    error = new ErrorResponse(message, 404)
  }

  //mongoose duplicate key
  if (err.code === 11000) {
    const message = `Duplicate field value entered`
    error = new ErrorResponse(message, 400)
  }

  //Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message)
    error = new ErrorResponse(message, 400)
  }

  res
    .status(err.statusCode || 500)
    .json({ success: false, error: err.message || 'Server error' })
}

module.exports = errorHandler
