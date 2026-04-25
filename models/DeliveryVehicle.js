const mongoose = require('mongoose')

const DeliveryVehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Please add the vehicle registration number'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    company: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryCompany',
      required: [true, 'Please assign this vehicle to a delivery company'],
    },
    make: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
      min: [1900, 'Year cannot be before 1900'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
    },
    vehicleType: {
      type: String,
      required: [true, 'Please specify the vehicle type'],
      enum: {
        values: ['motorcycle', 'tuk_tuk', 'pickup', 'van', 'truck', 'refrigerated_truck'],
        message:
          'Vehicle type must be one of: motorcycle, tuk_tuk, pickup, van, truck, refrigerated_truck',
      },
    },
    payload: {
      maxKg: {
        type: Number,
        min: [0, 'Max payload weight cannot be negative'],
      },
      maxVolumeLiters: {
        type: Number,
        min: [0, 'Max payload volume cannot be negative'],
      },
    },
    // NTSA Commercial Vehicle License — KES 2,000/year
    commercialVehicleLicense: {
      number: {
        type: String,
        trim: true,
      },
      expiryDate: {
        type: Date,
      },
      documentUrl: {
        type: String,
        trim: true,
      },
    },
    insurance: {
      provider: {
        type: String,
        trim: true,
      },
      policyNumber: {
        type: String,
        trim: true,
      },
      expiryDate: {
        type: Date,
      },
      type: {
        type: String,
        enum: {
          values: ['comprehensive', 'third_party'],
          message: 'Insurance type must be comprehensive or third_party',
        },
      },
    },
    // Nullable — set when a driver is actively assigned
    currentDriver: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeliveryDriver',
      default: null,
    },
    currentLocation: {
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
      updatedAt: {
        type: Date,
      },
    },
    // Android IoT device identifier (IMEI or UUID)
    deviceId: {
      type: String,
      trim: true,
    },
    deviceStatus: {
      online: {
        type: Boolean,
        default: false,
      },
      lastSeen: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'on_delivery', 'maintenance', 'inactive'],
        message: 'Status must be available, on_delivery, maintenance, or inactive',
      },
      default: 'available',
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
DeliveryVehicleSchema.index({ registrationNumber: 1 }, { unique: true })
DeliveryVehicleSchema.index({ company: 1, status: 1 })
DeliveryVehicleSchema.index({ currentDriver: 1 })

module.exports = mongoose.model('DeliveryVehicle', DeliveryVehicleSchema)
