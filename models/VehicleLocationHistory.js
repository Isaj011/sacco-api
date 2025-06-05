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
  },
  speed: Number,    // Optional: can be calculated or stored
  heading: Number,  // Optional: direction in degrees
  // Optionally add routeId, driverId, etc.
});

vehicleLocationHistorySchema.index({ vehicleId: 1, timestamp: -1 }); // For fast lookups

module.exports = mongoose.model('VehicleLocationHistory', vehicleLocationHistorySchema); 