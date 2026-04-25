const ComplianceProfile = require('../models/ComplianceProfile');
const Alert = require('../models/Alert');
const platformEventService = require('./platformEventService');

/**
 * complianceService
 *
 * Core compliance engine. Manages ComplianceProfile documents:
 *  - Creates profiles with correct document list per domain/entityType
 *  - Recalculates compliance scores on demand
 *  - Generates alerts for document expiry and safety issues
 *  - Updates driver behaviour scores after each trip
 *
 * Called by:
 *  - Nightly monitoring job (all profiles)
 *  - IoT domain processors (behaviour metrics after trip end)
 *  - Manual API endpoints (when operator updates a document)
 */

// ── Document templates per domain + entity type ───────────────────────
// Each entry defines a required document with its alert threshold.
const DOCUMENT_TEMPLATES = {
  sacco: {
    vehicle: [
      { name: 'PSV Insurance',           alertThresholdDays: 30 },
      { name: 'Road Service License',    alertThresholdDays: 30 },
      { name: 'NTSA Annual Inspection',  alertThresholdDays: 30 },
      { name: 'SACCO Membership',        alertThresholdDays: 30 },
      { name: 'Speed Limiter Certificate', alertThresholdDays: 14 }
    ],
    driver: [
      { name: 'PSV Badge',              alertThresholdDays: 60 },
      { name: 'Driving License',        alertThresholdDays: 60 },
      { name: 'Medical Certificate',    alertThresholdDays: 30 },
      { name: 'Police Clearance (DCI)', alertThresholdDays: 60 }
    ]
  },
  school: {
    vehicle: [
      { name: 'PSV Insurance',                  alertThresholdDays: 30 },
      { name: 'NTSA Semi-Annual Inspection',     alertThresholdDays: 30 },
      { name: 'Speed Limiter Certificate',       alertThresholdDays: 14 }
    ],
    driver: [
      { name: 'Commercial Driving License',  alertThresholdDays: 60 },
      { name: 'Annual Health Examination',   alertThresholdDays: 30 }
    ]
  },
  delivery: {
    vehicle: [
      { name: 'Commercial Vehicle License', alertThresholdDays: 30 },
      { name: 'CAK Courier License',        alertThresholdDays: 60 },
      { name: 'Vehicle Insurance',          alertThresholdDays: 30 }
    ],
    driver: [
      { name: 'Driving License', alertThresholdDays: 60 }
    ]
  }
};

// ── Safety equipment templates per domain ─────────────────────────────
const EQUIPMENT_TEMPLATES = {
  sacco: [
    'Fire Extinguisher (≥1kg)',
    'First Aid Kit',
    'Emergency Exit',
    'Safety Belts (all seats)',
    'Reflective Markings / Warning Triangle'
  ],
  school: [
    'Fire Extinguisher (≥1kg)',
    'First Aid Kit',
    'Emergency Exit',
    'Safety Belts (all seats)',
    'Child Restraint Systems',
    'Reflective Markings / Warning Triangle'
  ],
  delivery: [
    'Fire Extinguisher (≥1kg)',
    'First Aid Kit',
    'Reflective Markings / Warning Triangle'
  ]
};

// ── Score penalty weights ─────────────────────────────────────────────
const PENALTIES = {
  DOC_EXPIRED:          30,
  DOC_MISSING:          30,
  DOC_EXPIRING_7DAYS:   15,
  DOC_EXPIRING_30DAYS:  10,
  EQUIPMENT_MISSING:     5,
  EQUIPMENT_OVERDUE:     5,
  SPEED_VIOLATIONS_MONTH:10,  // applied if > 5 violations in last month
  ENDORSEMENT_2:        20,
  LIMITER_SILENT:       20
};

/**
 * Create a fresh ComplianceProfile for a new entity.
 * Populates document list from template; all start as 'missing'.
 *
 * @param {'sacco'|'school'|'delivery'} domain
 * @param {'vehicle'|'driver'} entityType
 * @param {ObjectId} entityId
 * @returns {Promise<ComplianceProfile>}
 */
