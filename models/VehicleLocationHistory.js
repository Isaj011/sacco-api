const mongoose = require('mongoose');

const vehicleLocationHistorySchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  location: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    }
  },
  speed: {
    current: Number,
    average: Number,
    max: Number
  },
  heading: Number,  // direction in degrees
  context: {
    // Trigger information
    triggerType: {
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
      ]
    },
    triggerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LocationTrigger'
    },
    // Event information
    events: [{
      type: String,
      enum: [
        'trip_start',
        'trip_end',
        'stop_arrival',
        'stop_departure',
        'status_change',
        'maintenance'
      ]
    }],
    // Environmental conditions
    conditions: {
      weather: {
        condition: String,
        severity: String,
        temperature: Number
      },
      traffic: {
        level: String,
        description: String
      }
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route'
      },
      deviation: {
        distance: Number,
        duration: Number
      }
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['gps', 'manual', 'system'],
      default: 'system'
    },
    accuracy: Number,
    batteryLevel: Number,
    signalStrength: Number
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
vehicleLocationHistorySchema.index({ vehicleId: 1, timestamp: -1 });
vehicleLocationHistorySchema.index({ 'context.triggerType': 1 });
vehicleLocationHistorySchema.index({ 'context.events': 1 });
vehicleLocationHistorySchema.index({ 'metadata.source': 1 });

module.exports = mongoose.model('VehicleLocationHistory', vehicleLocationHistorySchema); 