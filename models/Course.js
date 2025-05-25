const mongoose = require('mongoose');

// Stop schema to hold information about each stop in a course
const StopSchema = new mongoose.Schema({
  stopId: String,
  stopName: String,
  stopOrder: Number,
  estimatedTime: String, // ISO 8601 format
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
  isTerminal: Boolean,
  waitingTime: Number,
});

// Schedule schema to hold information about the schedule for a course
const ScheduleSchema = new mongoose.Schema({
  startTime: String,
  endTime: String,
  frequency: Number,
  isActive: Boolean,
});

// Fare schema to hold information about fare calculations for a course
const FareSchema = new mongoose.Schema({
  baseFare: Number,
  distanceFare: Number,
  peakHourMultiplier: Number,
  discountPercentage: Number,
});

// Performance schema to hold data on performance metrics for a course
const PerformanceSchema = new mongoose.Schema({
  averageSpeed: Number,
  onTimePercentage: Number,
  passengerSatisfaction: Number,
  totalTrips: Number,
});

// Main Course schema that references other sub-schemas
const CourseSchema = new mongoose.Schema({
  routeName: {
    type: String,
    trim: true,
    required: [true, 'Please add the route name'],
  },
  routeNumber: {
    type: String,
    required: [true, 'Please add route number'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [false, 'Please add a description'],
  },
  totalDistance: {
    type: Number,
    required: [true, 'Please add the total distance'],
  },
  estimatedDuration: {
    type: String,
    required: [true, 'Estimated duration is required'],
  },
  stops: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Stop'
  }],
  schedule: {
    type: mongoose.Schema.ObjectId,
    ref: 'Schedule'
  },
  fare: {
    type: mongoose.Schema.ObjectId,
    ref: 'Fare'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Maintenance', 'Suspended'],
    default: 'Active',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  currentPassengers: {
    type: Number,
    default: 0
  },
  maxCapacity: {
    type: Number,
    required: [true, 'Please add maximum capacity']
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: String,
  },
  performance: {
    type: mongoose.Schema.ObjectId,
    ref: 'Performance'
  },
  assignedVehicles: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle'
  }],
  totalPassengersFerried: {
    type: Number,
    default: 0,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', CourseSchema);