exports.createProfile = async (domain, entityType, entityId) => {
  const existing = await ComplianceProfile.findOne({ entityId });
  if (existing) return existing;

  const docTemplates = DOCUMENT_TEMPLATES[domain]?.[entityType] || [];
  const documents = docTemplates.map(t => ({
    name:               t.name,
    status:             'missing',
    alertThresholdDays: t.alertThresholdDays
  }));

  const equipmentNames = entityType === 'vehicle'
    ? (EQUIPMENT_TEMPLATES[domain] || [])
    : [];

  const safetyEquipment = equipmentNames.map(name => ({
    name,
    required: true,
    present:  false,
    status:   'due_for_check'
  }));

  const profile = await ComplianceProfile.create({
    domain,
    entityType,
    entityId,
    documents,
    safetyEquipment,
    complianceScore:  0,
    complianceStatus: 'non_compliant',
    nextCheckDue:     new Date()
  });

  return profile;
};

/**
 * Recalculate compliance score for a profile.
 * Updates the profile in-place and saves. Returns updated profile.
 *
 * @param {ComplianceProfile} profile
 * @returns {Promise<ComplianceProfile>}
 */
exports.recalculate = async (profile) => {
  const now  = Date.now();
  let score  = 100;
  const issues = [];

  // ── 1. Documents ────────────────────────────────────────────────
  for (const doc of profile.documents) {
    if (doc.status === 'not_applicable') continue;

    if (!doc.expiryDate) {
      // No date entered = missing
      doc.status = 'missing';
      score -= PENALTIES.DOC_MISSING;
      issues.push({
        field:    doc.name,
        severity: 'critical',
        message:  `${doc.name} has not been recorded. Please upload document.`
      });
      continue;
    }

    const expiry    = new Date(doc.expiryDate).getTime();
    const msLeft    = expiry - now;
    const daysLeft  = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    doc.daysUntilExpiry = daysLeft;

    if (daysLeft < 0) {
      doc.status = 'expired';
      score -= PENALTIES.DOC_EXPIRED;
      issues.push({
        field:    doc.name,
        severity: 'critical',
        message:  `${doc.name} expired ${Math.abs(daysLeft)} days ago.`,
        dueDate:  doc.expiryDate
      });
    } else if (daysLeft <= 7) {
      doc.status = 'expiring_soon';
      score -= PENALTIES.DOC_EXPIRING_7DAYS;
      issues.push({
        field:    doc.name,
        severity: 'high',
        message:  `${doc.name} expires in ${daysLeft} day(s). Renew immediately.`,
        dueDate:  doc.expiryDate
      });
    } else if (daysLeft <= doc.alertThresholdDays) {
      doc.status = 'expiring_soon';
      score -= PENALTIES.DOC_EXPIRING_30DAYS;
      issues.push({
        field:    doc.name,
        severity: 'warning',
        message:  `${doc.name} expires in ${daysLeft} days.`,
        dueDate:  doc.expiryDate
      });
    } else {
      doc.status = 'valid';
    }
  }

  // ── 2. Safety equipment ─────────────────────────────────────────
  for (const eq of profile.safetyEquipment) {
    if (!eq.required) continue;

    if (!eq.present) {
      eq.status = 'missing';
      score -= PENALTIES.EQUIPMENT_MISSING;
      issues.push({
        field:    eq.name,
        severity: 'high',
        message:  `${eq.name} is missing from the vehicle.`
      });
    } else if (eq.nextVerificationDue && eq.nextVerificationDue < new Date()) {
      eq.status = 'due_for_check';
      score -= PENALTIES.EQUIPMENT_OVERDUE;
      issues.push({
        field:    eq.name,
        severity: 'warning',
        message:  `${eq.name} verification is overdue.`,
        dueDate:  eq.nextVerificationDue
      });
    } else {
      eq.status = 'ok';
    }
  }

  // ── 3. Speed limiter heartbeat (vehicles) ───────────────────────
  if (profile.vehicleFlags?.speedLimiterInstalled) {
    const lastHeartbeat = profile.vehicleFlags.speedLimiterLastHeartbeat;
    if (!lastHeartbeat) {
      profile.vehicleFlags.speedLimiterStatus = 'silent';
      score -= PENALTIES.LIMITER_SILENT;
      issues.push({
        field:    'Speed Limiter',
        severity: 'critical',
        message:  'Speed limiter has never transmitted to NTSA IRSMS.'
      });
    } else {
      const minutesSilent = (now - new Date(lastHeartbeat).getTime()) / 60000;
      if (minutesSilent > 60) {
        profile.vehicleFlags.speedLimiterStatus = 'silent';
        score -= PENALTIES.LIMITER_SILENT;
        issues.push({
          field:    'Speed Limiter',
          severity: 'critical',
          message:  `Speed limiter has been silent for ${Math.round(minutesSilent)} minutes.`
        });
      } else {
        profile.vehicleFlags.speedLimiterStatus = 'transmitting';
      }
    }
  }

  // ── 4. Driver behaviour ─────────────────────────────────────────
  if (profile.entityType === 'driver') {
    // Compute endorsements in rolling 3-year window
    const threeYearsAgo = new Date(now - 3 * 365 * 24 * 60 * 60 * 1000);
    const recentEndorsements = (profile.behaviourMetrics.endorsements || [])
      .filter(e => new Date(e.date) >= threeYearsAgo).length;
    profile.behaviourMetrics.endorsementsLast3Years = recentEndorsements;

    if (recentEndorsements >= 3) {
      score = 0;
      issues.push({
        field:    'Endorsements',
        severity: 'critical',
        message:  `Driver has ${recentEndorsements} endorsements in 3 years — disqualified per Traffic Act.`
      });
    } else if (recentEndorsements === 2) {
      score -= PENALTIES.ENDORSEMENT_2;
      issues.push({
        field:    'Endorsements',
        severity: 'high',
        message:  'Driver has 2 endorsements in 3 years. One more results in disqualification.'
      });
    }

    if ((profile.behaviourMetrics.speedViolationsMonth || 0) > 5) {
      score -= PENALTIES.SPEED_VIOLATIONS_MONTH;
      issues.push({
        field:    'Speed Violations',
        severity: 'warning',
        message:  `Driver has ${profile.behaviourMetrics.speedViolationsMonth} speed violations this month.`
      });
    }

    // Alcohol violation — immediate zero
    if (profile.driverFlags?.alcoholStatus === 'violation') {
      score = 0;
      issues.push({
        field:    'Alcohol Status',
        severity: 'critical',
        message:  'Driver flagged for alcohol violation. Suspended from operations.'
      });
    }
  }

  // ── 5. School operating hours (vehicles) ────────────────────────
  // Handled real-time in SchoolIoTProcessor — just record flag here.

  // ── Clamp score ─────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  // ── Determine status ─────────────────────────────────────────────
  const previousStatus = profile.complianceStatus;
  let newStatus;

  if (profile.complianceStatus === 'suspended') {
    newStatus = 'suspended'; // Manual suspension — only lifted by admin
  } else if (score >= 90) {
    newStatus = 'compliant';
  } else if (score >= 70) {
    newStatus = 'warning';
  } else if (score >= 50) {
    newStatus = 'at_risk';
  } else {
    newStatus = 'non_compliant';
  }

  profile.complianceScore  = score;
  profile.previousStatus   = previousStatus;
  profile.complianceStatus = newStatus;
  profile.activeIssues     = issues;
  profile.lastChecked      = new Date();
  profile.nextCheckDue     = new Date(now + 24 * 60 * 60 * 1000); // tomorrow

  await profile.save();

  // ── Fire alerts and platform events on status change ─────────────
  if (newStatus !== previousStatus) {
    await _onStatusChange(profile, previousStatus, newStatus);
  }

  // ── Create individual alerts for critical/high issues ─────────────
  await _createIssueAlerts(profile, issues);

  return profile;
};

