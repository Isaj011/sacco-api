const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');

// Check if user is authenticated and has NTSA role
exports.ntsaAuth = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return next(
            new ErrorResponse('Access denied. NTSA authorization required.', 401)
        );
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user has NTSA role
        const ntsaRoles = ['admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'];
        if (!ntsaRoles.includes(decoded.role)) {
            return next(
                new ErrorResponse('Access denied. NTSA role required.', 403)
            );
        }

        req.user = decoded;
        next();
    } catch (err) {
        return next(
            new ErrorResponse('Access denied. Invalid token.', 401)
        );
    }
};

// Check if user has specific NTSA permissions
exports.ntsaPermission = (permissions) => {
    return (req, res, next) => {
        const rolePermissions = {
            'admin': ['read', 'write', 'delete', 'manage'],
            'ntsa_officer': ['read', 'write', 'manage'],
            'ntsa_inspector': ['read', 'write'],
            'ntsa_analyst': ['read']
        };

        const userPermissions = rolePermissions[req.user.role] || [];
        const hasPermission = permissions.some(permission =>
            userPermissions.includes(permission)
        );

        if (!hasPermission) {
            return next(
                new ErrorResponse('Access denied. Insufficient permissions.', 403)
            );
        }

        next();
    };
};

// Log NTSA access for audit trail
exports.logNtsaAccess = (req, res, next) => {
    console.log(`NTSA Access: ${req.user.role} - ${req.user.id} - ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
    next();
};
