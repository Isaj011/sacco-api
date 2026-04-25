# M-Pesa STK Push Ticketing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Sacco-only M-Pesa STK Push ticketing foundation — passenger pays via M-Pesa prompt on their phone, ticket record is created, and callback updates payment status.

**Architecture:** Three-layer approach — `services/mpesaService.js` owns all Daraja API communication (OAuth + STK push), `models/Ticket.js` stores each payment attempt tied to a Vehicle and Course, `controllers/ticketingController.js` exposes initiate/callback/status endpoints. School vehicles are untouched. Final fare calculation, seat assignment, and conductor UI are out of scope for this task.

**Tech Stack:** Safaricom Daraja API v1, axios (already installed), Node.js/Express/Mongoose, existing `protect` + `authorize` middleware.

---

## Environment Variables Needed

Add these to `config/config.env` before starting:

```env
# M-Pesa Daraja API (use sandbox values during development)
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/v1/tickets/callback
MPESA_ENVIRONMENT=sandbox
```

> **Sandbox credentials:** Get from https://developer.safaricom.co.ke → Create App → copy Consumer Key and Consumer Secret. The shortcode `174379` and passkey above are Safaricom's official sandbox values.

> **Callback URL in dev:** Safaricom cannot reach `localhost`. Use ngrok: `ngrok http 5000` → copy the HTTPS URL → set as `MPESA_CALLBACK_URL`.

---

## Task 1: M-Pesa Service

**Files:**
- Create: `services/mpesaService.js`

**What it does:** Handles two Daraja API calls — get OAuth token, initiate STK push. Token is cached in memory for its 1-hour lifetime to avoid hammering the auth endpoint.

**Step 1: Create the service**

```javascript
// services/mpesaService.js
const axios = require('axios');

const DARAJA_BASE = process.env.MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// In-memory token cache
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get OAuth access token from Daraja.
 * Caches the token until 60 seconds before expiry.
 */
const getAccessToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const { data } = await axios.get(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  cachedToken = data.access_token;
  // expires_in is in seconds; cache 60s early
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
};

/**
 * Initiate M-Pesa STK Push (Lipa Na M-Pesa Online).
 *
 * @param {string} phone   - Kenyan phone in 2547XXXXXXXX format
 * @param {number} amount  - Amount in KES (integer, no decimals)
 * @param {string} ref     - AccountReference shown to payer (max 12 chars)
 * @param {string} desc    - TransactionDesc shown on M-Pesa prompt (max 13 chars)
 * @returns {object}       - Daraja response with CheckoutRequestID
 */
const initiateSTKPush = async (phone, amount, ref, desc) => {
  const token = await getAccessToken();

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14); // YYYYMMDDHHmmss

  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount), // M-Pesa requires integer
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: ref.substring(0, 12),
    TransactionDesc: desc.substring(0, 13)
  };

  const { data } = await axios.post(
    `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data;
};

module.exports = { getAccessToken, initiateSTKPush };
```

**Step 2: Verify manually (no test runner needed)**

```bash
node -e "
require('dotenv').config({ path: './config/config.env' });
const { getAccessToken } = require('./services/mpesaService');
getAccessToken().then(t => console.log('Token OK:', t.substring(0,20) + '...')).catch(console.error);
"
```

Expected output: `Token OK: K0jjcP6qvfJGDjxZ4r...` (first 20 chars of token)

**Step 3: Commit**

```bash
git add services/mpesaService.js
git commit -m "feat: add M-Pesa Daraja service (OAuth + STK push)"
```

---

## Task 2: Ticket Model

**Files:**
- Create: `models/Ticket.js`

**What it does:** Stores each payment attempt. Links to `Vehicle` (Sacco) and `Course` (route). Status moves `PENDING → COMPLETED | FAILED | CANCELLED`. School vehicles are not referenced here.

**Step 1: Create the model**

```javascript
// models/Ticket.js
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  // Who is paying
  passengerPhone: {
    type: String,
    required: [true, 'Passenger phone is required'],
    match: [/^2547\d{8}$/, 'Phone must be in format 2547XXXXXXXX']
  },

  // What they are paying for
  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle is required']
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'Course (route) is required']
  },
  boardingStop: {
    type: String,
    required: false
  },
  alightingStop: {
    type: String,
    required: false
  },

  // Payment details
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1 KES']
  },
  currency: {
    type: String,
    default: 'KES'
  },

  // M-Pesa tracking
  checkoutRequestId: {
    type: String,
    unique: true,
    sparse: true  // null until STK push succeeds
  },
  merchantRequestId: {
    type: String,
    required: false
  },
  mpesaReceiptNumber: {
    type: String,
    required: false  // set by callback on success
  },

  // Lifecycle
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'],
    default: 'PENDING'
  },
  failureReason: {
    type: String,
    required: false
  },

  // Raw callback payload for debugging
  callbackPayload: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },

  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for common queries
