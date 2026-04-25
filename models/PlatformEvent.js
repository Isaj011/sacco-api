const mongoose = require('mongoose');

/**
 * PlatformEvent — Central event bus for all domains.
 *
 * Every domain (Sacco, School, Delivery) writes here when something
 * significant happens. Analytics, NTSA feed, and monitoring all read
 * from this collection. Raw events expire after 7 days via TTL index;
 * the nightly analytics job aggregates them before they expire.
 */
const PlatformEventSchema = new mongoose.Schema({

  // ── Domain stamp ──────────────────────────────────────────────────
  domain: {
    type: String,
    enum: ['sacco', 'school', 'delivery', 'platform'],
    required: [true, 'Domain is required'],
    index: true
  },

  // ── What happened ─────────────────────────────────────────────────
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    index: true
    /**
     * Sacco:
     *   TRIP_STARTED, TRIP_COMPLETED, TRIP_CANCELLED
     *   LOCATION_UPDATE
     *   PASSENGER_BOARDED, PASSENGER_ALIGHTED
     *   SPEED_VIOLATION, ROUTE_DEVIATION, OVERLOADING
     *   TICKET_PAID, TICKET_FAILED
     *   DRIVER_DOC_EXPIRY, VEHICLE_DOC_EXPIRY
     *   COMPLIANCE_STATUS_CHANGED
     *
     * School:
     *   SCHOOL_VEHICLE_LOCATION
     *   TRIP_STARTED, TRIP_ENDED
     *   STUDENT_PICKED_UP, STUDENT_DROPPED_OFF
     *   TRIP_DELAY, ROUTE_DEVIATION
     *   OPERATING_HOURS_VIOLATION  (outside 6am–6pm)
     *   DRIVER_DOC_EXPIRY, VEHICLE_DOC_EXPIRY
     *
     * Delivery:
     *   ORDER_PLACED, ORDER_PAID, ORDER_ASSIGNED
     *   PARCEL_PICKED_UP, PARCEL_IN_TRANSIT
     *   PARCEL_DELIVERED, DELIVERY_FAILED
     *   ROUTE_DEVIATION
     *   DRIVER_DOC_EXPIRY, VEHICLE_DOC_EXPIRY
     *
     * Platform:
     *   ALERT_CREATED, ALERT_RESOLVED
     *   COMPLIANCE_SCORE_UPDATED
     *   NTSA_PUSH_SENT, NTSA_PUSH_FAILED
     *   SYSTEM_HEALTH
     */
  },

  // ── Primary entity this event is about ───────────────────────────
  entityType: {
    type: String,
    enum: [
      // Sacco
      'sacco_vehicle', 'sacco_driver', 'sacco_trip', 'sacco_ticket',
      // School
      'school_vehicle', 'school_driver', 'school_trip', 'school_student',
      // Delivery
      'delivery_vehicle', 'delivery_driver', 'delivery_order', 'parcel',
      // Cross-cutting
      'user', 'alert', 'system'
    ],
    required: [true, 'Entity type is required']
  },
  entityId: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Entity ID is required'],
    index: true
  },

  // ── Where it happened ────────────────────────────────────────────
  location: {
    latitude:  { type: Number, min: -90,  max: 90  },
    longitude: { type: Number, min: -180, max: 180 },
    accuracy:  { type: Number, min: 0 }
  },

  // ── Structured payload (domain-specific, flexible) ───────────────
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // ── Source of this event ─────────────────────────────────────────
  source: {
    type: String,
    enum: ['iot_device', 'system', 'user_action', 'background_job', 'webhook'],
    default: 'iot_device'
  },
  deviceId: {
    type: String,
    required: false
  },

  // ── Timing ───────────────────────────────────────────────────────
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // ── Processing flags (batch jobs flip these after consuming) ─────
  processedForAnalytics: {
    type: Boolean,
    default: false,
    index: true
  },
  processedForNTSA: {
    type: Boolean,
    default: false,
    index: true
  }

}, {
  // No timestamps: true — we manage timestamp ourselves for device-reported times
  versionKey: false
});

// ── Indexes ───────────────────────────────────────────────────────────
// Primary query patterns
PlatformEventSchema.index({ domain: 1, eventType: 1, timestamp: -1 });
PlatformEventSchema.index({ entityId: 1, timestamp: -1 });
PlatformEventSchema.index({ domain: 1, processedForAnalytics: 1, timestamp: 1 });
PlatformEventSchema.index({ domain: 1, processedForNTSA: 1, timestamp: 1 });

// Geo queries for heatmaps / stage analysis
PlatformEventSchema.index({
  'location.latitude': 1,
  'location.longitude': 1,
  timestamp: -1
});

// NTSA compliance event fast lookup
PlatformEventSchema.index({
  eventType: 1,
  processedForNTSA: 1,
  timestamp: -1
});

// ── TTL — raw events expire after 7 days ──────────────────────────────
// Analytics job must consume events before this fires.
PlatformEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 604800 } // 7 days
);

module.exports = mongoose.model('PlatformEvent', PlatformEventSchema);
