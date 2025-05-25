const mongoose = require('mongoose');

const driverAssignmentSchema = new mongoose.Schema({
  driverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Driver', 
    required: [true, 'Driver ID is required']
  },
  
  // Administrative Information
  employeeId: { 
    type: String, 
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true
  },
  salary: {
    amount: {
      type: Number,
      required: [true, 'Salary amount is required'],
      min: [0, 'Salary amount cannot be negative']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'KES'
    },
    paymentFrequency: {
      type: String,
      required: [true, 'Payment frequency is required'],
      enum: ['weekly', 'bi-weekly', 'monthly']
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
driverAssignmentSchema.index({ employeeId: 1 });
driverAssignmentSchema.index({ 'vehicleAssignment.busNumber': 1 });
driverAssignmentSchema.index({ 'vehicleAssignment.routeAssigned': 1 });

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

const DriverAssignment = mongoose.model('DriverAssignment', driverAssignmentSchema);

module.exports = DriverAssignment; 