const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'Kenya' },
    coordinates: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    }
}, { _id: false });

const contactSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    designation: String
}, { _id: false });

const schoolSchema = new Schema({
    name: {
        type: String,
        required: [true, 'School name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'School code is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['primary', 'secondary', 'mixed', 'international', 'other'],
        required: true
    },
    ownership: {
        type: String,
        enum: ['public', 'private', 'charter', 'international'],
        required: true
    },
    address: {
        type: addressSchema,
        required: true
    },
    contacts: [contactSchema],
    principal: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true }
    },
    academicYear: {
        start: { type: Date, required: true },
        end: { type: Date, required: true }
    },
    settings: {
        timezone: {
            type: String,
            default: 'Africa/Nairobi',
            required: true
        },
        language: {
            type: String,
            enum: ['en', 'sw'],
            default: 'en',
            required: true
        },
        currency: {
            type: String,
            default: 'KES',
            required: true
        },
        dateFormat: {
            type: String,
            default: 'DD/MM/YYYY',
            required: true
        },
        timeFormat: {
            type: String,
            default: 'HH:mm',
            required: true
        }
    },
    features: {
        hasTransport: { type: Boolean, default: false },
        hasBoarding: { type: Boolean, default: false },
        hasCafeteria: { type: Boolean, default: false },
        hasLibrary: { type: Boolean, default: false },
        hasLaboratory: { type: Boolean, default: false }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    logo: String,
    website: String,
    description: String,
    isActive: {
        type: Boolean,
        default: true
    },
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'premium', 'enterprise'],
            default: 'free'
        },
        startDate: Date,
        endDate: Date,
        isActive: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
schoolSchema.index({ 'address.coordinates': '2dsphere' });
schoolSchema.index({ code: 1 }, { unique: true });
schoolSchema.index({ name: 'text', code: 'text' });

// Virtual for students count
schoolSchema.virtual('studentsCount', {
    ref: 'Student',
    localField: '_id',
    foreignField: 'school',
    count: true
});

// Virtual for vehicles count
schoolSchema.virtual('vehiclesCount', {
    ref: 'Vehicle',
    localField: '_id',
    foreignField: 'school',
    count: true
});

// Virtual for drivers count
schoolSchema.virtual('driversCount', {
    ref: 'Driver',
    localField: '_id',
    foreignField: 'school',
    count: true
});

// Pre-save hook to ensure end date is after start date for academic year
schoolSchema.pre('save', function (next) {
    if (this.academicYear.end <= this.academicYear.start) {
        throw new Error('Academic year end date must be after start date');
    }
    next();
});

// Pre-save hook to update subscription status
schoolSchema.pre('save', function (next) {
    const now = new Date();
    if (this.subscription) {
        this.subscription.isActive = this.subscription.endDate && this.subscription.endDate > now;
    }
    next();
});

// Static method to get active schools
schoolSchema.statics.getActiveSchools = function () {
    return this.find({ isActive: true, status: 'active' });
};

// Method to get school's full address
schoolSchema.methods.getFullAddress = function () {
    return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.postalCode}, ${this.address.country}`;
};

const School = mongoose.model('School', schoolSchema);

module.exports = School;
