const mongoose = require('mongoose');
const Driver = require('./Driver');  // Add this import

// Create a counter schema for employee IDs
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

const driverAssignmentSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Driver',
    required: [true, 'Driver ID is required']
  },
  
  // Administrative Information
  employeeId: {
    type: String,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  salary: {
    amount: {
      type: Number,
      required: [true, 'Salary amount is required']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'KES'
    },
    paymentFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'monthly'
    }
  },
  leaveRecords: [{
    type: {
      type: String,
      required: true,
      enum: ['annual', 'sick', 'emergency', 'unpaid']
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  disciplinaryRecords: [{
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['warning', 'suspension', 'termination', 'other']
    },
    description: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  grievanceHistory: [{
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['salary', 'working_conditions', 'harassment', 'other']
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'rejected'],
      default: 'pending'
    },
    resolution: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Vehicle Assignment
  vehicleAssignment: {
    busNumber: { 
      type: mongoose.Schema.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Bus number is required']
    },
    routeAssigned: { 
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: [true, 'Route assignment is required']
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required']
    },
    assignmentDate: {
      type: Date,
      required: [true, 'Assignment date is required']
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned by is required']
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
  }
}, {
  timestamps: true
});

// Add indexes for frequently queried fields
driverAssignmentSchema.index({ driverId: 1 });
driverAssignmentSchema.index({ 'vehicleAssignment.busNumber': 1 });
driverAssignmentSchema.index({ 'vehicleAssignment.routeAssigned': 1 });

// Static method to generate or retrieve employee ID
driverAssignmentSchema.statics.getEmployeeId = async function(driverId) {
  // First check if driver already has an employeeId
  const driver = await Driver.findById(driverId);
  
  if (driver && driver.employeeId) {
    return driver.employeeId;
  }

  // If no existing employeeId, check previous assignments
  const previousAssignment = await this.findOne({ 
    driverId,
    employeeId: { $exists: true, $ne: null }
  }).sort({ createdAt: -1 });

  if (previousAssignment && previousAssignment.employeeId) {
    return previousAssignment.employeeId;
  }

  // If no previous assignment, generate new employeeId
  const prefix = 'EMP';
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Get total count of assignments for this year
  const yearPrefix = `${prefix}-${year}`;
  const count = await this.countDocuments({
    employeeId: new RegExp(`^${yearPrefix}`)
  });
  
  return `${yearPrefix}-${(count + 1).toString().padStart(4, '0')}`;
};

// Pre-save middleware to ensure employeeId is set and synced with Driver
driverAssignmentSchema.pre('save', async function(next) {
  try {
    if (!this.employeeId) {
      this.employeeId = await this.constructor.getEmployeeId(this.driverId);
    }

    // Update the Driver's employeeId
    await Driver.findByIdAndUpdate(this.driverId, {
      employeeId: this.employeeId,
      status: 'assigned'
    });

    next();
  } catch (error) {
    next(error);
  }
});

// Post-remove middleware to clear Driver's employeeId if no active assignments
driverAssignmentSchema.post('remove', async function() {
  try {
    const Driver = mongoose.model('Driver');
    const Vehicle = mongoose.model('Vehicle');

    // Check if driver has any other active assignments
    const activeAssignments = await this.constructor.countDocuments({
      driverId: this.driverId,
      isActive: true
    });

    // If no active assignments, update driver status but keep employeeId
    if (activeAssignments === 0) {
      await Driver.findByIdAndUpdate(this.driverId, {
        status: 'inactive'
        // Don't clear employeeId anymore
      });
    }

    // Update vehicle status
    await Vehicle.findByIdAndUpdate(
      this.vehicleAssignment.busNumber,
      { 
        $unset: { currentAssignment: 1 },
        $unset: { currentDriver: 1 },
        status: 'available'
      }
    );
  } catch (error) {
    console.error('Error in post-remove middleware:', error);
  }
});

// Middleware to update Vehicle's driverAssignment field
driverAssignmentSchema.post('save', async function() {
  try {
    const Vehicle = mongoose.model('Vehicle');
    await Vehicle.findByIdAndUpdate(
      this.vehicleAssignment.busNumber,
      { 
        currentAssignment: this._id,
        currentDriver: this.driverId,
        status: 'in_use'
      }
    );
  } catch (error) {
    console.error('Error updating Vehicle driverAssignment:', error);
  }
});

// Middleware to remove Vehicle's driverAssignment reference when deleted
driverAssignmentSchema.post('remove', async function() {
  try {
    const Vehicle = mongoose.model('Vehicle');
    const vehicle = await Vehicle.findById(this.vehicleAssignment.busNumber);
    
    if (vehicle) {
      // Only update vehicle if this was its current assignment
      if (vehicle.currentAssignment && 
          vehicle.currentAssignment.toString() === this._id.toString()) {
        await Vehicle.findByIdAndUpdate(
          this.vehicleAssignment.busNumber,
          { 
            $unset: { currentAssignment: 1 },
            $unset: { currentDriver: 1 },
            status: 'available'
          }
        );
      }
    }
  } catch (error) {
    console.error('Error removing Vehicle driverAssignment:', error);
  }
});

// Pre-save middleware to update the updatedAt field
driverAssignmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if driver is currently on leave
driverAssignmentSchema.methods.isOnLeave = function() {
  const now = new Date();
  return this.leaveRecords.some(leave => 
    leave.status === 'approved' && 
    leave.startDate <= now && 
    leave.endDate >= now
  );
};

// Method to get active disciplinary records
driverAssignmentSchema.methods.getActiveDisciplinaryRecords = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.disciplinaryRecords.filter(record => 
    record.date >= thirtyDaysAgo
  );
};

module.exports = mongoose.model('DriverAssignment', driverAssignmentSchema); 