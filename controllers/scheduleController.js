const Schedule = require('../models/Schedule');

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Public
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find();
    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single schedule
// @route   GET /api/schedules/:id
// @access  Public
exports.getSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private
exports.createSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.create(req.body);
    res.status(201).json({
      success: true,
      data: schedule
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

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private
exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }
    res.status(200).json({
      success: true,
      data: schedule
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

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }
    await schedule.remove();
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