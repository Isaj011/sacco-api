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

  // Rich context data for Kenya Sacco operations
  contextData: {
    // Environmental conditions
    weather: {
      condition: String,
      severity: String,
      temperature: Number
    },
    traffic: {
      level: String,
      description: String
    },
    
    // Performance metrics
    performance: {
      fuelEfficiency: Number,
      idleTime: Number,
      stopDuration: Number
    },
    
    // Route information
    route: {
      routeId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Course'
      },
      deviation: {
        distance: Number,
        duration: Number
      }
    },
    
    // Device health
    deviceHealth: {
      batteryLevel: Number,
      signalStrength: Number,
      accuracy: Number
    },
    
    // Events and status
    events: [String],
    heading: Number,
    source: {
      type: String,
      enum: ['gps', 'manual', 'system'],
      default: 'system'
    }
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

// Middleware to automatically create VehicleLocationHistory entries
VehicleSchema.post('save', async function() {
  try {
    // Only create history entry if location or context data was updated
    if (this.isModified('currentLocation') || this.isModified('contextData') || this.isModified('currentSpeed')) {
      const VehicleLocationHistory = mongoose.model('VehicleLocationHistory');
      
      const historyData = {
        vehicleId: this._id,
        location: {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude
        },
        timestamp: this.currentLocation.updatedAt || new Date(),
        speed: {
          current: this.currentSpeed,
          average: this.averageSpeed,
          max: this.contextData?.performance?.maxSpeed || this.currentSpeed
        },
        heading: this.contextData?.heading,
        context: {
          // Trigger information (will be populated by LocationTriggerService)
          triggerType: null,
          triggerId: null,
          
          // Event information
          events: this.contextData?.events || [],
          
          // Environmental conditions
          conditions: {
            weather: this.contextData?.weather,
            traffic: this.contextData?.traffic
          },
          
          // Performance metrics
          performance: this.contextData?.performance,
          
          // Route information
          route: {
            routeId: this.contextData?.route?.routeId || this.assignedRoute,
            deviation: this.contextData?.route?.deviation
          }
        },
        metadata: {
          source: this.contextData?.source || 'system',
          accuracy: this.contextData?.deviceHealth?.accuracy,
          batteryLevel: this.contextData?.deviceHealth?.batteryLevel,
          signalStrength: this.contextData?.deviceHealth?.signalStrength
        }
      };

      await VehicleLocationHistory.create(historyData);
      console.log(`📝 Auto-created VehicleLocationHistory for vehicle ${this.plateNumber || this._id}`);
    }
  } catch (error) {
    console.error('Error creating VehicleLocationHistory entry:', error);
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
