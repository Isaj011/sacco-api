const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const driverSchema = new Schema({
    driverId: {
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
    contact: {
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        emergencyContact: {
            name: String,
            relationship: String,
            phone: String
        }
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
    license: {
        number: {
            type: String,
            required: [true, 'License number is required'],
            uppercase: true,
            trim: true
        },
        type: {
            type: String,
            required: [true, 'License type is required'],
            enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K'],
            uppercase: true
        },
        issueDate: {
            type: Date,
            required: [true, 'License issue date is required']
        },
        expiryDate: {
            type: Date,
            required: [true, 'License expiry date is required']
        },
        authority: {
            type: String,
            default: 'NTSA',
            trim: true
        },
        documents: [String] // URLs to license documents
    },
    employment: {
        employeeId: {
            type: String,
            trim: true
        },
        hireDate: {
            type: Date,
            default: Date.now
        },
        employmentType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'temporary', 'probation'],
            default: 'full-time'
        },
        position: {
            type: String,
            trim: true
        },
        department: {
            type: String,
            trim: true
        },
        supervisor: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['active', 'on_leave', 'suspended', 'terminated', 'retired'],
            default: 'active'
        },
        terminationDate: Date,
        terminationReason: String
    },
    documents: [{
        type: {
            type: String,
            enum: ['id_card', 'passport', 'certificate', 'medical', 'other'],
            required: true
        },
        name: String,
        url: {
            type: String,
            required: true
        },
        issueDate: Date,
        expiryDate: Date,
        verified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        verifiedAt: Date,
        notes: String
    }],
    medical: {
        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
            default: null
        },
        conditions: [String],
        allergies: [String],
        medications: [String],
        doctorName: String,
        doctorPhone: String,
        lastMedicalCheckup: Date,
        nextMedicalCheckup: Date,
        notes: String
    },
    training: [{
        name: {
            type: String,
            required: true
        },
        provider: String,
        completionDate: Date,
        expiryDate: Date,
        certificateUrl: String,
        notes: String
    }],
    assignedVehicle: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolVehicle'
    },
    assignedRoute: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolRoute'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave', 'suspended'],
        default: 'active'
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
driverSchema.index({ driverId: 1 }, { unique: true });
driverSchema.index({ 'license.number': 1 }, { unique: true, sparse: true });
driverSchema.index({ 'contact.phone': 1 });
driverSchema.index({ 'address.coordinates': '2dsphere' });
driverSchema.index({ firstName: 'text', lastName: 'text', driverId: 'text' });

// Virtuals
driverSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`.trim();
});

driverSchema.virtual('age').get(function () {
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
driverSchema.pre('save', async function (next) {
    // Generate driver ID if not provided
    if (!this.driverId) {
        const school = await this.model('School').findById(this.school);
        if (school) {
            const count = await this.constructor.countDocuments({
                school: this.school,
                'employment.hireDate': { $gte: new Date(new Date().getFullYear(), 0, 1) }
            });
            this.driverId = `DRV-${school.code}-${new Date().getFullYear().toString().slice(-2)}-${String(count + 1).padStart(4, '0')}`;
        }
    }

    // Generate employee ID if not provided
    if (!this.employment.employeeId && this.school) {
        const school = await this.model('School').findById(this.school);
        if (school) {
            const count = await this.constructor.countDocuments({
                school: this.school,
                'employment.hireDate': { $gte: new Date(new Date().getFullYear(), 0, 1) }
            });
            this.employment.employeeId = `EMP-${school.code}-${new Date().getFullYear().toString().slice(-2)}-${String(count + 1).padStart(4, '0')}`;
        }
    }

    next();
});

// Methods
driverSchema.methods.isLicenseValid = function () {
    if (!this.license || !this.license.expiryDate) return false;
    return new Date(this.license.expiryDate) > new Date();
};

driverSchema.methods.getUpcomingDocuments = function () {
    const upcoming = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Check driver's license
    if (this.license && this.license.expiryDate) {
        const expiry = new Date(this.license.expiryDate);
        if (expiry <= thirtyDaysFromNow) {
            upcoming.push({
                type: 'license',
                name: 'Driver License',
                expiryDate: expiry,
                daysRemaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
            });
        }
    }

    // Check other documents
    this.documents.forEach(doc => {
        if (doc.expiryDate) {
            const expiry = new Date(doc.expiryDate);
            if (expiry <= thirtyDaysFromNow) {
                upcoming.push({
                    type: 'document',
                    documentType: doc.type,
                    name: doc.name || `${doc.type} document`,
                    expiryDate: expiry,
                    daysRemaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
                });
            }
        }
    });

    // Check training certificates
    this.training.forEach(training => {
        if (training.expiryDate) {
            const expiry = new Date(training.expiryDate);
            if (expiry <= thirtyDaysFromNow) {
                upcoming.push({
                    type: 'training',
                    name: training.name,
                    expiryDate: expiry,
                    daysRemaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
                });
            }
        }
    });

    return upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
};

const SchoolDriver = mongoose.model('SchoolDriver', driverSchema);

module.exports = SchoolDriver;
