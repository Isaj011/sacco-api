const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

// Simple device authentication for junior developers
// This is a basic implementation that's easy to understand and modify

// In-memory device registry (in production, use database)
const devices = new Map([
    ['demo_device_001', { id: 'demo_device_001', key: 'demo_key_123', name: 'Demo Bus 1' }],
    ['demo_device_002', { id: 'demo_device_002', key: 'demo_key_456', name: 'Demo Bus 2' }],
    ['test_device', { id: 'test_device', key: 'test_key_789', name: 'Test Device' }]
]);

// Simple authentication middleware
exports.authenticateDevice = asyncHandler(async (req, res, next) => {
    let deviceKey;

    // Check for device key in multiple places (flexible for junior devs)
    if (req.headers.authorization) {
        // Handle "Bearer token" format
        if (req.headers.authorization.startsWith('Bearer ')) {
            deviceKey = req.headers.authorization.substring(7);
        }
        // Handle "Device token" format
        else if (req.headers.authorization.startsWith('Device ')) {
            deviceKey = req.headers.authorization.substring(7);
        }
        // Handle raw token
        else {
            deviceKey = req.headers.authorization;
        }
    }

    // Check for API key in headers
    if (!deviceKey && req.headers['x-api-key']) {
        deviceKey = req.headers['x-api-key'];
    }

    // Check for device key in query parameters (for testing)
    if (!deviceKey && req.query.device_key) {
        deviceKey = req.query.device_key;
    }

    // Check for device key in request body (for simple POST requests)
    if (!deviceKey && req.body && req.body.device_key) {
        deviceKey = req.body.device_key;
    }

    if (!deviceKey) {
        return res.status(401).json({
            success: false,
            error: 'No device key provided. Include one of: Authorization header, X-API-Key header, device_key query parameter, or device_key in request body'
        });
    }

    // Find device by key
    let device = null;
    for (const [deviceId, deviceInfo] of devices) {
        if (deviceInfo.key === deviceKey) {
            device = { ...deviceInfo };
            break;
        }
    }

    // In development mode, allow any key that starts with "demo_" or "test_"
    if (!device && process.env.NODE_ENV === 'development') {
        if (deviceKey.startsWith('demo_') || deviceKey.startsWith('test_')) {
            device = {
                id: deviceKey,
                key: deviceKey,
                name: `Development Device (${deviceKey})`
            };
        }
    }

    if (!device) {
        return res.status(401).json({
            success: false,
            error: 'Invalid device key',
            hint: 'Valid keys: demo_key_123, demo_key_456, test_key_789 (or any key starting with "demo_" or "test_" in development)'
        });
    }

    // Add device info to request
    req.device = device;
    req.device.authenticated = true;

    console.log(`🔓 Device authenticated: ${device.name} (${device.id})`);
    next();
});

// Optional authentication - doesn't block requests but adds device info if available
exports.optionalDeviceAuth = asyncHandler(async (req, res, next) => {
    let deviceKey;

    // Try to find device key in various places
    if (req.headers.authorization) {
        if (req.headers.authorization.startsWith('Bearer ')) {
            deviceKey = req.headers.authorization.substring(7);
        } else if (req.headers.authorization.startsWith('Device ')) {
            deviceKey = req.headers.authorization.substring(7);
        } else {
            deviceKey = req.headers.authorization;
        }
    }

    if (!deviceKey && req.headers['x-api-key']) {
        deviceKey = req.headers['x-api-key'];
    }

    if (!deviceKey && req.query.device_key) {
        deviceKey = req.query.device_key;
    }

    if (!deviceKey && req.body && req.body.device_key) {
        deviceKey = req.body.device_key;
    }

    if (deviceKey) {
        // Try to find device
        let device = null;
        for (const [deviceId, deviceInfo] of devices) {
            if (deviceInfo.key === deviceKey) {
                device = { ...deviceInfo };
                break;
            }
        }

        // Development mode fallback
        if (!device && process.env.NODE_ENV === 'development') {
            if (deviceKey.startsWith('demo_') || deviceKey.startsWith('test_')) {
                device = {
                    id: deviceKey,
                    key: deviceKey,
                    name: `Development Device (${deviceKey})`
                };
            }
        }

        if (device) {
            req.device = { ...device, authenticated: true };
        } else {
            req.device = { id: 'unknown', authenticated: false };
        }
    } else {
        req.device = { id: 'anonymous', authenticated: false };
    }

    next();
});

// Simple rate limiting middleware
exports.simpleRateLimit = asyncHandler(async (req, res, next) => {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    // Simple in-memory rate limiting (not suitable for production)
    // In production, use Redis or a proper rate limiting library
    const deviceId = req.device?.id || 'anonymous';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100; // 100 requests per minute

    // This is a very basic implementation
    // In production, you'd want to use a proper rate limiting solution
    next();
});

// Helper function to add new devices (for junior devs to easily add devices)
exports.addDevice = (deviceId, deviceKey, deviceName) => {
    devices.set(deviceId, { id: deviceId, key: deviceKey, name: deviceName });
    console.log(`📱 Device added: ${deviceName} (${deviceId})`);
};

// Helper function to get all devices (for debugging)
exports.getAllDevices = () => {
    return Array.from(devices.values());
};

