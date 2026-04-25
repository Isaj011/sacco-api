const mongoose = require('mongoose');

/**
 * DailyAnalytics — Permanent aggregated daily metrics per entity.
 *
 * One document per (domain + entityId + date). Created/updated by the
 * nightly analyticsAggregationJob before PlatformEvents expire via TTL.
 * Upsert logic makes the job safe to re-run without double-counting
 * (use $inc on numeric fields; job marks source events processed).
 */
const DailyAnalyticsSchema = new mongoose.Schema({

  // ── Identity ──────────────────────────────────────────────────────────
  domain: {
    type: String,
    enum: ['sacco', 'school', 'delivery'],
    required: [true, 'Domain is required'],
    index: true
  },

  entityType: {
    type: String,
    enum: ['vehicle', 'driver'],
    required: [true, 'Entity type is required']
  },

  entityId: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Entity ID is required'],
    index: true
  },

  // Midnight UTC of the day this document covers
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },

  // ── Trip metrics ──────────────────────────────────────────────────────
  trips: {
    total:            { type: Number, default: 0 },
    completed:        { type: Number, default: 0 },
    cancelled:        { type: Number, default: 0 },
    totalDistanceKm:  { type: Number, default: 0 },
    totalDurationMin: { type: Number, default: 0 }
  },

  // ── Passenger metrics (sacco + school) ───────────────────────────────
  passengers: {
    boarded: { type: Number, default: 0 },
    alighted: { type: Number, default: 0 },
    peak:     { type: Number, default: 0 }   // max passengers in one trip this day
  },

  // ── Revenue (sacco only) ──────────────────────────────────────────────
  revenue: {
    collected: { type: Number, default: 0 },  // sum of TICKET_PAID payload.amount
    reported:  { type: Number, default: 0 },  // from TRIP_COMPLETED payload.summary
    variance:  { type: Number, default: 0 }   // collected - reported (set on job run)
  },

  // ── Compliance / violation counts ─────────────────────────────────────
  violations: {
    speed:          { type: Number, default: 0 },
    overloading:    { type: Number, default: 0 },
    routeDeviation: { type: Number, default: 0 },
    operatingHours: { type: Number, default: 0 }  // school only
  },

  // ── Delivery metrics ──────────────────────────────────────────────────
  deliveries: {
    total:      { type: Number, default: 0 },
    successful: { type: Number, default: 0 },
    failed:     { type: Number, default: 0 },
    returned:   { type: Number, default: 0 }
  },

  // ── Behaviour score (averaged across completed trips) ─────────────────
  behaviourScore: {
    average: { type: Number },
    min:     { type: Number },
    max:     { type: Number }
  },

  // ── Meta ──────────────────────────────────────────────────────────────
  eventCount:  { type: Number, default: 0 },   // PlatformEvents aggregated into this doc
  lastUpdated: { type: Date }

}, {
  versionKey: false
});

// ── Indexes ───────────────────────────────────────────────────────────────
// Primary query pattern: fetch one entity's history
DailyAnalyticsSchema.index({ domain: 1, entityId: 1, date: -1 });

// Domain-wide daily summary
DailyAnalyticsSchema.index({ domain: 1, date: -1 });

// Unique: one record per entity per day
DailyAnalyticsSchema.index({ entityId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('DailyAnalytics', DailyAnalyticsSchema);
