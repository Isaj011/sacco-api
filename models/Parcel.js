const mongoose = require('mongoose')

const StatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
    location: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
    },
  },
  { _id: false }
)

const ParcelSchema = new mongoose.Schema(
  {
    // Auto-generated as PRK-{YYYYMMDD}-{6-digit random hex uppercase}
    trackingNumber: {
      type: String,
      required: [true, 'Tracking number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    order: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryOrder',
      required: [true, 'Please assign this parcel to a delivery order'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    dimensions: {
      lengthCm: {
        type: Number,
        min: [0, 'Length cannot be negative'],
      },
      widthCm: {
        type: Number,
        min: [0, 'Width cannot be negative'],
      },
      heightCm: {
        type: Number,
        min: [0, 'Height cannot be negative'],
      },
      weightKg: {
        type: Number,
        min: [0, 'Weight cannot be negative'],
      },
    },
    value: {
      amountKES: {
        type: Number,
        min: [0, 'Declared value cannot be negative'],
      },
      // Whether sender has formally declared the value (affects insurance eligibility)
      declared: {
        type: Boolean,
        default: false,
      },
    },
    fragile: {
      type: Boolean,
      default: false,
    },
    requiresRefrigeration: {
      type: Boolean,
      default: false,
    },
    sender: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
      county: {
        type: String,
        trim: true,
      },
    },
    recipient: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
      county: {
        type: String,
        trim: true,
      },
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'],
        message:
          'Status must be pending, picked_up, in_transit, delivered, failed, or returned',
      },
      default: 'pending',
    },
    statusHistory: [StatusHistorySchema],
    // Nullable — set once proof of delivery is captured
    proof: {
      type: mongoose.Schema.ObjectId,
      ref: 'ProofOfDelivery',
      default: null,
    },
    domain: {
      type: String,
      default: 'delivery',
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
)

// Pre-save: auto-generate trackingNumber if missing
ParcelSchema.pre('save', function (next) {
  if (this.trackingNumber) return next()

  const today = new Date()
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const randomHex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .toUpperCase()
    .padStart(6, '0')

  this.trackingNumber = `PRK-${datePart}-${randomHex}`
  next()
})

// Indexes
ParcelSchema.index({ trackingNumber: 1 }, { unique: true })
ParcelSchema.index({ order: 1 })
ParcelSchema.index({ status: 1 })
ParcelSchema.index({ 'recipient.phone': 1 })

module.exports = mongoose.model('Parcel', ParcelSchema)
