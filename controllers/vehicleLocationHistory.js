const VehicleLocationHistory = require('../models/VehicleLocationHistory');
const Vehicle = require('../models/Vehicle');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get vehicle location history with filters
// @route   GET /api/v1/vehicle-location-history
// @access  Private
exports.getVehicleLocationHistory = asyncHandler(async (req, res, next) => {
  const { 
    vehicleId, 
    startDate, 
    endDate, 
    limit = 50, 
    triggerType,
    events,
    weather,
    traffic,
    source 
  } = req.query;
  
  let query = {};
  
  // Vehicle filter
  if (vehicleId) query.vehicleId = vehicleId;
  
  // Date range filter
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  // Trigger type filter
  if (triggerType) query['context.triggerType'] = triggerType;
  
  // Events filter
  if (events) {
    const eventArray = events.split(',');
    query['context.events'] = { $in: eventArray };
  }
  
  // Weather filter
  if (weather) query['context.conditions.weather.condition'] = weather;
  
  // Traffic filter
  if (traffic) query['context.conditions.traffic.level'] = traffic;
  
  // Source filter
  if (source) query['metadata.source'] = source;
  
  const history = await VehicleLocationHistory.find(query)
    .populate('vehicleId', 'plateNumber vehicleModel')
    .populate('context.triggerId', 'name type')
    .populate('context.route.routeId', 'routeName routeNumber')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));
    
  res.status(200).json({
    success: true,
    count: history.length,
    data: history
  });
});

// @desc    Get vehicle location history by vehicle ID
// @route   GET /api/v1/vehicle-location-history/vehicle/:vehicleId
// @access  Private
exports.getVehicleLocationHistoryByVehicle = asyncHandler(async (req, res, next) => {
  const { limit = 100, days = 7, includeContext = 'true' } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  
  let projection = {};
  if (includeContext === 'false') {
    projection = {
      vehicleId: 1,
      timestamp: 1,
      location: 1,
      speed: 1,
      heading: 1
    };
  }
  
  const history = await VehicleLocationHistory.find({
    vehicleId: req.params.vehicleId,
    timestamp: { $gte: startDate }
  })
  .select(projection)
  .populate('context.triggerId', 'name type')
  .populate('context.route.routeId', 'routeName routeNumber')
  .sort({ timestamp: -1 })
  .limit(parseInt(limit));
  
  res.status(200).json({
    success: true,
    count: history.length,
    data: history
  });
});

// @desc    Get location history analytics for Kenya Sacco operations
// @route   GET /api/v1/vehicle-location-history/analytics
// @access  Private
exports.getLocationHistoryAnalytics = asyncHandler(async (req, res, next) => {
  const { vehicleId, days = 30, groupBy = 'day' } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  
  let matchQuery = { timestamp: { $gte: startDate } };
  if (vehicleId) matchQuery.vehicleId = vehicleId;
  
  let groupFormat = '%Y-%m-%d';
  if (groupBy === 'hour') groupFormat = '%Y-%m-%d-%H';
  if (groupBy === 'week') groupFormat = '%Y-%U';
  if (groupBy === 'month') groupFormat = '%Y-%m';
  
  const analytics = await VehicleLocationHistory.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          vehicleId: '$vehicleId',
          date: { $dateToString: { format: groupFormat, date: '$timestamp' } }
        },
        totalEntries: { $sum: 1 },
        avgSpeed: { $avg: '$speed.current' },
        maxSpeed: { $max: '$speed.current' },
        minSpeed: { $min: '$speed.current' },
        totalTriggers: {
          $sum: { $cond: [{ $ne: ['$context.triggerType', null] }, 1, 0] }
        },
        avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
        avgBatteryLevel: { $avg: '$metadata.batteryLevel' },
        avgSignalStrength: { $avg: '$metadata.signalStrength' },
        totalIdleTime: { $sum: '$context.performance.idleTime' },
        totalStopDuration: { $sum: '$context.performance.stopDuration' },
        weatherConditions: { $addToSet: '$context.conditions.weather.condition' },
        trafficLevels: { $addToSet: '$context.conditions.traffic.level' },
        events: { $addToSet: '$context.events' }
      }
    },
    { $sort: { '_id.date': -1 } }
  ]);
  
  res.status(200).json({
    success: true,
    data: analytics
  });
});

