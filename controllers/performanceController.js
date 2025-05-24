const Performance = require('../models/Performance');

// @desc    Get all performances
// @route   GET /api/performances
// @access  Public
exports.getPerformances = async (req, res) => {
  try {
    const performances = await Performance.find();
    res.status(200).json({ success: true, count: performances.length, data: performances });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single performance
// @route   GET /api/performances/:id
// @access  Public
exports.getPerformance = async (req, res) => {
  try {
    const performance = await Performance.findById(req.params.id);
    if (!performance) return res.status(404).json({ success: false, error: 'Performance not found' });
    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Create new performance
// @route   POST /api/performances
// @access  Private
exports.createPerformance = async (req, res) => {
  try {
    const performance = await Performance.create(req.body);
    res.status(201).json({ success: true, data: performance });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update performance
// @route   PUT /api/performances/:id
// @access  Private
exports.updatePerformance = async (req, res) => {
  try {
    const performance = await Performance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!performance) return res.status(404).json({ success: false, error: 'Performance not found' });
    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete performance
// @route   DELETE /api/performances/:id
// @access  Private
exports.deletePerformance = async (req, res) => {
  try {
    const performance = await Performance.findById(req.params.id);
    if (!performance) return res.status(404).json({ success: false, error: 'Performance not found' });
    await performance.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
}; 