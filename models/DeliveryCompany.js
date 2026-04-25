const mongoose = require('mongoose')

const DeliveryCompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add the company name'],
      trim: true,
      maxlength: [100, 'Company name cannot be more than 100 characters'],
    },
    registrationNumber: {
      type: String,
      required: [true, 'Please add the Kenya company registration number'],
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email address'],
      match: [/^\S+@\S+\.\S+$/, 'Please add a valid email address'],
      trim: true,
      lowercase: true,
    },
    address: {
      city: {
        type: String,
        required: [true, 'Please add a city'],
        trim: true,
      },
      county: {
        type: String,
        required: [true, 'Please add a county'],
        trim: true,
      },
    },
    cakLicense: {
      number: {
        type: String,
        trim: true,
      },
      // tier defines annual fee bracket per CAK courier licensing regulations
      tier: {
        type: String,
        enum: {
          values: ['individual', 'small', 'large'],
          message: 'Tier must be individual (KES 30k), small (KES 50k), or large (KES 100k)',
        },
      },
      expiryDate: {
        type: Date,
      },
      documentUrl: {
        type: String,
        trim: true,
      },
      // KES 30,000 individual | KES 50,000 small | KES 100,000 large
      annualFeeKES: {
        type: Number,
        min: [0, 'Annual fee cannot be negative'],
      },
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'suspended', 'revoked'],
        message: 'Status must be active, suspended, or revoked',
      },
      default: 'active',
    },
    contactPerson: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        match: [/^\S+@\S+\.\S+$/, 'Please add a valid contact person email'],
        trim: true,
        lowercase: true,
      },
    },
    // Kenya counties the company is licensed/operating in
    operatingCounties: [
      {
        type: String,
        trim: true,
      },
    ],
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

module.exports = mongoose.model('DeliveryCompany', DeliveryCompanySchema)
