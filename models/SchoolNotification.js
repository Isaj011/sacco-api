const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    notificationId: {
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
    type: {
        type: String,
        enum: [
            'trip_update',
            'student_pickup',
            'student_dropoff',
            'delay_alert',
            'emergency',
            'route_change',
            'vehicle_issue',
            'attendance',
            'general',
            'maintenance',
            'safety',
            'academic'
        ],
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent', 'critical'],
        default: 'medium'
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    recipients: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['parent', 'driver', 'admin', 'staff', 'student'],
            required: true
        },
        deliveryStatus: {
            type: String,
            enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
            default: 'pending'
        },
        deliveryMethods: [{
            type: {
                type: String,
                enum: ['push', 'email', 'sms', 'in_app'],
                required: true
            },
            status: {
                type: String,
                enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
                default: 'pending'
            },
            sentAt: Date,
            deliveredAt: Date,
            readAt: Date,
            error: String,
            messageId: String // For external service tracking
        }],
        readAt: Date,
        preferences: {
            push: { type: Boolean, default: true },
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        }
    }],
    relatedEntities: [{
        entityType: {
            type: String,
            enum: ['student', 'trip', 'vehicle', 'driver', 'route', 'school', 'incident'],
            required: true
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        entityName: String
    }],
    scheduledFor: Date,
    expiresAt: Date,
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sent', 'delivered', 'expired', 'cancelled'],
        default: 'draft'
    },
    deliverySettings: {
        sendImmediately: {
            type: Boolean,
            default: true
        },
        retryAttempts: {
            type: Number,
            default: 3,
            min: 0,
            max: 5
        },
        retryInterval: {
            type: Number, // in minutes
            default: 15,
            min: 5,
            max: 60
        },
        quietHours: {
            enabled: { type: Boolean, default: false },
            start: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ },
            end: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ }
        }
    },
    metadata: {
        template: String,
        variables: Schema.Types.Mixed,
        attachments: [{
            name: String,
            url: String,
            type: String,
            size: Number
        }],
        actionButtons: [{
            text: String,
            url: String,
            action: String,
            style: {
                type: String,
                enum: ['primary', 'secondary', 'danger', 'success'],
                default: 'primary'
            }
        }],
        tracking: {
            opens: { type: Number, default: 0 },
            clicks: { type: Number, default: 0 },
            lastOpenedAt: Date,
            lastClickedAt: Date
        }
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    sentAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelReason: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ notificationId: 1 }, { unique: true });
notificationSchema.index({ school: 1, status: 1 });
notificationSchema.index({ 'recipients.user': 1, status: 1 });
notificationSchema.index({ type: 1, priority: 1, status: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ expiresAt: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });

// Virtuals
notificationSchema.virtual('isExpired').get(function () {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
});

notificationSchema.virtual('deliveryRate').get(function () {
    if (this.recipients.length === 0) return 0;
    const delivered = this.recipients.filter(r => r.deliveryStatus === 'delivered' || r.deliveryStatus === 'read').length;
    return (delivered / this.recipients.length) * 100;
});

notificationSchema.virtual('readRate').get(function () {
    if (this.recipients.length === 0) return 0;
    const read = this.recipients.filter(r => r.deliveryStatus === 'read').length;
    return (read / this.recipients.length) * 100;
});

