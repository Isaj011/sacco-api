const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const alertService = require('../services/alertService');
const Alert = require('../models/Alert');

// @desc      Get all alerts with pagination and filters
// @route     GET  /api/v1/alerts
// @access    Private
exports.getAlerts = asyncHandler(async (req, res, next) => {
  const { status, type, severity, entityType, page = 1, limit = 50, timeRange } = req.query;
  
  const filters = {};
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (severity) filters.severity = severity;
  if (entityType) filters.entityType = entityType;
  if (timeRange) filters.timeRange = timeRange;

  const result = await alertService.getAlerts(filters, parseInt(page), parseInt(limit));

  res.status(200).json({
    success: true,
    data: result.alerts,
    pagination: result.pagination,
    filters
  });
});

// @desc      Get alert by ID
// @route     GET  /api/v1/alerts/:id
// @access    Private
exports.getAlert = asyncHandler(async (req, res, next) => {
  const alert = await Alert.findById(req.params.id)
    .populate('entityId', 'name plateNumber licenseNumber')
    .populate('acknowledgedBy', 'name email')
    .populate('resolvedBy', 'name email');

  if (!alert) {
    return next(new ErrorResponse(`Alert not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: alert
  });
});

// @desc      Acknowledge an alert
// @route     PUT  /api/v1/alerts/:id/acknowledge
// @access    Private
exports.acknowledgeAlert = asyncHandler(async (req, res, next) => {
  const acknowledgedBy = req.user.id;
  
  const result = await alertService.acknowledgeAlert(req.params.id, acknowledgedBy);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Alert acknowledged successfully'
  });
});

// @desc      Resolve an alert
// @route     PUT  /api/v1/alerts/:id/resolve
// @access    Private
exports.resolveAlert = asyncHandler(async (req, res, next) => {
  const resolvedBy = req.user.id;
  
  const result = await alertService.resolveAlert(req.params.id, resolvedBy);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Alert resolved successfully'
  });
});

// @desc      Dismiss an alert
// @route     PUT  /api/v1/alerts/:id/dismiss
// @access    Private
exports.dismissAlert = asyncHandler(async (req, res, next) => {
  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    return next(new ErrorResponse(`Alert not found with id of ${req.params.id}`, 404));
  }

  alert.status = 'dismissed';
  alert.updatedAt = new Date();
  await alert.save();

  res.status(200).json({
    success: true,
    data: alert,
    message: 'Alert dismissed successfully'
  });
});

// @desc      Get alert statistics
// @route     GET  /api/v1/alerts/stats
// @access    Private
exports.getAlertStatistics = asyncHandler(async (req, res, next) => {
  const { timeRange = '24h' } = req.query;
  
  const stats = await alertService.getAlertStatistics(timeRange);

  res.status(200).json({
    success: true,
    data: stats,
    timeRange
  });
});

// @desc      Get alerts by type
// @route     GET  /api/v1/alerts/type/:type
// @access    Private
exports.getAlertsByType = asyncHandler(async (req, res, next) => {
  const alerts = await alertService.getAlertsByType(req.params.type);

  res.status(200).json({
    success: true,
    data: alerts,
    type: req.params.type,
    count: alerts.length
  });
});

// @desc      Get alerts by severity
// @route     GET  /api/v1/alerts/severity/:severity
// @access    Private
exports.getAlertsBySeverity = asyncHandler(async (req, res, next) => {
  const alerts = await alertService.getAlertsBySeverity(req.params.severity);

  res.status(200).json({
    success: true,
    data: alerts,
    severity: req.params.severity,
    count: alerts.length
  });
});

// @desc      Get active alerts
// @route     GET  /api/v1/alerts/active
// @access    Private
exports.getActiveAlerts = asyncHandler(async (req, res, next) => {
  const alerts = await alertService.getActiveAlerts();

  res.status(200).json({
    success: true,
    data: alerts,
    count: alerts.length
  });
});

// @desc      Generate new alerts
// @route     POST  /api/v1/alerts/generate
// @access    Private
exports.generateAlerts = asyncHandler(async (req, res, next) => {
  const alerts = await alertService.generateAllAlerts();

  res.status(200).json({
    success: true,
    data: alerts,
    message: `Generated ${alerts.length} alerts`,
    count: alerts.length
  });
});

// @desc      Delete an alert
// @route     DELETE  /api/v1/alerts/:id
// @access    Private
exports.deleteAlert = asyncHandler(async (req, res, next) => {
  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    return next(new ErrorResponse(`Alert not found with id of ${req.params.id}`, 404));
  }

  await alert.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
    message: 'Alert deleted successfully'
  });
});

// @desc      Bulk acknowledge alerts
// @route     PUT  /api/v1/alerts/bulk/acknowledge
// @access    Private
exports.bulkAcknowledgeAlerts = asyncHandler(async (req, res, next) => {
  const { alertIds } = req.body;
  const acknowledgedBy = req.user.id;

  if (!alertIds || !Array.isArray(alertIds)) {
    return next(new ErrorResponse('Alert IDs array is required', 400));
  }

  const results = [];
  for (const alertId of alertIds) {
    try {
      const result = await alertService.acknowledgeAlert(alertId, acknowledgedBy);
      results.push({ id: alertId, success: true, data: result });
    } catch (error) {
      results.push({ id: alertId, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  res.status(200).json({
    success: true,
    data: results,
    message: `Acknowledged ${successCount} alerts, ${failureCount} failed`,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failureCount
    }
  });
});

// @desc      Get alert trends
// @route     GET  /api/v1/alerts/trends
// @access    Private
exports.getAlertTrends = asyncHandler(async (req, res, next) => {
  const { timeRange = '7d' } = req.query;
  
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const trends = await Alert.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          type: '$type',
          severity: '$severity'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);

  // Process trends data
  const processedTrends = {
    daily: {},
    byType: {},
    bySeverity: {}
  };

  trends.forEach(trend => {
    const date = trend._id.date;
    const type = trend._id.type;
    const severity = trend._id.severity;
    const count = trend.count;

    // Daily trends
    if (!processedTrends.daily[date]) {
      processedTrends.daily[date] = 0;
    }
    processedTrends.daily[date] += count;

    // Type trends
    if (!processedTrends.byType[type]) {
      processedTrends.byType[type] = {};
    }
    if (!processedTrends.byType[type][date]) {
      processedTrends.byType[type][date] = 0;
    }
    processedTrends.byType[type][date] += count;

    // Severity trends
    if (!processedTrends.bySeverity[severity]) {
      processedTrends.bySeverity[severity] = {};
    }
    if (!processedTrends.bySeverity[severity][date]) {
      processedTrends.bySeverity[severity][date] = 0;
    }
    processedTrends.bySeverity[severity][date] += count;
  });

  res.status(200).json({
    success: true,
    data: processedTrends,
    timeRange
  });
}); 