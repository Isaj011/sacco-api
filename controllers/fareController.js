const Fare = require('../models/Fare');

// @desc    Get all fares
// @route   GET /api/fares
// @access  Public
exports.getFares = async (req, res) => {
  try {
    const fares = await Fare.find();
    res.status(200).json({
      success: true,
      count: fares.length,
      data: fares
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single fare
// @route   GET /api/fares/:id
// @access  Public
exports.getFare = async (req, res) => {
  try {
    const fare = await Fare.findById(req.params.id);
    if (!fare) {
      return res.status(404).json({
        success: false,
        error: 'Fare not found'
      });
    }
    res.status(200).json({
      success: true,
      data: fare
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new fare
// @route   POST /api/fares
// @access  Private
exports.createFare = async (req, res) => {
  try {
    const fare = await Fare.create(req.body);
    res.status(201).json({
      success: true,
      data: fare
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update fare
// @route   PUT /api/fares/:id
// @access  Private
exports.updateFare = async (req, res) => {
  try {
    const fare = await Fare.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!fare) {
      return res.status(404).json({
        success: false,
        error: 'Fare not found'
      });
    }
    res.status(200).json({
      success: true,
      data: fare
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete fare
// @route   DELETE /api/fares/:id
// @access  Private
exports.deleteFare = async (req, res) => {
  try {
    const fare = await Fare.findById(req.params.id);
    if (!fare) {
      return res.status(404).json({
        success: false,
        error: 'Fare not found'
      });
    }
    await fare.remove();
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 