const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const ComplianceProfile = require('../models/ComplianceProfile');
const Alert = require('../models/Alert');
const platformEventService = require('../services/platformEventService');
const complianceMonitoringJob = require('../jobs/complianceMonitoringJob');

// ─────────────────────────────────────────────────────────────────────────────
// Compliance overview
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Platform-wide compliance summary — counts by status for all domains
 * @route   GET /api/v1/monitoring/compliance
 * @access  Private (admin)
 */
exports.getComplianceSummary = asyncHandler(async (req, res) => {
  const domains = ['sacco', 'school', 'delivery'];

  const [domainSummaries, platformCounts] = await Promise.all([
    Promise.all(
      domains.map(async (domain) => {
        const counts = await ComplianceProfile.aggregate([
          { $match: { domain } },
          { $group: { _id: '$complianceStatus', count: { $sum: 1 } } }
        ]);
        const byStatus = Object.fromEntries(counts.map(c => [c._id, c.count]));
        const total = counts.reduce((sum, c) => sum + c.count, 0);
        return { domain, total, byStatus };
      })
    ),
    ComplianceProfile.aggregate([
      { $group: { _id: '$complianceStatus', count: { $sum: 1 } } }
    ])
  ]);

  const platformTotal     = platformCounts.reduce((s, c) => s + c.count, 0);
  const compliantCount    = platformCounts.find(c => c._id === 'compliant')?.count ?? 0;
  const nonCompliantCount = platformCounts.reduce((s, c) =>
    ['non_compliant', 'suspended'].includes(c._id) ? s + c.count : s, 0);
  const score = platformTotal > 0 ? Math.round((compliantCount / platformTotal) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      score,
      nonCompliant: nonCompliantCount,
      total: platformTotal,
      domains: domainSummaries,
    }
  });
});

/**
 * @desc    Domain-specific compliance overview with at-risk entities
 * @route   GET /api/v1/monitoring/compliance/:domain
 * @access  Private (admin)
 */
exports.getDomainCompliance = asyncHandler(async (req, res, next) => {
  const { domain } = req.params;
  const validDomains = ['sacco', 'school', 'delivery'];

  if (!validDomains.includes(domain)) {
    return next(new ErrorResponse(`Invalid domain: ${domain}`, 400));
  }

  // Status distribution
  const statusCounts = await ComplianceProfile.aggregate([
    { $match: { domain } },
    { $group: { _id: { entityType: '$entityType', status: '$complianceStatus' }, count: { $sum: 1 } } }
  ]);

  // Non-compliant + suspended entities — most urgent
  const nonCompliant = await ComplianceProfile
    .find({
      domain,
      complianceStatus: { $in: ['non_compliant', 'suspended'] }
    })
    .select('entityId entityType complianceScore complianceStatus activeIssues lastChecked')
    .sort({ complianceScore: 1 })
    .limit(20);

  // Expiring documents in next 7 days
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = await ComplianceProfile.find({
    domain,
    'documents.expiryDate': { $lte: sevenDays, $gte: new Date() }
  })
    .select('entityId entityType documents')
    .limit(20);

  // items: full list for the domain, ordered worst-first (for the compliance table)
  const items = await ComplianceProfile
    .find({ domain })
    .select('entityId entityType complianceScore complianceStatus activeIssues lastChecked')
    .sort({ complianceScore: 1 })
    .limit(100);

  res.status(200).json({
    success: true,
    domain,
    data: { statusCounts, nonCompliant, expiringSoon, items }
  });
});

/**
 * @desc    Get compliance profile for a single entity
 * @route   GET /api/v1/monitoring/compliance/entity/:entityId
 * @access  Private
 */
exports.getEntityCompliance = asyncHandler(async (req, res, next) => {
  const profile = await ComplianceProfile
    .findOne({ entityId: req.params.entityId });

  if (!profile) {
    return next(new ErrorResponse('Compliance profile not found', 404));
  }

  res.status(200).json({ success: true, data: profile });
});

// ─────────────────────────────────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Active alerts — filterable by severity, domain (via entityType), type
 * @route   GET /api/v1/monitoring/alerts
 * @access  Private
 */
exports.getAlerts = asyncHandler(async (req, res) => {
  const { severity, type, status = 'active', limit = 50 } = req.query;

  const query = {};
  if (severity) query.severity = severity;
  if (type)     query.type     = type;
  if (status)   query.status   = status;

  const alerts = await Alert
    .find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.status(200).json({ success: true, count: alerts.length, data: alerts });
});

/**
 * @desc    Acknowledge an alert
 * @route   PATCH /api/v1/monitoring/alerts/:id/acknowledge
 * @access  Private
 */
