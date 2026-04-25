const Alert = require('../models/Alert');
const ComplianceProfile = require('../models/ComplianceProfile');
const platformEventService = require('./platformEventService');

/**
 * DeliveryIoTProcessor
 *
 * Receives structured event batches from the IoT gateway (Android device
 * on a delivery motorcycle/van/truck) and processes each event type.
 *
 * Domains that apply (Kenya):
 *  - Communications Authority of Kenya (CAK) Courier License
 *  - Kenya Traffic Act Cap 403 (speed limits, vehicle standards)
 *  - Commercial Vehicle License (KES 2,000/year via NTSA)
 *
 * NOTE: The full DeliveryVehicle, Parcel, and DeliveryOrder models are
 * created in Phase 2 of the platform roadmap. Until those models are
 * available this processor writes all events to PlatformEvent for later
 * consumption by the analytics and NTSA push jobs. Vehicle compliance
 * heartbeats are still tracked via ComplianceProfile.
 */

const SPEED_LIMIT_KMH = 80;

/**
 * Process a batch of events for one delivery vehicle.
 *
 * @param {object} payload
 * @param {string} payload.deviceId
 * @param {string} payload.vehicleId   — DeliveryVehicle ObjectId (or placeholder)
 * @param {string} [payload.orderId]   — DeliveryOrder ObjectId (if order active)
 * @param {Array}  payload.events      — [ { type, payload, timestamp? } ]
 * @returns {Promise<{ processed: number, alerts: number, errors: string[] }>}
 */
exports.process = async (payload) => {
  const { deviceId, vehicleId, orderId, events = [] } = payload;
  const result = { processed: 0, alerts: 0, errors: [] };

  if (!vehicleId) {
    result.errors.push('vehicleId is required for delivery domain');
    return result;
  }

  // ── Update speed limiter heartbeat ───────────────────────────────
  // ComplianceProfile may or may not exist yet — findOneAndUpdate is safe
  await ComplianceProfile.findOneAndUpdate(
    { entityId: vehicleId, entityType: 'vehicle' },
    { $set: { 'vehicleFlags.speedLimiterLastHeartbeat': new Date() } }
  );

  // ── Process each event ───────────────────────────────────────────
  for (const event of events) {
    try {
      await _processEvent(vehicleId, event, deviceId, orderId, result);
      result.processed++;
    } catch (err) {
      result.errors.push(`${event.type}: ${err.message}`);
    }
  }

  return result;
};