// @desc    Get real-time vehicle status with latest location
// @route   GET /api/v1/vehicle-location-history/realtime
// @access  Private
exports.getRealTimeVehicleStatus = asyncHandler(async (req, res, next) => {
  const { vehicleIds } = req.query;
  
  let matchQuery = {};
  if (vehicleIds) {
    const vehicleIdArray = vehicleIds.split(',');
    matchQuery.vehicleId = { $in: vehicleIdArray };
  }
  
  // Get latest entry for each vehicle
  const realTimeData = await VehicleLocationHistory.aggregate([
    { $match: matchQuery },
    {
      $sort: { timestamp: -1 }
    },
    {
      $group: {
        _id: '$vehicleId',
        latestEntry: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestEntry' }
    },
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicleId',
        foreignField: '_id',
        as: 'vehicle'
      }
    },
    {
      $unwind: '$vehicle'
    },
    {
      $project: {
        vehicleId: 1,
        timestamp: 1,
        location: 1,
        speed: 1,
        heading: 1,
        context: 1,
        metadata: 1,
        'vehicle.plateNumber': 1,
        'vehicle.vehicleModel': 1,
        'vehicle.status': 1,
        'vehicle.currentDriver': 1
      }
    }
  ]);
  
  res.status(200).json({
    success: true,
    count: realTimeData.length,
    data: realTimeData
  });
});

// @desc    Get trigger alerts history
// @route   GET /api/v1/vehicle-location-history/triggers
// @access  Private
exports.getTriggerAlertsHistory = asyncHandler(async (req, res, next) => {
  const { vehicleId, triggerType, days = 7, limit = 50 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  
  let query = {
    'context.triggerType': { $ne: null },
    timestamp: { $gte: startDate }
  };
  
  if (vehicleId) query.vehicleId = vehicleId;
  if (triggerType) query['context.triggerType'] = triggerType;
  
  const triggers = await VehicleLocationHistory.find(query)
    .populate('vehicleId', 'plateNumber vehicleModel')
    .populate('context.triggerId', 'name type conditions')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));
  
  res.status(200).json({
    success: true,
    count: triggers.length,
    data: triggers
  });
});

// @desc    Get performance metrics for Kenya Sacco compliance
// @route   GET /api/v1/vehicle-location-history/performance
// @access  Private
exports.getPerformanceMetrics = asyncHandler(async (req, res, next) => {
  const { vehicleId, days = 30 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  
  let matchQuery = { timestamp: { $gte: startDate } };
  if (vehicleId) matchQuery.vehicleId = vehicleId;
  
  const performance = await VehicleLocationHistory.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$vehicleId',
        totalDistance: { $sum: { $multiply: ['$speed.current', 0.00833] } }, // km per 30 seconds
        avgSpeed: { $avg: '$speed.current' },
        maxSpeed: { $max: '$speed.current' },
        avgFuelEfficiency: { $avg: '$context.performance.fuelEfficiency' },
        totalIdleTime: { $sum: '$context.performance.idleTime' },
        totalStopDuration: { $sum: '$context.performance.stopDuration' },
        avgBatteryLevel: { $avg: '$metadata.batteryLevel' },
        avgSignalStrength: { $avg: '$metadata.signalStrength' },
        speedViolations: {
          $sum: { $cond: [{ $gt: ['$speed.current', 80] }, 1, 0] } // Count speeds > 80 km/h
        },
        routeDeviations: {
          $sum: { $cond: [{ $gt: ['$context.route.deviation.distance', 100] }, 1, 0] } // Count deviations > 100m
        },
        weatherConditions: { $addToSet: '$context.conditions.weather.condition' },
        trafficLevels: { $addToSet: '$context.conditions.traffic.level' }
      }
    },
    {
      $lookup: {
        from: 'vehicles',
        localField: '_id',
        foreignField: '_id',
        as: 'vehicle'
      }
    },
    {
      $unwind: '$vehicle'
    },
    {
      $project: {
        vehicleId: '$_id',
        plateNumber: '$vehicle.plateNumber',
        vehicleModel: '$vehicle.vehicleModel',
        totalDistance: { $round: ['$totalDistance', 2] },
        avgSpeed: { $round: ['$avgSpeed', 2] },
        maxSpeed: { $round: ['$maxSpeed', 2] },
        avgFuelEfficiency: { $round: ['$avgFuelEfficiency', 2] },
        totalIdleTime: { $round: ['$totalIdleTime', 2] },
        totalStopDuration: { $round: ['$totalStopDuration', 2] },
        avgBatteryLevel: { $round: ['$avgBatteryLevel', 2] },
        avgSignalStrength: { $round: ['$avgSignalStrength', 2] },
        speedViolations: 1,
        routeDeviations: 1,
        weatherConditions: 1,
        trafficLevels: 1
      }
    }
  ]);
  
  res.status(200).json({
    success: true,
    count: performance.length,
    data: performance
  });
}); 