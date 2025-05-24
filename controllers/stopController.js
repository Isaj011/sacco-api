const Stop = require('../models/Stop');

// @desc    Get all stops
// @route   GET /api/stops
// @access  Public
exports.getStops = async (req, res) => {
  try {
    const stops = await Stop.find();
    res.status(200).json({
      success: true,
      count: stops.length,
      data: stops
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single stop
// @route   GET /api/stops/:id
// @access  Public
exports.getStop = async (req, res) => {
  try {
    const stop = await Stop.findById(req.params.id);
    if (!stop) {
      return res.status(404).json({
        success: false,
        error: 'Stop not found'
      });
    }
    res.status(200).json({
      success: true,
      data: stop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new stop
// @route   POST /api/stops
// @access  Private
exports.createStop = async (req, res) => {
  try {
    const stop = await Stop.create(req.body);
    res.status(201).json({
      success: true,
      data: stop
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

// @desc    Update stop
// @route   PUT /api/stops/:id
// @access  Private
exports.updateStop = async (req, res) => {
  try {
    const stop = await Stop.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!stop) {
      return res.status(404).json({
        success: false,
        error: 'Stop not found'
      });
    }
    res.status(200).json({
      success: true,
      data: stop
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

// @desc    Delete stop
// @route   DELETE /api/stops/:id
// @access  Private
exports.deleteStop = async (req, res) => {
  try {
    const stop = await Stop.findById(req.params.id);
    if (!stop) {
      return res.status(404).json({
        success: false,
        error: 'Stop not found'
      });
    }
    await stop.remove();
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