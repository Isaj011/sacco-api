const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

const saccoProcessor   = require('../services/saccoIoTProcessor');
const schoolProcessor  = require('../services/schoolIoTProcessor');
const deliveryProcessor = require('../services/deliveryIoTProcessor');

/**
 * @desc    Unified IoT event ingestion endpoint
 * @route   POST /api/v1/gateway/ingest
 * @access  Device auth (optionalDeviceAuth — allow during development)
 *
 * Expected body shape:
 * {
 *   "domain":    "sacco" | "school" | "delivery",
 *   "deviceId":  "DEVICE_IMEI_OR_UUID",
 *   "vehicleId": "<MongoDB ObjectId>",
 *   "tripId":    "<MongoDB ObjectId>",    // optional
 *   "orderId":   "<MongoDB ObjectId>",    // delivery only, optional
 *   "events": [
 *     { "type": "LOCATION_UPDATE", "payload": { ... }, "timestamp": "ISO8601" },
 *     { "type": "PASSENGER_BOARDED", "payload": { ... } }
 *   ]
 * }
 *
 * The "domain" field drives which processor handles the batch.
 * Each processor is domain-isolated — no cross-contamination.
 */
exports.ingest = asyncHandler(async (req, res, next) => {
  const { domain, deviceId, vehicleId, events } = req.body;

  // ── Validate required fields ──────────────────────────────────────
  if (!domain) {
    return next(new ErrorResponse('domain is required (sacco | school | delivery)', 400));
  }
  if (!deviceId) {
    return next(new ErrorResponse('deviceId is required', 400));
  }
  if (!vehicleId) {
    return next(new ErrorResponse('vehicleId is required', 400));
  }
  if (!Array.isArray(events) || events.length === 0) {
    return next(new ErrorResponse('events must be a non-empty array', 400));
  }
  if (events.length > 100) {
    return next(new ErrorResponse('Maximum 100 events per batch', 400));
  }

  // ── Route to domain processor ────────────────────────────────────
  let result;
  switch (domain) {

    case 'sacco':
      result = await saccoProcessor.process(req.body);
      break;

    case 'school':
      result = await schoolProcessor.process(req.body);
      break;

    case 'delivery':
      result = await deliveryProcessor.process(req.body);
      break;

    default:
      return next(new ErrorResponse(
        `Unknown domain "${domain}". Valid domains: sacco, school, delivery`, 400
      ));
  }

  // ── Respond ──────────────────────────────────────────────────────
  // Always 200 if the gateway processed the batch (individual event errors
  // are captured in result.errors, not as HTTP failures). This prevents
  // the Android device from retrying the entire batch for a partial error.
  res.status(200).json({
    success: true,
    domain,
    deviceId,
    vehicleId,
    processed: result.processed,
    alerts:    result.alerts,
    errors:    result.errors.length > 0 ? result.errors : undefined
  });
});

/**
 * @desc    Gateway health check — device can ping to confirm connectivity
 * @route   GET /api/v1/gateway/health
 * @access  Public
 */
exports.health = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    status:  'online',
    timestamp: new Date().toISOString(),
    domains: ['sacco', 'school', 'delivery']
  });
});
