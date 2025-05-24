const mongoose = require('mongoose');

const AssignedVehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  plateNumber: {
    type: String,
    required: [true, 'Please add plate number'],
    unique: true,
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Please add vehicle model']
  },
  driverName: {
    type: String,
    required: [true, 'Please add driver name']
  },
  seatingCapacity: {
    type: Number,
    required: [true, 'Please add seating capacity']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AssignedVehicle', AssignedVehicleSchema); 