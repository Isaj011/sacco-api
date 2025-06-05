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
    latitude: {
      type: Number,
      required: false,
      min: -90,
      max: 90,
      default: -1.2921, // Default to Nairobi CBD
    },
    longitude: {
      type: Number,
      required: false,
      min: -180,
      max: 180,
      default: 38.8219, // Default to Nairobi CBD
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    }
  },

  // Driver and capacity information
  currentDriver: {
    type: mongoose.Schema.ObjectId,
    ref: 'Driver',
    default: null
  },
  currentAssignment: {
    type: mongoose.Schema.ObjectId,
    ref: 'DriverAssignment',
    default: null
  },
  seatingCapacity: {
    type: Number,
    required: [true, 'Please add vehicle seating capacity'],
    min: [1, 'Capacity must be at least 1'],
  },

  // Route and operation details
  assignedRoute: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course'
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

  // Status tracking
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'out_of_service'],
    default: 'available'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['available', 'in_use', 'maintenance', 'out_of_service']
    },
    date: {
      type: Date,
      default: Date.now
    },
    reason: String,
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  }],

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

  // System Fields
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true
});

// Add indexes for frequently queried fields
VehicleSchema.index({ plateNumber: 1 });
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ currentDriver: 1 });

// Pre-save middleware to update the updatedAt field
VehicleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to update vehicle status
VehicleSchema.methods.updateStatus = async function(newStatus, reason, updatedBy) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    reason,
    updatedBy
  });
  return this.save();
};

// Populate middleware
VehicleSchema.pre('find', function(next) {
  this.populate([
    { path: 'assignedRoute', select: 'routeName routeNumber' },
    { path: 'currentDriver', select: 'driverName nationalId contactDetails driverLicense psvLicense status' },
    { path: 'currentAssignment', select: 'employeeId salary vehicleAssignment' }
  ]);
  next();
});

VehicleSchema.pre('findOne', function(next) {
  this.populate([
    { path: 'assignedRoute', select: 'routeName routeNumber' },
    { path: 'currentDriver', select: 'driverName nationalId contactDetails driverLicense psvLicense status' },
    { path: 'currentAssignment', select: 'employeeId salary vehicleAssignment' }
  ]);
  next();
});

// Middleware to update Course's assignedVehicles array
VehicleSchema.post('save', async function(next) {
  try {
    const Course = mongoose.model('Course');
    if (this.isModified('assignedRoute')) {
      // Remove from old route if exists
      if (this._oldAssignedRoute) {
        await Course.findByIdAndUpdate(
          this._oldAssignedRoute,
          { $pull: { assignedVehicles: this._id } }
        );
      }
      // Add to new route
      await Course.findByIdAndUpdate(
        this.assignedRoute,
        { $addToSet: { assignedVehicles: this._id } }
      );
    }
  } catch (error) {
    console.error('Error updating Course assignedVehicles:', error);
  }
});

// Store old assignedRoute before update
VehicleSchema.pre('save', function(next) {
  if (this.isModified('assignedRoute')) {
    this._oldAssignedRoute = this.assignedRoute;
  }
  next();
});

// The following fields are system-managed and should not be set directly by user input:
// assignedRoute, currentDriver, currentAssignment, estimatedArrivalTime, totalPassengersFerried, averageDailyIncome, totalIncome, totalTrips, mileage
// These fields are updated by system logic or other backend processes.

module.exports = mongoose.model('Vehicle', VehicleSchema)
