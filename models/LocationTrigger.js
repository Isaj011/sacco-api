const mongoose = require('mongoose');

const LocationTriggerSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  type: {
    type: String,
    enum: [
      'time_based',
      'location_based',
      'speed_based',
      'event_based',
      'condition_based',
      'route_deviation',
      'performance_based',
      'integration_based'
    ],
    required: true
  },
  conditions: {
    // Time-based conditions
    timeBased: {
      interval: {
        type: Number,  // minutes
        default: 15
      },
      timeWindows: {
        peakHours: {
          start: String,  // HH:mm format
          end: String,    // HH:mm format
          updateInterval: Number  // minutes
        },
        offPeak: {
          start: String,
          end: String,
          updateInterval: Number
        },
        night: {
          start: String,
          end: String,
          updateInterval: Number
        }
      }
    },
    // Location-based conditions
    locationBased: {
      geofence: {
        type: {
          type: String,
          enum: ['polygon', 'circle', 'rectangle']
        },
        coordinates: [[Number]],  // Array of [lat, lng] pairs
        radius: Number,  // For circle type
        events: [{
          type: String,
          enum: ['enter', 'exit', 'dwell']
        }]
      },
      distance: {
        threshold: Number,  // meters
        minTimeBetweenUpdates: Number  // seconds
      }
    },
    // Speed-based conditions
    speedBased: {
      thresholds: {
        high: Number,  // km/h
        low: Number,   // km/h
        normal: Number // km/h
      },
      change: {
        percentage: Number,  // % change in speed
        timeWindow: Number   // seconds
      }
    },
    // Event-based conditions
    eventBased: {
      events: {
        tripStart: Boolean,
        tripEnd: Boolean,
        stopArrival: Boolean,
        stopDeparture: Boolean,
        statusChange: Boolean,
        maintenance: Boolean
      }
    },
    // Condition-based triggers
    conditionBased: {
      weather: {
        severe: Boolean,
        moderate: Boolean
      },
      traffic: {
        heavy: Boolean,
        light: Boolean
      },
      vehicle: {
        lowFuel: Boolean,
        maintenance: Boolean,
        error: Boolean
      }
    },
    // Route deviation conditions
    routeDeviation: {
      distance: {
        fromRoute: Number,  // meters
        timeWindow: Number  // seconds
      },
      allowedDeviation: {
        distance: Number,  // meters
        duration: Number   // seconds
      }
    },
    // Performance-based conditions
    performanceBased: {
      metrics: {
        fuelEfficiency: Boolean,
        speedVariation: Boolean,
        idleTime: Boolean,
        stopDuration: Boolean
      },
      thresholds: {
        fuelEfficiency: Number,  // km/l
        idleTime: Number,       // seconds
        stopDuration: Number    // seconds
      }
    },
    // Integration-based conditions
    integrationBased: {
      systems: {
        trafficAPI: Boolean,
        weatherAPI: Boolean,
        maintenanceSystem: Boolean,
        customerApp: Boolean
      },
      updateFrequency: {
        traffic: Number,     // seconds
        weather: Number,     // seconds
        maintenance: Number  // seconds
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTriggered: {
    type: Date,
    default: null
  },
  metadata: {
    description: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    tags: [String]
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
LocationTriggerSchema.index({ vehicle: 1, type: 1 });
LocationTriggerSchema.index({ 'conditions.timeBased.timeWindows.peakHours.start': 1 });
LocationTriggerSchema.index({ isActive: 1 });

module.exports = mongoose.model('LocationTrigger', LocationTriggerSchema); 