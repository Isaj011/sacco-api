const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  // Basic incident information
  incidentType: {
    type: String,
    required: [true, 'Incident type is required'],
    enum: [
      'accident',
      'traffic_violation',
      'speed_violation',
      'route_deviation',
      'harsh_braking',
      'vehicle_breakdown',
      'driver_violation',
      'safety_incident',
      'compliance_breach',
      'other'
    ]
  },
  severity: {
    type: String,
    required: [true, 'Severity level is required'],
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['reported', 'investigating', 'resolved', 'closed'],
    default: 'reported'
  },

  // Location and timing
  location: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    address: String,
    landmark: String
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Vehicle and driver information
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },

  // Incident details
  description: {
    type: String,
    required: [true, 'Incident description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  details: {
    speedAtTime: Number,
    weatherConditions: String,
    trafficConditions: String,
    roadConditions: String,
    passengerCount: Number,
    injuries: Number,
    fatalities: Number,
    propertyDamage: {
      estimated: Number,
      currency: {
        type: String,
        default: 'KES'
      }
    }
  },

  // Violation specific data
  violation: {
    type: String,
    enum: [
      'speeding',
      'reckless_driving',
      'route_deviation',
      'unauthorized_stop',
      'overloading',
      'document_expiry',
      'vehicle_condition',
      'driver_behavior',
      'none'
    ]
  },
  violationDetails: {
    speedLimit: Number,
    actualSpeed: Number,
    deviationDistance: Number,
    deviationDuration: Number
  },

  // Investigation and resolution
  investigation: {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedDate: Date,
    findings: String,
    recommendations: [String],
    correctiveActions: [String],
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date
  },

  // Financial impact
  financialImpact: {
    insuranceClaim: {
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'submitted', 'approved', 'rejected', 'paid'],
        default: 'pending'
      },
      claimNumber: String
    },
    repairCosts: Number,
    legalCosts: Number,
    lostRevenue: Number,
    totalCost: Number
  },

  // Regulatory compliance
  regulatoryReporting: {
    reportedToAuthority: {
      type: Boolean,
      default: false
    },
    authorityName: String,
    reportNumber: String,
    reportDate: Date,
    complianceRequired: [String],
    complianceStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'compliant', 'non_compliant'],
      default: 'pending'
    }
  },

  // Evidence and documentation
  evidence: {
    photos: [{
      url: String,
      description: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    videos: [{
      url: String,
      description: String,
      duration: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    documents: [{
      name: String,
      url: String,
      type: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    witnessStatements: [{
      name: String,
      contact: String,
      statement: String,
      recordedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Notifications and alerts
  notifications: {
    sentTo: [{
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      type: {
        type: String,
        enum: ['email', 'sms', 'push', 'system']
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent'
      }
    }],
    escalationLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    }
  },

  // System fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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

// Indexes for efficient querying
IncidentSchema.index({ incidentType: 1, timestamp: -1 });
IncidentSchema.index({ severity: 1, status: 1 });
IncidentSchema.index({ vehicle: 1, timestamp: -1 });
IncidentSchema.index({ driver: 1, timestamp: -1 });
IncidentSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
IncidentSchema.index({ status: 1, severity: 1 });

// Pre-save middleware to update the updatedAt field
IncidentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate total financial impact
IncidentSchema.methods.calculateTotalCost = function() {
  const { financialImpact } = this;
  return (financialImpact.repairCosts || 0) + 
         (financialImpact.legalCosts || 0) + 
         (financialImpact.lostRevenue || 0);
};

// Method to check if incident requires immediate attention
IncidentSchema.methods.requiresImmediateAttention = function() {
  return this.severity === 'critical' || 
         this.severity === 'high' || 
         this.details?.injuries > 0 || 
         this.details?.fatalities > 0;
};

// Method to get incident summary
IncidentSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.incidentType,
    severity: this.severity,
    status: this.status,
    timestamp: this.timestamp,
    location: this.location,
    description: this.description.substring(0, 100) + '...',
    requiresAttention: this.requiresImmediateAttention()
  };
};

// Static method to get incident statistics
IncidentSchema.statics.getStatistics = async function(timeRange = 'month') {
  const dateFilter = getDateFilter(timeRange);
  
  const stats = await this.aggregate([
    { $match: { timestamp: dateFilter } },
    {
      $group: {
        _id: null,
        totalIncidents: { $sum: 1 },
        criticalIncidents: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highSeverityIncidents: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        resolvedIncidents: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        totalInjuries: { $sum: '$details.injuries' },
        totalFatalities: { $sum: '$details.fatalities' },
        totalPropertyDamage: { $sum: '$details.propertyDamage.estimated' }
      }
    }
  ]);

  return stats[0] || {
    totalIncidents: 0,
    criticalIncidents: 0,
    highSeverityIncidents: 0,
    resolvedIncidents: 0,
    totalInjuries: 0,
    totalFatalities: 0,
    totalPropertyDamage: 0
  };
};

function getDateFilter(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case 'day':
      return { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
    case 'week':
      return { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    case 'month':
      return { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    case 'quarter':
      return { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
    case 'year':
      return { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
    default:
      return { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  }
}

module.exports = mongoose.model('Incident', IncidentSchema); 