/**
 * Update driver behaviour metrics after a trip completes.
 *
 * @param {ObjectId} driverEntityId  — Driver or SchoolDriver ObjectId
 * @param {object}   tripMetrics
 * @param {number}   tripMetrics.speedViolations
 * @param {number}   tripMetrics.harshBrakingEvents
 * @param {number}   tripMetrics.routeDeviations
 * @param {boolean}  tripMetrics.overloading
 * @param {number}   tripMetrics.distanceKm
 * @param {number}   tripMetrics.behaviourScore  — 0-100, computed by Android
 */
exports.recordTripBehaviour = async (driverEntityId, tripMetrics) => {
  const profile = await ComplianceProfile.findOne({
    entityId:   driverEntityId,
    entityType: 'driver'
  });
  if (!profile) return;

  const bm = profile.behaviourMetrics;
  bm.totalTrips            = (bm.totalTrips || 0) + 1;
  bm.totalDistanceKm       = (bm.totalDistanceKm || 0) + (tripMetrics.distanceKm || 0);
  bm.speedViolationsTotal  = (bm.speedViolationsTotal || 0) + (tripMetrics.speedViolations || 0);
  bm.speedViolationsMonth  = (bm.speedViolationsMonth || 0) + (tripMetrics.speedViolations || 0);
  bm.harshBrakingEvents    = (bm.harshBrakingEvents || 0) + (tripMetrics.harshBrakingEvents || 0);
  bm.routeDeviations       = (bm.routeDeviations || 0) + (tripMetrics.routeDeviations || 0);
  if (tripMetrics.overloading) {
    bm.overloadingEvents   = (bm.overloadingEvents || 0) + 1;
  }
  bm.lastTripScore   = tripMetrics.behaviourScore;
  bm.lastTripDate    = new Date();

  // Rolling average score
  const prevAvg    = bm.averageBehaviourScore || 100;
  const totalTrips = bm.totalTrips;
  bm.averageBehaviourScore = Math.round(
    ((prevAvg * (totalTrips - 1)) + (tripMetrics.behaviourScore || 100)) / totalTrips
  );

  profile.markModified('behaviourMetrics');
  await profile.save();

  // Recalculate full score
  await exports.recalculate(profile);
};

