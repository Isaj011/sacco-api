const mongoose = require('mongoose');

const FareSchema = new mongoose.Schema({
  baseFare: {
    type: Number,
    required: [true, 'Please add base fare']
  },
  distanceFare: {
    type: Number,
    required: [true, 'Please add distance fare']
  },
  peakHourMultiplier: {
    type: Number,
    default: 1.0
  },
  discountPercentage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Fare', FareSchema); 