const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  averageSpeed: {
    type: Number,
    default: 0
  },
  onTimePercentage: {
    type: Number,
    default: 0
  },
  passengerSatisfaction: {
    type: Number,
    default: 0
  },
  totalTrips: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Performance', PerformanceSchema); 