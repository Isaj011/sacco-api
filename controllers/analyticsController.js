const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const analyticsService = require('../services/analyticsService');
const alertService = require('../services/alertService');

// @desc      Get comprehensive business analytics
// @route     GET  /api/v1/analytics/business
// @access    Private
exports.getBusinessAnalytics = asyncHandler(async (req, res, next) => {
  const timeRange = req.query.timeRange || 'month';
  
  const businessData = {
    financialMetrics: await analyticsService.getFinancialMetrics(timeRange),
    operationalEfficiency: await analyticsService.getOperationalEfficiency(),
    businessIntelligence: await analyticsService.getBusinessIntelligence()
  };

  res.status(200).json({
    success: true,
    data: businessData,
    timeRange
  });
});

// @desc      Get financial metrics
// @route     GET  /api/v1/analytics/financial
// @access    Private
exports.getFinancialMetrics = asyncHandler(async (req, res, next) => {
  const timeRange = req.query.timeRange || 'month';
  
  const financialData = await analyticsService.getFinancialMetrics(timeRange);

  res.status(200).json({
    success: true,
    data: financialData,
    timeRange
  });
});

// @desc      Get operational efficiency metrics
// @route     GET  /api/v1/analytics/operational
// @access    Private
exports.getOperationalEfficiency = asyncHandler(async (req, res, next) => {
  const operationalData = await analyticsService.getOperationalEfficiency();

  res.status(200).json({
    success: true,
    data: operationalData
  });
});

// @desc      Get compliance data
// @route     GET  /api/v1/analytics/compliance
// @access    Private
exports.getComplianceData = asyncHandler(async (req, res, next) => {
  const complianceData = await analyticsService.getComplianceData();

  res.status(200).json({
    success: true,
    data: complianceData
  });
});

// @desc      Get service quality metrics
// @route     GET  /api/v1/analytics/service-quality
// @access    Private
exports.getServiceQualityMetrics = asyncHandler(async (req, res, next) => {
  const qualityData = await analyticsService.getServiceQualityMetrics();

  res.status(200).json({
    success: true,
    data: qualityData
  });
});

// @desc      Get passenger experience data
// @route     GET  /api/v1/analytics/passenger-experience
// @access    Private
exports.getPassengerExperience = asyncHandler(async (req, res, next) => {
  const experienceData = await analyticsService.getPassengerExperience();

  res.status(200).json({
    success: true,
    data: experienceData
  });
});

// @desc      Get live operations data
// @route     GET  /api/v1/analytics/live-operations
// @access    Private
exports.getLiveOperationsData = asyncHandler(async (req, res, next) => {
  const liveData = await analyticsService.getLiveOperationsData();

  res.status(200).json({
    success: true,
    data: liveData,
    timestamp: new Date()
  });
});

// @desc      Get predictive analytics
// @route     GET  /api/v1/analytics/predictive
// @access    Private
exports.getPredictiveAnalytics = asyncHandler(async (req, res, next) => {
  const predictiveData = await analyticsService.getPredictiveAnalytics();

  res.status(200).json({
    success: true,
    data: predictiveData
  });
});

// @desc      Get comprehensive dashboard data
// @route     GET  /api/v1/analytics/dashboard
// @access    Private
exports.getDashboardData = asyncHandler(async (req, res, next) => {
  const timeRange = req.query.timeRange || 'month';
  const dashboardType = req.query.type || 'executive'; // executive, operational, compliance, financial

  let dashboardData = {};

  switch (dashboardType) {
    case 'executive':
      dashboardData = {
        overview: {
          totalVehicles: await getTotalVehicles(),
          activeVehicles: await getActiveVehicles(),
          totalDrivers: await getTotalDrivers(),
          totalRoutes: await getTotalRoutes()
        },
        financial: await analyticsService.getFinancialMetrics(timeRange),
        operational: await analyticsService.getOperationalEfficiency(),
        compliance: await analyticsService.getComplianceData()
      };
      break;
    
    case 'operational':
      dashboardData = {
        liveOperations: await analyticsService.getLiveOperationsData(),
        serviceQuality: await analyticsService.getServiceQualityMetrics(),
        passengerExperience: await analyticsService.getPassengerExperience(),
        predictive: await analyticsService.getPredictiveAnalytics()
      };
      break;
    
    case 'compliance':
      dashboardData = {
        compliance: await analyticsService.getComplianceData(),
        safetyMetrics: await getSafetyMetrics(),
        regulatoryAlerts: await getRegulatoryAlerts()
      };
      break;
    
    case 'financial':
      dashboardData = {
        financial: await analyticsService.getFinancialMetrics(timeRange),
        trends: await getFinancialTrends(timeRange),
        budgetVsActual: await getBudgetVsActual(timeRange)
      };
      break;
    
    default:
      return next(new ErrorResponse('Invalid dashboard type', 400));
  }

  res.status(200).json({
    success: true,
    data: dashboardData,
    dashboardType,
    timeRange
  });
});

