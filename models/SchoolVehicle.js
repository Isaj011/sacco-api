const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const vehicleSchema = new Schema({
    registrationNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    make: {
        type: String,
        required: true,
        trim: true
    },
    model: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        min: 1990,
        max: new Date().getFullYear() + 1
    },
    color: {
        type: String,
        trim: true
    },
    vehicleType: {
        type: String,
        enum: ['bus', 'minibus', 'van', 'car', 'other'],
        required: true
    },
    capacity: {
        students: {
            type: Number,
            required: true,
            min: 1
        },
        seats: {
            type: Number,
            required: true,
            min: 1
        }
    },
    fuelType: {
        type: String,
        enum: ['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'other'],
        required: true
    },
    transmission: {
        type: String,
        enum: ['automatic', 'manual', 'semi-automatic'],
        required: true
    },
    owner: {
        type: {
            type: String,
            enum: ['school', 'contracted'],
            required: true
        },
        name: String,
        contactPerson: String,
        phone: String,
        email: String,
        address: String
    },
    registration: {
        number: String,
        authority: String,
        issueDate: Date,
        expiryDate: Date,
        documents: [String]
    },
    insurance: {
        provider: String,
        policyNumber: String,
        type: {
            type: String,
            enum: ['comprehensive', 'third_party', 'third_party_fire_theft']
        },
        startDate: Date,
        expiryDate: Date,
        premiumAmount: Number,
        documents: [String]
    },
    safety: {
        gpsEnabled: {
            type: Boolean,
            default: false
        },
        speedGovernor: {
            type: Boolean,
            default: false
        },
        speedLimit: Number,
        firstAidKit: {
            type: Boolean,
            default: true
        },
        fireExtinguisher: {
            type: Boolean,
            default: true
        },
        emergencyExit: {
            type: Boolean,
            default: true
        },
        seatBelts: {
            type: Boolean,
            default: true
        },
        cctv: {
            type: Boolean,
            default: false
        },
        panicButton: {
            type: Boolean,
            default: false
        },
        lastInspection: Date,
        inspectionStatus: {
            type: String,
            enum: ['passed', 'failed', 'pending'],
            default: 'pending'
        }
    },
    maintenance: {
        schedule: {
            type: {
                type: String,
                enum: ['time', 'mileage', 'both'],
                default: 'both'
            },
            intervalDays: Number,
            intervalMileage: Number,
            lastService: {
                date: Date,
                mileage: Number,
                serviceType: String,
                notes: String,
                serviceProvider: String,
                cost: Number
            },
            nextService: {
                date: Date,
                mileage: Number
            }
        },
        currentMileage: {
            type: Number,
            default: 0
        },
        fuelEfficiency: Number,
        fuelTankCapacity: Number,
        serviceHistory: [{
            date: Date,
            mileage: Number,
            serviceType: String,
            description: String,
            serviceProvider: String,
            cost: Number,
            nextServiceDate: Date,
            nextServiceMileage: Number,
            documents: [String]
        }]
    },
    currentAssignment: {
        driver: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolDriver'
        },
        route: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolRoute'
        },
        startDate: Date,
        endDate: Date,
        status: {
            type: String,
            enum: ['active', 'inactive', 'on_hold'],
            default: 'inactive'
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance', 'accident', 'decommissioned'],
        default: 'active'
    },
    currentLocation: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            index: '2dsphere'
        },
        timestamp: Date,
        speed: Number,
        heading: Number,
        accuracy: Number
    },
    features: [String],
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
vehicleSchema.index({ registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ 'currentLocation.coordinates': '2dsphere' });
vehicleSchema.index({ school: 1, status: 1 });
vehicleSchema.index({ 'currentAssignment.driver': 1 });
vehicleSchema.index({ 'currentAssignment.route': 1 });

// Virtuals
vehicleSchema.virtual('fullName').get(function () {
    return `${this.year} ${this.make} ${this.model} (${this.registrationNumber})`;
});

vehicleSchema.virtual('isOperational').get(function () {
    return this.status === 'active' &&
        this.currentAssignment.status === 'active' &&
        (!this.insurance.expiryDate || new Date(this.insurance.expiryDate) > new Date()) &&
        (!this.registration.expiryDate || new Date(this.registration.expiryDate) > new Date());
});

// Pre-save hooks
vehicleSchema.pre('save', function (next) {
    // Update maintenance schedule if last service is updated
    if (this.isModified('maintenance.schedule.lastService')) {
        const { lastService } = this.maintenance.schedule;
        if (lastService && lastService.date) {
            this.maintenance.schedule.nextService = {
                date: new Date(lastService.date.getTime() +
                    (this.maintenance.schedule.intervalDays || 30) * 24 * 60 * 60 * 1000),
                mileage: (this.maintenance.currentMileage || 0) +
                    (this.maintenance.schedule.intervalMileage || 5000)
            };
        }
    }

    // Update insurance status if expiry date is in the past
    if (this.insurance && this.insurance.expiryDate &&
        new Date(this.insurance.expiryDate) < new Date()) {
        this.status = 'inactive';
    }

    next();
});

// Methods
vehicleSchema.methods.getNextMaintenance = function () {
    if (!this.maintenance.schedule.nextService) return null;

    const nextService = { ...this.maintenance.schedule.nextService };
    const now = new Date();

    // Calculate days until next service
    if (nextService.date) {
        const timeDiff = nextService.date - now;
        nextService.daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }

    // Calculate mileage until next service
    if (nextService.mileage && this.maintenance.currentMileage) {
        nextService.mileageRemaining = nextService.mileage - this.maintenance.currentMileage;
    }

    return nextService;
};

const SchoolVehicle = mongoose.model('SchoolVehicle', vehicleSchema);

module.exports = SchoolVehicle;
