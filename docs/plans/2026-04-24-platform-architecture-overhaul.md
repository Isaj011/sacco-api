# Platform Architecture Overhaul

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the current loosely-coupled codebase into a multi-domain transport platform where Sacco, School, and Delivery operate as isolated verticals feeding a central intelligence layer that serves NTSA, analytics, and demographic insights.

**Architecture:** Domain isolation enforced at the model and route layer. A `PlatformEvent` collection acts as the single source of truth — every domain writes events here, and all analytics, NTSA feeds, and external data enrichment reads from it. IoT (Android/Gemma) is domain-aware and routes data to the correct processor.

**Tech Stack:** Node.js/Express/Mongoose, M-Pesa Daraja API, WebSocket (ws), node-cron, axios, Safaricom Daraja, Google Gemma 4 (on-device — API surface only defined here, not implemented)

---

## The Problem With the Current System (Audit Findings)

| Issue | Current State | Required State |
|---|---|---|
| Domain isolation | School/Sacco share Incident, Attendance, Alert models with no domain tag | Every model and event is stamped with its domain |
| Central data point | Events in 5 scattered collections (PassengerEvent, IoT.alerts, Alert, SchoolTrip.events, VehicleLocationHistory) | One `PlatformEvent` collection all domains write to |
| IoT routing | IoT only links to Sacco `Vehicle` model | IoT is domain-aware, routes to correct vehicle type |
| Analytics | In-memory only, no persistence | Reads from `PlatformEvent`, persists aggregations |
| Delivery | Does not exist | Full domain: parcels, drivers, vehicles, M-Pesa payment |
| Ticketing | Partial plan only | Complete Sacco-only M-Pesa ticketing |
| NTSA feed | Reads from Sacco models ad-hoc | Reads structured compliance events from `PlatformEvent` |
| Gemma AI | No integration point | Defined event contract so Android/Gemma output maps directly to `PlatformEvent` |

---

## The Platform Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ANDROID DEVICE (per vehicle)                    │
│                    Gemma 4 AI — processes locally                       │
│         GPS · Speed · Passengers · Doors · Camera · Audio              │
│   Outputs structured JSON events — no raw video/audio sent to cloud    │
└──────────┬──────────────────┬───────────────────┬───────────────────────┘
           │ domain: sacco    │ domain: school    │ domain: delivery
           ▼                  ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    IoT GATEWAY  /api/v1/iot/ingest                       │
│           Routes payload to correct domain processor                    │
└────┬─────────────────────┬────────────────────┬────────────────────────-┘
     │                     │                    │
     ▼                     ▼                    ▼
┌──────────┐        ┌────────────┐      ┌────────────────┐
│  SACCO   │        │   SCHOOL   │      │    DELIVERY    │
│  DOMAIN  │        │   DOMAIN   │      │    DOMAIN      │
│          │        │            │      │                │
│ Vehicle  │        │SchoolVehicle│     │DeliveryVehicle │
│ Driver   │        │SchoolDriver│      │DeliveryDriver  │
│ Course   │        │SchoolRoute │      │DeliveryOrder   │
│ Ticket   │        │SchoolTrip  │      │Parcel          │
│ Passenger│        │Student     │      │ProofOfDelivery │
│  Event   │        │Parent      │      │DeliveryPayment │
└────┬─────┘        └─────┬──────┘      └───────┬────────┘
     │                    │                     │
     └────────────────────┴─────────────────────┘
                          │ All domains write here
                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    PLATFORM EVENT BUS (PlatformEvent)                   │
│   domain · entityType · entityId · eventType · payload · location ·    │
│   timestamp · processedForAnalytics · processedForNTSA                  │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
          ┌────────────────┼──────────────────────┐
          ▼                ▼                      ▼
   ┌────────────┐  ┌──────────────┐    ┌──────────────────┐
   │  ANALYTICS │  │ NTSA FEED    │    │ EXTERNAL DATA    │
   │  ENGINE    │  │              │    │ ENRICHMENT       │
   │            │  │ Compliance   │    │                  │
   │ Revenue    │  │ Speed data   │    │ Traffic APIs     │
   │ Stage heat │  │ PSV reports  │    │ Weather          │
   │ maps       │  │ Policy data  │    │ Census/Demo data │
   │ Demand     │  │              │    │ Stage popularity │
   └────────────┘  └──────────────┘    └──────────────────┘
