const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tripStopSchema = new Schema({
    stop: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolRoute',
        required: true
    },
    actualArrivalTime: Date,
    actualDepartureTime: Date,
    scheduledArrivalTime: {
        type: String, // "HH:MM"
        required: true
    },
    scheduledDepartureTime: {
        type: String, // "HH:MM"
        required: true
    },
    delayMinutes: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'arrived', 'departed', 'skipped'],
        default: 'pending'
    },
    studentsPickedUp: [{
        student: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolStudent'
        },
        pickupTime: Date,
        checkInMethod: {
            type: String,
            enum: ['qr_code', 'nfc', 'manual', 'gps'],
            default: 'manual'
        },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolDriver'
        }
    }],
    studentsDroppedOff: [{
        student: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolStudent'
        },
        dropOffTime: Date,
        checkOutMethod: {
            type: String,
            enum: ['qr_code', 'nfc', 'manual', 'gps'],
            default: 'manual'
        },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolDriver'
        },
        receivedBy: String, // Parent/guardian name
        receivedByPhone: String
    }],
    notes: String
}, { _id: true });

const tripEventSchema = new Schema({
    eventType: {
        type: String,
        enum: [
            'trip_started',
            'trip_ended',
            'stop_arrived',
            'stop_departed',
            'student_picked_up',
            'student_dropped_off',
            'delay',
            'incident',
            'route_deviation',
            'emergency',
            'vehicle_issue'
        ],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number] // [longitude, latitude]
    },
    description: String,
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    reportedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    relatedStudent: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolStudent'
    },
    metadata: Schema.Types.Mixed
}, { _id: true });

const tripSchema = new Schema({
    tripId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    route: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolRoute',
        required: true
    },
    vehicle: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolVehicle',
        required: true
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolDriver',
        required: true
    },
    tripType: {
        type: String,
        enum: ['morning', 'afternoon', 'field_trip', 'special'],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    scheduledStartTime: {
        type: String, // "HH:MM"
        required: true
    },
    scheduledEndTime: {
        type: String, // "HH:MM"
    },
    actualStartTime: Date,
    actualEndTime: Date,
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'],
        default: 'scheduled'
    },
    stops: [tripStopSchema],
    events: [tripEventSchema],
    enrolledStudents: [{
        student: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolStudent'
        },
        pickupStop: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolRoute'
        },
        dropOffStop: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolRoute'
        },
        status: {
            type: String,
            enum: ['enrolled', 'picked_up', 'dropped_off', 'absent', 'cancelled'],
            default: 'enrolled'
        },
        pickupTime: Date,
        dropOffTime: Date,
        notes: String
    }],
    attendance: {
        totalEnrolled: {
            type: Number,
            default: 0
        },
        totalPickedUp: {
            type: Number,
            default: 0
        },
        totalDroppedOff: {
            type: Number,
            default: 0
        },
        absent: {
            type: Number,
            default: 0
        }
    },
    metrics: {
        totalDistance: {
            type: Number, // in kilometers
            default: 0
        },
        totalDuration: {
            type: Number, // in minutes
            default: 0
        },
        averageSpeed: {
            type: Number, // in km/h
            default: 0
        },
        fuelConsumed: {
            type: Number, // in liters
            default: 0
        },
        delays: [{
            reason: String,
            duration: Number, // in minutes
            location: {
                type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point'
                },
                coordinates: [Number]
            },
            timestamp: Date
        }]
    },
    incidents: [{
        type: Schema.Types.ObjectId,
        ref: 'Incident'
    }],
    weather: {
        condition: String,
        temperature: Number,
        visibility: String
    },
    notes: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
tripSchema.index({ tripId: 1 }, { unique: true });
tripSchema.index({ school: 1, date: 1 });
tripSchema.index({ route: 1, date: 1 });
tripSchema.index({ vehicle: 1, date: 1 });
tripSchema.index({ driver: 1, date: 1 });
tripSchema.index({ status: 1, date: 1 });
tripSchema.index({ 'events.timestamp': 1 });
tripSchema.index({ 'enrolledStudents.student': 1 });

// Virtuals
tripSchema.virtual('duration').get(function () {
    if (this.actualStartTime && this.actualEndTime) {
        return (this.actualEndTime - this.actualStartTime) / (1000 * 60); // in minutes
    }
    return null;
});

tripSchema.virtual('isOverdue').get(function () {
    if (this.status !== 'in_progress' || !this.scheduledEndTime) return false;
    const now = new Date();
    const scheduledEnd = new Date(this.date);
    const [hours, minutes] = this.scheduledEndTime.split(':');
    scheduledEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return now > scheduledEnd;
});

tripSchema.virtual('completionRate').get(function () {
    if (this.attendance.totalEnrolled === 0) return 0;
    return (this.attendance.totalDroppedOff / this.attendance.totalEnrolled) * 100;
});

