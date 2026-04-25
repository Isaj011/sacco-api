const PlatformEvent = require('../models/PlatformEvent');

/**
 * platformEventService
 *
 * Single helper used by all domain processors and services to write
 * to the central PlatformEvent collection. Never write to PlatformEvent
 * directly — always go through this service so indexing and defaults
 * are applied consistently.
 */

/**
 * Write a single platform event.
 *
 * @param {object} opts
 * @param {'sacco'|'school'|'delivery'|'platform'} opts.domain
 * @param {string}   opts.eventType   - e.g. 'SPEED_VIOLATION'
 * @param {string}   opts.entityType  - e.g. 'sacco_vehicle'
 * @param {ObjectId} opts.entityId
 * @param {object}   [opts.location]  - { latitude, longitude, accuracy }
 * @param {object}   [opts.payload]   - domain-specific data
 * @param {string}   [opts.source]    - defaults to 'iot_device'
 * @param {string}   [opts.deviceId]
 * @param {Date}     [opts.timestamp] - device-reported time; defaults to now
 * @param {boolean}  [opts.ntsa]      - true = mark processedForNTSA: false (needs push)
 * @returns {Promise<PlatformEvent>}
 */
exports.write = async (opts) => {
  try {
    const event = await PlatformEvent.create({
      domain:     opts.domain,
      eventType:  opts.eventType,
      entityType: opts.entityType,
      entityId:   opts.entityId,
      location:   opts.location   || undefined,
      payload:    opts.payload    || {},
      source:     opts.source     || 'iot_device',
      deviceId:   opts.deviceId   || undefined,
      timestamp:  opts.timestamp  ? new Date(opts.timestamp) : new Date(),
      processedForAnalytics: false,
      processedForNTSA:      opts.ntsa ? false : true  // true = already handled / not needed
    });
    return event;
  } catch (err) {
    // Event bus failure must never crash the main request — log and continue
    console.error('[PlatformEvent] write failed:', err.message, opts);
    return null;
  }
};

/**
 * Write multiple events in one batch (more efficient than calling write() in a loop).
 *
 * @param {object[]} events - array of opts objects (same shape as write())
 * @returns {Promise<PlatformEvent[]>}
 */
exports.writeBatch = async (events) => {
  try {
    const docs = events.map(opts => ({
      domain:     opts.domain,
      eventType:  opts.eventType,
      entityType: opts.entityType,
      entityId:   opts.entityId,
      location:   opts.location  || undefined,
      payload:    opts.payload   || {},
      source:     opts.source    || 'iot_device',
      deviceId:   opts.deviceId  || undefined,
      timestamp:  opts.timestamp ? new Date(opts.timestamp) : new Date(),
      processedForAnalytics: false,
      processedForNTSA:      opts.ntsa ? false : true
    }));

    const created = await PlatformEvent.insertMany(docs, { ordered: false });
    return created;
  } catch (err) {
    console.error('[PlatformEvent] writeBatch failed:', err.message);
    return [];
  }
};

/**
 * Mark a batch of events as processed for NTSA (after successful push).
 *
 * @param {ObjectId[]} ids
 */
exports.markNTSAProcessed = async (ids) => {
  await PlatformEvent.updateMany(
    { _id: { $in: ids } },
    { $set: { processedForNTSA: true } }
  );
};

/**
 * Mark a batch of events as processed for Analytics.
 *
 * @param {ObjectId[]} ids
 */
exports.markAnalyticsProcessed = async (ids) => {
  await PlatformEvent.updateMany(
    { _id: { $in: ids } },
    { $set: { processedForAnalytics: true } }
  );
};

/**
 * Fetch unprocessed NTSA compliance events (for the NTSA push job).
 * Compliance events: SPEED_VIOLATION, ROUTE_DEVIATION, OVERLOADING, OPERATING_HOURS_VIOLATION
 *
 * @param {number} limit
 */
exports.getPendingNTSAEvents = async (limit = 100) => {
  return PlatformEvent.find({
    processedForNTSA: false,
    eventType: {
      $in: [
        'SPEED_VIOLATION',
        'ROUTE_DEVIATION',
        'OVERLOADING',
        'OPERATING_HOURS_VIOLATION',
        'DRIVER_DOC_EXPIRY',
        'VEHICLE_DOC_EXPIRY'
      ]
    }
  })
    .sort({ timestamp: 1 })
    .limit(limit);
};

/**
 * Fetch unprocessed analytics events (for the nightly analytics job).
 *
 * @param {string} domain
 * @param {number} limit
 */
exports.getPendingAnalyticsEvents = async (domain, limit = 1000) => {
  const query = { processedForAnalytics: false };
  if (domain) query.domain = domain;
  return PlatformEvent.find(query).sort({ timestamp: 1 }).limit(limit);
};
