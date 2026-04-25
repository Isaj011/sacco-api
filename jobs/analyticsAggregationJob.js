const DailyAnalytics = require('../models/DailyAnalytics');
const platformEventService = require('../services/platformEventService');
const PlatformEvent = require('../models/PlatformEvent');

/**
 * analyticsAggregationJob
 *
 * Reads PlatformEvents with processedForAnalytics: false,
 * aggregates them into DailyAnalytics documents,
 * marks events as processed.
 *
 * Run nightly before the 7-day TTL fires.
 * Safe to run multiple times (upsert logic).
 */

/**
 * Derive midnight UTC for a given Date (the "day bucket" key).
 *
 * @param {Date} d
 * @returns {Date}
 */
function toMidnightUTC(d) {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

/**
 * Map PlatformEvent.entityType to the simplified entityType used in DailyAnalytics.
 *
 * @param {string} entityType  — e.g. 'sacco_vehicle', 'school_driver'
 * @returns {'vehicle'|'driver'}
 */
function deriveEntityType(entityType) {
  if (typeof entityType === 'string') {
    if (entityType.endsWith('_driver')) return 'driver';
    if (entityType.endsWith('_vehicle')) return 'vehicle';
  }
  return 'vehicle'; // default
}

/**
 * Build a composite group key from an event.
 *
 * @param {object} event
 * @returns {string}
 */
function groupKey(event) {
  const date = toMidnightUTC(event.timestamp);
  return `${event.domain}|${event.entityId}|${date.toISOString()}`;
}

/**
 * Run the analytics aggregation job.
 *
 * @param {object} [opts]
 * @param {string} [opts.domain]     — restrict to one domain (optional)
 * @param {number} [opts.batchSize]  — default 500
 * @returns {Promise<{ processed: number, groups: number, errors: string[] }>}
 */
exports.run = async (opts = {}) => {
  const { domain, batchSize = 500 } = opts;
  const result = { processed: 0, groups: 0, errors: [] };

  let events;
  try {
    events = await platformEventService.getPendingAnalyticsEvents(domain, batchSize);
  } catch (err) {
    result.errors.push(`Failed to fetch pending events: ${err.message}`);
    return result;
  }

  if (!events || events.length === 0) {
    return result;
  }

  // ── Group events by { domain, entityId, date (midnight UTC) } ──────────
  const groups = new Map(); // key → { domain, entityId, entityType, date, events[] }

  for (const event of events) {
    const key = groupKey(event);

    if (!groups.has(key)) {
      groups.set(key, {
        domain:     event.domain,
        entityId:   event.entityId,
        entityType: deriveEntityType(event.entityType),
        date:       toMidnightUTC(event.timestamp),
        events:     []
      });
    }

    groups.get(key).events.push(event);
  }

  // ── Process each group — build $inc update and upsert ─────────────────
  const processedIds = [];

  for (const [, group] of groups) {
    const incFields = {
      eventCount: group.events.length
    };

    for (const event of group.events) {
      const p = event.payload || {};

      switch (event.eventType) {

        // ── Trip lifecycle ────────────────────────────────────────────
        case 'TRIP_STARTED':
          incFields['trips.total'] = (incFields['trips.total'] || 0) + 1;
          break;

        case 'TRIP_COMPLETED':
        case 'TRIP_ENDED':
          incFields['trips.completed'] = (incFields['trips.completed'] || 0) + 1;
          if (p.summary) {
            if (p.summary.distanceKm) {
              incFields['trips.totalDistanceKm'] =
                (incFields['trips.totalDistanceKm'] || 0) + (p.summary.distanceKm || 0);
            }
            if (p.summary.durationMin) {
              incFields['trips.totalDurationMin'] =
                (incFields['trips.totalDurationMin'] || 0) + (p.summary.durationMin || 0);
            }
            if (p.summary.revenue !== undefined) {
              incFields['revenue.reported'] =
                (incFields['revenue.reported'] || 0) + (p.summary.revenue || 0);
            }
          }
          break;

        case 'TRIP_CANCELLED':
          incFields['trips.cancelled'] = (incFields['trips.cancelled'] || 0) + 1;
          break;

        // ── Passenger events ──────────────────────────────────────────
        case 'PASSENGER_BOARDED':
          incFields['passengers.boarded'] =
            (incFields['passengers.boarded'] || 0) + (p.count || 1);
          break;

        case 'PASSENGER_ALIGHTED':
          incFields['passengers.alighted'] =
            (incFields['passengers.alighted'] || 0) + (p.count || 1);
          break;

        // ── School student events (map to passenger metrics) ──────────
        case 'STUDENT_PICKED_UP':
          incFields['passengers.boarded'] = (incFields['passengers.boarded'] || 0) + 1;
          break;

        case 'STUDENT_DROPPED_OFF':
          incFields['passengers.alighted'] = (incFields['passengers.alighted'] || 0) + 1;
          break;

        // ── Revenue ───────────────────────────────────────────────────
        case 'TICKET_PAID':
          incFields['revenue.collected'] =
            (incFields['revenue.collected'] || 0) + (p.amount || 0);
          break;

        // ── Violations ────────────────────────────────────────────────
        case 'SPEED_VIOLATION':
          incFields['violations.speed'] = (incFields['violations.speed'] || 0) + 1;
          break;

        case 'OVERLOADING':
          incFields['violations.overloading'] = (incFields['violations.overloading'] || 0) + 1;
          break;

        case 'ROUTE_DEVIATION':
          incFields['violations.routeDeviation'] =
            (incFields['violations.routeDeviation'] || 0) + 1;
          break;

        case 'OPERATING_HOURS_VIOLATION':
          incFields['violations.operatingHours'] =
            (incFields['violations.operatingHours'] || 0) + 1;
          break;

        // ── Delivery events ───────────────────────────────────────────
        case 'PARCEL_DELIVERED':
          incFields['deliveries.successful'] =
            (incFields['deliveries.successful'] || 0) + 1;
          incFields['deliveries.total'] = (incFields['deliveries.total'] || 0) + 1;
          break;

        case 'DELIVERY_FAILED':
          incFields['deliveries.failed'] = (incFields['deliveries.failed'] || 0) + 1;
          incFields['deliveries.total'] = (incFields['deliveries.total'] || 0) + 1;
          break;

        default:
          // Unrecognised event type — count it in eventCount only
          break;
      }
    }

    // ── Upsert DailyAnalytics document ───────────────────────────────
    try {
      await DailyAnalytics.findOneAndUpdate(
        {
          domain:   group.domain,
          entityId: group.entityId,
          date:     group.date
        },
        {
          $inc: incFields,
          $set: { lastUpdated: new Date() },
          $setOnInsert: {
            domain:     group.domain,
            entityType: group.entityType,
            entityId:   group.entityId,
            date:       group.date
          }
        },
        { upsert: true, new: false }
      );

      // Collect processed event IDs from this group
      for (const event of group.events) {
        processedIds.push(event._id);
      }

      result.groups += 1;
    } catch (err) {
      result.errors.push(
        `Upsert failed for ${group.domain}/${group.entityId}/${group.date.toISOString()}: ${err.message}`
      );
    }
  }

  // ── Mark all successfully processed events ────────────────────────────
  if (processedIds.length > 0) {
    try {
      await platformEventService.markAnalyticsProcessed(processedIds);
      result.processed = processedIds.length;
    } catch (err) {
      result.errors.push(`markAnalyticsProcessed failed: ${err.message}`);
    }
  }

  return result;
};

/**
 * Backfill analytics for a specific date range.
 *
 * Queries PlatformEvent directly (bypassing the processedForAnalytics flag)
 * so it can reprocess historical data. Useful after schema changes or
 * initial data import.
 *
 * @param {Date}   startDate
 * @param {Date}   endDate
 * @param {string} [domain]     — restrict to one domain
 * @param {number} [batchSize]  — default 500
 * @returns {Promise<{ processed: number, groups: number, errors: string[] }>}
 */
exports.runForDateRange = async (startDate, endDate, domain, batchSize = 500) => {
  const result = { processed: 0, groups: 0, errors: [] };

  let events;
  try {
    const query = {
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    if (domain) query.domain = domain;

    events = await PlatformEvent.find(query).sort({ timestamp: 1 }).limit(batchSize);
  } catch (err) {
    result.errors.push(`Failed to fetch events for date range: ${err.message}`);
    return result;
  }

  if (!events || events.length === 0) {
    return result;
  }

  // ── Group events ──────────────────────────────────────────────────────
  const groups = new Map();

  for (const event of events) {
    const key = groupKey(event);

    if (!groups.has(key)) {
      groups.set(key, {
        domain:     event.domain,
        entityId:   event.entityId,
        entityType: deriveEntityType(event.entityType),
        date:       toMidnightUTC(event.timestamp),
        events:     []
      });
    }

    groups.get(key).events.push(event);
  }

  // ── Upsert each group (same logic as run()) ───────────────────────────
  for (const [, group] of groups) {
    const incFields = { eventCount: group.events.length };

    for (const event of group.events) {
      const p = event.payload || {};

      switch (event.eventType) {
        case 'TRIP_STARTED':
          incFields['trips.total'] = (incFields['trips.total'] || 0) + 1;
          break;
        case 'TRIP_COMPLETED':
        case 'TRIP_ENDED':
          incFields['trips.completed'] = (incFields['trips.completed'] || 0) + 1;
          if (p.summary) {
            if (p.summary.distanceKm)
              incFields['trips.totalDistanceKm'] =
                (incFields['trips.totalDistanceKm'] || 0) + (p.summary.distanceKm || 0);
            if (p.summary.durationMin)
              incFields['trips.totalDurationMin'] =
                (incFields['trips.totalDurationMin'] || 0) + (p.summary.durationMin || 0);
            if (p.summary.revenue !== undefined)
              incFields['revenue.reported'] =
                (incFields['revenue.reported'] || 0) + (p.summary.revenue || 0);
          }
          break;
        case 'TRIP_CANCELLED':
          incFields['trips.cancelled'] = (incFields['trips.cancelled'] || 0) + 1;
          break;
        case 'PASSENGER_BOARDED':
          incFields['passengers.boarded'] =
            (incFields['passengers.boarded'] || 0) + (p.count || 1);
          break;
        case 'PASSENGER_ALIGHTED':
          incFields['passengers.alighted'] =
            (incFields['passengers.alighted'] || 0) + (p.count || 1);
          break;
        case 'STUDENT_PICKED_UP':
          incFields['passengers.boarded'] = (incFields['passengers.boarded'] || 0) + 1;
          break;
        case 'STUDENT_DROPPED_OFF':
          incFields['passengers.alighted'] = (incFields['passengers.alighted'] || 0) + 1;
          break;
        case 'TICKET_PAID':
          incFields['revenue.collected'] =
            (incFields['revenue.collected'] || 0) + (p.amount || 0);
          break;
        case 'SPEED_VIOLATION':
          incFields['violations.speed'] = (incFields['violations.speed'] || 0) + 1;
          break;
        case 'OVERLOADING':
          incFields['violations.overloading'] = (incFields['violations.overloading'] || 0) + 1;
          break;
        case 'ROUTE_DEVIATION':
          incFields['violations.routeDeviation'] =
            (incFields['violations.routeDeviation'] || 0) + 1;
          break;
        case 'OPERATING_HOURS_VIOLATION':
          incFields['violations.operatingHours'] =
            (incFields['violations.operatingHours'] || 0) + 1;
          break;
        case 'PARCEL_DELIVERED':
          incFields['deliveries.successful'] =
            (incFields['deliveries.successful'] || 0) + 1;
          incFields['deliveries.total'] = (incFields['deliveries.total'] || 0) + 1;
          break;
        case 'DELIVERY_FAILED':
          incFields['deliveries.failed'] = (incFields['deliveries.failed'] || 0) + 1;
          incFields['deliveries.total'] = (incFields['deliveries.total'] || 0) + 1;
          break;
        default:
          break;
      }
    }

    try {
      await DailyAnalytics.findOneAndUpdate(
        { domain: group.domain, entityId: group.entityId, date: group.date },
        {
          $inc: incFields,
          $set: { lastUpdated: new Date() },
          $setOnInsert: {
            domain:     group.domain,
            entityType: group.entityType,
            entityId:   group.entityId,
            date:       group.date
          }
        },
        { upsert: true, new: false }
      );

      result.processed += group.events.length;
      result.groups += 1;
    } catch (err) {
      result.errors.push(
        `Backfill upsert failed for ${group.domain}/${group.entityId}/${group.date.toISOString()}: ${err.message}`
      );
    }
  }

  return result;
};
