const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema({
    studentId: {
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
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    middleName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    grade: {
        type: String,
        required: [true, 'Grade is required']
    },
    section: {
        type: String,
        trim: true
    },
    rollNumber: {
        type: String,
        trim: true
    },
    admissionNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    admissionDate: {
        type: Date,
        default: Date.now
    },
    academicYear: {
        type: String,
        required: [true, 'Academic year is required']
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: {
            type: String,
            default: 'Kenya'
        },
        coordinates: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                index: '2dsphere'
            }
        }
    },
    parents: [{
        relation: {
            type: String,
            enum: ['father', 'mother', 'guardian'],
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        name: {
            type: String,
            required: true
        },
        email: String,
        phone: {
            type: String,
            required: true
        },
        occupation: String,
        isPrimary: {
            type: Boolean,
            default: false
        },
        canPickup: {
            type: Boolean,
            default: true
        }
    }],
    transportation: {
        usesTransport: {
            type: Boolean,
            default: false
        },
        routeId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolRoute'
        },
        pickupPoint: {
            name: String,
            address: String,
            coordinates: {
                type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point'
                },
                coordinates: [Number]
            },
            pickupTime: String
        },
        dropPoint: {
            name: String,
            address: String,
            coordinates: {
                type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point'
                },
                coordinates: [Number]
            },
            dropTime: String
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended'],
            default: 'active'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: Date
    },
    medical: {
        bloodGroup: String,
        allergies: [String],
        conditions: [String],
        medications: [String],
        doctorName: String,
        doctorPhone: String,
        insuranceProvider: String,
        insurancePolicyNumber: String
    },
    documents: [{
        type: {
            type: String,
            enum: ['birth_certificate', 'transfer_certificate', 'medical_certificate', 'other']
        },
        name: String,
        url: {
            type: String,
            required: true
        },
        uploadDate: {
            type: Date,
            default: Date.now
        },
        verified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        verifiedAt: Date
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'graduated', 'transferred', 'withdrawn'],
        default: 'active'
    },
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
studentSchema.index({ studentId: 1 }, { unique: true });
studentSchema.index({ school: 1, admissionNumber: 1 }, { unique: true, sparse: true });
studentSchema.index({ 'address.coordinates': '2dsphere' });
studentSchema.index({ 'transportation.pickupPoint.coordinates': '2dsphere' });
studentSchema.index({ 'transportation.dropPoint.coordinates': '2dsphere' });
studentSchema.index({ firstName: 'text', lastName: 'text', studentId: 'text' });

// Virtuals
studentSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`.trim();
});

studentSchema.virtual('age').get(function () {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
});

// Pre-save hooks
studentSchema.pre('save', async function (next) {
    if (!this.studentId) {
        const school = await this.model('School').findById(this.school);
        if (school) {
            const year = new Date().getFullYear().toString().slice(-2);
            const count = await this.constructor.countDocuments({
                school: this.school,
                admissionDate: { $gte: new Date(new Date().getFullYear(), 0, 1) }
            });
            this.studentId = `${school.code}${year}${String(count + 1).padStart(4, '0')}`;
        }
    }

    // Set admission number if not provided
    if (!this.admissionNumber && this.school) {
        const school = await this.model('School').findById(this.school);
        if (school) {
            const year = new Date().getFullYear().toString().slice(-2);
            const count = await this.constructor.countDocuments({
                school: this.school,
                admissionDate: { $gte: new Date(new Date().getFullYear(), 0, 1) }
            });
            this.admissionNumber = `ADM-${school.code}-${year}-${String(count + 1).padStart(4, '0')}`;
        }
    }

    next();
});

// Methods
studentSchema.methods.getTransportationStatus = function () {
    if (!this.transportation.usesTransport) {
        return 'Not using school transport';
    }

    if (this.transportation.status === 'suspended') {
        return 'Transportation suspended';
    }

    if (this.transportation.endDate && new Date(this.transportation.endDate) < new Date()) {
        return 'Transportation expired';
    }

    return 'Active';
};

const SchoolStudent = mongoose.model('SchoolStudent', studentSchema);

module.exports = SchoolStudent;
