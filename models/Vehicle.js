const mongoose = require('mongoose')
const slugify = require('slugify')

const VehicleSchema = new mongoose.Schema({
  plate: {
    type: String,
    required: [true, 'Please add the vehicle plate'],
    unique: true,
    trim: true,
    maxlength: [15, 'plate cannot be more than 15 characters'],
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'plate cannot be more than 8 characters'],
  },
  model: {
    type: String,
    maxlength: [15, 'model cannot be longer than 15 character'],
  },
  condition: {
    type: String,
    required: [true, 'please add the condition'],
  },
  driver: {
    type: String,
    required: [true, 'please add the assigned driver'],
    trim: true,
    maxlength: [15, 'driver name cannot belonger than 15 characters'],
  },
  driverRating: {
    type: Number,
    required: [true, 'please add a valid rating'],
  },
  capacity: {
    type: Number,
    required: [true, 'please add vehicle capacity'],
  },
  routeAssigned: {
    type: [String],
    required: [true, 'please add the route assigned'],
  },
  active: {
    type: Boolean,
    required: true,
  },
  mileage: {
    type: Number,
    required: true,
  },
  photo: {
    type: String,
    default: 'no-photo.jpg',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
})

// /create vehicle slug from the plate

VehicleSchema.pre('save', function (next) {
  this.slug = slugify(this.plate, { lower: true })
  next()
})

module.exports = mongoose.model('Vehicle', VehicleSchema)
