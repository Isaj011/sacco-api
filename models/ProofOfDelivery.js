const mongoose = require('mongoose')

const ProofOfDeliverySchema = new mongoose.Schema(
  {
    // One proof per parcel — enforced by unique index
    parcel: {
      type: mongoose.Schema.ObjectId,
      ref: 'Parcel',
      required: [true, 'Please link this proof to a parcel'],
      unique: true,
    },
    order: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryOrder',
      required: [true, 'Please link this proof to a delivery order'],
    },
    driver: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryDriver',
      required: [true, 'Please specify the driver who made this delivery'],
    },
    deliveredAt: {
      type: Date,
      required: [true, 'Please provide the delivery timestamp'],
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
      // GPS accuracy in metres
      accuracy: {
        type: Number,
        min: [0, 'Accuracy cannot be negative'],
      },
    },
    // Name of the person who physically received the parcel — may differ from parcel.recipient.name
    recipientName: {
      type: String,
      required: [true, 'Please provide the name of the person who received the parcel'],
      trim: true,
    },
    recipientPhone: {
      type: String,
      trim: true,
    },
    verificationMethod: {
      type: String,
      required: [true, 'Please specify the verification method used'],
      enum: {
        values: ['signature', 'photo', 'otp', 'qr_code'],
        message: 'Verification method must be signature, photo, otp, or qr_code',
      },
    },
    // Cloudinary URL for recipient signature image
    signatureImageUrl: {
      type: String,
      trim: true,
    },
    // Cloudinary URL for photo of parcel at delivery point
    photoImageUrl: {
      type: String,
      trim: true,
    },
    otpVerified: {
      type: Boolean,
      default: false,
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

// Indexes
ProofOfDeliverySchema.index({ parcel: 1 }, { unique: true })
ProofOfDeliverySchema.index({ order: 1 })
ProofOfDeliverySchema.index({ driver: 1 })

module.exports = mongoose.model('ProofOfDelivery', ProofOfDeliverySchema)
