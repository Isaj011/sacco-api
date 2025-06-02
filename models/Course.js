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
    type: Number
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: String,
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
  },
  schedule: ScheduleSchema,
  performance: PerformanceSchema
}, {
  timestamps: true
});

// Add a pre-save hook to calculate maxCapacity
CourseSchema.pre('save', async function(next) {
  if (this.assignedVehicles && this.assignedVehicles.length > 0) {
    const vehicles = await this.model('Vehicle').find({ _id: { $in: this.assignedVehicles } });
    this.maxCapacity = vehicles.reduce((total, vehicle) => total + (vehicle.seatingCapacity || 0), 0);
  }
  if (this.stops && this.stops.length > 0) {
    const stops = await this.model('Stop').find({ _id: { $in: this.stops } });
    const schedule = {
      startTime: stops[0].estimatedTime,
      endTime: stops[stops.length - 1].estimatedTime,
      frequency: 30, // Example: 30 minutes
      isActive: true
    };
    this.schedule = schedule;
  }
  // Example: Update performance based on trip data
  const performance = {
    averageSpeed: 60, // Example: 60 km/h
    onTimePercentage: 95, // Example: 95%
    passengerSatisfaction: 4.5, // Example: 4.5 out of 5
    totalTrips: this.totalTrips || 0
  };
  this.performance = performance;
  next();
});

module.exports = mongoose.model('Course', CourseSchema);
