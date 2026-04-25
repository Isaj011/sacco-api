const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');
const Alert = require('../models/Alert');
const ComplianceProfile = require('../models/ComplianceProfile');
const SaccoTrip = require('../models/SaccoTrip');
const platformEventService = require('./platformEventService');
const complianceService = require('./complianceService');

/**
 * SaccoIoTProcessor
 *
 * Receives structured event batches from the IoT gateway (sourced from
 * the Android app on a Sacco vehicle) and processes each event type.
 *
 * Responsibilities:
 *  - Update Vehicle model (location, speed, passengers, metrics)
 *  - Create VehicleLocationHistory entries (single path — no duplicates)
 *  - Run real-time compliance checks (speed, overloading, route deviation)
 *  - Write PlatformEvents for every significant event
 *  - Create Alerts for violations
 *  - Update ComplianceProfile.vehicleFlags.speedLimiterLastHeartbeat
 */

const SPEED_LIMIT_KMH   = 80;
const OVERLOAD_THRESHOLD = 0; // 0 = strictly > seatingCapacity

/**
 * Process a batch of events for one Sacco vehicle.
 *
 * @param {object} payload
 * @param {string} payload.deviceId
 * @param {string} payload.vehicleId   — MongoDB ObjectId string
 * @param {string} [payload.tripId]    — SaccoTrip ObjectId (if trip active)
 * @param {Array}  payload.events      — [ { type, payload, timestamp? } ]
 * @returns {Promise<{ processed: number, alerts: number, errors: string[] }>}
 */
exports.process = async (payload) => {
  const { deviceId, vehicleId, tripId, events = [] } = payload;
  const result = { processed: 0, alerts: 0, errors: [] };

  // ── Resolve vehicle ──────────────────────────────────────────────
  const vehicle = await Vehicle.findById(vehicleId).select(
    'plateNumber seatingCapacity assignedRoute currentDriver ' +
    'currentLocation currentMetrics deviceId deviceStatus complianceStatus'
  );

  if (!vehicle) {
    result.errors.push(`Vehicle ${vehicleId} not found`);
    return result;
  }

  // ── Update speed limiter heartbeat ───────────────────────────────
  await ComplianceProfile.findOneAndUpdate(
    { entityId: vehicle._id, entityType: 'vehicle' },
    { $set: { 'vehicleFlags.speedLimiterLastHeartbeat': new Date() } }
  );

  // ── Update device online status ───────────────────────────────────
  await Vehicle.findByIdAndUpdate(vehicleId, {
    $set: {
      lastIoTUpdate:              new Date(),
      'deviceStatus.lastSeen':    new Date(),
      'deviceStatus.online':      true,
      deviceId:                   deviceId
    }
  });

  // ── Process each event ───────────────────────────────────────────
  for (const event of events) {
    try {
      await _processEvent(vehicle, event, deviceId, tripId, result);
      result.processed++;
    } catch (err) {
      result.errors.push(`${event.type}: ${err.message}`);
    }
  }

  return result;
};

