const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

// IoT Device Authentication Middleware
// This middleware authenticates IoT devices using API keys or device tokens
exports.authenticateDevice = asyncHandler(async (req, res, next) => {
    let deviceToken;

    // Check for device token in headers
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Device ')
    ) {
        deviceToken = req.headers.authorization.split(' ')[1];
    }

    // Check for device token in query parameters (for simple GET requests)
    if (!deviceToken && req.query.deviceToken) {
        deviceToken = req.query.deviceToken;
    }

    // Check for API key in headers
    if (!deviceToken && req.headers['x-api-key']) {
        deviceToken = req.headers['x-api-key'];
    }

    if (!deviceToken) {
        return next(new ErrorResponse('Access denied. No device token provided.', 401));
    }

    try {
        // For development/testing, allow simple device IDs as tokens
        // In production, you should use proper JWT tokens or API keys
        if (process.env.NODE_ENV === 'development') {
            // Simple validation for development - accept any non-empty string as device ID
            if (deviceToken.length < 3) {
                return next(new ErrorResponse('Invalid device token', 401));
            }

            // Add device info to request
            req.device = {
                deviceId: deviceToken,
                authenticated: true,
                type: 'development'
            };

            return next();
        }

        // Production authentication using JWT
        const decoded = jwt.verify(deviceToken, process.env.JWT_SECRET);

        // Add device info to request
        req.device = {
            deviceId: decoded.deviceId,
            deviceType: decoded.deviceType,
            vehicleId: decoded.vehicleId,
            authenticated: true,
            type: 'production'
        };

        next();
    } catch (err) {
        return next(new ErrorResponse('Invalid device token', 401));
    }
});

// Optional device authentication - allows requests without authentication but sets device info if available
exports.optionalDeviceAuth = asyncHandler(async (req, res, next) => {
    let deviceToken;

    // Check for device token in headers
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Device ')
    ) {
        deviceToken = req.headers.authorization.split(' ')[1];
    }

    // Check for device token in query parameters
    if (!deviceToken && req.query.deviceToken) {
        deviceToken = req.query.deviceToken;
    }

    // Check for API key in headers
    if (!deviceToken && req.headers['x-api-key']) {
        deviceToken = req.headers['x-api-key'];
    }

    if (deviceToken) {
        try {
            if (process.env.NODE_ENV === 'development') {
                req.device = {
                    deviceId: deviceToken,
                    authenticated: true,
                    type: 'development'
                };
            } else {
                const decoded = jwt.verify(deviceToken, process.env.JWT_SECRET);
                req.device = {
                    deviceId: decoded.deviceId,
                    deviceType: decoded.deviceType,
                    vehicleId: decoded.vehicleId,
                    authenticated: true,
                    type: 'production'
                };
            }
        } catch (err) {
            // Token is invalid but we don't block the request
            req.device = {
                deviceId: deviceToken,
                authenticated: false,
                type: 'invalid'
            };
        }
    } else {
        req.device = {
            deviceId: null,
            authenticated: false,
            type: 'none'
        };
    }

    next();
});

// Rate limiting specifically for IoT devices
exports.deviceRateLimit = asyncHandler(async (req, res, next) => {
    // More lenient rate limiting for IoT devices in development
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    // In production, implement stricter rate limiting
    // This is a placeholder - you might want to use a proper rate limiting library
    const deviceId = req.device?.deviceId || 'anonymous';

    // Simple in-memory rate limiting (not suitable for production)
    // In production, use Redis or similar for distributed rate limiting
    next();
});

// Validate IoT data format
exports.validateIoTData = asyncHandler(async (req, res, next) => {
    const { deviceId, location, sensorData } = req.body;

    // Basic validation
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 3) {
        return next(new ErrorResponse('Valid deviceId is required', 400));
    }

    // Validate location data if provided
    if (location) {
        if (location.latitude && (location.latitude < -90 || location.latitude > 90)) {
            return next(new ErrorResponse('Invalid latitude value', 400));
        }
        if (location.longitude && (location.longitude < -180 || location.longitude > 180)) {
            return next(new ErrorResponse('Invalid longitude value', 400));
        }
        if (location.speed && (location.speed < 0 || location.speed > 500)) {
            return next(new ErrorResponse('Invalid speed value', 400));
        }
    }

    // Validate sensor data if provided
    if (sensorData) {
        if (sensorData.humidity && (sensorData.humidity < 0 || sensorData.humidity > 100)) {
            return next(new ErrorResponse('Invalid humidity value (must be 0-100)', 400));
        }
        if (sensorData.fuelLevel && (sensorData.fuelLevel < 0 || sensorData.fuelLevel > 100)) {
            return next(new ErrorResponse('Invalid fuel level (must be 0-100)', 400));
        }
        if (sensorData.temperature && (sensorData.temperature < -50 || sensorData.temperature > 200)) {
            return next(new ErrorResponse('Invalid temperature value', 400));
        }
    }

    next();
});

// Generate device token (for device registration)
exports.generateDeviceToken = (deviceId, deviceType, vehicleId = null) => {
    return jwt.sign(
        {
            deviceId,
            deviceType,
            vehicleId,
            type: 'device'
        },
        process.env.JWT_SECRET,
        { expiresIn: '365d' } // Device tokens can be long-lived
    );
};
