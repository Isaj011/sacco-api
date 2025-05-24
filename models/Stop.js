const mongoose = require('mongoose');

const StopSchema = new mongoose.Schema({
  stopId: {
    type: String,
    required: [true, 'Please add a stop ID'],
    unique: true,
    trim: true
  },
  stopName: {
    type: String,
    required: [true, 'Please add a stop name'],
    trim: true
  },
  stopOrder: {
    type: Number,
    required: [true, 'Please add stop order']
  },
  estimatedTime: {
    type: String, // ISO 8601 format
    required: [true, 'Please add estimated time']
  },
  coordinates: {
    latitude: {
      type: Number,
      required: [true, 'Please add latitude']
    },
    longitude: {
      type: Number,
      required: [true, 'Please add longitude']
    }
  },
  isTerminal: {
    type: Boolean,
    default: false
  },
  isDestination: {
    type: Boolean,
    default: false
  },
  waitingTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Stop', StopSchema); 