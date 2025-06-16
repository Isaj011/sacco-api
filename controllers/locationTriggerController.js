const LocationTrigger = require('../models/LocationTrigger');
const LocationTriggerService = require('../services/locationTriggerService');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Create new location trigger
// @route   POST /api/v1/vehicles/:vehicleId/triggers
// @access  Private/Admin
exports.createTrigger = asyncHandler(async (req, res, next) => {
  req.body.vehicle = req.params.vehicleId;
  req.body.createdBy = req.user.id;

  const trigger = await LocationTrigger.create(req.body);

  res.status(201).json({
    success: true,
    data: trigger
  });
});

// @desc    Get all triggers for a vehicle
// @route   GET /api/v1/vehicles/:vehicleId/triggers
// @access  Private
exports.getTriggers = asyncHandler(async (req, res, next) => {
  const triggers = await LocationTrigger.find({ vehicle: req.params.vehicleId });

  res.status(200).json({
    success: true,
    count: triggers.length,
    data: triggers
  });
});

// @desc    Get single trigger
// @route   GET /api/v1/triggers/:id
// @access  Private
exports.getTrigger = asyncHandler(async (req, res, next) => {
  const trigger = await LocationTrigger.findById(req.params.id);

  if (!trigger) {
    return next(
      new ErrorResponse(`Trigger not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: trigger
  });
});

// @desc    Update trigger
// @route   PUT /api/v1/triggers/:id
// @access  Private/Admin
exports.updateTrigger = asyncHandler(async (req, res, next) => {
  let trigger = await LocationTrigger.findById(req.params.id);

  if (!trigger) {
    return next(
      new ErrorResponse(`Trigger not found with id of ${req.params.id}`, 404)
    );
  }

  trigger = await LocationTrigger.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: trigger
  });
});

// @desc    Delete trigger
// @route   DELETE /api/v1/triggers/:id
// @access  Private/Admin
exports.deleteTrigger = asyncHandler(async (req, res, next) => {
  const trigger = await LocationTrigger.findById(req.params.id);

  if (!trigger) {
    return next(
      new ErrorResponse(`Trigger not found with id of ${req.params.id}`, 404)
    );
  }

  await trigger.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update vehicle location and check triggers
// @route   POST /api/v1/vehicles/:vehicleId/location
// @access  Private
exports.updateLocation = asyncHandler(async (req, res, next) => {
  const { latitude, longitude } = req.body;
  const context = req.body.context || {};

  const currentLocation = {
    latitude,
    longitude,
    updatedAt: new Date()
  };

  const { activatedTriggers, historyEntries } = await LocationTriggerService.checkTrigger(
    req.params.vehicleId,
    currentLocation,
    context
  );

  res.status(200).json({
    success: true,
    data: {
      location: currentLocation,
      activatedTriggers: activatedTriggers.map(trigger => ({
        id: trigger._id,
        type: trigger.type,
        conditions: trigger.conditions,
        lastTriggered: trigger.lastTriggered
      })),
      historyEntries: historyEntries.map(entry => ({
        id: entry._id,
        timestamp: entry.timestamp,
        location: entry.location,
        context: entry.context
      }))
    }
  });
});

// @desc    Get all triggers in system (Development only)
// @route   GET /api/v1/triggers
// @access  Private/Admin
exports.getAllTriggers = asyncHandler(async (req, res, next) => {
  const triggers = await LocationTrigger.find()
    .populate('vehicle', 'plateNumber model')
    .populate('createdBy', 'name email');

  // Get trigger statistics
  const stats = {
    total: triggers.length,
    active: triggers.filter(t => t.isActive).length,
    byType: triggers.reduce((acc, trigger) => {
      acc[trigger.type] = (acc[trigger.type] || 0) + 1;
      return acc;
    }, {}),
    lastTriggered: triggers
      .filter(t => t.lastTriggered)
      .sort((a, b) => b.lastTriggered - a.lastTriggered)
      .slice(0, 5)
      .map(t => ({
        id: t._id,
        vehicle: t.vehicle.plateNumber,
        type: t.type,
        lastTriggered: t.lastTriggered
      }))
  };

  res.status(200).json({
    success: true,
    count: triggers.length,
    stats,
    data: triggers
  });
}); 