TicketSchema.index({ passengerPhone: 1, createdAt: -1 });
TicketSchema.index({ vehicle: 1, createdAt: -1 });
TicketSchema.index({ checkoutRequestId: 1 });
TicketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', TicketSchema);
```

**Step 2: Commit**

```bash
git add models/Ticket.js
git commit -m "feat: add Ticket model for M-Pesa payments"
```

---

## Task 3: Ticketing Controller

**Files:**
- Create: `controllers/ticketingController.js`

**What it does:** Three endpoints —
1. `POST /initiate` — driver or conductor triggers STK push to passenger's phone
2. `POST /callback` — Safaricom calls this when payment completes/fails (public, no auth)
3. `GET /:id` — check ticket status

**Step 1: Create the controller**

```javascript
// controllers/ticketingController.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Ticket = require('../models/Ticket');
const Vehicle = require('../models/Vehicle');
const Course = require('../models/Course');
const { initiateSTKPush } = require('../services/mpesaService');

// @desc    Initiate M-Pesa STK push for a passenger
// @route   POST /api/v1/tickets/initiate
// @access  Private (admin, driver, staff)
exports.initiatePayment = asyncHandler(async (req, res, next) => {
  const { passengerPhone, vehicleId, courseId, amount, boardingStop, alightingStop } = req.body;

  // Validate vehicle exists and is a Sacco vehicle (not school)
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    return next(new ErrorResponse('Vehicle not found', 404));
  }

  // Validate course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse('Course (route) not found', 404));
  }

  // Create ticket in PENDING state before calling Daraja
  // This ensures we have a record even if STK push fails
  const ticket = await Ticket.create({
    passengerPhone,
    vehicle: vehicleId,
    course: courseId,
    amount,
    boardingStop,
    alightingStop,
    status: 'PENDING'
  });

  try {
    const ref = `TKT-${ticket._id.toString().slice(-8).toUpperCase()}`;
    const desc = `Fare ${course.routeNumber || 'Route'}`;

    const darajaResponse = await initiateSTKPush(
      passengerPhone,
      amount,
      ref,
      desc
    );

    // Update ticket with M-Pesa tracking IDs
    ticket.checkoutRequestId = darajaResponse.CheckoutRequestID;
    ticket.merchantRequestId = darajaResponse.MerchantRequestID;
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'STK push sent to passenger phone',
      data: {
        ticketId: ticket._id,
        checkoutRequestId: darajaResponse.CheckoutRequestID,
        status: 'PENDING'
      }
    });

  } catch (err) {
    // Mark ticket as failed if Daraja call errors
    ticket.status = 'FAILED';
    ticket.failureReason = err.message;
    await ticket.save();

    return next(new ErrorResponse(`M-Pesa initiation failed: ${err.message}`, 502));
  }
});