exports.acknowledgeAlert = asyncHandler(async (req, res, next) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) return next(new ErrorResponse('Alert not found', 404));

  alert.acknowledged   = true;
  alert.acknowledgedBy = req.user.id;
  alert.acknowledgedAt = new Date();
  alert.status         = 'acknowledged';
  await alert.save();

  res.status(200).json({ success: true, data: alert });
});

/**
 * @desc    Resolve an alert
 * @route   PATCH /api/v1/monitoring/alerts/:id/resolve
 * @access  Private
 */
exports.resolveAlert = asyncHandler(async (req, res, next) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) return next(new ErrorResponse('Alert not found', 404));

  alert.resolvedBy = req.user.id;
  alert.resolvedAt = new Date();
  alert.status     = 'resolved';
  await alert.save();

  res.status(200).json({ success: true, data: alert });
});

// ─────────────────────────────────────────────────────────────────────────────
// NTSA feed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Events pending NTSA push (compliance violations not yet forwarded)
 * @route   GET /api/v1/monitoring/ntsa/pending
 * @access  Private (admin / NTSA operator)
 */
exports.getNTSAPending = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const events = await platformEventService.getPendingNTSAEvents(limit);

  res.status(200).json({
    success: true,
    count: events.length,
    data: events
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Manual job trigger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Manually trigger the nightly compliance monitoring job
 * @route   POST /api/v1/monitoring/compliance/run
 * @access  Private (admin only)
 */
exports.runComplianceJob = asyncHandler(async (req, res) => {
  const { domain, dueOnly = false } = req.body;

  // Run async — respond immediately so the HTTP request doesn't time out
  // on large datasets. Client polls /api/v1/monitoring/compliance for results.
  const resultPromise = complianceMonitoringJob.run({ domain, dueOnly });

  resultPromise
    .then(r => console.log('[ComplianceJob] manual run complete:', r))
    .catch(e => console.error('[ComplianceJob] manual run error:', e.message));

  res.status(202).json({
    success: true,
    message: 'Compliance monitoring job started. Results available shortly.',
    domain: domain || 'all'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Analytics aggregation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Run analytics aggregation job manually
 * @route   POST /api/v1/monitoring/analytics/run
 * @access  Private (admin)
 */
exports.runAnalyticsJob = asyncHandler(async (req, res) => {
  const { domain } = req.body;
  const analyticsJob = require('../jobs/analyticsAggregationJob');

  analyticsJob.run({ domain })
    .then(r => console.log('[AnalyticsJob] complete:', r))
    .catch(e => console.error('[AnalyticsJob] error:', e.message));

  res.status(202).json({
    success: true,
    message: 'Analytics aggregation job started.',
    domain: domain || 'all'
  });
});

/**
 * @desc    Get daily analytics for an entity
 * @route   GET /api/v1/monitoring/analytics/:entityId
 * @access  Private
 */
exports.getEntityAnalytics = asyncHandler(async (req, res) => {
  const DailyAnalytics = require('../models/DailyAnalytics');
  const days = Math.min(Number(req.query.days) || 30, 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // 'platform' is a special aggregation across all sacco vehicles.
  // Output shape mirrors individual DailyAnalytics documents so the frontend
  // can use the same field accessors (r.revenue.collected, r.trips.completed…).
  if (req.params.entityId === 'platform') {
    const records = await DailyAnalytics.aggregate([
      { $match: { domain: 'sacco', date: { $gte: since } } },
      { $group: {
        _id:              { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        date:             { $first: '$date' },
        revCollected:     { $sum: '$revenue.collected' },
        tripsCompleted:   { $sum: '$trips.completed' },
        passBoarded:      { $sum: '$passengers.boarded' },
        vSpeed:           { $sum: '$violations.speed' },
        vOverload:        { $sum: '$violations.overloading' },
        vDeviation:       { $sum: '$violations.routeDeviation' },
        vHours:           { $sum: '$violations.operatingHours' },
      }},
      { $project: {
        _id:        0,
        date:       1,
        revenue:    { collected: '$revCollected' },
        trips:      { completed: '$tripsCompleted' },
        passengers: { boarded: '$passBoarded' },
        violations: { speed: '$vSpeed', overloading: '$vOverload', routeDeviation: '$vDeviation', operatingHours: '$vHours' },
      }},
      { $sort: { date: -1 } },
      { $limit: days },
    ]);
    return res.status(200).json({ success: true, count: records.length, data: records });
  }

  const records = await DailyAnalytics
    .find({ entityId: req.params.entityId, date: { $gte: since } })
    .sort({ date: -1 })
    .limit(days);

  res.status(200).json({ success: true, count: records.length, data: records });
});
