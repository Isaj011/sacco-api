const AssignedVehicle = require('../models/AssignedVehicle');

// @desc    Get all assigned vehicles
// @route   GET /api/assigned-vehicles
// @access  Public
exports.getAssignedVehicles = async (req, res) => {
  try {
    const vehicles = await AssignedVehicle.find();
    res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single assigned vehicle
// @route   GET /api/assigned-vehicles/:id
// @access  Public
exports.getAssignedVehicle = async (req, res) => {
  try {
    const vehicle = await AssignedVehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Assigned vehicle not found' });
    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Create new assigned vehicle
// @route   POST /api/assigned-vehicles
// @access  Private
exports.createAssignedVehicle = async (req, res) => {
  try {
    const vehicle = await AssignedVehicle.create(req.body);
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update assigned vehicle
// @route   PUT /api/assigned-vehicles/:id
// @access  Private
exports.updateAssignedVehicle = async (req, res) => {
  try {
    const vehicle = await AssignedVehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ success: false, error: 'Assigned vehicle not found' });
    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete assigned vehicle
// @route   DELETE /api/assigned-vehicles/:id
// @access  Private
exports.deleteAssignedVehicle = async (req, res) => {
  try {
    const vehicle = await AssignedVehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Assigned vehicle not found' });
    await vehicle.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
}; 