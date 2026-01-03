const mongoose = require('mongoose');

const PassengerEventSchema = new mongoose.Schema({
    // Core event information
    eventType: {
        type: String,
        required: [true, 'Event type is required'],
        enum: [
            'PASSENGER_SEATED',
            'PASSENGER_STOOD_UP',
            'PASSENGER_BOARDED',
            'PASSENGER_ALIGHTED',
            'TRIP_STARTED',
            'TRIP_ENDED',
            'STOP_REACHED',
            'DOOR_OPENED',
            'DOOR_CLOSED'
        ]
    },
    tripId: {
        type: String,
        required: [true, 'Trip ID is required'],
        trim: true,
        maxlength: [50, 'Trip ID cannot be more than 50 characters']
    },

    // Zone/Location information
    zoneId: {
        type: String,
        required: false,
        trim: true,
        maxlength: [50, 'Zone ID cannot be more than 50 characters']
    },
    zoneType: {
        type: String,
        required: false,
        enum: ['SEAT', 'STANDING_AREA', 'DOOR', 'AISLE', 'UNKNOWN'],
        default: 'UNKNOWN'
    },

    // GPS location
    gps: {
        latitude: {
            type: Number,
            required: [true, 'GPS latitude is required'],
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            required: [true, 'GPS longitude is required'],
            min: -180,
            max: 180
        },
        accuracy: {
            type: Number,
            required: false,
            min: 0,
            default: 10.0
        },
        altitude: {
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

    // Timestamps
    timestamp: {
        type: Number,
        required: [true, 'Event timestamp is required'],
        validate: {
            validator: function (v) {
                return v <= Date.now();
            },
            message: 'Timestamp cannot be in the future'
        }
    },
    receivedAt: {
        type: Date,
        default: Date.now
    },

    // Device information
    deviceId: {
        type: String,
        required: false,
        trim: true,
        maxlength: [50, 'Device ID cannot be more than 50 characters']
    },
    vehicleId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Vehicle',
        required: false
    },

    // Additional metadata
    passengerCount: {
        type: Number,
        required: false,
        min: 0,
        default: 1
    },
    routeId: {
        type: String,
        required: false,
        trim: true
    },
    driverId: {
        type: String,
        required: false,
        trim: true
    },

    // Processing status
    processed: {
        type: Boolean,
        default: false
    },

    // Raw data for debugging
    rawData: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

// Indexes for better query performance
PassengerEventSchema.index({ tripId: 1, timestamp: 1 });
PassengerEventSchema.index({ eventType: 1, timestamp: -1 });
PassengerEventSchema.index({ deviceId: 1, timestamp: -1 });
PassengerEventSchema.index({ vehicleId: 1, timestamp: -1 });
PassengerEventSchema.index({ 'gps.latitude': 1, 'gps.longitude': 1 });
PassengerEventSchema.index({ receivedAt: -1 });

// Virtual for formatted location
PassengerEventSchema.virtual('formattedLocation').get(function () {
    if (this.gps && this.gps.latitude && this.gps.longitude) {
        return `${this.gps.latitude}, ${this.gps.longitude}`;
    }
    return null;
});

// Virtual for event duration (for trip events)
PassengerEventSchema.virtual('eventAge').get(function () {
    return Date.now() - this.timestamp;
});

// Pre-save middleware
PassengerEventSchema.pre('save', function (next) {
    // Validate GPS coordinates
    if (this.gps) {
        if (Math.abs(this.gps.latitude) < 0.01 && Math.abs(this.gps.longitude) < 0.01) {
            return next(new Error('GPS coordinates appear to be invalid (too close to 0,0)'));
        }
    }

    // Set receivedAt if not provided
    if (!this.receivedAt) {
        this.receivedAt = new Date();
    }

    next();
});

// Static method to get trip statistics
PassengerEventSchema.statics.getTripStatistics = async function (tripId) {
    const stats = await this.aggregate([
        { $match: { tripId: tripId } },
        {
            $group: {
                _id: '$eventType',
                count: { $sum: 1 },
                firstOccurrence: { $min: '$timestamp' },
                lastOccurrence: { $max: '$timestamp' }
            }
        },
        { $sort: { firstOccurrence: 1 } }
    ]);

    return stats;
};

// Static method to get active trips
PassengerEventSchema.statics.getActiveTrips = async function (hours = 24) {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    const activeTrips = await this.aggregate([
        { $match: { timestamp: { $gte: cutoffTime } } },
        {
            $group: {
                _id: '$tripId',
                vehicleId: { $first: '$vehicleId' },
                deviceId: { $first: '$deviceId' },
                lastEvent: { $max: '$timestamp' },
                lastEventType: { $last: '$eventType' },
                eventCount: { $sum: 1 },
                passengerEvents: {
                    $sum: {
                        $cond: [
                            { $in: ['$eventType', ['PASSENGER_SEATED', 'PASSENGER_BOARDED', 'PASSENGER_ALIGHTED']] },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            $addFields: {
                hasTripEnd: {
                    $any: true
                }
            }
        },
        { $sort: { lastEvent: -1 } }
    ]);

    return activeTrips;
};

module.exports = mongoose.model('PassengerEvent', PassengerEventSchema);
