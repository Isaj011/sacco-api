const mongoose = require('mongoose')

const DeliveryOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    company: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryCompany',
      required: [true, 'Please assign this order to a delivery company'],
    },
    // Assigned after order creation
    vehicle: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryVehicle',
      default: null,
    },
    // Assigned after order creation
    driver: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryDriver',
      default: null,
    },
    // Parcel ObjectIds — populated separately via Parcel model
    parcels: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Parcel',
      },
    ],
    pickupLocation: {
      address: {
        type: String,
        trim: true,
      },
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
      county: {
        type: String,
        trim: true,
      },
      scheduledAt: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'assigned', 'picked_up', 'in_transit', 'completed', 'cancelled'],
        message:
          'Status must be pending, assigned, picked_up, in_transit, completed, or cancelled',
      },
      default: 'pending',
    },
    pricing: {
      baseRateKES: {
        type: Number,
        min: [0, 'Base rate cannot be negative'],
      },
      distanceKm: {
        type: Number,
        min: [0, 'Distance cannot be negative'],
      },
      totalKES: {
        type: Number,
        min: [0, 'Total cannot be negative'],
      },
      paid: {
        type: Boolean,
        default: false,
      },
      paymentMethod: {
        type: String,
        enum: {
          values: ['mpesa', 'cash', 'invoice'],
          message: 'Payment method must be mpesa, cash, or invoice',
        },
      },
    },
    route: {
      plannedDistanceKm: {
        type: Number,
        min: [0, 'Planned distance cannot be negative'],
      },
      actualDistanceKm: {
        type: Number,
        min: [0, 'Actual distance cannot be negative'],
      },
      startedAt: {
        type: Date,
      },
      completedAt: {
        type: Date,
      },
    },
    notes: {
      type: String,
      trim: true,
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

// Pre-save: auto-generate orderNumber as ORD-{YYYYMMDD}-{NNN}
DeliveryOrderSchema.pre('save', async function (next) {
  if (this.orderNumber) return next()

  const today = new Date()
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD

  // Count existing orders created today to derive the sequence
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const count = await this.constructor.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  })

  const sequence = String(count + 1).padStart(3, '0')
  this.orderNumber = `ORD-${datePart}-${sequence}`

  next()
})

// Indexes
DeliveryOrderSchema.index({ orderNumber: 1 }, { unique: true })
DeliveryOrderSchema.index({ company: 1, status: 1 })
DeliveryOrderSchema.index({ driver: 1, status: 1 })
DeliveryOrderSchema.index({ vehicle: 1, status: 1 })

module.exports = mongoose.model('DeliveryOrder', DeliveryOrderSchema)