// ── Private: dispatch single event ───────────────────────────────────
async function _processEvent (vehicle, event, deviceId, tripId, result) {
  const { type, payload, timestamp } = event;
  const ts = timestamp ? new Date(timestamp) : new Date();

  switch (type) {

    case 'LOCATION_UPDATE':
      await _handleLocationUpdate(vehicle, payload, deviceId, tripId, ts, result);
      break;

    case 'PASSENGER_BOARDED':
      await _handlePassengerBoarded(vehicle, payload, deviceId, tripId, ts, result);
      break;

    case 'PASSENGER_ALIGHTED':
      await _handlePassengerAlighted(vehicle, payload, deviceId, tripId, ts, result);
      break;

    case 'SPEED_ALERT':
      await _handleSpeedAlert(vehicle, payload, deviceId, tripId, ts, result);
      break;

    case 'TRIP_STARTED':
      await _handleTripStarted(vehicle, payload, deviceId, ts);
      break;

    case 'TRIP_ENDED':
      await _handleTripEnded(vehicle, payload, deviceId, tripId, ts);
      break;

    case 'STOP_REACHED':
      await _handleStopReached(vehicle, payload, deviceId, tripId, ts);
      break;

    case 'FARE_COLLECTED':
      await _handleFareCollected(vehicle, payload, deviceId, tripId, ts);
      break;

    case 'DOOR_OPENED':
    case 'DOOR_CLOSED':
      await platformEventService.write({
        domain: 'sacco', eventType: type,
        entityType: 'sacco_vehicle', entityId: vehicle._id,
        location:   _loc(payload),
        payload:    { ...payload, tripId },
        deviceId,   timestamp: ts
      });
      break;

    default:
      // Unknown event — still write to PlatformEvent for audit
      await platformEventService.write({
        domain: 'sacco', eventType: type,
        entityType: 'sacco_vehicle', entityId: vehicle._id,
        payload: { ...payload, tripId, _unknown: true },
        deviceId, timestamp: ts
      });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────

async function _handleLocationUpdate (vehicle, payload, deviceId, tripId, ts, result) {
  const { latitude, longitude, speed = 0, heading, accuracy } = payload;

  // 1. Update vehicle current location
  await Vehicle.findByIdAndUpdate(vehicle._id, {
    $set: {
      'currentLocation.latitude':  latitude,
      'currentLocation.longitude': longitude,
      'currentLocation.updatedAt': ts,
      'currentMetrics.speed':      speed
    }
  });

  // 2. Create location history (single source — no duplicate from model hook
  //    because we use findByIdAndUpdate which bypasses post-save)
  await VehicleLocationHistory.create({
    vehicleId:  vehicle._id,
    timestamp:  ts,
    location:   { latitude, longitude, accuracy },
    speed:      { current: speed },
    heading,
    dataSource: 'IOT_DEVICE',
    deviceId
  });

  // 3. Real-time speed compliance check
  if (speed > SPEED_LIMIT_KMH) {
    await _raiseSpeedViolation(vehicle, { latitude, longitude, speed }, deviceId, tripId, ts, result);
  }

  // 4. Write platform event (NTSA needs location + speed every 5s)
  await platformEventService.write({
    domain:     'sacco',
    eventType:  'LOCATION_UPDATE',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    location:   { latitude, longitude, accuracy },
    payload:    { speed, heading, tripId },
    source:     'iot_device',
    deviceId,
    timestamp:  ts,
    ntsa:       true   // NTSA needs speed telemetry
  });
}

async function _handlePassengerBoarded (vehicle, payload, deviceId, tripId, ts, result) {
  const { count = 1, boardingStop, currentCount } = payload;

  // Update real-time passenger count
  const newCount = currentCount || (vehicle.currentMetrics?.passengerCount || 0) + count;
  await Vehicle.findByIdAndUpdate(vehicle._id, {
    $set:  { 'currentMetrics.passengerCount': newCount },
    $inc:  { totalPassengersFerried: count }
  });

  // Overloading check — Kenya Traffic Act: fines KES 20,000–100,000
  const overloaded = vehicle.seatingCapacity > 0 && newCount > vehicle.seatingCapacity;
  if (overloaded) {
    await _raiseOverloadingAlert(vehicle, { newCount, capacity: vehicle.seatingCapacity, boardingStop }, deviceId, tripId, ts, result);
  }

  await platformEventService.write({
    domain:     'sacco',
    eventType:  'PASSENGER_BOARDED',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    location:   _loc(payload),
    payload:    { count, boardingStop, currentCount: newCount, tripId, overloaded },
    deviceId,
    timestamp:  ts,
    ntsa:       overloaded
  });
}

async function _handlePassengerAlighted (vehicle, payload, deviceId, tripId, ts, result) {
  const { count = 1, alightingStop, currentCount } = payload;

  const newCount = currentCount !== undefined
    ? currentCount
    : Math.max(0, (vehicle.currentMetrics?.passengerCount || 0) - count);

  await Vehicle.findByIdAndUpdate(vehicle._id, {
    $set: { 'currentMetrics.passengerCount': newCount }
  });

  await platformEventService.write({
    domain:     'sacco',
    eventType:  'PASSENGER_ALIGHTED',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    location:   _loc(payload),
    payload:    { count, alightingStop, currentCount: newCount, tripId },
    deviceId,
    timestamp:  ts
  });
}

async function _handleSpeedAlert (vehicle, payload, deviceId, tripId, ts, result) {
  // Android already detected speed violation — treat same as server-side check
  await _raiseSpeedViolation(vehicle, payload, deviceId, tripId, ts, result);
}

async function _handleTripStarted (vehicle, payload, deviceId, ts) {
  await Vehicle.findByIdAndUpdate(vehicle._id, {
    $set: {
      status:                          'in_use',
      'currentMetrics.passengerCount': 0
    }
  });

  // Create a SaccoTrip record to track this trip end-to-end
  const saccoTrip = await SaccoTrip.create({
    vehicle:    vehicle._id,
    driver:     payload.driverId   || vehicle.currentDriver || null,
    route:      payload.courseId   || null,
    deviceId,
    status:     'in_progress',
    startedAt:  ts,
    startLocation: _loc(payload)
      ? { latitude: _loc(payload).latitude, longitude: _loc(payload).longitude, stopName: payload.startStop }
      : undefined
  });

  await platformEventService.write({
    domain:     'sacco',
    eventType:  'TRIP_STARTED',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    location:   _loc(payload),
    payload:    {
      courseId:    payload.courseId,
      driverId:    payload.driverId,
      fareConfig:  payload.fareConfig,
      saccoTripId: saccoTrip._id
    },
    deviceId,
    timestamp:  ts
  });
}

async function _handleTripEnded (vehicle, payload, deviceId, tripId, ts) {
  const summary    = payload.summary    || {};
  const compliance = payload.compliance || {};

  // ── Close SaccoTrip record ───────────────────────────────────────────
  const updatedTrip = await SaccoTrip.findOneAndUpdate(
    { vehicle: vehicle._id, status: 'in_progress' },
    {
      $set: {
        status:      'completed',
        endedAt:     ts,
        endLocation: _loc(payload)
          ? { latitude: _loc(payload).latitude, longitude: _loc(payload).longitude, stopName: payload.endStop }
          : undefined,
        'revenue.reported':              summary.totalRevenue      || 0,
        'revenue.expected':              summary.expectedRevenue   || 0,
        'compliance.speedViolations':    compliance.speedViolations    || 0,
        'compliance.harshBrakingEvents': compliance.harshBrakingEvents || 0,
        'compliance.routeDeviations':    compliance.routeDeviations    || 0,
        'compliance.overloadingOccurred':compliance.overloadingOccurred|| false,
        'compliance.distanceKm':         compliance.distanceKm         || 0,
        'compliance.behaviourScore':     compliance.behaviourScore      || 100
      }
    },
    { new: true }   // return the updated document — no second query needed
  );

  // ── Revenue variance check (KES 100 tolerance) ───────────────────────
  // variance = collected - reported; negative means collected < reported
  if (updatedTrip && updatedTrip.revenue.variance < -100) {
    await Alert.create({
      type:       'revenue_target_missed',
      severity:   'high',
      title:      `Revenue Discrepancy — ${vehicle.plateNumber}`,
      message:    `Collected KES ${updatedTrip.revenue.collected} vs reported KES ${updatedTrip.revenue.reported} ` +
                  `(variance: KES ${updatedTrip.revenue.variance}).`,
      entityId:   vehicle._id,
      entityType: 'vehicle',
      status:     'active',
      metadata:   {
        tripId:    updatedTrip._id,
        collected: updatedTrip.revenue.collected,
        reported:  updatedTrip.revenue.reported,
        variance:  updatedTrip.revenue.variance
      }
    });
  }

  // ── Update vehicle financial aggregates ──────────────────────────────
  if (summary.totalRevenue) {
    await Vehicle.findByIdAndUpdate(vehicle._id, {
      $set: { status: 'available', 'currentMetrics.passengerCount': 0 },
      $inc: {
        totalTrips:         1,
        totalIncome:        summary.totalRevenue || 0,
        averageDailyIncome: 0  // recalculated by analytics job
      }
    });
  } else {
    await Vehicle.findByIdAndUpdate(vehicle._id, {
      $set: { status: 'available', 'currentMetrics.passengerCount': 0 },
      $inc: { totalTrips: 1 }
    });
  }

  // ── Update driver behaviour metrics ──────────────────────────────────
  if (payload.compliance && vehicle.currentDriver) {
    await complianceService.recordTripBehaviour(vehicle.currentDriver, {
      speedViolations:    compliance.speedViolations    || 0,
      harshBrakingEvents: compliance.harshBrakingEvents || 0,
      routeDeviations:    compliance.routeDeviations    || 0,
      overloading:        compliance.overloadingOccurred|| false,
      distanceKm:         compliance.distanceKm         || 0,
      behaviourScore:     compliance.behaviourScore      || 100
    });
  }

  await platformEventService.write({
    domain:     'sacco',
    eventType:  'TRIP_COMPLETED',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    location:   _loc(payload),
    payload:    {
      tripId,
      saccoTripId: updatedTrip ? updatedTrip._id : null,
      summary,
      compliance: payload.compliance
    },
    deviceId,
    timestamp:  ts,
    ntsa:       true   // NTSA gets trip-level compliance summary
  });
}

async function _handleStopReached (vehicle, payload, deviceId, tripId, ts) {
  // Push stop record onto the active SaccoTrip
  await SaccoTrip.findOneAndUpdate(
    { vehicle: vehicle._id, status: 'in_progress' },
    {
      $push: {
        stops: {
          stopName:   payload.stopName,
          arrivedAt:  ts,
          passengersBoarded:  payload.passengersBoarded  || 0,
          passengersAlighted: payload.passengersAlighted || 0
        }
      }
    }
  );

  await platformEventService.write({
    domain:     'sacco',
    eventType:  'STOP_REACHED',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    location:   _loc(payload),
    payload:    { stopName: payload.stopName, tripId },
    deviceId,
    timestamp:  ts
  });
}

async function _handleFareCollected (vehicle, payload, deviceId, tripId, ts) {
  const {
    amount,
    method      = 'cash',
    mpesaCode,
    mpesaPhone,
    boardingStop,
    alightingStop
  } = payload;

  if (!amount || amount <= 0) return; // guard against bad data

  // Push the fare payment onto the active SaccoTrip
  // The pre-save hook on SaccoTrip will recompute revenue.collected automatically,
  // but findOneAndUpdate bypasses pre-save — so we $inc revenue.collected directly.
  await SaccoTrip.findOneAndUpdate(
    { vehicle: vehicle._id, status: 'in_progress' },
    {
      $push: {
        farePayments: {
          amount,
          method,
          mpesaCode:        mpesaCode   || undefined,
          mpesaPhone:       mpesaPhone  || undefined,
          boardingStop:     boardingStop  || undefined,
          alightingStop:    alightingStop || undefined,
          timestamp:        ts,
          syncedFromDevice: true
        }
      },
      $inc: { 'revenue.collected': amount }
    }
  );

  await platformEventService.write({
    domain:     'sacco',
    eventType:  'FARE_COLLECTED',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    location:   _loc(payload),
    payload:    { amount, method, mpesaCode, boardingStop, alightingStop, tripId },
    deviceId,
    timestamp:  ts
  });
}

// ── Violation helpers ─────────────────────────────────────────────────

async function _raiseSpeedViolation (vehicle, payload, deviceId, tripId, ts, result) {
  const { latitude, longitude, speed } = payload;

  // Alert
  await Alert.create({
    type:       'speed_violation',
    severity:   speed > 120 ? 'critical' : 'high',
    title:      `Speed Violation — ${vehicle.plateNumber}`,
    message:    `Vehicle recorded ${speed} km/h (limit: ${SPEED_LIMIT_KMH} km/h).`,
    entityId:   vehicle._id,
    entityType: 'vehicle',
    status:     'active',
    metadata:   { speed, limit: SPEED_LIMIT_KMH, tripId, deviceId }
  });

  // PlatformEvent — ntsa: true (must be pushed to NTSA IRSMS)
  await platformEventService.write({
    domain:     'sacco',
    eventType:  'SPEED_VIOLATION',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    location:   { latitude, longitude },
    payload:    { speed, limit: SPEED_LIMIT_KMH, tripId, plateNumber: vehicle.plateNumber },
    deviceId,
    timestamp:  ts,
    ntsa:       true
  });

  result.alerts++;
}

async function _raiseOverloadingAlert (vehicle, payload, deviceId, tripId, ts, result) {
  const { newCount, capacity, boardingStop } = payload;

  await Alert.create({
    type:       'capacity_overflow',
    severity:   'high',
    title:      `Overloading — ${vehicle.plateNumber}`,
    message:    `Vehicle has ${newCount} passengers (capacity: ${capacity}). Fines: KES 20,000–100,000.`,
    entityId:   vehicle._id,
    entityType: 'vehicle',
    status:     'active',
    metadata:   { count: newCount, capacity, boardingStop, tripId }
  });

  await platformEventService.write({
    domain:     'sacco',
    eventType:  'OVERLOADING',
    entityType: 'sacco_vehicle',
    entityId:   vehicle._id,
    payload:    { count: newCount, capacity, boardingStop, tripId, plateNumber: vehicle.plateNumber },
    deviceId,
    timestamp:  ts,
    ntsa:       true   // NTSA violation
  });

  result.alerts++;
}

// ── Utility ───────────────────────────────────────────────────────────
function _loc (payload) {
  if (!payload) return undefined;
  const lat = payload.latitude  || payload.boardingGps?.latitude;
  const lng = payload.longitude || payload.boardingGps?.longitude;
  if (!lat || !lng) return undefined;
  return { latitude: lat, longitude: lng, accuracy: payload.accuracy };
}
