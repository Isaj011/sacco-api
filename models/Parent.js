const mongoose = require('mongoose');

const ParentSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.ObjectId,
        ref: 'School',
        required: true
    },
    firstName: {
        type: String,
        required: [true, 'Please add a first name']
    },
    lastName: {
        type: String,
        required: [true, 'Please add a last name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number']
    },
    alternatePhone: {
        type: String
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    city: {
        type: String,
        required: [true, 'Please add a city']
    },
    state: {
        type: String,
        required: [true, 'Please add a state']
    },
    postalCode: {
        type: String,
        required: [true, 'Please add a postal code']
    },
    country: {
        type: String,
        default: 'Kenya'
    },
    children: [{
        student: {
            type: mongoose.Schema.ObjectId,
            ref: 'Student',
            required: true
        },
        relationship: {
            type: String,
            enum: ['mother', 'father', 'guardian'],
            required: true
        },
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    notificationPreferences: {
        sms: {
            type: Boolean,
            default: true
        },
        email: {
            type: Boolean,
            default: true
        },
        push: {
            type: Boolean,
            default: true
        }
    },
    fcmToken: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    photo: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for frequently queried fields
ParentSchema.index({ school: 1, email: 1 });
ParentSchema.index({ 'children.student': 1 });

// Cascade delete parent's related data when parent is deleted
ParentSchema.pre('remove', async function (next) {
    console.log(`Removing parent ${this._id}`);
    // Remove parent from student's parents array
    await this.model('Student').updateMany(
        { 'parents.parent': this._id },
        { $pull: { parents: { parent: this._id } } }
    );
    next();
});

// Add method to get full name
ParentSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in toJSON output
ParentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Parent', ParentSchema);