```

---

## Domain Definitions (Strict Isolation)

### Rule
A vehicle belongs to exactly one domain. A driver belongs to exactly one domain. They NEVER cross. Cross-domain aggregation happens ONLY through `PlatformEvent`, never by direct model reference.

---

## SACCO DOMAIN — Complete Feature Set

### Models (keep existing, add `domain` stamp and `PlatformEvent` writes)

**Vehicle** — Sacco matatu/bus
- Existing fields kept
- Add: `domain: { type: String, default: 'sacco', immutable: true }`
- IoT device links here
- On location update → write `PlatformEvent(domain:'sacco', eventType:'VEHICLE_LOCATION_UPDATE')`

**Driver** — PSV-licensed Sacco driver
- Existing fields kept
- Add: `domain: { type: String, default: 'sacco', immutable: true }`
- Document expiry → write `PlatformEvent(domain:'sacco', eventType:'DOCUMENT_EXPIRY_WARNING')`

**Course** — Sacco route
- Existing fields kept
- Revenue updates → write `PlatformEvent(domain:'sacco', eventType:'REVENUE_RECORDED')`

**Ticket** — M-Pesa payment per trip (COMPLETED from previous plan)
- On COMPLETED → write `PlatformEvent(domain:'sacco', eventType:'TICKET_PAID', payload:{amount, phone, route})`

**PassengerEvent** — Boarding, alighting, seat/door events from IoT
- On create → write `PlatformEvent(domain:'sacco', eventType:'PASSENGER_EVENT')`

**VehicleLocationHistory** — Already exists, keep as-is (Sacco only)

**LocationTrigger** — Already exists, keep as-is (Sacco only)

### New Sacco Features
- Ticketing via M-Pesa STK Push (from previous plan — implement)
- Passenger count analytics per route per hour (from PassengerEvents)
- Speed violation auto-reporting to NTSA (via PlatformEvent)
- Route heat map data (GPS points aggregated from PlatformEvent)

---

## SCHOOL DOMAIN — Complete Feature Set

### Models (keep all existing SchoolXxx models, enforce no Sacco refs)

**School** — Institution record, subscription tier gates features

**SchoolVehicle** — School bus (NEVER references Sacco Vehicle)
- Add: `domain: { type: String, default: 'school', immutable: true }`
- IoT device links here (separate IoT pipeline)
- On location update → write `PlatformEvent(domain:'school', eventType:'SCHOOL_VEHICLE_LOCATION')`
- On trip start/end → WebSocket push to parents + `PlatformEvent`

**SchoolDriver** — School bus driver (NEVER references Sacco Driver)
- Add: `domain: { type: String, default: 'school', immutable: true }`

**SchoolRoute** — School pickup/dropoff route

**SchoolStudent** — Student enrolled in school transport

**SchoolTrip** — Active trip with pickup/dropoff events
- On student pickup → write `PlatformEvent(domain:'school', eventType:'STUDENT_PICKED_UP')` + WebSocket to parent
- On student dropoff → write `PlatformEvent(domain:'school', eventType:'STUDENT_DROPPED_OFF')` + WebSocket to parent
- On delay → write `PlatformEvent(domain:'school', eventType:'TRIP_DELAY')` + push notification

**Parent** — Receives WebSocket + push notifications about child

**SchoolNotification** — Notification log

### School IoT Flow (separate from Sacco)
```
School bus Android (Gemma) 
  → POST /api/v1/iot/ingest { domain: 'school', vehicleId, events[] }
  → SchoolIoTProcessor.process()
  → SchoolVehicle.currentLocation updated
  → SchoolTrip active stops checked
  → PlatformEvent written
  → WebSocket pushed to parents of students on that trip
