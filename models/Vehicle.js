const mongoose = require('mongoose')
const slugify = require('slugify')

const VehicleSchema = new mongoose.Schema({
  // Core vehicle information
  plateNumber: {
    type: String,
    required: [true, 'Please add the vehicle plate number'],
    unique: true,
    trim: true,
    maxlength: [15, 'Plate number cannot be more than 15 characters'],
  },
  slug: String,
  vehicleModel: {
    type: String,
    required: [true, 'Please add the vehicle model'],
    maxlength: [50, 'Model name cannot be longer than 50 characters'],
  },
  vehicleCondition: {
    type: String,
    required: [true, 'Please add the vehicle condition'],
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Maintenance'],
  },
  operationalStatus: {
    type: Boolean,
    required: true,
    default: true,
  },
  currentLocation: {
    type: String,
    required: [true, 'Please add current location'],
    default: 'Not Available',
  },

  // Driver and capacity information
  driverName: {
    type: String,
    required: [true, 'Please add the assigned driver'],
    trim: true,
    maxlength: [50, 'Driver name cannot be longer than 50 characters'],
  },
  seatingCapacity: {
    type: Number,
    required: [true, 'Please add vehicle seating capacity'],
    min: [1, 'Capacity must be at least 1'],
  },

  // Route and operation details
  assignedRoute: {
    type: String,
    required: [true, 'Please add the assigned route'],
    trim: true,
    maxlength: [100, 'Route name cannot be longer than 100 characters'],
  },
  averageSpeed: {
    type: Number,
    required: [true, 'Please add average speed'],
    min: [0, 'Speed cannot be negative'],
    default: 0,
  },
  estimatedArrivalTime: {
    type: String,
    required: [true, 'Please add estimated arrival time'],
    default: 'Not Available',
  },

  // Performance metrics
  totalPassengersFerried: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Total passengers cannot be negative'],
  },
  averageDailyIncome: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Average daily income cannot be negative'],
  },
  totalIncome: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Total income cannot be negative'],
  },
  totalTrips: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Total trips cannot be negative'],
  },
  mileage: {
    type: Number,
    required: true,
    min: [0, 'Mileage cannot be negative'],
    default: 0,
  },

  // Maintenance and insurance
  lastMaintenance: {
    type: Date,
    default: null,
  },
  nextMaintenance: {
    type: Date,
    default: null,
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    default: 'Petrol',
  },
  insuranceExpiry: {
    type: Date,
    default: null,
  },

  // Media
  photo: {
    type: String,
    default: 'no-photo.jpg',
  },

  // System fields
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
})

// Create vehicle slug from the plate number
VehicleSchema.pre('save', function (next) {
  this.slug = slugify(this.plateNumber, { lower: true })
  next()
})

module.exports = mongoose.model('Vehicle', VehicleSchema)
