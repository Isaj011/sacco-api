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

// AssignedVehicle schema to link vehicle details with the course
const AssignedVehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle', // Reference to the Vehicle model, ensure this is correct
  },
  plateNumber: String,
  model: String,
  driverName: String,
  seatingCapacity: Number,
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
    type: String, // changed from Number to String
    required: [true, 'Estimated duration is required'],
  },
  stops: [StopSchema], // Array of stops for the course
  schedule: ScheduleSchema, // Schedule for the course
  fare: FareSchema, // Fare structure for the course
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Maintenance', 'Suspended'],
    default: 'Active',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  currentPassengers: Number,
  maxCapacity: Number,
  currentLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: String,
  },
  performance: PerformanceSchema, // Performance metrics
  assignedVehicles: [AssignedVehicleSchema], // Vehicles assigned to the course
  totalPassengersFerried: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true, // Ensure this is correct, as 'User' model must exist
  },
});

// Ensure that assignedVehicles.vehicleId is populated when fetching Course data
CourseSchema.pre('find', function(next) {
  this.populate('assignedVehicles.vehicleId', 'plateNumber model seatingCapacity'); // Specify which fields to populate
  next();
});

CourseSchema.pre('findOne', function(next) {
  this.populate('assignedVehicles.vehicleId', 'plateNumber model seatingCapacity'); // Specify which fields to populate
  next();
});

module.exports = mongoose.model('Course', CourseSchema);