```

### Fix: Attendance Model
Current `Attendance` model references both `Student` and `Vehicle` (Sacco). This is wrong.

**Fix:** Split into:
- `SchoolAttendance` → references `SchoolStudent` + `SchoolVehicle` + `SchoolRoute` (school domain)
- Remove `Attendance` model entirely

### Fix: Incident Model
Current `Incident` references Sacco Vehicle/Driver/Course.

**Fix:** Add `domain` field + `domainVehicleId` (string) + `domainDriverId` (string):
- Sacco incident: domain='sacco', references Vehicle+Driver+Course
- School incident: domain='school', references SchoolVehicle+SchoolDriver+SchoolRoute
- Delivery incident: domain='delivery', references DeliveryVehicle+DeliveryDriver

---

## DELIVERY DOMAIN — New Feature Set

### Purpose
East African last-mile parcel delivery. A delivery company registers vehicles and drivers. Senders pay via M-Pesa. Drivers deliver and capture proof of delivery via the Android app (photo + GPS stamp via Gemma). The same IoT infrastructure used by Sacco powers delivery vehicle tracking.

### New Models

**DeliveryCompany**
```javascript
{
  name: String,
  registrationNumber: String,
  contactEmail: String,
  contactPhone: String,
  address: String,
  serviceAreas: [String], // Nairobi, Mombasa, etc.
  subscription: { plan, startDate, endDate, isActive },
  domain: { type: String, default: 'delivery', immutable: true }
}
```

**DeliveryVehicle**
```javascript
{
  company: ObjectId → DeliveryCompany,
  plateNumber: String,
  vehicleType: enum['motorcycle', 'tuktuk', 'pickup', 'van', 'truck'],
  capacity: { weight: Number, volume: Number }, // kg and litres
  currentLocation: { latitude, longitude, updatedAt },
  currentDriver: ObjectId → DeliveryDriver,
  status: enum['available', 'on_delivery', 'maintenance', 'offline'],
  deviceId: String, // Android device
  domain: { type: String, default: 'delivery', immutable: true }
}
```

**DeliveryDriver**
```javascript
{
  company: ObjectId → DeliveryCompany,
  firstName: String, lastName: String,
  phone: String, nationalId: String,
  license: { number, expiryDate },
  assignedVehicle: ObjectId → DeliveryVehicle,
  status: enum['available', 'on_delivery', 'offline'],
  totalDeliveries: Number, rating: Number,
  domain: { type: String, default: 'delivery', immutable: true }
}
```

**DeliveryOrder**
```javascript
{
  orderNumber: String, // auto-generated
  company: ObjectId → DeliveryCompany,
  sender: {
    name: String, phone: String,
    address: String, location: { latitude, longitude }
  },
  recipient: {
    name: String, phone: String,
    address: String, location: { latitude, longitude }
  },
  parcels: [ObjectId → Parcel],
  assignedVehicle: ObjectId → DeliveryVehicle,
  assignedDriver: ObjectId → DeliveryDriver,
  route: { estimatedDistance: Number, estimatedDuration: Number },
  payment: {
    amount: Number, method: enum['mpesa', 'cash', 'account'],
    status: enum['PENDING', 'PAID', 'FAILED'],
    mpesaReceiptNumber: String,
    checkoutRequestId: String
  },
  status: enum['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'],
  timeline: [{
    status: String, timestamp: Date, location: {lat, lng}, note: String
  }],
  proofOfDelivery: ObjectId → ProofOfDelivery,
  domain: { type: String, default: 'delivery', immutable: true }
}
```

**Parcel**
```javascript
{
  order: ObjectId → DeliveryOrder,
  description: String,
  weight: Number, // kg
  dimensions: { length, width, height }, // cm
  fragile: Boolean,
  declaredValue: Number, // KES
  barcode: String, // auto-generated
  domain: { type: String, default: 'delivery', immutable: true }
}
```

**ProofOfDelivery**
```javascript
{
  order: ObjectId → DeliveryOrder,
  driver: ObjectId → DeliveryDriver,
  deliveredAt: Date,
  location: { latitude, longitude, accuracy },
  recipientName: String,
  recipientSignature: String, // base64 or URL
  photos: [String], // Cloudinary URLs — captured by Android/Gemma
  notes: String,
  domain: { type: String, default: 'delivery', immutable: true }
}
```

### Delivery IoT Flow
```
Delivery Android (Gemma)
  → POST /api/v1/iot/ingest { domain: 'delivery', vehicleId, events[] }
  → DeliveryIoTProcessor.process()
  → DeliveryVehicle.currentLocation updated
  → DeliveryOrder timeline updated if near recipient
  → PlatformEvent written (domain: 'delivery')
  → Sender notified via SMS/M-Pesa callback when delivered