// @desc    M-Pesa payment callback (called by Safaricom)
// @route   POST /api/v1/tickets/callback
// @access  Public (Safaricom server — no JWT auth)
exports.mpesaCallback = asyncHandler(async (req, res, next) => {
  const body = req.body;

  // Safaricom wraps everything in Body.stkCallback
  const stkCallback = body?.Body?.stkCallback;

  if (!stkCallback) {
    // Malformed callback — acknowledge anyway to stop Safaricom retrying
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

  const ticket = await Ticket.findOne({ checkoutRequestId: CheckoutRequestID });

  if (!ticket) {
    // Unknown ticket — acknowledge and move on
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  // Store raw payload for debugging
  ticket.callbackPayload = body;
  ticket.completedAt = new Date();

  if (ResultCode === 0) {
    // Payment successful — extract receipt number from metadata
    const items = CallbackMetadata?.Item || [];
    const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');

    ticket.status = 'COMPLETED';
    ticket.mpesaReceiptNumber = receiptItem?.Value || null;
  } else {
    ticket.status = 'FAILED';
    ticket.failureReason = ResultDesc;
  }

  await ticket.save();

  // Always return 200 to Safaricom — they retry on non-200
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// @desc    Get ticket by ID (status check)
// @route   GET /api/v1/tickets/:id
// @access  Private
exports.getTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('vehicle', 'plateNumber vehicleModel')
    .populate('course', 'routeName routeNumber');

  if (!ticket) {
    return next(new ErrorResponse('Ticket not found', 404));
  }

  res.status(200).json({
    success: true,
    data: ticket
  });
});

// @desc    Get all tickets for a vehicle
// @route   GET /api/v1/tickets/vehicle/:vehicleId
// @access  Private (admin, staff)
exports.getVehicleTickets = asyncHandler(async (req, res, next) => {
  const tickets = await Ticket.find({ vehicle: req.params.vehicleId })
    .populate('course', 'routeName routeNumber')
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    count: tickets.length,
    data: tickets
  });
});
```

**Step 2: Commit**

```bash
git add controllers/ticketingController.js
git commit -m "feat: add ticketing controller (initiate, callback, status)"
```

---

## Task 4: Routes

**Files:**
- Create: `routes/ticketing.js`

**Step 1: Create the routes file**

```javascript
// routes/ticketing.js
const express = require('express');
const {
  initiatePayment,
  mpesaCallback,
  getTicket,
  getVehicleTickets
} = require('../controllers/ticketingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Safaricom callback — must be public, no JWT
router.post('/callback', mpesaCallback);

// Initiate STK push — drivers and staff can trigger
router.post('/initiate', protect, authorize('admin', 'staff', 'driver'), initiatePayment);

// Status check
router.get('/:id', protect, getTicket);

// All tickets for a vehicle
router.get('/vehicle/:vehicleId', protect, authorize('admin', 'staff'), getVehicleTickets);

module.exports = router;
```

**Step 2: Commit**

```bash
git add routes/ticketing.js
git commit -m "feat: add ticketing routes"
```

---

## Task 5: Mount Routes in server.js

**Files:**
- Modify: `server.js`

**Step 1: Add two lines to server.js**

After the existing route imports (around line 61), add:

```javascript
const ticketing = require('./routes/ticketing')
```

After the existing route mounts (around line 209), add:

```javascript
app.use('/api/v1/tickets', ticketing)
```

**Step 2: Add env vars to config/config.env**

```env
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://REPLACE-WITH-NGROK-URL.ngrok.io/api/v1/tickets/callback
MPESA_ENVIRONMENT=sandbox
```

**Step 3: Restart server and verify routes load**

```bash
npm run dev
```

Expected in console: `Server running in development mode on port 5000` with no errors.

**Step 4: Smoke test the callback endpoint (no M-Pesa account needed)**

```bash
curl -X POST http://localhost:5000/api/v1/tickets/callback \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "CheckoutRequestID": "ws_CO_test_123",
        "ResultCode": 0,
        "ResultDesc": "The service request is processed successfully.",
        "CallbackMetadata": {
          "Item": [
            { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
            { "Name": "Amount", "Value": 100 }
          ]
        }
      }
    }
  }'
```

Expected: `{"ResultCode":0,"ResultDesc":"Accepted"}`

**Step 5: Commit**

```bash
git add server.js config/config.env
git commit -m "feat: mount ticketing routes, add M-Pesa env vars"
```

---

## What Is Intentionally NOT In This Plan (Final Touches Later)

- Fare auto-calculation from Course fare + peak hour multiplier
- Timeout job (mark PENDING tickets as TIMEOUT after 5 minutes if no callback)
- Conductor mobile UI / QR code generation
- Passenger-facing status polling endpoint
- Daily revenue aggregation back to Vehicle.totalIncome
- Production Daraja credentials and go-live checklist
- Refund / reversal flow

---

## Quick Test Flow (End-to-End on Sandbox)

1. `npm run seed` — get a vehicleId and courseId from the seeded data
2. Login as admin → get JWT token
3. `POST /api/v1/tickets/initiate` with phone `254708374149` (Safaricom sandbox test number), vehicleId, courseId, amount `1`
4. Safaricom sandbox sends a fake STK push (no real phone needed on sandbox)
5. Simulate callback manually with the curl command above using the returned `checkoutRequestId`
6. `GET /api/v1/tickets/:ticketId` — status should be `COMPLETED`
