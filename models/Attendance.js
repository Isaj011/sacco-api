const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.ObjectId,
        ref: 'Student',
        required: true
    },
    school: {
        type: mongoose.Schema.ObjectId,
        ref: 'School',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    checkIn: {
        time: Date,
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                index: '2dsphere'
            },
            address: String
        },
        verifiedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        method: {
            type: String,
            enum: ['app', 'rfid', 'manual', 'qr'],
            default: 'app'
        }
    },
    checkOut: {
        time: Date,
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                index: '2dsphere'
            },
            address: String
        },
        verifiedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        method: {
            type: String,
            enum: ['app', 'rfid', 'manual', 'qr'],
            default: 'app'
        },
        pickedUpBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'Parent'
        }
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        default: 'absent'
    },
    notes: String,
    vehicle: {
        type: mongoose.Schema.ObjectId,
        ref: 'Vehicle'
    },
    driver: {
        type: mongoose.Schema.ObjectId,
        ref: 'Driver'
    },
    route: {
        type: mongoose.Schema.ObjectId,
        ref: 'Route'
    },
    session: {
        type: String,
        enum: ['morning', 'afternoon', 'evening'],
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationNotes: String,
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for performance
AttendanceSchema.index({ student: 1, date: 1, session: 1 }, { unique: true });
AttendanceSchema.index({ school: 1, date: 1 });
AttendanceSchema.index({ vehicle: 1, date: 1 });
AttendanceSchema.index({ driver: 1, date: 1 });
AttendanceSchema.index({ route: 1, date: 1 });

// Virtual for attendance duration
AttendanceSchema.virtual('duration').get(function () {
    if (this.checkIn && this.checkIn.time && this.checkOut && this.checkOut.time) {
        return (this.checkOut.time - this.checkIn.time) / (1000 * 60); // in minutes
    }
    return null;
});

// Pre-save hook to update status
AttendanceSchema.pre('save', function (next) {
    if (this.checkIn && this.checkIn.time) {
        this.status = 'present';

        // Check if student is late (after 8:30 AM for morning session)
        if (this.session === 'morning') {
            const checkInTime = new Date(this.checkIn.time);
            const lateTime = new Date(checkInTime);
            lateTime.setHours(8, 30, 0, 0); // 8:30 AM

            if (checkInTime > lateTime) {
                this.status = 'late';
            }
        }
    }
    next();
});

// Static method to get attendance summary
AttendanceSchema.statics.getSummary = async function (schoolId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                school: schoolId,
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date' }
                },
                present: {
                    $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                },
                absent: {
                    $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                },
                late: {
                    $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
                },
                total: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

module.exports = mongoose.model('Attendance', AttendanceSchema);