// Pre-save hooks
notificationSchema.pre('save', async function (next) {
    // Generate notification ID if not provided
    if (!this.notificationId) {
        const school = await this.model('School').findById(this.school);
        if (school) {
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const count = await this.constructor.countDocuments({
                school: this.school,
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            });
            this.notificationId = `NTF-${school.code}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
        }
    }

    // Set expiration if not provided (7 days from creation)
    if (!this.expiresAt && this.type !== 'emergency') {
        this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    // Auto-send if sendImmediately is true and status is draft
    if (this.deliverySettings.sendImmediately && this.status === 'draft' && !this.scheduledFor) {
        this.status = 'sent';
        this.sentAt = new Date();
    }

    next();
});

// Methods
notificationSchema.methods.send = async function () {
    if (this.status === 'cancelled' || this.status === 'expired') {
        throw new Error('Cannot send cancelled or expired notification');
    }

    this.status = 'sent';
    this.sentAt = new Date();

    // Initialize delivery status for all recipients
    this.recipients.forEach(recipient => {
        recipient.deliveryStatus = 'sent';
        recipient.deliveryMethods.forEach(method => {
            method.status = 'pending';
        });
    });

    return this.save();
};

notificationSchema.methods.schedule = function (scheduledDate) {
    if (new Date(scheduledDate) <= new Date()) {
        throw new Error('Scheduled date must be in the future');
    }

    this.scheduledFor = scheduledDate;
    this.status = 'scheduled';
    return this.save();
};

notificationSchema.methods.cancel = function (reason, cancelledBy) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    this.cancelReason = reason;
    return this.save();
};

notificationSchema.methods.markAsDelivered = function (userId, method, messageId) {
    const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
    if (!recipient) {
        throw new Error('Recipient not found');
    }

    recipient.deliveryStatus = 'delivered';
    const deliveryMethod = recipient.deliveryMethods.find(m => m.type === method);
    if (deliveryMethod) {
        deliveryMethod.status = 'delivered';
        deliveryMethod.deliveredAt = new Date();
        deliveryMethod.messageId = messageId;
    }

    // Update overall delivered at if all recipients are delivered
    const allDelivered = this.recipients.every(r => r.deliveryStatus === 'delivered' || r.deliveryStatus === 'read');
    if (allDelivered && !this.deliveredAt) {
        this.deliveredAt = new Date();
    }

    return this.save();
};

notificationSchema.methods.markAsRead = function (userId, method) {
    const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
    if (!recipient) {
        throw new Error('Recipient not found');
    }

    recipient.deliveryStatus = 'read';
    recipient.readAt = new Date();

    const deliveryMethod = recipient.deliveryMethods.find(m => m.type === method);
    if (deliveryMethod) {
        deliveryMethod.status = 'read';
        deliveryMethod.readAt = new Date();
    }

    // Update tracking
    if (!this.metadata.tracking) {
        this.metadata.tracking = { opens: 0, clicks: 0 };
    }
    this.metadata.tracking.opens += 1;
    this.metadata.tracking.lastOpenedAt = new Date();

    return this.save();
};

notificationSchema.methods.trackClick = function (userId, action) {
    const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
    if (!recipient) {
        throw new Error('Recipient not found');
    }

    // Update tracking
    if (!this.metadata.tracking) {
        this.metadata.tracking = { opens: 0, clicks: 0 };
    }
    this.metadata.tracking.clicks += 1;
    this.metadata.tracking.lastClickedAt = new Date();

    return this.save();
};

notificationSchema.methods.addRecipient = function (userId, role, preferences) {
    // Check if recipient already exists
    const existingRecipient = this.recipients.find(r => r.user.toString() === userId.toString());
    if (existingRecipient) {
        throw new Error('Recipient already exists');
    }

    this.recipients.push({
        user: userId,
        role: role,
        preferences: preferences || {
            push: true,
            email: true,
            sms: false
        },
        deliveryMethods: [
            { type: 'push' },
            { type: 'email' },
            { type: 'in_app' }
        ]
    });

    return this.save();
};

notificationSchema.methods.removeRecipient = function (userId) {
    this.recipients = this.recipients.filter(r => r.user.toString() !== userId.toString());
    return this.save();
};

notificationSchema.methods.updateRecipientPreferences = function (userId, preferences) {
    const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
    if (!recipient) {
        throw new Error('Recipient not found');
    }

    recipient.preferences = { ...recipient.preferences, ...preferences };
    return this.save();
};

// Static methods
notificationSchema.statics.findByRecipient = function (userId, status, limit = 50) {
    const query = { 'recipients.user': userId };
    if (status) {
        query.status = status;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('recipients.user', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');
};

notificationSchema.statics.findUnreadByRecipient = function (userId, limit = 50) {
    return this.find({
        'recipients.user': userId,
        'recipients.deliveryStatus': { $ne: 'read' },
        status: { $in: ['sent', 'delivered'] }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('recipients.user', 'firstName lastName email');
};

notificationSchema.statics.findByTypeAndPriority = function (schoolId, type, priority, startDate, endDate) {
    const query = { school: schoolId };
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('recipients.user', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');
};

const SchoolNotification = mongoose.model('SchoolNotification', notificationSchema);

module.exports = SchoolNotification;
