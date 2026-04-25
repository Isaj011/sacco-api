const SchoolVehicle = require('../models/SchoolVehicle');
const SchoolTrip    = require('../models/SchoolTrip');
const SchoolStudent = require('../models/SchoolStudent');
const Alert         = require('../models/Alert');
const ComplianceProfile = require('../models/ComplianceProfile');
const platformEventService = require('./platformEventService');
const complianceService    = require('./complianceService');

/**
 * SchoolIoTProcessor
 *
 * Receives structured event batches from the IoT gateway (Android device
 * installed on a school bus/van) and processes each event type.
 *
 * Key rules from Ministry of Education / Kenya Traffic Act:
 *  - Speed limit:      80 km/h (speed governor mandatory)
 *  - Operating hours:  06:00 – 18:00 (school transport only)
 *  - School buses must be yellow (inspected semi-annually by NTSA)
 *  - Child restraint systems required
 *  - Parent notifications: STUDENT_PICKED_UP / STUDENT_DROPPED_OFF in real-time
 */

const SPEED_LIMIT_KMH   = 80;
const SCHOOL_HOURS_START = 6;   // 06:00 EAT
const SCHOOL_HOURS_END   = 18;  // 18:00 EAT

/**
 * Process a batch of events for one school vehicle.
 *
 * @param {object} payload
 * @param {string} payload.deviceId
 * @param {string} payload.vehicleId   — SchoolVehicle ObjectId string
 * @param {string} [payload.tripId]    — SchoolTrip _id string (if trip active)
 * @param {Array}  payload.events      — [ { type, payload, timestamp? } ]
 * @returns {Promise<{ processed: number, alerts: number, errors: string[] }>}
 */
