const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.ObjectId,
        ref: 'School',
        required: true
    },
    admissionNumber: {
        type: String,
        required: [true, 'Please add an admission number'],
        unique: true
    },
    firstName: {
        type: String,
        required: [true, 'Please add a first name']
    },
    lastName: {
        type: String,
        required: [true, 'Please add a last name']
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Please add date of birth']
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    grade: {
        type: String,
        required: [true, 'Please add grade/class']
    },
    section: {
        type: String
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    contactNumber: {
        type: String,
        required: [true, 'Please add a contact number']
    },
    parents: [{
        parent: {
            type: mongoose.Schema.ObjectId,
            ref: 'Parent'
        },
        relationship: {
            type: String,
            enum: ['mother', 'father', 'guardian', 'other']
        },
        isPrimary: Boolean
    }],
    medicalInfo: {
        bloodGroup: String,
        allergies: [String],
        conditions: [String],
        medications: [String],
        notes: String
    },
    emergencyContacts: [{
        name: String,
        relationship: String,
        phone: String,
        email: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    photo: {
        type: String
    },
    checkInStatus: {
        type: String,
        enum: ['checked-in', 'checked-out', 'absent'],
        default: 'absent'
    },
    lastCheckIn: Date,
    lastCheckOut: Date,
    currentVehicle: {
        type: mongoose.Schema.ObjectId,
        ref: 'Vehicle'
    },
    currentDriver: {
        type: mongoose.Schema.ObjectId,
        ref: 'Driver'
    },
    route: {
        type: mongoose.Schema.ObjectId,
        ref: 'Route'
    },
    pickupPoint: String,
    dropoffPoint: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for frequently queried fields
StudentSchema.index({ school: 1, admissionNumber: 1 });
StudentSchema.index({ school: 1, isActive: 1 });
StudentSchema.index({ school: 1, route: 1 });
StudentSchema.index({ school: 1, 'parents.parent': 1 });

// Static method to get next admission number
StudentSchema.statics.getNextAdmissionNumber = async function (schoolId) {
    const result = await this.aggregate([
        {
            $match: { school: schoolId }
        },
        {
            $sort: { admissionNumber: -1 }
        },
        {
            $limit: 1
        }
    ]);

    if (result.length > 0) {
        const lastNumber = parseInt(result[0].admissionNumber.match(/\d+$/)[0]);
        return `STU-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    return 'STU-0001';
};

// Pre-save hook to generate admission number if not provided
StudentSchema.pre('save', async function (next) {
    if (!this.admissionNumber) {
        this.admissionNumber = await this.constructor.getNextAdmissionNumber(this.school);
    }
    next();
});

// Cascade delete student's related data when student is deleted
StudentSchema.pre('remove', async function (next) {
    console.log(`Removing student ${this._id}`);
    // Remove student from parent's children array
    await this.model('Parent').updateMany(
        { 'children.student': this._id },
        { $pull: { children: { student: this._id } } }
    );

    // Remove student's attendance records
    await this.model('Attendance').deleteMany({ student: this._id });

    next();
});

// Add method to get full name
StudentSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in toJSON output
StudentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Student', StudentSchema);