// ── Private: dispatch single event ───────────────────────────────────
async function _processEvent (vehicleId, event, deviceId, orderId, result) {
  const { type, payload, timestamp } = event;
  const ts = timestamp ? new Date(timestamp) : new Date();

  switch (type) {

    case 'LOCATION_UPDATE':
      await _handleLocationUpdate(vehicleId, payload, deviceId, orderId, ts, result);
      break;

    case 'PARCEL_PICKED_UP':
      await platformEventService.write({
        domain: 'delivery', eventType: 'PARCEL_PICKED_UP',
        entityType: 'delivery_vehicle', entityId: vehicleId,
        location:  _loc(payload),
        payload:   { ...payload, orderId },
        deviceId,  timestamp: ts
      });
      break;

    case 'PARCEL_IN_TRANSIT':
      await platformEventService.write({
        domain: 'delivery', eventType: 'PARCEL_IN_TRANSIT',
        entityType: 'delivery_vehicle', entityId: vehicleId,
        location:  _loc(payload),
        payload:   { ...payload, orderId },
        deviceId,  timestamp: ts
      });
      break;

    case 'PARCEL_DELIVERED':
      await platformEventService.write({
        domain: 'delivery', eventType: 'PARCEL_DELIVERED',
        entityType: 'delivery_vehicle', entityId: vehicleId,
        location:  _loc(payload),
        payload:   { ...payload, orderId, proofOfDelivery: payload.proofOfDelivery },
        deviceId,  timestamp: ts
      });
      break;

    case 'DELIVERY_FAILED':
      await platformEventService.write({
        domain: 'delivery', eventType: 'DELIVERY_FAILED',
        entityType: 'delivery_vehicle', entityId: vehicleId,
        location:  _loc(payload),
        payload:   { ...payload, orderId, reason: payload.reason },
        deviceId,  timestamp: ts
      });
      break;

    case 'TRIP_STARTED':
      await platformEventService.write({
        domain: 'delivery', eventType: 'TRIP_STARTED',
        entityType: 'delivery_vehicle', entityId: vehicleId,
        location:  _loc(payload),
        payload:   { orderId, driverId: payload.driverId },
        deviceId,  timestamp: ts
      });
      break;

    case 'TRIP_ENDED':
      await platformEventService.write({
        domain: 'delivery', eventType: 'TRIP_ENDED',
        entityType: 'delivery_vehicle', entityId: vehicleId,
        location:  _loc(payload),
        payload:   { orderId, summary: payload.summary },
        deviceId,  timestamp: ts
      });
      break;

    case 'SPEED_ALERT':
      await _raiseSpeedViolation(vehicleId, payload, deviceId, orderId, ts, result);
      break;

    case 'ROUTE_DEVIATION':
      await platformEventService.write({
        domain: 'delivery', eventType: 'ROUTE_DEVIATION',
        entityType: 'delivery_vehicle', entityId: vehicleId,
        location:  _loc(payload),
        payload:   { ...payload, orderId },
        deviceId,  timestamp: ts,
        ntsa:      true
      });
      result.alerts++;
      break;

    default:
      await platformEventService.write({
        domain: 'delivery', eventType: type,
        entityType: 'delivery_vehicle', entityId: vehicleId,
        payload: { ...payload, orderId, _unknown: true },
        deviceId, timestamp: ts
      });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────

async function _handleLocationUpdate (vehicleId, payload, deviceId, orderId, ts, result) {
  const { latitude, longitude, speed = 0, heading, accuracy } = payload;

  // Speed check
  if (speed > SPEED_LIMIT_KMH) {
    await _raiseSpeedViolation(vehicleId, { latitude, longitude, speed }, deviceId, orderId, ts, result);
  }

  // PlatformEvent — NTSA tracks commercial vehicle locations
  await platformEventService.write({
    domain:     'delivery',
    eventType:  'LOCATION_UPDATE',
    entityType: 'delivery_vehicle',
    entityId:   vehicleId,
    location:   { latitude, longitude, accuracy },
    payload:    { speed, heading, orderId },
    source:     'iot_device',
    deviceId,
    timestamp:  ts,
    ntsa:       true
  });
}

// ── Violation helpers ─────────────────────────────────────────────────

async function _raiseSpeedViolation (vehicleId, payload, deviceId, orderId, ts, result) {
  const { latitude, longitude, speed } = payload;

  await Alert.create({
    type:       'speed_violation',
    severity:   speed > 120 ? 'critical' : 'high',
    title:      `Speed Violation — Delivery Vehicle`,
    message:    `Delivery vehicle recorded ${speed} km/h (limit: ${SPEED_LIMIT_KMH} km/h).`,
    entityId:   vehicleId,
    entityType: 'vehicle',
    status:     'active',
    metadata:   { speed, limit: SPEED_LIMIT_KMH, orderId, deviceId }
  });

  await platformEventService.write({
    domain:     'delivery',
    eventType:  'SPEED_VIOLATION',
    entityType: 'delivery_vehicle',
    entityId:   vehicleId,
    location:   { latitude, longitude },
    payload:    { speed, limit: SPEED_LIMIT_KMH, orderId },
    deviceId,
    timestamp:  ts,
    ntsa:       true
  });

  result.alerts++;
}

// ── Utility ───────────────────────────────────────────────────────────
function _loc (payload) {
  if (!payload) return undefined;
  const lat = payload.latitude  || payload.location?.latitude;
  const lng = payload.longitude || payload.location?.longitude;
  if (!lat || !lng) return undefined;
  return { latitude: lat, longitude: lng, accuracy: payload.accuracy };
}
