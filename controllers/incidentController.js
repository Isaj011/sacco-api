const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Incident = require('../models/Incident');

// @desc      Get all incidents with pagination and filters
// @route     GET /api/v1/incidents
// @access    Private
exports.getIncidents = asyncHandler(async (req, res, next) => {
  const { status, severity, vehicleId, driverId, page = 1, limit = 50 } = req.query;

  const filters = {};
  if (status)    filters.status   = status;
  if (severity)  filters.severity = severity;
  if (vehicleId) filters.vehicle  = vehicleId;
  if (driverId)  filters.driver   = driverId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Incident.countDocuments(filters);

  const incidents = await Incident.find(filters)
    .populate('vehicle', 'plateNumber vehicleModel')
    .populate('driver',  'driverName')
    .populate('route',   'name code')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: incidents.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: incidents,
    filters
  });
});

// @desc      Get single incident
// @route     GET /api/v1/incidents/:id
// @access    Private
exports.getIncident = asyncHandler(async (req, res, next) => {
  const incident = await Incident.findById(req.params.id)
    .populate('vehicle', 'plateNumber vehicleModel')
    .populate('driver',  'driverName')
    .populate('route',   'name code')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('investigation.assignedTo', 'name email');

  if (!incident) {
    return next(new ErrorResponse(`Incident not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: incident
  });
});

// @desc      Create new incident
// @route     POST /api/v1/incidents
// @access    Private
exports.createIncident = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user._id;

  const incident = await Incident.create(req.body);

  res.status(201).json({
    success: true,
    data: incident,
    message: 'Incident created successfully'
  });
});

// @desc      Update incident
// @route     PUT /api/v1/incidents/:id
// @access    Private
exports.updateIncident = asyncHandler(async (req, res, next) => {
  let incident = await Incident.findById(req.params.id);

  if (!incident) {
    return next(new ErrorResponse(`Incident not found with id of ${req.params.id}`, 404));
  }

  req.body.updatedBy = req.user._id;

  incident = await Incident.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: incident,
    message: 'Incident updated successfully'
  });
});

// @desc      Update incident status
// @route     PATCH /api/v1/incidents/:id/status
// @access    Private
exports.updateIncidentStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  const validStatuses = ['reported', 'investigating', 'resolved', 'closed'];
  if (!status) {
    return next(new ErrorResponse('Status field is required', 400));
  }
  if (!validStatuses.includes(status)) {
    return next(
      new ErrorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400
      )
    );
  }

  const incident = await Incident.findById(req.params.id);

  if (!incident) {
    return next(new ErrorResponse(`Incident not found with id of ${req.params.id}`, 404));
  }

  incident.status    = status;
  incident.updatedBy = req.user._id;
  await incident.save();

  res.status(200).json({
    success: true,
    data: incident,
    message: `Incident status updated to '${status}'`
  });
});

// @desc      Delete incident
// @route     DELETE /api/v1/incidents/:id
// @access    Private/Admin
exports.deleteIncident = asyncHandler(async (req, res, next) => {
  const incident = await Incident.findById(req.params.id);

  if (!incident) {
    return next(new ErrorResponse(`Incident not found with id of ${req.params.id}`, 404));
  }

  await incident.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
    message: 'Incident deleted successfully'
  });
});

// @desc      Get incident statistics for dashboard
// @route     GET /api/v1/incidents/stats
// @access    Private
exports.getIncidentStats = asyncHandler(async (req, res, next) => {
  const stats = await Incident.aggregate([
    {
      $facet: {
        bySeverity: [
          {
            $group: {
              _id: '$severity',
              count: { $sum: 1 }
            }
          }
        ],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        total: [
          { $count: 'count' }
        ]
      }
    }
  ]);

  const result = stats[0];

  // Build bySeverity map with all enum values defaulting to 0
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  result.bySeverity.forEach(({ _id, count }) => {
    if (_id) bySeverity[_id] = count;
  });

  // Build byStatus map with all enum values defaulting to 0
  const byStatus = { reported: 0, investigating: 0, resolved: 0, closed: 0 };
  result.byStatus.forEach(({ _id, count }) => {
    if (_id) byStatus[_id] = count;
  });

  const total = result.total.length > 0 ? result.total[0].count : 0;

  res.status(200).json({
    success: true,
    data: {
      total,
      bySeverity,
      byStatus,
      critical: bySeverity.critical,
      underInvestigation: byStatus.investigating,
      resolved: byStatus.resolved
    }
  });
});
