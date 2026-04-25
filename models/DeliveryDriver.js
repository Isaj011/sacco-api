const mongoose = require('mongoose')

const DeliveryDriverSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please add the driver first name'],
      trim: true,
      maxlength: [50, 'First name cannot be more than 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Please add the driver last name'],
      trim: true,
      maxlength: [50, 'Last name cannot be more than 50 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Please add a valid email address'],
      trim: true,
      lowercase: true,
    },
    // Kenya National ID — required for NTSA licensing compliance
    nationalId: {
      type: String,
      required: [true, 'Please add the national ID number'],
      unique: true,
      trim: true,
    },
    company: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryCompany',
      required: [true, 'Please assign this driver to a delivery company'],
    },
    // Kenya driving license classes for delivery vehicles:
    // A3 = motorcycles, B = light vehicles, C = medium trucks, CE = heavy trucks with trailer
    drivingLicense: {
      number: {
        type: String,
        trim: true,
      },
      class: {
        type: String,
        enum: {
          values: ['A3', 'B', 'C', 'CE'],
          message: 'License class must be A3 (motorcycle), B (light), C (medium truck), or CE (heavy truck)',
        },
      },
      expiryDate: {
        type: Date,
      },
      documentUrl: {
        type: String,
        trim: true,
      },
    },
    // Nullable — set when driver is actively assigned to a vehicle
    currentVehicle: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryVehicle',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'on_delivery', 'off_duty', 'suspended'],
        message: 'Status must be available, on_delivery, off_duty, or suspended',
      },
      default: 'available',
    },
    metrics: {
      totalDeliveries: {
        type: Number,
        default: 0,
        min: [0, 'Total deliveries cannot be negative'],
      },
      successfulDeliveries: {
        type: Number,
        default: 0,
        min: [0, 'Successful deliveries cannot be negative'],
      },
      failedDeliveries: {
        type: Number,
        default: 0,
        min: [0, 'Failed deliveries cannot be negative'],
      },
      averageRating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
      },
    },
    domain: {
      type: String,
      default: 'delivery',
      immutable: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Virtual: full name
DeliveryDriverSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Indexes
DeliveryDriverSchema.index({ phone: 1 }, { unique: true })
DeliveryDriverSchema.index({ nationalId: 1 }, { unique: true })
DeliveryDriverSchema.index({ company: 1, status: 1 })

module.exports = mongoose.model('DeliveryDriver', DeliveryDriverSchema)