// @desc      Get analytics export
// @route     GET  /api/v1/analytics/export
// @access    Private
exports.exportAnalytics = asyncHandler(async (req, res, next) => {
  const { type, format, timeRange } = req.query;
  
  if (!type) {
    return next(new ErrorResponse('Analytics type is required', 400));
  }

  let data;
  switch (type) {
    case 'financial':
      data = await analyticsService.getFinancialMetrics(timeRange);
      break;
    case 'operational':
      data = await analyticsService.getOperationalEfficiency();
      break;
    case 'compliance':
      data = await analyticsService.getComplianceData();
      break;
    case 'service-quality':
      data = await analyticsService.getServiceQualityMetrics();
      break;
    case 'passenger-experience':
      data = await analyticsService.getPassengerExperience();
      break;
    case 'live-operations':
      data = await analyticsService.getLiveOperationsData();
      break;
    case 'predictive':
      data = await analyticsService.getPredictiveAnalytics();
      break;
    default:
      return next(new ErrorResponse('Invalid analytics type', 400));
  }

  // Set response headers for file download
  const filename = `${type}_analytics_${new Date().toISOString().split('T')[0]}`;
  
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.status(200).json(data);
  } else if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.status(200).send(convertToCSV(data));
  } else {
    res.status(200).json({
      success: true,
      data,
      exportInfo: {
        type,
        format: format || 'json',
        timeRange,
        filename
      }
    });
  }
});

// @desc      Get real-time alerts
// @route     GET  /api/v1/analytics/alerts
// @access    Private
exports.getRealTimeAlerts = asyncHandler(async (req, res, next) => {
  const { type, severity, entityType } = req.query;
  
  let alerts;
  
  if (type) {
    alerts = await alertService.getAlertsByType(type);
  } else if (severity) {
    alerts = await alertService.getAlertsBySeverity(severity);
  } else {
    alerts = await alertService.getActiveAlerts();
  }

  // Filter by entity type if specified
  if (entityType) {
    alerts = alerts.filter(alert => alert.entityType === entityType);
  }

  res.status(200).json({
    success: true,
    data: alerts,
    timestamp: new Date(),
    total: alerts.length
  });
});

// @desc      Acknowledge an alert
// @route     PUT  /api/v1/analytics/alerts/:id/acknowledge
// @access    Private
exports.acknowledgeAlert = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const acknowledgedBy = req.user.id;

  const result = await alertService.acknowledgeAlert(id, acknowledgedBy);

  res.status(200).json({
    success: true,
    data: result
  });
});

