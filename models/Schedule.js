const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: [true, 'Please add start time']
  },
  endTime: {
    type: String,
    required: [true, 'Please add end time']
  },
  frequency: {
    type: Number,
    required: [true, 'Please add frequency in minutes']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Schedule', ScheduleSchema); 