/**
 * Get or create a profile for an entity.
 */
exports.getOrCreate = async (domain, entityType, entityId) => {
  let profile = await ComplianceProfile.findOne({ entityId });
  if (!profile) {
    profile = await exports.createProfile(domain, entityType, entityId);
  }
  return profile;
};

// ── Private helpers ───────────────────────────────────────────────────

async function _onStatusChange (profile, from, to) {
  // Write a platform event
  await platformEventService.write({
    domain:     profile.domain,
    eventType:  'COMPLIANCE_STATUS_CHANGED',
    entityType: profile.entityType === 'vehicle'
      ? `${profile.domain}_vehicle`
      : `${profile.domain}_driver`,
    entityId:   profile.entityId,
    source:     'background_job',
    ntsa:       ['non_compliant', 'suspended'].includes(to),
    payload:    { from, to, score: profile.complianceScore }
  });
}

async function _createIssueAlerts (profile, issues) {
  for (const issue of issues) {
    if (!['critical', 'high'].includes(issue.severity)) continue;

    // Map to Alert model's type field
    const alertType = issue.field.toLowerCase().includes('insurance')
      ? 'insurance_expiry'
      : issue.field.toLowerCase().includes('license') || issue.field.toLowerCase().includes('badge') || issue.field.toLowerCase().includes('clearance')
        ? 'license_expiry'
        : issue.field.toLowerCase().includes('inspection')
          ? 'maintenance_due'
          : issue.field.toLowerCase().includes('speed')
            ? 'speed_violation'
            : issue.field.toLowerCase().includes('endorse')
              ? 'compliance_breach'
              : 'compliance_breach';

    // Avoid duplicate active alerts for the same issue
    const existing = await Alert.findOne({
      entityId:   profile.entityId,
      type:       alertType,
      status:     'active',
      'metadata.field': issue.field
    });
    if (existing) continue;

    await Alert.create({
      type:       alertType,
      severity:   issue.severity === 'critical' ? 'critical' : 'high',
      title:      `${issue.field} — Action Required`,
      message:    issue.message,
      entityId:   profile.entityId,
      entityType: profile.entityType === 'vehicle' ? 'vehicle' : 'driver',
      status:     'active',
      metadata:   { field: issue.field, domain: profile.domain, dueDate: issue.dueDate }
    });
  }
}