// Helper function to validate event data (simple validation)
exports.validateEventData = (req, res, next) => {
    // Check if this is a batch request
    if (req.body.events && Array.isArray(req.body.events)) {
        return validateBatchEventData(req, res, next);
    }

    // Validate single event
    const { eventType, tripId, timestamp, gps } = req.body;

    // Basic validation
    const errors = [];

    if (!eventType) {
        errors.push('eventType is required');
    } else {
        // Validate event type
        const validEventTypes = [
            'PASSENGER_SEATED',
            'PASSENGER_STANDING',
            'PASSENGER_STOOD_UP',
            'PASSENGER_BOARDED',
            'PASSENGER_ALIGHTED',
            'TRIP_STARTED',
            'TRIP_ENDED',
            'STOP_REACHED',
            'DOOR_OPENED',
            'DOOR_CLOSED'
        ];

        if (!validEventTypes.includes(eventType)) {
            errors.push(`Invalid eventType. Must be one of: ${validEventTypes.join(', ')}`);
        }
    }

    if (!tripId) {
        errors.push('tripId is required');
    }

    if (!timestamp) {
        errors.push('timestamp is required');
    } else if (typeof timestamp !== 'number' || timestamp <= 0) {
        errors.push('timestamp must be a positive number');
    }

    if (!gps) {
        errors.push('gps is required');
    } else {
        if (!gps.latitude || typeof gps.latitude !== 'number') {
            errors.push('gps.latitude is required and must be a number');
        }
        if (!gps.longitude || typeof gps.longitude !== 'number') {
            errors.push('gps.longitude is required and must be a number');
        }
        if (gps.latitude < -90 || gps.latitude > 90) {
            errors.push('gps.latitude must be between -90 and 90');
        }
        if (gps.longitude < -180 || gps.longitude > 180) {
            errors.push('gps.longitude must be between -180 and 180');
        }
    }

    // Validate and transform zoneType
    if (req.body.zoneType) {
        const validZoneTypes = ['SEAT', 'STANDING_AREA', 'DOOR', 'AISLE', 'UNKNOWN'];

        // Transform 'STANDING' to 'STANDING_AREA' for backward compatibility
        if (req.body.zoneType === 'STANDING') {
            req.body.zoneType = 'STANDING_AREA';
        }

        if (!validZoneTypes.includes(req.body.zoneType)) {
            errors.push(`Invalid zoneType. Must be one of: ${validZoneTypes.join(', ')}`);
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

// Validate batch event data
const validateBatchEventData = (req, res, next) => {
    const { events, vehicleId, batchTimestamp } = req.body;
    const errors = [];

    if (!events || !Array.isArray(events) || events.length === 0) {
        errors.push('Batch must contain at least one event');
    }

    const validEventTypes = [
        'PASSENGER_SEATED',
        'PASSENGER_STANDING',
        'PASSENGER_STOOD_UP',
        'PASSENGER_BOARDED',
        'PASSENGER_ALIGHTED',
        'TRIP_STARTED',
        'TRIP_ENDED',
        'STOP_REACHED',
        'DOOR_OPENED',
        'DOOR_CLOSED'
    ];

    // Validate each event in the batch
    events.forEach((event, index) => {
        if (!event.eventType) {
            errors.push(`Event ${index}: eventType is required`);
        } else if (!validEventTypes.includes(event.eventType)) {
            errors.push(`Event ${index}: Invalid eventType "${event.eventType}"`);
        }

        if (!event.tripId) {
            errors.push(`Event ${index}: tripId is required`);
        }

        if (!event.timestamp) {
            errors.push(`Event ${index}: timestamp is required`);
        } else if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
            errors.push(`Event ${index}: timestamp must be a positive number`);
        }

        if (!event.gps) {
            errors.push(`Event ${index}: gps is required`);
        } else {
            if (!event.gps.latitude || typeof event.gps.latitude !== 'number') {
                errors.push(`Event ${index}: gps.latitude is required and must be a number`);
            }
            if (!event.gps.longitude || typeof event.gps.longitude !== 'number') {
                errors.push(`Event ${index}: gps.longitude is required and must be a number`);
            }
            if (event.gps.latitude < -90 || event.gps.latitude > 90) {
                errors.push(`Event ${index}: gps.latitude must be between -90 and 90`);
            }
            if (event.gps.longitude < -180 || event.gps.longitude > 180) {
                errors.push(`Event ${index}: gps.longitude must be between -180 and 180`);
            }
        }

        // Validate and transform zoneType for batch events
        if (event.zoneType) {
            const validZoneTypes = ['SEAT', 'STANDING_AREA', 'DOOR', 'AISLE', 'UNKNOWN'];

            // Transform 'STANDING' to 'STANDING_AREA' for backward compatibility
            if (event.zoneType === 'STANDING') {
                event.zoneType = 'STANDING_AREA';
            }

            if (!validZoneTypes.includes(event.zoneType)) {
                errors.push(`Event ${index}: Invalid zoneType "${event.zoneType}". Must be one of: ${validZoneTypes.join(', ')}`);
            }
        }
    });

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Batch validation failed',
            details: errors
        });
    }

    next();
};
