const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const FarePaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Fare amount is required']
  },
  method: {
    type: String,
    enum: ['mpesa', 'cash', 'card'],
    default: 'cash'
  },
  mpesaCode: {
    type: String,
    trim: true   // e.g. "QHX7Y8Z..."
  },
  mpesaPhone: {
    type: String,
    trim: true   // masked: "07XX...XXX"
  },
  boardingStop: String,
  alightingStop: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  syncedFromDevice: {
    type: Boolean,
    default: true  // false = added manually later
  }
}, { _id: true });

const StopRecordSchema = new mongoose.Schema({
  stopName: String,
  arrivedAt: Date,
  departedAt: Date,
  passengersBoarded: { type: Number, default: 0 },
  passengersAlighted: { type: Number, default: 0 }
}, { _id: false });

// ── Main schema ───────────────────────────────────────────────────────────────

const SaccoTripSchema = new mongoose.Schema({
  tripId: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
    // auto-generated in pre-save if missing
  },

  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle reference is required']
  },

  driver: {
    type: mongoose.Schema.ObjectId,
    ref: 'Driver',
    default: null
  },

  route: {
    type: mongoose.Schema.ObjectId,
    ref: 'Route',
    default: null
  },

  deviceId: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'in_progress'
  },

  startedAt: Date,
  endedAt: Date,

  startLocation: {
    latitude:  Number,
    longitude: Number,
    stopName:  String
  },

  endLocation: {
    latitude:  Number,
    longitude: Number,
    stopName:  String
  },

  passengers: {
    boarded:  { type: Number, default: 0 },
    alighted: { type: Number, default: 0 },
    peak:     { type: Number, default: 0 }  // max simultaneous
  },

  farePayments: [FarePaymentSchema],

  revenue: {
    collected:  { type: Number, default: 0 },   // sum of farePayments[].amount — computed in pre-save
    reported:   { type: Number, default: 0 },   // what conductor reported
    expected:   { type: Number, default: 0 },   // Course baseFare × passengers.boarded
    variance:   { type: Number, default: 0 },   // collected - reported
    reconciled: { type: Boolean, default: false }
  },

  compliance: {
    speedViolations:     { type: Number, default: 0 },
    harshBrakingEvents:  { type: Number, default: 0 },
    routeDeviations:     { type: Number, default: 0 },
    overloadingOccurred: { type: Boolean, default: false },
    behaviourScore:      { type: Number, min: 0, max: 100 },
    distanceKm:          { type: Number, default: 0 }
  },

  stops: [StopRecordSchema],

  notes: String

}, {
  timestamps: true   // createdAt / updatedAt
});

// ── Indexes ───────────────────────────────────────────────────────────────────

SaccoTripSchema.index({ vehicle: 1, startedAt: -1 });
SaccoTripSchema.index({ driver: 1, startedAt: -1 });
SaccoTripSchema.index({ status: 1, startedAt: -1 });
SaccoTripSchema.index({ tripId: 1 }, { unique: true });

// ── Pre-save middleware ───────────────────────────────────────────────────────

SaccoTripSchema.pre('save', async function (next) {
  try {
    // 1. Auto-generate tripId if not yet set
    if (!this.tripId) {
      const Vehicle = mongoose.model('Vehicle');
      const vehicle = await Vehicle.findById(this.vehicle).select('plateNumber').lean();

      const plate = vehicle
        ? vehicle.plateNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()
        : 'UNK';

      const now = this.startedAt || this.createdAt || new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

      // Count today's trips for this vehicle to get the 3-digit sequence
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const todayCount = await this.constructor.countDocuments({
        vehicle:   this.vehicle,
        startedAt: { $gte: startOfDay, $lte: endOfDay }
      });

      const seq = String(todayCount + 1).padStart(3, '0');
      this.tripId = `TRP-${plate}-${datePart}-${seq}`;
    }

    // 2. Recompute revenue.collected from farePayments
    if (this.farePayments && this.farePayments.length > 0) {
      this.revenue.collected = this.farePayments.reduce(
        (sum, fp) => sum + (fp.amount || 0), 0
      );
    }

    // 3. Recompute revenue.variance (only meaningful when reported is set)
    if (this.revenue.reported > 0) {
      this.revenue.variance = this.revenue.collected - this.revenue.reported;
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('SaccoTrip', SaccoTripSchema);
