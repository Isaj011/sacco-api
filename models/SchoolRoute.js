const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const routeStopSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Stop name is required'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Stop address is required']
    },
    type: {
        type: String,
        enum: ['pickup', 'dropoff', 'both'],
        default: 'both'
    },
    sequence: {
        type: Number,
        required: [true, 'Stop sequence is required'],
        min: 1
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: [true, 'Coordinates are required']
        },
        address: String,
        landmark: String
    },
    estimatedTime: {
        // In minutes from route start
        type: Number,
        min: 0
    },
    arrivalTime: {
        // In 24-hour format "HH:MM"
        type: String,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    departureTime: {
        // In 24-hour format "HH:MM"
        type: String,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    students: [{
        type: Schema.Types.ObjectId,
        ref: 'SchoolStudent'
    }],
    notes: String
}, { _id: true });

const routeScheduleSchema = new Schema({
    days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
    }],
    startTime: {
        type: String, // In 24-hour format "HH:MM"
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        required: true
    },
    endTime: {
        type: String, // In 24-hour format "HH:MM"
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const routeSchema = new Schema({
    routeId: {
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
    name: {
        type: String,
        required: [true, 'Route name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['morning', 'afternoon', 'both', 'custom'],
        default: 'both'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'under_maintenance'],
        default: 'active'
    },
    distance: {
        // In kilometers
        type: Number,
        min: 0
    },
    duration: {
        // In minutes
        type: Number,
        min: 0
    },
    stops: [routeStopSchema],
    schedule: [routeScheduleSchema],
    assignedVehicle: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolVehicle'
    },
    assignedDriver: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolDriver'
    },
    students: [{
        type: Schema.Types.ObjectId,
        ref: 'SchoolStudent'
    }],
    capacity: {
        type: Number,
        min: 1
    },
    currentOccupancy: {
        type: Number,
        default: 0,
        min: 0
    },
    waypoints: [{
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: [Number] // [longitude, latitude]
        },
        sequence: Number
    }],
    startPoint: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number], // [longitude, latitude]
        address: String,
        name: String
    },
    endPoint: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number], // [longitude, latitude]
        address: String,
        name: String
    },
    isRoundTrip: {
        type: Boolean,
        default: true
    },
    estimatedRoundTripTime: {
        // In minutes
        type: Number,
        min: 0
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
routeSchema.index({ routeId: 1 }, { unique: true });
routeSchema.index({ school: 1, name: 1 }, { unique: true });
routeSchema.index({ 'stops.location.coordinates': '2dsphere' });
routeSchema.index({ 'startPoint.coordinates': '2dsphere' });
routeSchema.index({ 'endPoint.coordinates': '2dsphere' });
routeSchema.index({ 'waypoints.location.coordinates': '2dsphere' });

// Virtuals
routeSchema.virtual('availableSeats').get(function () {
    if (!this.capacity) return null;
    return Math.max(0, this.capacity - (this.currentOccupancy || 0));
});

routeSchema.virtual('isFull').get(function () {
    if (!this.capacity) return false;
    return this.currentOccupancy >= this.capacity;
});

// Pre-save hooks
routeSchema.pre('save', async function (next) {
    // Generate route ID if not provided
    if (!this.routeId) {
        const school = await this.model('School').findById(this.school);
        if (school) {
            const count = await this.constructor.countDocuments({
                school: this.school,
                createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
            });
            this.routeId = `RT-${school.code}-${new Date().getFullYear().toString().slice(-2)}-${String(count + 1).padStart(4, '0')}`;
        }
    }

    // Update current occupancy based on students
    if (this.isModified('students')) {
        this.currentOccupancy = this.students.length;
    }

    // Sort stops by sequence
    if (this.stops && this.stops.length > 0) {
        this.stops.sort((a, b) => a.sequence - b.sequence);
    }

    next();
});

// Methods
routeSchema.methods.addStop = function (stopData) {
    if (!this.stops) this.stops = [];

    // Set sequence if not provided
    if (stopData.sequence === undefined) {
        stopData.sequence = this.stops.length > 0 ?
            Math.max(...this.stops.map(s => s.sequence)) + 1 : 1;
    }

    this.stops.push(stopData);
    return this.save();
};

routeSchema.methods.updateStop = function (stopId, updateData) {
    const stop = this.stops.id(stopId);
    if (!stop) throw new Error('Stop not found');

    Object.assign(stop, updateData);
    return this.save();
};

routeSchema.methods.removeStop = function (stopId) {
    const stopIndex = this.stops.findIndex(s => s._id.toString() === stopId);
    if (stopIndex === -1) throw new Error('Stop not found');

    this.stops.splice(stopIndex, 1);
    return this.save();
};

routeSchema.methods.addStudent = function (studentId, stopId) {
    if (!this.students) this.students = [];

    // Check if student is already assigned
    if (this.students.includes(studentId)) {
        throw new Error('Student is already assigned to this route');
    }

    // Check capacity
    if (this.capacity && this.currentOccupancy >= this.capacity) {
        throw new Error('Route has reached maximum capacity');
    }

    // Add student to route
    this.students.push(studentId);
    this.currentOccupancy = this.students.length;

    // Add student to stop if stopId is provided
    if (stopId) {
        const stop = this.stops.id(stopId);
        if (stop) {
            if (!stop.students.includes(studentId)) {
                stop.students.push(studentId);
            }
        }
    }

    return this.save();
};

routeSchema.methods.removeStudent = function (studentId) {
    if (!this.students) return this;

    // Remove student from route
    this.students = this.students.filter(id => id.toString() !== studentId);
    this.currentOccupancy = this.students.length;

    // Remove student from all stops
    this.stops.forEach(stop => {
        stop.students = stop.students.filter(id => id.toString() !== studentId);
    });

    return this.save();
};

const SchoolRoute = mongoose.model('SchoolRoute', routeSchema);

module.exports = SchoolRoute;
