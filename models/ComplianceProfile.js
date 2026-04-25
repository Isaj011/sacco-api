const mongoose = require('mongoose');

/**
 * ComplianceProfile — Tracks all legally-required documents, safety
 * equipment checks, and behaviour metrics for vehicles and drivers
 * across all domains, per Kenya law (Traffic Act Cap 403, PSV
 * Regulations 2014, NTSA school transport checklist, CAK courier regs).
 *
 * One document per entity (vehicle or driver). Updated by:
 *  - Manual entry when documents are renewed
 *  - Nightly compliance monitoring job
 *  - Real-time IoT processing (behaviour metrics after each trip)
 */

// ── Sub-schema: a single required document ────────────────────────────
const DocumentSchema = new mongoose.Schema({
  name:           { type: String, required: true },   // 'PSV Insurance'
  documentNumber: { type: String },
  provider:       { type: String },                   // insurer, issuing body
  issuedDate:     { type: Date },
  expiryDate:     { type: Date },
  documentUrl:    { type: String },                   // Cloudinary URL

  alertThresholdDays: { type: Number, default: 30 },  // start alerting X days before

  // Computed by complianceService.recalculate()
  daysUntilExpiry: { type: Number },
  status: {
    type: String,
    enum: ['valid', 'expiring_soon', 'expired', 'missing', 'not_applicable'],
    default: 'missing'
  },

  lastVerified: { type: Date },
  verifiedBy:   { type: mongoose.Schema.ObjectId, ref: 'User' }
}, { _id: true });

// ── Sub-schema: safety equipment item ────────────────────────────────
const EquipmentSchema = new mongoose.Schema({
  name:            { type: String, required: true }, // 'Fire Extinguisher'
  required:        { type: Boolean, default: true },
  present:         { type: Boolean, default: false },
  lastVerified:    { type: Date },
  nextVerificationDue: { type: Date },
  verifiedBy:      { type: mongoose.Schema.ObjectId, ref: 'User' },
  notes:           { type: String },
  status: {
    type: String,
    enum: ['ok', 'due_for_check', 'missing', 'not_applicable'],
    default: 'due_for_check'
  }
}, { _id: true });

// ── Sub-schema: a driver endorsement ─────────────────────────────────
const EndorsementSchema = new mongoose.Schema({
  date:      { type: Date, required: true },
  violation: { type: String },   // e.g. 'speeding', 'reckless_driving'
  points:    { type: Number, default: 1 },
  issuedBy:  { type: String },   // NTSA, Police, Court
  notes:     { type: String }
}, { _id: true });

// ── Sub-schema: active compliance issue ──────────────────────────────
const IssueSchema = new mongoose.Schema({
  field:    { type: String, required: true },  // 'PSV Insurance'
  severity: {
    type: String,
    enum: ['critical', 'high', 'warning', 'info'],
    required: true
  },
  message:   { type: String, required: true },
  dueDate:   { type: Date },
  resolvedAt:{ type: Date }
}, { _id: true });