```

### Delivery M-Pesa Flow
Sender pays when placing order:
```
POST /api/v1/delivery/orders/initiate-payment
  → mpesaService.initiateSTKPush(senderPhone, amount)
  → DeliveryOrder.payment.status = PENDING
  → Callback received → DeliveryOrder.payment.status = PAID
  → Order assigned to available driver
  → PlatformEvent(domain:'delivery', eventType:'ORDER_PAID')
```

---

## THE CENTRAL EVENT BUS — PlatformEvent

### New Model

```javascript
// models/PlatformEvent.js
{
  // Domain stamp (immutable)
  domain: {
    type: String,
    enum: ['sacco', 'school', 'delivery', 'platform'],
    required: true,
    index: true
  },

  // What happened
  eventType: {
    type: String,
    required: true,
    index: true
    // Examples:
    // sacco:    VEHICLE_LOCATION_UPDATE, PASSENGER_BOARDED, TICKET_PAID,
    //           SPEED_VIOLATION, ROUTE_DEVIATION, DRIVER_DOC_EXPIRY
    // school:   SCHOOL_VEHICLE_LOCATION, STUDENT_PICKED_UP, STUDENT_DROPPED_OFF,
    //           TRIP_STARTED, TRIP_ENDED, TRIP_DELAY
    // delivery: ORDER_PLACED, ORDER_PAID, PARCEL_PICKED_UP,
    //           PARCEL_DELIVERED, DELIVERY_FAILED
    // platform: USER_LOGIN, ALERT_CREATED, SYSTEM_HEALTH
  },

  // The primary entity this event is about
  entityType: {
    type: String,
    enum: ['vehicle', 'school_vehicle', 'delivery_vehicle',
           'driver', 'school_driver', 'delivery_driver',
           'passenger', 'student', 'parcel', 'ticket', 'trip', 'order']
  },
  entityId: { type: mongoose.Schema.ObjectId, required: true },

  // Where it happened
  location: { latitude: Number, longitude: Number, accuracy: Number },

  // Structured payload (domain-specific)
  payload: { type: mongoose.Schema.Types.Mixed },

  // Who/what generated this event
  source: {
    type: String,
    enum: ['iot_device', 'system', 'user_action', 'background_job', 'webhook'],
    default: 'iot_device'
  },
  deviceId: String, // IoT device that generated this (if applicable)

  timestamp: { type: Date, default: Date.now, index: true },

  // Processing flags (analytics batch job uses these)
  processedForAnalytics: { type: Boolean, default: false, index: true },
  processedForNTSA: { type: Boolean, default: false, index: true }
}
```

### Indexes for PlatformEvent
```javascript
PlatformEventSchema.index({ domain: 1, eventType: 1, timestamp: -1 });
PlatformEventSchema.index({ entityId: 1, timestamp: -1 });
PlatformEventSchema.index({ 'location.latitude': 1, 'location.longitude': 1, timestamp: -1 });
PlatformEventSchema.index({ processedForAnalytics: 1, timestamp: 1 });
PlatformEventSchema.index({ processedForNTSA: 1, domain: 1, timestamp: 1 });
```

---

## IoT GATEWAY — Domain-Aware Routing

### New Single Ingestion Endpoint

Replace the current `/api/v1/iot/data` with a unified gateway:

```
POST /api/v1/iot/ingest
Body: {
  domain: 'sacco' | 'school' | 'delivery',
  deviceId: String,
  vehicleId: String,
  timestamp: Number, // unix ms
  events: [
    {
      type: 'LOCATION_UPDATE' | 'PASSENGER_BOARDED' | 'STUDENT_PICKED_UP' |
             'SPEED_ALERT' | 'DOOR_OPENED' | 'PARCEL_DELIVERED' | etc,
      payload: { ... }
    }
  ]
}
```

Gateway routes `domain: 'sacco'` → `SaccoIoTProcessor`
Gateway routes `domain: 'school'` → `SchoolIoTProcessor`
Gateway routes `domain: 'delivery'` → `DeliveryIoTProcessor`

Each processor:
1. Updates domain models
2. Writes to `PlatformEvent`
3. Triggers WebSocket if needed

### Gemma AI Event Contract
Gemma on the Android device produces structured output. The API expects exactly this format from Gemma's output layer:

```json
{
  "domain": "sacco",
  "deviceId": "android_device_001",
  "vehicleId": "64abc...",
  "timestamp": 1714000000000,
  "events": [
    {
      "type": "LOCATION_UPDATE",
      "payload": {
        "latitude": -1.2921,
        "longitude": 36.8219,
        "speed": 45,
        "heading": 270,
        "accuracy": 5
      }
    },
    {
      "type": "PASSENGER_BOARDED",
      "payload": { "count": 2, "zone": "DOOR_1" }
    },
    {
      "type": "SPEED_ALERT",
      "payload": { "speed": 125, "limit": 80, "severity": "HIGH" }
    }
  ]
}
```

This means Gemma's prompt/fine-tune output maps directly to `PlatformEvent` writes — no translation layer needed.

---

## NTSA FEED — Compliance Pipeline

### What NTSA Gets
NTSA reads from `PlatformEvent` where `processedForNTSA: false` and domain is `sacco` (and optionally `school` for school bus compliance).

**Compliance Events Sent to NTSA:**

| eventType | Trigger | NTSA Data |
|---|---|---|
| SPEED_VIOLATION | Speed > 80km/h on road / 50 in town | vehicle plate, GPS, speed, timestamp |
| ROUTE_DEVIATION | Vehicle > 500m off assigned route | vehicle plate, route, deviation distance |
| OVERLOADING | Passenger count > seatingCapacity | vehicle plate, count, capacity |
| DOCUMENT_EXPIRY | PSV/insurance/license < 30 days | driver/vehicle, doc type, expiry |
| ACCIDENT_REPORTED | Incident type = accident | full incident payload |
| DANGEROUS_DRIVING | Harsh braking/acceleration detected by Gemma | vehicle, GPS, severity |

### NTSA Dashboard Endpoints (existing `/api/v1/ntsa-dashboard`)
Refactor to read from `PlatformEvent` aggregations instead of ad-hoc Vehicle queries.

---

## ANALYTICS ENGINE — Central Intelligence

### What It Builds From PlatformEvent

**Stage Heat Maps**
```
Aggregate: PlatformEvent where eventType=PASSENGER_BOARDED
Group by: location (rounded to 0.001 degree grid = ~100m)
Output: GeoJSON heatmap → busiest boarding stages by hour
```

**Route Demand Gaps**
```
Aggregate: PlatformEvent where eventType=PASSENGER_BOARDED, time between events
Output: Routes where avg wait > 15 min = underserved
```

**Revenue Intelligence (Sacco)**
```
Aggregate: PlatformEvent where domain=sacco, eventType=TICKET_PAID
Group by: courseId, date
Output: Daily revenue per route, peak earning hours
Feed back to: Vehicle.averageDailyIncome, Course.totalIncome (via nightly job)
```

**School Bus Reliability**
```
Aggregate: PlatformEvent where domain=school, eventType=STUDENT_PICKED_UP
Compare: scheduled pickup time vs actual pickup time
Output: On-time % per school, per route, per driver
```

**Delivery Performance**
```
Aggregate: PlatformEvent where domain=delivery
Compare: ORDER_PLACED timestamp vs PARCEL_DELIVERED timestamp
Output: Average delivery time per zone, failure rate per driver
```

**External Data Enrichment (internet search)**
The analytics service fetches external data to enrich platform events:
- **Traffic API** (Google Maps, HERE) — correlate VEHICLE_LOCATION_UPDATE with traffic density
- **Weather API** (OpenWeatherMap) — tag events with weather conditions
- **Census/demographic data** — overlay stage locations with population density
- **Market data** — identify expansion opportunities (high demand, low supply stages)

---

## ALERT SYSTEM — Unified

### Fix: One Alert System

Current state: 2 systems (IoT.alerts embedded + Alert collection).

**Solution:** Kill `IoT.alerts` embedded array. All alerts go to `Alert` collection with domain tag.

```javascript
// Alert model additions
domain: {
  type: String,
  enum: ['sacco', 'school', 'delivery', 'platform'],
  required: true
}
```

IoT alert generation → `alertService.createAlert()` → `Alert` collection → `PlatformEvent(platform, ALERT_CREATED)`

---

## IMPLEMENTATION PHASES

### Phase 1 — Foundation (Do First)
1. Create `PlatformEvent` model
2. Create `services/platformEventService.js` (write event helper)
3. Create unified IoT gateway `/api/v1/iot/ingest`
4. Add `domain` field to `Vehicle`, `Driver`, `Alert`, `Incident`

### Phase 2 — Sacco Domain Completion
1. Wire existing Sacco models to write PlatformEvents
2. Implement M-Pesa Ticketing (from previous plan)
3. Fix `VehicleLocationHistory` duplicate creation bug
4. Passenger event → revenue feedback loop

### Phase 3 — School Domain Isolation
1. Create `SchoolIoTProcessor` service
2. Fix `Attendance` → rename to `SchoolAttendance`, remove Sacco refs
3. Wire SchoolTrip events to PlatformEvent + WebSocket
4. Parent notification on student pickup/dropoff

### Phase 4 — Delivery Domain (New)
1. Create all Delivery models
2. Create `DeliveryIoTProcessor` service
3. Delivery M-Pesa payment flow
4. ProofOfDelivery with photo upload (Cloudinary, already installed)

### Phase 5 — Analytics & NTSA
1. Analytics background job reads PlatformEvent
2. Stage heat map endpoint
3. NTSA compliance feed refactor
4. External data enrichment (weather, traffic)

### Phase 6 — Gemma AI Contract
1. Define and document Gemma event schema
2. Test with mock Android payloads
3. Validate each domain processor handles all Gemma event types

---

## Files to Create (New)
```
models/PlatformEvent.js
models/DeliveryCompany.js
models/DeliveryVehicle.js
models/DeliveryDriver.js
models/DeliveryOrder.js
models/Parcel.js
models/ProofOfDelivery.js
models/SchoolAttendance.js       (replaces Attendance.js)
models/Ticket.js                 (from previous plan)
services/platformEventService.js
services/saccoIoTProcessor.js
services/schoolIoTProcessor.js
services/deliveryIoTProcessor.js
services/analyticsJobService.js
controllers/iotGatewayController.js
controllers/deliveryController.js
controllers/ticketingController.js (from previous plan)
routes/iotGateway.js
routes/delivery.js
routes/ticketing.js              (from previous plan)
docs/gemma-event-contract.md
```

## Files to Modify (Existing)
```
models/Vehicle.js         — add domain field, PlatformEvent write on save
models/Driver.js          — add domain field
models/Alert.js           — add domain field
models/Incident.js        — add domain field + domain-aware refs
models/IoT.js             — remove embedded alerts array
models/PassengerEvent.js  — add PlatformEvent write on create
models/SchoolVehicle.js   — add domain field, IoT linkage
models/SchoolTrip.js      — wire events to PlatformEvent + WebSocket
models/Course.js          — revenue updates write PlatformEvent
services/iotProcessingService.js  — refactor → becomes saccoIoTProcessor
services/alertService.js          — use Alert collection only (remove IoT.alerts)
services/analyticsService.js      — read from PlatformEvent
controllers/iot.js                — point to new gateway
server.js                         — mount new routes
config/config.env                 — add delivery + analytics env vars
```

## Files to Delete
```
models/Attendance.js      — replaced by SchoolAttendance.js
```
