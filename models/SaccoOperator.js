const mongoose = require('mongoose')

const SaccoOperatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add the SACCO name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    registrationNumber: {
      type: String,
      required: [true, 'Please add the Kenya NTSA registration number'],
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
      city: { type: String, required: [true, 'Please add a city'], trim: true },
      county: { type: String, required: [true, 'Please add a county'], trim: true },
    },
    contactPerson: {
      name:  { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    operatingCounties: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: { values: ['active', 'suspended', 'revoked'], message: 'Status must be active, suspended, or revoked' },
      default: 'active',
    },
    domain: { type: String, default: 'sacco', immutable: true },
  },
  { timestamps: true }
)

SaccoOperatorSchema.index({ registrationNumber: 1 }, { unique: true })
SaccoOperatorSchema.index({ status: 1 })

module.exports = mongoose.model('SaccoOperator', SaccoOperatorSchema)