// ── Main schema ───────────────────────────────────────────────────────
const ComplianceProfileSchema = new mongoose.Schema({

  // Domain and entity this profile belongs to
  domain: {
    type: String,
    enum: ['sacco', 'school', 'delivery'],
    required: true,
    index: true
  },
  entityType: {
    type: String,
    enum: ['vehicle', 'driver'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.ObjectId,
    required: true,
    index: true
    // Resolves to: Vehicle | Driver | SchoolVehicle | SchoolDriver |
    //              DeliveryVehicle | DeliveryDriver
  },

  // ── Documents ── (populated from domain/entityType context)
  // Sacco vehicle:  PSV Insurance, Road Service License, Annual NTSA Inspection,
  //                 SACCO Membership, Speed Limiter Certificate
  // Sacco driver:   PSV Badge, Driving License, Medical Certificate, Police Clearance
  // School vehicle: Insurance, Semi-annual NTSA Inspection, Speed Limiter Certificate
  // School driver:  Commercial Driving License, Annual Health Examination
  // Delivery vehicle: Commercial Vehicle License, CAK Courier License, Insurance
  // Delivery driver:  Driving License (A3/C/CE)
  documents: [DocumentSchema],

  // ── Safety equipment ── (vehicles only)
  // Sacco/Delivery: fire_extinguisher, first_aid_kit, emergency_exit,
  //                 safety_belts, reflective_markings
  // School extras:  child_restraint_systems
  safetyEquipment: [EquipmentSchema],

  // ── Vehicle-specific flags ────────────────────────────────────────
  vehicleFlags: {
    speedLimiterInstalled:     { type: Boolean, default: false },
    speedLimiterLastHeartbeat: { type: Date },   // last NTSA IRSMS transmission
    speedLimiterStatus: {
      type: String,
      enum: ['transmitting', 'silent', 'tampered', 'not_installed'],
      default: 'not_installed'
    },

    // Weekly inspection record (Sacco — 6-month retention required)
    weeklyInspectionLastDate: { type: Date },
    weeklyInspectionNextDue:  { type: Date },

    // School-specific
    isYellow:     { type: Boolean },  // school buses must be yellow
    maintenanceRecordsRetained: { type: Boolean, default: false }, // 2-year retention

    // General
    operationalStatus: {
      type: String,
      enum: ['operational', 'grounded', 'maintenance', 'suspended'],
      default: 'operational'
    }
  },

  // ── Driver behaviour metrics (updated after each trip via IoT) ───
  behaviourMetrics: {
    totalTrips:            { type: Number, default: 0 },
    totalDistanceKm:       { type: Number, default: 0 },
    speedViolationsTotal:  { type: Number, default: 0 },
    speedViolationsMonth:  { type: Number, default: 0 },  // reset monthly
    harshBrakingEvents:    { type: Number, default: 0 },
    overloadingEvents:     { type: Number, default: 0 },
    routeDeviations:       { type: Number, default: 0 },
    averageBehaviourScore: { type: Number, default: 100, min: 0, max: 100 },
    lastTripScore:         { type: Number, min: 0, max: 100 },
    lastTripDate:          { type: Date },

    endorsements:          [EndorsementSchema],
    // Computed by complianceService — endorsements within rolling 3-year window
    endorsementsLast3Years: { type: Number, default: 0 }
  },

  // ── Driver personal flags ─────────────────────────────────────────
  driverFlags: {
    minimumAgeVerified:        { type: Boolean, default: false },  // must be ≥ 24 (Sacco)
    minimumExperienceVerified: { type: Boolean, default: false },  // must have ≥ 4yrs (Sacco)
    alcoholStatus: {
      type: String,
      enum: ['clear', 'under_review', 'violation'],
      default: 'clear'
    },
    workingHoursCompliant: { type: Boolean, default: true },
    annualHealthExamDate:  { type: Date }                          // School drivers
  },

  // ── Computed compliance score and status ─────────────────────────
  //
  // Score formula (complianceService.recalculate):
  //   Start at 100
  //   Expired document or missing:      -30 each  (critical)
  //   Expiring in < 7 days:             -15 each  (high)
  //   Expiring in < 30 days:            -10 each  (medium)
  //   Safety equipment missing/overdue: -5 each
  //   Speed violations > 5 last month:  -10
  //   endorsementsLast3Years = 2:       -20
  //   endorsementsLast3Years >= 3:      score = 0, status = suspended
  //
  // Thresholds:
  //   90–100: compliant
  //   70–89:  warning
  //   50–69:  at_risk
  //   < 50:   non_compliant
  //   manual: suspended
  complianceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  complianceStatus: {
    type: String,
    enum: ['compliant', 'warning', 'at_risk', 'non_compliant', 'suspended'],
    default: 'non_compliant',  // starts non_compliant until documents verified
    index: true
  },
  previousStatus: { type: String },  // detect status changes for alerts

  // Active issues (what is wrong right now)
  activeIssues: [IssueSchema],

  // ── Job scheduling ────────────────────────────────────────────────
  lastChecked:   { type: Date },
  nextCheckDue:  { type: Date }

}, {
  timestamps: true
});

// ── Indexes ───────────────────────────────────────────────────────────
ComplianceProfileSchema.index({ entityId: 1 }, { unique: true });
ComplianceProfileSchema.index({ domain: 1, complianceStatus: 1 });
ComplianceProfileSchema.index({ domain: 1, entityType: 1, complianceStatus: 1 });
ComplianceProfileSchema.index({ nextCheckDue: 1 });  // monitoring job picks these up

// ── Static: get all non-compliant profiles for a domain ──────────────
ComplianceProfileSchema.statics.getNonCompliant = function (domain) {
  return this.find({
    domain,
    complianceStatus: { $in: ['non_compliant', 'suspended'] }
  }).sort({ complianceScore: 1 });
};

// ── Static: get all profiles expiring in next N days ─────────────────
ComplianceProfileSchema.statics.getExpiringDocuments = function (domain, days = 30) {
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.find({
    domain,
    'documents.expiryDate': { $lte: cutoff, $gte: new Date() },
    'documents.status': { $ne: 'not_applicable' }
  });
};

module.exports = mongoose.model('ComplianceProfile', ComplianceProfileSchema);