exports.process = async (payload) => {
  const { deviceId, vehicleId, tripId, events = [] } = payload;
  const result = { processed: 0, alerts: 0, errors: [] };

  // ── Resolve school vehicle ────────────────────────────────────────
  const vehicle = await SchoolVehicle.findById(vehicleId).select(
    'registrationNumber school capacity status currentLocation ' +
    'currentAssignment safety'
  );

  if (!vehicle) {
    result.errors.push(`SchoolVehicle ${vehicleId} not found`);
    return result;
  }

  // ── Update speed limiter heartbeat ───────────────────────────────
  await ComplianceProfile.findOneAndUpdate(
    { entityId: vehicle._id, entityType: 'vehicle' },
    { $set: { 'vehicleFlags.speedLimiterLastHeartbeat': new Date() } }
  );

  // ── Mark device as seen (store deviceId on vehicle) ──────────────
  await SchoolVehicle.findByIdAndUpdate(vehicleId, {
    $set: { 'safety.gpsEnabled': true }
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

    case 'STUDENT_PICKED_UP':
      await _handleStudentPickedUp(vehicle, payload, deviceId, tripId, ts, result);
      break;

    case 'STUDENT_DROPPED_OFF':
      await _handleStudentDroppedOff(vehicle, payload, deviceId, tripId, ts, result);
      break;

    case 'TRIP_STARTED':
      await _handleTripStarted(vehicle, payload, deviceId, tripId, ts);
      break;

    case 'TRIP_ENDED':
      await _handleTripEnded(vehicle, payload, deviceId, tripId, ts, result);
      break;

    case 'STOP_REACHED':
      await platformEventService.write({
        domain: 'school', eventType: 'STOP_REACHED',
        entityType: 'school_vehicle', entityId: vehicle._id,
        location:  _loc(payload),
        payload:   { stopName: payload.stopName, tripId },
        deviceId,  timestamp: ts
      });
      break;

    case 'DOOR_OPENED':
    case 'DOOR_CLOSED':
      await platformEventService.write({
        domain: 'school', eventType: type,
        entityType: 'school_vehicle', entityId: vehicle._id,
        location:  _loc(payload),
        payload:   { ...payload, tripId },
        deviceId,  timestamp: ts
      });
      break;

    case 'SPEED_ALERT':
      // Android detected violation independently — delegate to same handler
      await _raiseSpeedViolation(vehicle, payload, deviceId, tripId, ts, result);
      break;

    default:
      await platformEventService.write({
        domain: 'school', eventType: type,
        entityType: 'school_vehicle', entityId: vehicle._id,
        payload: { ...payload, tripId, _unknown: true },
        deviceId, timestamp: ts
      });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────

async function _handleLocationUpdate (vehicle, payload, deviceId, tripId, ts, result) {
  const { latitude, longitude, speed = 0, heading, accuracy } = payload;

  // 1. Update vehicle current location (SchoolVehicle uses GeoJSON)
  await SchoolVehicle.findByIdAndUpdate(vehicle._id, {
    $set: {
      'currentLocation.coordinates': [longitude, latitude],
      'currentLocation.timestamp':   ts,
      'currentLocation.speed':       speed,
      'currentLocation.heading':     heading,
      'currentLocation.accuracy':    accuracy
    }
  });

  // 2. Speed compliance check
  if (speed > SPEED_LIMIT_KMH) {
    await _raiseSpeedViolation(vehicle, { latitude, longitude, speed }, deviceId, tripId, ts, result);
  }

  // 3. Operating-hours check — school transport must not run outside 06:00–18:00 EAT
  const hour = ts.getUTCHours() + 3; // EAT = UTC+3
  const hourInDay = hour % 24;
  if (hourInDay < SCHOOL_HOURS_START || hourInDay >= SCHOOL_HOURS_END) {
    await _raiseOperatingHoursViolation(vehicle, { latitude, longitude, speed, hour: hourInDay }, deviceId, tripId, ts, result);
  }

  // 4. Write platform event (NTSA school transport location telemetry)
  await platformEventService.write({
    domain:     'school',
    eventType:  'SCHOOL_VEHICLE_LOCATION',
    entityType: 'school_vehicle',
    entityId:   vehicle._id,
    location:   { latitude, longitude, accuracy },
    payload:    { speed, heading, tripId, schoolId: vehicle.school },
    source:     'iot_device',
    deviceId,
    timestamp:  ts,
    ntsa:       true   // NTSA requires school bus location every 5s
  });
}

async function _handleStudentPickedUp (vehicle, payload, deviceId, tripId, ts, result) {
  const { studentId, stopName, location: stopLocation } = payload;

  // Update SchoolTrip — mark student picked up
  if (tripId && studentId) {
    const trip = await SchoolTrip.findById(tripId);
    if (trip) {
      const enrolled = trip.enrolledStudents.find(
        s => s.student.toString() === studentId.toString()
      );
      if (enrolled) {
        enrolled.status    = 'picked_up';
        enrolled.pickupTime = ts;
        await trip.save();
      }
    }
  }

  // Write PlatformEvent (parent dashboard + school admin)
  await platformEventService.write({
    domain:     'school',
    eventType:  'STUDENT_PICKED_UP',
    entityType: 'school_student',
    entityId:   studentId || vehicle._id,   // best effort
    location:   _loc(payload),
    payload:    { studentId, stopName, tripId, vehicleId: vehicle._id, schoolId: vehicle.school },
    deviceId,
    timestamp:  ts
  });

  // Persist notification record (async — failure must not block)
  _writeParentNotification(vehicle, studentId, 'student_pickup', stopName, ts).catch(err =>
    console.error('[SchoolIoT] parent notification failed:', err.message)
  );
}

async function _handleStudentDroppedOff (vehicle, payload, deviceId, tripId, ts, result) {
  const { studentId, stopName } = payload;

  // Update SchoolTrip
  if (tripId && studentId) {
    const trip = await SchoolTrip.findById(tripId);
    if (trip) {
      const enrolled = trip.enrolledStudents.find(
        s => s.student.toString() === studentId.toString()
      );
      if (enrolled) {
        enrolled.status      = 'dropped_off';
        enrolled.dropOffTime = ts;
        await trip.save();
      }
    }
  }

  await platformEventService.write({
    domain:     'school',
    eventType:  'STUDENT_DROPPED_OFF',
    entityType: 'school_student',
    entityId:   studentId || vehicle._id,
    location:   _loc(payload),
    payload:    { studentId, stopName, tripId, vehicleId: vehicle._id, schoolId: vehicle.school },
    deviceId,
    timestamp:  ts
  });

  _writeParentNotification(vehicle, studentId, 'student_dropoff', stopName, ts).catch(err =>
    console.error('[SchoolIoT] parent notification failed:', err.message)
  );
}

async function _handleTripStarted (vehicle, payload, deviceId, tripId, ts) {
  if (tripId) {
    await SchoolTrip.findByIdAndUpdate(tripId, {
      $set: { status: 'in_progress', actualStartTime: ts }
    });
  }

  await platformEventService.write({
    domain:     'school',
    eventType:  'TRIP_STARTED',
    entityType: 'school_vehicle',
    entityId:   vehicle._id,
    location:   _loc(payload),
    payload:    { tripId, routeId: payload.routeId, driverId: payload.driverId, schoolId: vehicle.school },
    deviceId,
    timestamp:  ts
  });
}

async function _handleTripEnded (vehicle, payload, deviceId, tripId, ts, result) {
  const summary = payload.summary || {};

  if (tripId) {
    await SchoolTrip.findByIdAndUpdate(tripId, {
      $set: {
        status:        'completed',
        actualEndTime: ts,
        'metrics.totalDistance': summary.distanceKm || 0,
        'metrics.totalDuration': summary.durationMinutes || 0
      }
    });
  }

  // Update driver behaviour from compliance data
  const driverId = payload.driverId || vehicle.currentAssignment?.driver;
  if (payload.compliance && driverId) {
    await complianceService.recordTripBehaviour(driverId, {
      speedViolations:    payload.compliance.speedViolations    || 0,
      harshBrakingEvents: payload.compliance.harshBrakingEvents || 0,
      routeDeviations:    payload.compliance.routeDeviations    || 0,
      overloading:        false,  // school buses track differently
      distanceKm:         payload.compliance.distanceKm         || 0,
      behaviourScore:     payload.compliance.behaviourScore      || 100
    });
  }

  await platformEventService.write({
    domain:     'school',
    eventType:  'TRIP_ENDED',
    entityType: 'school_vehicle',
    entityId:   vehicle._id,
    location:   _loc(payload),
    payload:    { tripId, summary, compliance: payload.compliance, schoolId: vehicle.school },
    deviceId,
    timestamp:  ts,
    ntsa:       true   // NTSA gets school trip completion
  });
}

// ── Violation helpers ─────────────────────────────────────────────────

async function _raiseSpeedViolation (vehicle, payload, deviceId, tripId, ts, result) {
  const { latitude, longitude, speed } = payload;

  await Alert.create({
    type:       'speed_violation',
    severity:   speed > 120 ? 'critical' : 'high',
    title:      `Speed Violation — ${vehicle.registrationNumber}`,
    message:    `School vehicle recorded ${speed} km/h (limit: ${SPEED_LIMIT_KMH} km/h). Children on board.`,
    entityId:   vehicle._id,
    entityType: 'vehicle',
    status:     'active',
    metadata:   { speed, limit: SPEED_LIMIT_KMH, tripId, deviceId, schoolId: vehicle.school }
  });

  await platformEventService.write({
    domain:     'school',
    eventType:  'SPEED_VIOLATION',
    entityType: 'school_vehicle',
    entityId:   vehicle._id,
    location:   { latitude, longitude },
    payload:    { speed, limit: SPEED_LIMIT_KMH, tripId, registrationNumber: vehicle.registrationNumber, schoolId: vehicle.school },
    deviceId,
    timestamp:  ts,
    ntsa:       true
  });

  result.alerts++;
}

async function _raiseOperatingHoursViolation (vehicle, payload, deviceId, tripId, ts, result) {
  const { latitude, longitude, hour } = payload;

  await Alert.create({
    type:       'compliance_breach',
    severity:   'high',
    title:      `Operating Hours Violation — ${vehicle.registrationNumber}`,
    message:    `School vehicle operating at ${hour}:00 EAT. Ministry of Education requires 06:00–18:00 only.`,
    entityId:   vehicle._id,
    entityType: 'vehicle',
    status:     'active',
    metadata:   { hour, tripId, deviceId, schoolId: vehicle.school }
  });

  await platformEventService.write({
    domain:     'school',
    eventType:  'OPERATING_HOURS_VIOLATION',
    entityType: 'school_vehicle',
    entityId:   vehicle._id,
    location:   { latitude, longitude },
    payload:    { hour, tripId, registrationNumber: vehicle.registrationNumber, schoolId: vehicle.school },
    deviceId,
    timestamp:  ts,
    ntsa:       true   // NTSA compliance event
  });

  result.alerts++;
}

// ── Parent notification helper ────────────────────────────────────────
// Creates a SchoolNotification record for the parent.
// Requires schoolId on the vehicle — always present (required field).
async function _writeParentNotification (vehicle, studentId, notifType, stopName, ts) {
  if (!studentId) return;

  const SchoolNotification = require('../models/SchoolNotification');

  // Find student to get parent userId
  const student = await SchoolStudent.findById(studentId).select('firstName lastName userId');
  if (!student || !student.userId) return;

  const isPickup  = notifType === 'student_pickup';
  const firstName = student.firstName;

  await SchoolNotification.create({
    school:    vehicle.school,
    type:      notifType,
    priority:  'high',
    title:     isPickup ? `${firstName} has boarded the bus` : `${firstName} has been dropped off`,
    message:   isPickup
      ? `${firstName} was picked up at ${stopName || 'a stop'} at ${ts.toLocaleTimeString('en-KE')}.`
      : `${firstName} was dropped off at ${stopName || 'a stop'} at ${ts.toLocaleTimeString('en-KE')}.`,
    recipients: [{
      user: student.userId,
      role: 'parent',
      deliveryMethods: [{ type: 'push' }, { type: 'in_app' }]
    }],
    relatedEntities: [
      { entityType: 'student', entityId: studentId, entityName: firstName },
      { entityType: 'vehicle', entityId: vehicle._id, entityName: vehicle.registrationNumber }
    ],
    deliverySettings: { sendImmediately: true },
    // createdBy required — use a sentinel system ObjectId
    createdBy: require('mongoose').Types.ObjectId.createFromHexString(
      '000000000000000000000001'
    )
  });
}

// ── Utility ───────────────────────────────────────────────────────────
function _loc (payload) {
  if (!payload) return undefined;
  const lat = payload.latitude  || payload.location?.latitude;
  const lng = payload.longitude || payload.location?.longitude;
  if (!lat || !lng) return undefined;
  return { latitude: lat, longitude: lng, accuracy: payload.accuracy };
}
