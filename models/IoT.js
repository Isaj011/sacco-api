const mongoose = require('mongoose');

const IoTSchema = new mongoose.Schema({
    // Device identification
    deviceId: {
        type: String,
        required: [true, 'Device ID is required'],
        unique: true,
        trim: true,
        maxlength: [50, 'Device ID cannot be more than 50 characters']
    },
    deviceType: {
        type: String,
        required: [true, 'Device type is required'],
        enum: ['GPS_TRACKER', 'TEMPERATURE_SENSOR', 'HUMIDITY_SENSOR', 'FUEL_SENSOR', 'SPEED_SENSOR', 'MULTI_SENSOR'],
        default: 'GPS_TRACKER'
    },
    vehicleId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Vehicle',
        required: false
    },

    // Location data (for GPS devices)
    location: {
        latitude: {
            type: Number,
            required: false,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            required: false,
            min: -180,
            max: 180
        },
        altitude: {
            type: Number,
            required: false
        },
        accuracy: {
            type: Number,
            required: false
        },
        speed: {
            type: Number,
            required: false,
            min: 0
        },
        heading: {
            type: Number,
            required: false,
            min: 0,
            max: 360
        }
    },

    // Sensor readings
    sensorData: {
        temperature: {
            type: Number,
            required: false
        },
        humidity: {
            type: Number,
            required: false,
            min: 0,
            max: 100
        },
        fuelLevel: {
            type: Number,
            required: false,
            min: 0,
            max: 100
        },
        batteryVoltage: {
            type: Number,
            required: false
        },
        engineStatus: {
            type: Boolean,
            required: false,
            default: false
        },
        odometer: {
            type: Number,
            required: false,
            min: 0
        },
        customFields: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: new Map()
        }
    },

    // Device status
    deviceStatus: {
        batteryLevel: {
            type: Number,
            required: false,
            min: 0,
            max: 100
        },
        signalStrength: {
            type: Number,
            required: false,
            min: 0,
            max: 5
        },
        lastSeen: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },

    // Metadata
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    receivedAt: {
        type: Date,
        default: Date.now
    },
    dataSource: {
        type: String,
        enum: ['HTTP_POST', 'MQTT', 'WEBSOCKET', 'MANUAL'],
        default: 'HTTP_POST'
    },
    rawData: {
        type: String,
        required: false
    },

    // Processing status
    processed: {
        type: Boolean,
        default: false
    },
    alerts: [{
        type: {
            type: String,
            enum: ['LOW_BATTERY', 'HIGH_SPEED', 'FUEL_LOW', 'TEMPERATURE_HIGH', 'DEVICE_OFFLINE', 'GEOFENCE_BREACH'],
            required: true
        },
        severity: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true,
    // Add indexes for better query performance
    index: {
        deviceId: 1,
        timestamp: -1
    }
});

// Compound indexes
IoTSchema.index({ deviceId: 1, timestamp: -1 });
IoTSchema.index({ vehicleId: 1, timestamp: -1 });
IoTSchema.index({ deviceType: 1, timestamp: -1 });
IoTSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
IoTSchema.index({ 'alerts.type': 1, timestamp: -1 });

// Virtual for formatted location
IoTSchema.virtual('formattedLocation').get(function () {
    if (this.location && this.location.latitude && this.location.longitude) {
        return `${this.location.latitude}, ${this.location.longitude}`;
    }
    return null;
});

// Middleware to process data before saving
IoTSchema.pre('save', function (next) {
    // Update last seen time
    if (this.deviceStatus) {
        this.deviceStatus.lastSeen = new Date();
    }

    // Generate alerts based on sensor data
    this.generateAlerts();

    next();
});

// Instance method to generate alerts
IoTSchema.methods.generateAlerts = function () {
    this.alerts = [];

    // Battery level alert
    if (this.deviceStatus && this.deviceStatus.batteryLevel < 20) {
        this.alerts.push({
            type: 'LOW_BATTERY',
            severity: this.deviceStatus.batteryLevel < 10 ? 'CRITICAL' : 'HIGH',
            message: `Device battery is critically low: ${this.deviceStatus.batteryLevel}%`
        });
    }

    // Speed alert
    if (this.location && this.location.speed > 120) {
        this.alerts.push({
            type: 'HIGH_SPEED',
            severity: this.location.speed > 150 ? 'CRITICAL' : 'HIGH',
            message: `Vehicle speed exceeded limit: ${this.location.speed} km/h`
        });
    }

    // Fuel level alert
    if (this.sensorData && this.sensorData.fuelLevel < 15) {
        this.alerts.push({
            type: 'FUEL_LOW',
            severity: this.sensorData.fuelLevel < 5 ? 'CRITICAL' : 'MEDIUM',
            message: `Fuel level is low: ${this.sensorData.fuelLevel}%`
        });
    }

    // Temperature alert
    if (this.sensorData && this.sensorData.temperature > 80) {
        this.alerts.push({
            type: 'TEMPERATURE_HIGH',
            severity: this.sensorData.temperature > 100 ? 'CRITICAL' : 'HIGH',
            message: `Engine temperature is high: ${this.sensorData.temperature}°C`
        });
    }
};

module.exports = mongoose.model('IoT', IoTSchema);
