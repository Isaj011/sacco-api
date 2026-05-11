# Farerari v2 — Platform Centralization Design

**Date:** 2026-05-02  
**Status:** Approved  
**Scope:** Backend (sacco-api) + Frontend (fare_rari)

---

## 1. Course → Route Full Rename

The Mongoose model `Course` is renamed to `Route` and the MongoDB collection `courses` renamed to `routes`. This is a clean, permanent rename with no backwards-compatibility shims.

**Backend changes (~25 files):**
- `models/Course.js` → `models/Route.js` — schema gains `{ collection: 'routes' }` option; model exported as `Route`
- All `require('../models/Course')` imports updated
- `routes/courses.js` → `routes/routes.js`; route file URL prefix `/api/v1/courses` → `/api/v1/routes`
- `server.js` mount updated
- `scripts/migrateCoursesToRoutes.js` — one-time migration: `db.courses.renameCollection('routes')`
- Seed script updated to use `Route`

**Frontend changes:**
- All RTK Query endpoint references to `/courses` updated to `/routes`
- Display labels "Course" → "Route" throughout

---

## 2. SaccoOperator Model + Org Scoping

A `SaccoOperator` model (mirrors the existing `School` and `DeliveryCompany` patterns) is introduced so that SACCO-domain entities belong to an organization.

**New model `models/SaccoOperator.js`:**
- Fields: `name`, `registrationNumber` (unique), `phone`, `email`, `address.{city,county}`, `contactPerson.{name,phone,email}`, `operatingCounties[]`, `status` (`active/suspended/revoked`), `domain: 'sacco'` (immutable)
- Indexes: `registrationNumber`, `status`

**Model additions (optional `saccoOperator` ref):**
- `models/Vehicle.js` — add `saccoOperator: { type: ObjectId, ref: 'SaccoOperator', default: null }`
- `models/Driver.js` — same
- `models/Route.js` (post-rename) — same
- `models/User.js` — same (publisher/staff users belong to an operator)

**New CRUD: `controllers/saccoOperatorController.js` + `routes/saccoOperators.js`**
- `GET /api/v1/sacco-operators` — admin/ntsa only; list all
- `POST /api/v1/sacco-operators` — admin only; create
- `PUT /api/v1/sacco-operators/:id` — admin only; update
- `DELETE /api/v1/sacco-operators/:id` — admin only
- `POST /api/v1/sacco-operators/:id/assign-user` — admin only; set `user.saccoOperator`

**Scoping middleware `middleware/scopeToSacco.js`:**
- admin/ntsa roles → pass through, no filter added
- publisher/staff with `req.user.saccoOperator` → `req.scopeFilter = { saccoOperator: req.user.saccoOperator }`
- Applied to Vehicle, Driver, Route list endpoints

---

## 3. Animated Live Fleet Map

The existing fleet map tab is rewritten to show smooth animated vehicle markers scoped to the authenticated user's SACCO.

**WebSocket channel:** `/ws?type=fleet` — server pushes `{ vehicleId, location: {lat,lng}, heading, speed, status, plateNumber, driverName, routeName }` every time a vehicle updates.

**Frontend marker animation:**
- Each vehicle has `previousPosition` and `targetPosition` stored in a ref
- On new WS message: set `targetPosition`, start `requestAnimationFrame` loop interpolating lat/lng linearly over ~28s
- Mapbox marker icon rotates to `heading` degrees
- Marker popup: driver name, speed (km/h), route name, status badge

**SACCO scoping on WS push:**
- `broadcastToFleet(saccoOperatorId, data)` — only broadcasts to clients whose WS connection carries matching operator context
- Admin/ntsa clients receive all fleet updates

**Simulator integration:**
- `backgroundJobService` already runs every 30s → emits `vehicle_updated` on eventBus → server's `broadcastToFleet` call updated to include `saccoOperator` field from the vehicle doc

---

## 4. School Live Map Tab

A "Live" tab added to `SchoolPage.jsx` alongside the existing Vehicles / Drivers / Trips tabs.

**Tab content:**
- Mapbox map initialized with the school's approximate center coordinates
- Markers for each of the school's vehicles showing current position
- Real-time updates via existing `/ws?schoolId=X` WebSocket channel
- Same animated interpolation as fleet map (same reusable hook)
- No driver-reassign controls — view only

**Data source:**
- Initial positions from `GET /api/v1/school-vehicles?school=X&populate=currentLocation`
- Live updates from WebSocket

---

## 5. Fleet Page Driver/Route Columns

The Vehicles tab and Drivers tab in the fleet page gain contextual columns.

**Vehicles tab additions:**
- "Driver" column — populated from `currentDriver` virtual or `DriverAssignment` lookup → shows `driverName` or "Unassigned"
- "Route" column — populated from `assignedRoute` ref → shows route name or "—"

**Drivers tab additions:**
- "Vehicle" column — shows `currentVehicle.plateNumber` or "Unassigned"
- "Route" column — shows vehicle's assigned route name

**Backend population:**
- Vehicle list endpoint gains `.populate('currentDriver', 'driverName')` and `.populate('assignedRoute', 'name')`
- Driver list endpoint gains `.populate('currentVehicle', 'plateNumber registrationNumber')`

---

## Implementation Order

1. Course → Route rename (foundation — no other task depends on old name)
2. SaccoOperator model + scoping middleware (unblocks fleet scoping)
3. Fleet page driver/route columns (quick win, no new models needed)
4. Animated live fleet map (builds on scoping + simulator already wired)
5. School live map tab (reuses animation hook from step 4)

---

## Out of Scope (v2)

- External NTSA API push (deferred until government API keys obtained)
- Parcel/delivery live map
- Mobile app