// Pre-save hooks
tripSchema.pre('save', async function (next) {
    // Generate trip ID if not provided
    if (!this.tripId) {
        const school = await this.model('School').findById(this.school);
        if (school) {
            const dateStr = this.date.toISOString().split('T')[0].replace(/-/g, '');
            const count = await this.constructor.countDocuments({
                school: this.school,
                date: this.date
            });
            this.tripId = `TRP-${school.code}-${dateStr}-${String(count + 1).padStart(3, '0')}`;
        }
    }

    // Update attendance counts
    if (this.isModified('enrolledStudents')) {
        this.attendance.totalEnrolled = this.enrolledStudents.length;
        this.attendance.totalPickedUp = this.enrolledStudents.filter(s => s.status === 'picked_up').length;
        this.attendance.totalDroppedOff = this.enrolledStudents.filter(s => s.status === 'dropped_off').length;
        this.attendance.absent = this.enrolledStudents.filter(s => s.status === 'absent').length;
    }

    next();
});

// Methods
tripSchema.methods.startTrip = function (startTime, location) {
    this.status = 'in_progress';
    this.actualStartTime = startTime || new Date();

    // Add trip started event
    this.events.push({
        eventType: 'trip_started',
        timestamp: this.actualStartTime,
        location: location,
        description: 'Trip has started',
        reportedBy: this.driver
    });

    return this.save();
};

tripSchema.methods.endTrip = function (endTime, location) {
    this.status = 'completed';
    this.actualEndTime = endTime || new Date();

    // Calculate metrics
    if (this.actualStartTime) {
        this.metrics.totalDuration = (this.actualEndTime - this.actualStartTime) / (1000 * 60);
    }

    // Add trip ended event
    this.events.push({
        eventType: 'trip_ended',
        timestamp: this.actualEndTime,
        location: location,
        description: 'Trip has completed',
        reportedBy: this.driver
    });

    return this.save();
};

tripSchema.methods.pickupStudent = function (studentId, stopId, pickupTime, method) {
    const enrolledStudent = this.enrolledStudents.find(s =>
        s.student.toString() === studentId.toString()
    );

    if (!enrolledStudent) {
        throw new Error('Student not enrolled in this trip');
    }

    enrolledStudent.status = 'picked_up';
    enrolledStudent.pickupTime = pickupTime || new Date();

    // Add to stop's picked up students
    const stop = this.stops.find(s => s.stop.toString() === stopId.toString());
    if (stop) {
        stop.studentsPickedUp.push({
            student: studentId,
            pickupTime: enrolledStudent.pickupTime,
            checkInMethod: method || 'manual',
            verifiedBy: this.driver
        });
        stop.status = 'departed';
    }

    // Add event
    this.events.push({
        eventType: 'student_picked_up',
        timestamp: enrolledStudent.pickupTime,
        description: `Student picked up at stop`,
        relatedStudent: studentId,
        reportedBy: this.driver
    });

    return this.save();
};

tripSchema.methods.dropOffStudent = function (studentId, stopId, dropOffTime, method, receivedBy, receivedByPhone) {
    const enrolledStudent = this.enrolledStudents.find(s =>
        s.student.toString() === studentId.toString()
    );

    if (!enrolledStudent) {
        throw new Error('Student not enrolled in this trip');
    }

    enrolledStudent.status = 'dropped_off';
    enrolledStudent.dropOffTime = dropOffTime || new Date();

    // Add to stop's dropped off students
    const stop = this.stops.find(s => s.stop.toString() === stopId.toString());
    if (stop) {
        stop.studentsDroppedOff.push({
            student: studentId,
            dropOffTime: enrolledStudent.dropOffTime,
            checkOutMethod: method || 'manual',
            verifiedBy: this.driver,
            receivedBy: receivedBy,
            receivedByPhone: receivedByPhone
        });
    }

    // Add event
    this.events.push({
        eventType: 'student_dropped_off',
        timestamp: enrolledStudent.dropOffTime,
        description: `Student dropped off at stop`,
        relatedStudent: studentId,
        reportedBy: this.driver,
        metadata: { receivedBy, receivedByPhone }
    });

    return this.save();
};

tripSchema.methods.addEvent = function (eventType, description, severity, location, reportedBy, metadata) {
    this.events.push({
        eventType,
        timestamp: new Date(),
        location,
        description,
        severity: severity || 'low',
        reportedBy: reportedBy || this.driver,
        metadata
    });

    return this.save();
};

tripSchema.methods.addDelay = function (reason, duration, location) {
    this.metrics.delays.push({
        reason,
        duration,
        location,
        timestamp: new Date()
    });

    // Update status if significant delay
    if (duration > 15) {
        this.status = 'delayed';
    }

    // Add event
    this.events.push({
        eventType: 'delay',
        timestamp: new Date(),
        location,
        description: `Trip delayed by ${duration} minutes: ${reason}`,
        severity: duration > 30 ? 'high' : 'medium',
        reportedBy: this.driver,
        metadata: { reason, duration }
    });

    return this.save();
};

const SchoolTrip = mongoose.model('SchoolTrip', tripSchema);

module.exports = SchoolTrip;