// @desc      Get alert statistics
// @route     GET  /api/v1/analytics/alerts/stats
// @access    Private
exports.getAlertStatistics = asyncHandler(async (req, res, next) => {
  const allAlerts = await alertService.generateAllAlerts();
  
  // Calculate statistics
  const stats = {
    total: allAlerts.length,
    bySeverity: {
      critical: allAlerts.filter(a => a.severity === 'critical').length,
      high: allAlerts.filter(a => a.severity === 'high').length,
      medium: allAlerts.filter(a => a.severity === 'medium').length,
      low: allAlerts.filter(a => a.severity === 'low').length
    },
    byType: {},
    byEntityType: {
      vehicle: allAlerts.filter(a => a.entityType === 'vehicle').length,
      driver: allAlerts.filter(a => a.entityType === 'driver').length,
      incident: allAlerts.filter(a => a.entityType === 'incident').length,
      system: allAlerts.filter(a => a.entityType === 'system').length,
      financial: allAlerts.filter(a => a.entityType === 'financial').length,
      service: allAlerts.filter(a => a.entityType === 'service').length
    },
    acknowledged: allAlerts.filter(a => a.acknowledged).length,
    unacknowledged: allAlerts.filter(a => !a.acknowledged).length
  };

  // Count by alert type
  allAlerts.forEach(alert => {
    stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
  });

  res.status(200).json({
    success: true,
    data: stats,
    timestamp: new Date()
  });
});

// @desc      Get historical trends
// @route     GET  /api/v1/analytics/trends
// @access    Private
exports.getHistoricalTrends = asyncHandler(async (req, res, next) => {
  const { metric, timeRange } = req.query;
  
  if (!metric) {
    return next(new ErrorResponse('Metric is required', 400));
  }

  const trends = await getHistoricalTrends(metric, timeRange);

  res.status(200).json({
    success: true,
    data: trends,
    metric,
    timeRange
  });
});

// ==================== NEW ENDPOINTS FOR FRONTEND ====================

// @desc      Get demand analysis
// @route     GET  /api/v1/analytics/demand-analysis
// @access    Private
exports.getDemandAnalysis = asyncHandler(async (req, res, next) => {
  const timeRange = req.query.timeRange || 'month';
  
  const demandData = {
    usagePatterns: await analyticsService.getPassengerDemandPatterns([]),
    peakHours: await analyticsService.getPeakHours([]),
    seasonalVariations: await getSeasonalVariations(timeRange),
    routePopularity: await analyticsService.getRoutePopularity([]),
    passengerDemand: await getPassengerDemand(timeRange)
  };

  res.status(200).json({
    success: true,
    data: demandData,
    timeRange
  });
});

// @desc      Get risk assessment
// @route     GET  /api/v1/analytics/risk-assessment
// @access    Private
exports.getRiskAssessment = asyncHandler(async (req, res, next) => {
  const timeRange = req.query.timeRange || 'month';
  
  const riskData = {
    financialRisks: await analyticsService.getFinancialRisks(),
    operationalVulnerabilities: await analyticsService.getOperationalVulnerabilities(),
    safetyRisks: await getSafetyRisks(timeRange),
    complianceRisks: await getComplianceRisks(timeRange),
    overallRiskLevel: await getOverallRiskLevel(timeRange)
  };

  res.status(200).json({
    success: true,
    data: riskData,
    timeRange
  });
});

// @desc      Get market intelligence
// @route     GET  /api/v1/analytics/market-intelligence
// @access    Private
exports.getMarketIntelligence = asyncHandler(async (req, res, next) => {
  const timeRange = req.query.timeRange || 'month';
  
  const marketData = {
    marketAnalysis: await analyticsService.getBusinessIntelligence(),
    competitiveIntelligence: await getCompetitiveIntelligence(timeRange),
    growthOpportunities: await analyticsService.identifyNewRouteOpportunities(),
    expansionPotential: await analyticsService.getExpansionPotential(),
    marketTrends: await getMarketTrends(timeRange)
  };

  res.status(200).json({
    success: true,
    data: marketData,
    timeRange
  });
});

// ==================== HELPER FUNCTIONS ====================

async function getTotalVehicles() {
  const Vehicle = require('../models/Vehicle');
  return await Vehicle.countDocuments();
}

async function getActiveVehicles() {
  const Vehicle = require('../models/Vehicle');
  return await Vehicle.countDocuments({ status: { $in: ['in_use', 'available'] } });
}

async function getTotalDrivers() {
  const Driver = require('../models/Driver');
  return await Driver.countDocuments();
}

async function getTotalRoutes() {
  const Course = require('../models/Course');
  return await Course.countDocuments();
}

