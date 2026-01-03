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
    const { eventType, tripId, timestamp, gps } = req.body;

    // Basic validation
    const errors = [];

    if (!eventType) {
        errors.push('eventType is required');
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

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};
