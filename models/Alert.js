const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: [
      // Vehicle alerts
      'vehicle_breakdown',
      'maintenance_due',
      'insurance_expiry',
      'route_deviation',
      'speed_violation',
      
      // Driver alerts
      'license_expiry',
      'psv_expiry',
      'medical_expiry',
      
      // Safety alerts
      'safety_incident',
      'compliance_breach',
      
      // Operational alerts
      'route_delay',
      'schedule_conflict',
      'capacity_overflow',
      
      // Financial alerts
      'revenue_target_missed',
      'expense_overbudget',
      
      // Service alerts
      'service_quality_low',
      'customer_complaint'
    ]
  },
  
  severity: {
    type: String,
    required: [true, 'Alert severity is required'],
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  
  title: {
    type: String,
    required: [true, 'Alert title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  
  entityId: {
    type: mongoose.Schema.ObjectId,
    refPath: 'entityType',
    required: [true, 'Entity ID is required']
  },
  
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['vehicle', 'driver', 'incident', 'system', 'financial', 'service']
  },
  
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active'
  },
  
  acknowledged: {
    type: Boolean,
    default: false
  },
  
  acknowledgedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  
  acknowledgedAt: {
    type: Date
  },
  
  resolvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  
  resolvedAt: {
    type: Date
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
AlertSchema.index({ type: 1, status: 1, createdAt: -1 });
AlertSchema.index({ entityId: 1, entityType: 1 });
AlertSchema.index({ severity: 1, status: 1 });
AlertSchema.index({ createdAt: -1 });

// Virtual for time since creation
AlertSchema.virtual('timeSinceCreation').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for time since acknowledgment
AlertSchema.virtual('timeSinceAcknowledgment').get(function() {
  if (!this.acknowledgedAt) return null;
  return Date.now() - this.acknowledgedAt.getTime();
});

// Pre-save middleware to update updatedAt
AlertSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get alerts by filters
AlertSchema.statics.getAlertsByFilters = function(filters = {}) {
  const query = {};
  
  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;
  if (filters.status) query.status = filters.status;
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.entityId) query.entityId = filters.entityId;
  
  if (filters.timeRange) {
    const now = new Date();
    let startDate;
    
    switch (filters.timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
    }
    
    query.createdAt = { $gte: startDate };
  }
  
  return this.find(query)
    .populate('entityId', 'name plateNumber licenseNumber')
    .populate('acknowledgedBy', 'name email')
    .populate('resolvedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to get alert statistics
AlertSchema.statics.getAlertStatistics = function(timeRange = '24h') {
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        bySeverity: {
          $push: {
            severity: '$severity',
            count: 1
          }
        },
        byType: {
          $push: {
            type: '$type',
            count: 1
          }
        },
        byEntityType: {
          $push: {
            entityType: '$entityType',
            count: 1
          }
        },
        byStatus: {
          $push: {
            status: '$status',
            count: 1
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Alert', AlertSchema); 