async function getSafetyMetrics() {
  // Mock safety metrics
  return {
    totalIncidents: 5,
    safetyScore: 92,
    riskLevel: 'Low',
    lastIncident: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  };
}

async function getRegulatoryAlerts() {
  // Mock regulatory alerts
  return [
    {
      type: 'license_expiry',
      severity: 'high',
      message: 'Driver license expiring in 5 days',
      driverId: 'mock-driver-id',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  ];
}

async function getFinancialTrends(timeRange) {
  // Mock financial trends
  return {
    revenue: [45000, 52000, 48000, 55000, 60000, 58000],
    expenses: [35000, 38000, 36000, 42000, 45000, 43000],
    profit: [10000, 14000, 12000, 13000, 15000, 15000]
  };
}

async function getBudgetVsActual(timeRange) {
  // Mock budget vs actual data
  return {
    budgeted: 500000,
    actual: 480000,
    variance: -20000,
    variancePercentage: -4
  };
}

async function getHistoricalTrends(metric, timeRange) {
  // Mock historical trends based on metric
  const trends = {
    revenue: [45000, 52000, 48000, 55000, 60000, 58000],
    passengers: [1200, 1350, 1280, 1450, 1600, 1550],
    efficiency: [85, 87, 86, 88, 90, 89],
    compliance: [92, 94, 93, 95, 96, 95]
  };

  return {
    metric,
    data: trends[metric] || [],
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  };
}

// New helper functions for the additional endpoints
async function getSeasonalVariations(timeRange) {
  return {
    peak: ['December', 'January', 'July'],
    low: ['February', 'March', 'September'],
    monthlyDemand: [1200, 1100, 1000, 1150, 1300, 1400, 1350, 1250, 1200, 1300, 1400, 1500]
  };
}

async function getPassengerDemand(timeRange) {
  return {
    current: 1250,
    projected: 1350,
    growth: 8.0,
    factors: ['Seasonal increase', 'New routes', 'Improved service']
  };
}

async function getSafetyRisks(timeRange) {
  return [
    { risk: 'Driver fatigue', probability: 'Medium', impact: 'High' },
    { risk: 'Vehicle maintenance', probability: 'Low', impact: 'Medium' },
    { risk: 'Weather conditions', probability: 'High', impact: 'Medium' }
  ];
}

async function getComplianceRisks(timeRange) {
  return [
    { risk: 'License expiry', probability: 'Medium', impact: 'High' },
    { risk: 'Insurance lapse', probability: 'Low', impact: 'High' },
    { risk: 'Regulatory changes', probability: 'Low', impact: 'Medium' }
  ];
}

async function getOverallRiskLevel(timeRange) {
  return {
    level: 'Low',
    score: 25,
    factors: ['Good safety record', 'Compliance maintained', 'Financial stability']
  };
}

async function getCompetitiveIntelligence(timeRange) {
  return {
    marketShare: 15.5,
    competitiveAdvantage: 'Route coverage',
    serviceDifferentiation: 'Real-time tracking',
    competitorAnalysis: [
      { competitor: 'Competitor A', marketShare: 20, strengths: ['Brand recognition'], weaknesses: ['Limited routes'] },
      { competitor: 'Competitor B', marketShare: 12, strengths: ['Low prices'], weaknesses: ['Poor service quality'] }
    ]
  };
}

async function getMarketTrends(timeRange) {
  return {
    growthRate: 5.2,
    marketSize: 5000000,
    keyTrends: ['Digital transformation', 'Sustainability focus', 'Customer experience'],
    opportunities: ['Route expansion', 'Technology adoption', 'Service diversification']
  };
}

function convertToCSV(data) {
  // Simple CSV conversion function
  const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, key) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(acc, flattenObject(obj[key], pre + key));
      } else {
        acc[pre + key] = obj[key];
      }
      return acc;
    }, {});
  };

  const flattened = flattenObject(data);
  const headers = Object.keys(flattened);
  const values = Object.values(flattened);
  
  return headers.join(',') + '\n' + values.join(',');
} 