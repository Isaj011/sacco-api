const mongoose = require('mongoose');

const PassengerFeedbackSchema = new mongoose.Schema({
  // Basic feedback information
  feedbackType: {
    type: String,
    required: [true, 'Feedback type is required'],
    enum: ['rating', 'complaint', 'suggestion', 'compliment', 'general']
  },
  category: {
    type: String,
    required: [true, 'Feedback category is required'],
    enum: [
      'service_quality',
      'punctuality',
      'cleanliness',
      'safety',
      'comfort',
      'driver_behavior',
      'vehicle_condition',
      'route_coverage',
      'pricing',
      'customer_service',
      'other'
    ]
  },

  // Trip information
  trip: {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    tripDate: {
      type: Date,
      required: true
    },
    tripTime: String, // Time of day (morning, afternoon, evening, night)
    tripDuration: Number, // in minutes
    departureLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    arrivalLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    }
  },

  // Rating details
  ratings: {
    overall: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: 1,
      max: 5
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    safety: {
      type: Number,
      min: 1,
      max: 5
    },
    comfort: {
      type: Number,
      min: 1,
      max: 5
    },
    driverBehavior: {
      type: Number,
      min: 1,
      max: 5
    },
    vehicleCondition: {
      type: Number,
      min: 1,
      max: 5
    },
    valueForMoney: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Feedback content
  title: {
    type: String,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Feedback description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  tags: [String], // For categorization and search

  // Passenger information (optional for anonymous feedback)
  passenger: {
    name: String,
    email: String,
    phone: String,
    ageGroup: {
      type: String,
      enum: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    frequency: {
      type: String,
      enum: ['first_time', 'occasional', 'regular', 'daily']
    }
  },

  // Response and resolution
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'in_progress', 'resolved', 'closed'],
    default: 'submitted'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date,
    actionTaken: String,
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date
  },

  // Impact and metrics
  impact: {
    passengerSatisfaction: Number, // Calculated impact on overall satisfaction
    serviceImprovement: Boolean, // Whether feedback led to service improvement
    policyChange: Boolean, // Whether feedback led to policy change
    compensationProvided: {
      type: Boolean,
      default: false
    },
    compensationAmount: Number,
    compensationType: {
      type: String,
      enum: ['refund', 'credit', 'free_ride', 'other']
    }
  },

  // Media attachments
  attachments: {
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
    }]
  },

  // Analytics and tracking
  analytics: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    keywords: [String], // Extracted keywords for analysis
    category: {
      type: String,
      enum: ['operational', 'service', 'safety', 'comfort', 'other']
    },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining']
    }
  },

  // System fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
PassengerFeedbackSchema.index({ feedbackType: 1, createdAt: -1 });
PassengerFeedbackSchema.index({ category: 1, status: 1 });
PassengerFeedbackSchema.index({ 'ratings.overall': 1 });
PassengerFeedbackSchema.index({ 'trip.vehicle': 1, createdAt: -1 });
PassengerFeedbackSchema.index({ 'trip.driver': 1, createdAt: -1 });
PassengerFeedbackSchema.index({ 'analytics.sentiment': 1 });
PassengerFeedbackSchema.index({ status: 1, priority: 1 });

// Pre-save middleware to update the updatedAt field
PassengerFeedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate average rating
PassengerFeedbackSchema.methods.calculateAverageRating = function() {
  const ratings = this.ratings;
  const ratingValues = Object.values(ratings).filter(rating => typeof rating === 'number');
  
  if (ratingValues.length === 0) return 0;
  
  return ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length;
};

// Method to determine sentiment based on ratings
PassengerFeedbackSchema.methods.determineSentiment = function() {
  const avgRating = this.calculateAverageRating();
  
  if (avgRating >= 4) return 'positive';
  if (avgRating >= 3) return 'neutral';
  return 'negative';
};

// Method to get feedback summary
PassengerFeedbackSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.feedbackType,
    category: this.category,
    overallRating: this.ratings.overall,
    sentiment: this.analytics.sentiment,
    status: this.status,
    priority: this.priority,
    createdAt: this.createdAt,
    title: this.title,
    description: this.description.substring(0, 100) + '...'
  };
};

// Static method to get feedback statistics
PassengerFeedbackSchema.statics.getStatistics = async function(timeRange = 'month') {
  const dateFilter = getDateFilter(timeRange);
  
  const stats = await this.aggregate([
    { $match: { createdAt: dateFilter } },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        averageRating: { $avg: '$ratings.overall' },
        positiveFeedback: { $sum: { $cond: [{ $eq: ['$analytics.sentiment', 'positive'] }, 1, 0] } },
        negativeFeedback: { $sum: { $cond: [{ $eq: ['$analytics.sentiment', 'negative'] }, 1, 0] } },
        resolvedFeedback: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        urgentFeedback: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
      }
    }
  ]);

  return stats[0] || {
    totalFeedback: 0,
    averageRating: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    resolvedFeedback: 0,
    urgentFeedback: 0
  };
};

// Static method to get category-wise statistics
PassengerFeedbackSchema.statics.getCategoryStatistics = async function(timeRange = 'month') {
  const dateFilter = getDateFilter(timeRange);
  
  return await this.aggregate([
    { $match: { createdAt: dateFilter } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        averageRating: { $avg: '$ratings.overall' },
        positiveCount: { $sum: { $cond: [{ $eq: ['$analytics.sentiment', 'positive'] }, 1, 0] } },
        negativeCount: { $sum: { $cond: [{ $eq: ['$analytics.sentiment', 'negative'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
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

module.exports = mongoose.model('PassengerFeedback', PassengerFeedbackSchema); 