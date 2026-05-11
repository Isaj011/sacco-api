# Farerari v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize the Farerari platform — rename Course→Route, introduce SaccoOperator org model with scoping, add animated live fleet map, school live map tab, and fleet driver/route columns.

**Architecture:** Five sequential work streams, each buildable independently. The Course→Route rename is done first since later tasks reference `Route`. SaccoOperator scoping gates the fleet map's org-filtered broadcasts. The animated map and school live map share a reusable interpolation hook.

**Tech Stack:** Node.js/Express, Mongoose, MongoDB; React 18, RTK Query, Mapbox GL JS, Tailwind, shadcn/ui

---

## Task 1: Create `models/Route.js` from `models/Course.js`

**Files:**
- Create: `models/Route.js`
- (Keep `models/Course.js` temporarily for backwards compat)

**Step 1: Copy Course.js to Route.js**

```bash
cp models/Course.js models/Route.js
```

**Step 2: Edit `models/Route.js`**

Change the last two lines from:
```js
module.exports = mongoose.model('Course', CourseSchema)
```
to:
```js
module.exports = mongoose.model('Route', CourseSchema, 'routes')
```

Also rename all internal variable names from `CourseSchema` to `RouteSchema` for clarity:
```js
const RouteSchema = new mongoose.Schema({ ... }, { timestamps: true })
// ... pre-save hook uses RouteSchema.pre(...)
module.exports = mongoose.model('Route', RouteSchema, 'routes')
```

**Step 3: Verify model loads**
```bash
node -e "const Route = require('./models/Route'); console.log(Route.modelName)"
```
Expected output: `Route`

**Step 4: Commit**
```bash
git add models/Route.js
git commit -m "feat: add Route model (Course rename, explicit 'routes' collection)"
```

---

## Task 2: Update `controllers/courseController.js`

**Files:**
- Modify: `controllers/courseController.js:1`

**Step 1: Replace Course import**

Line 1 changes from:
```js
const Course = require('../models/Course');
```
to:
```js
const Route = require('../models/Route');
```

**Step 2: Replace all `Course` references with `Route` in the file**

Run a find-and-replace across the entire file: every `Course` → `Route`.

Verify the controller still exports the same function names (getCourses, createCourse, etc. — **keep existing function names** to avoid breaking the routes file in this step).

**Step 3: Smoke test**
```bash
node -e "require('./controllers/courseController')"
```
Expected: no error output.

**Step 4: Commit**
```bash
git add controllers/courseController.js
git commit -m "feat: courseController uses Route model"
```

---

## Task 3: Update all other backend files that import `Course`

**Files to modify (find with: `grep -rl "require.*models/Course" .`):**
- `controllers/analyticsController.js`
- `controllers/enhancedPerformance.js`
- `controllers/iotAlerts.js`
- `controllers/iotAnalytics.js`
- `controllers/iotBackgroundJobs.js`
- `controllers/ntsaController.js`
- `controllers/vehicles.js`
- `services/analyticsService.js`
- `services/scheduleIoTService.js`
- `services/routeIoTService.js`
- `seed/databaseSeeder.js`
- `scripts/seedDatabase.js`

**Step 1: Bulk replace in all files**

For each file above, change:
```js
const Course = require('../models/Course');
// or
const Course = require('../../models/Course');
```
to:
```js
const Route = require('../models/Route');
// or (depth-adjusted)
const Route = require('../../models/Route');
```

Then replace every usage of `Course.` → `Route.` and variable names `course`/`courses` used in Mongoose calls (e.g. `await Course.find(...)` → `await Route.find(...)`).

**Step 2: Fix `seed/databaseSeeder.js` specifically**

- Line 13: `const Course = require('../models/Course')` → `const Route = require('../models/Route')`
- Line 111: In the clear-collections array, `Course` → `Route`
- `seedCourses()` method (lines 766-808): rename to `seedRoutes()`, update internal calls
- Line 91: `await this.seedCourses()` → `await this.seedRoutes()`
- `this.courses` → `this.routes` throughout

**Step 3: Verify no remaining Course model imports**
```bash
grep -r "require.*models/Course" . --include="*.js"
```
Expected: no output.

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: replace Course model with Route in all backend files"
```

---

## Task 4: Rename routes file and update server.js

**Files:**
- Rename: `routes/courses.js` → `routes/sacco-routes.js`  
  *(Note: `routes/routes.js` already exists for SchoolRoute — use `sacco-routes.js` to avoid collision)*
- Modify: `server.js` (import + mount lines)

**Step 1: Copy and update routes file**
```bash
cp routes/courses.js routes/sacco-routes.js
```

In `routes/sacco-routes.js`, update the URL comment at top from `/api/v1/courses` to `/api/v1/routes`. No other changes needed (controller function names stay the same for now).

**Step 2: Update `server.js`**

Find the line (around line 72):
```js
const courses = require('./routes/courses')
```
Replace with:
```js
const saccoRoutes = require('./routes/sacco-routes')
```

Find the mount line (around line 231):
```js
app.use('/api/v1/courses', courses)
```
Replace with:
```js
app.use('/api/v1/routes', saccoRoutes)
```

**Step 3: Start server, confirm endpoint**
```bash
npm run dev
# In another terminal:
curl http://localhost:5000/api/v1/routes | head -c 200
```
Expected: JSON with `success: true` and a `data` array (even if empty before migration).

**Step 4: Commit**
```bash
git add routes/sacco-routes.js server.js
git commit -m "feat: mount /api/v1/routes endpoint (renamed from /courses)"
```

---

## Task 5: Write and run database migration script

**Files:**
- Create: `scripts/migrateCoursesToRoutes.js`

**Step 1: Create migration script**

```js
#!/usr/bin/env node
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../config/config.env') });
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections({ name: 'courses' }).toArray();
  if (collections.length === 0) {
    console.log('courses collection does not exist — nothing to migrate');
  } else {
    await db.collection('courses').rename('routes', { dropTarget: false });
    console.log('✅ Renamed collection: courses → routes');
  }

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Step 2: Add npm script to `package.json`**

In the `scripts` block, add:
```json
"migrate:courses-to-routes": "node scripts/migrateCoursesToRoutes.js"
```

**Step 3: Run migration**
```bash
npm run migrate:courses-to-routes
```
Expected: `✅ Renamed collection: courses → routes`

**Step 4: Verify in MongoDB** (optional sanity check)
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config({ path: 'config/config.env' });
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log(cols.map(c => c.name));
  process.exit(0);
});
"
```
Expected: `routes` in the list, `courses` not present.

**Step 5: Commit**
```bash
git add scripts/migrateCoursesToRoutes.js package.json
git commit -m "feat: add courses→routes collection migration script"
```

---

## Task 6: Update frontend API layer — courses → routes

**Files:**
- Modify: `fare_rari/src/api/routeWaypoints/routeWaypoints.js:4`
- Modify: `fare_rari/src/api/sacco/saccoSlice.js` (courses endpoint URLs)

**Step 1: Update `routeWaypoints.js`**

Line 4 changes from:
```js
const routesUrl = 'courses'
```
to:
```js
const routesUrl = 'routes'
```
No other changes needed — all 5 endpoints derive from this constant.

**Step 2: Update `saccoSlice.js` courses endpoints**

Find the `fetchCourses` builder block (around line 59) and change every hardcoded `'courses'` URL segment to `'routes'`:
```js
// Before:
url: `courses?limit=${limit}&page=${page}`
url: `courses/${id}`
url: 'courses'
url: `courses/${id}`

// After:
url: `routes?limit=${limit}&page=${page}`
url: `routes/${id}`
url: 'routes'
url: `routes/${id}`
```

**Step 3: Verify frontend builds without errors**
```bash
cd fare_rari && npm run build 2>&1 | tail -20
```
Expected: `built in Xs` with no errors.

**Step 4: Commit**
```bash
cd fare_rari
git add src/api/routeWaypoints/routeWaypoints.js src/api/sacco/saccoSlice.js
git commit -m "feat: frontend API layer uses /routes instead of /courses"
```

---

## Task 7: Create `models/SaccoOperator.js`

**Files:**
- Create: `models/SaccoOperator.js`

**Step 1: Write the model**

```js
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
```

**Step 2: Verify model loads**
```bash
node -e "const S = require('./models/SaccoOperator'); console.log(S.modelName)"
```
Expected: `SaccoOperator`

**Step 3: Commit**
```bash
git add models/SaccoOperator.js
git commit -m "feat: add SaccoOperator model"
```

---

## Task 8: Add `saccoOperator` ref to Vehicle, Driver, Route, and User models

**Files:**
- Modify: `models/Vehicle.js`
- Modify: `models/Driver.js`
- Modify: `models/Route.js`
- Modify: `models/User.js`

**Step 1: Add `saccoOperator` field to `models/Vehicle.js`**

Find the last field before the `timestamps` option and add:
```js
saccoOperator: {
  type: mongoose.Schema.ObjectId,
  ref: 'SaccoOperator',
  default: null,
},
```

**Step 2: Add the same field to `models/Driver.js`** (same snippet)

**Step 3: Add the same field to `models/Route.js`** (same snippet)

**Step 4: Add the same field to `models/User.js`**

Same snippet — after `createdAt` field:
```js
saccoOperator: {
  type: mongoose.Schema.ObjectId,
  ref: 'SaccoOperator',
  default: null,
},
```

**Step 5: Verify all four models load**
```bash
node -e "
  require('./models/Vehicle');
  require('./models/Driver');
  require('./models/Route');
  require('./models/User');
  console.log('All models OK');
"
```

**Step 6: Commit**
```bash
git add models/Vehicle.js models/Driver.js models/Route.js models/User.js
git commit -m "feat: add saccoOperator ref to Vehicle, Driver, Route, User"
```

---

## Task 9: Create SaccoOperator controller and routes

**Files:**
- Create: `controllers/saccoOperatorController.js`
- Create: `routes/saccoOperators.js`
- Modify: `server.js`

**Step 1: Create `controllers/saccoOperatorController.js`**

```js
const SaccoOperator = require('../models/SaccoOperator')
const User = require('../models/User')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')

// @desc  Get all SACCO operators
// @route GET /api/v1/sacco-operators
// @access Private (admin, ntsa)
exports.getSaccoOperators = asyncHandler(async (req, res) => {
  const operators = await SaccoOperator.find().sort('name')
  res.status(200).json({ success: true, count: operators.length, data: operators })
})

// @desc  Get single SACCO operator
// @route GET /api/v1/sacco-operators/:id
// @access Private (admin, ntsa)
exports.getSaccoOperator = asyncHandler(async (req, res, next) => {
  const operator = await SaccoOperator.findById(req.params.id)
  if (!operator) return next(new ErrorResponse(`SaccoOperator not found: ${req.params.id}`, 404))
  res.status(200).json({ success: true, data: operator })
})

// @desc  Create SACCO operator
// @route POST /api/v1/sacco-operators
// @access Private (admin)
exports.createSaccoOperator = asyncHandler(async (req, res) => {
  const operator = await SaccoOperator.create(req.body)
  res.status(201).json({ success: true, data: operator })
})

// @desc  Update SACCO operator
// @route PUT /api/v1/sacco-operators/:id
// @access Private (admin)
exports.updateSaccoOperator = asyncHandler(async (req, res, next) => {
  const operator = await SaccoOperator.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  })
  if (!operator) return next(new ErrorResponse(`SaccoOperator not found: ${req.params.id}`, 404))
  res.status(200).json({ success: true, data: operator })
})

// @desc  Delete SACCO operator
// @route DELETE /api/v1/sacco-operators/:id
// @access Private (admin)
exports.deleteSaccoOperator = asyncHandler(async (req, res, next) => {
  const operator = await SaccoOperator.findById(req.params.id)
  if (!operator) return next(new ErrorResponse(`SaccoOperator not found: ${req.params.id}`, 404))
  await operator.deleteOne()
  res.status(200).json({ success: true, data: {} })
})

// @desc  Assign a user to a SACCO operator
// @route POST /api/v1/sacco-operators/:id/assign-user
// @access Private (admin)
exports.assignUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.body
  if (!userId) return next(new ErrorResponse('Please provide userId', 400))
  const [operator, user] = await Promise.all([
    SaccoOperator.findById(req.params.id),
    User.findById(userId),
  ])
  if (!operator) return next(new ErrorResponse(`SaccoOperator not found: ${req.params.id}`, 404))
  if (!user) return next(new ErrorResponse(`User not found: ${userId}`, 404))
  user.saccoOperator = operator._id
  await user.save()
  res.status(200).json({ success: true, data: user })
})
```

**Step 2: Create `routes/saccoOperators.js`**

```js
const express = require('express')
const {
  getSaccoOperators, getSaccoOperator,
  createSaccoOperator, updateSaccoOperator,
  deleteSaccoOperator, assignUser,
} = require('../controllers/saccoOperatorController')
const { protect, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(protect)

router.route('/')
  .get(authorize('admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSaccoOperators)
  .post(authorize('admin'), createSaccoOperator)

router.route('/:id')
  .get(authorize('admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSaccoOperator)
  .put(authorize('admin'), updateSaccoOperator)
  .delete(authorize('admin'), deleteSaccoOperator)

router.post('/:id/assign-user', authorize('admin'), assignUser)

module.exports = router
```

**Step 3: Mount in `server.js`**

After the existing imports (around line 100), add:
```js
const saccoOperators = require('./routes/saccoOperators')
```

After the existing mounts (around line 260), add:
```js
app.use('/api/v1/sacco-operators', saccoOperators)
```

**Step 4: Test endpoint**
```bash
# Start server, then:
curl -s http://localhost:5000/api/v1/sacco-operators \
  -H "Authorization: Bearer <admin-token>" | python -m json.tool
```
Expected: `{ "success": true, "count": 0, "data": [] }`

**Step 5: Commit**
```bash
git add controllers/saccoOperatorController.js routes/saccoOperators.js server.js
git commit -m "feat: add SaccoOperator CRUD endpoints"
```

---

## Task 10: Create scoping middleware `middleware/scopeToSacco.js`

**Files:**
- Create: `middleware/scopeToSacco.js`
- Modify: `routes/vehicles.js` (apply middleware to list route)
- Modify: `routes/sacco-routes.js` (apply middleware to list route)

**Step 1: Create `middleware/scopeToSacco.js`**

```js
// Attaches req.scopeFilter so list endpoints only return the authenticated
// user's SACCO data. Admin/NTSA roles see everything.
const ADMIN_ROLES = ['admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst']

const scopeToSacco = (req, res, next) => {
  if (!req.user) return next()
  if (ADMIN_ROLES.includes(req.user.role)) {
    req.scopeFilter = {}
  } else if (req.user.saccoOperator) {
    req.scopeFilter = { saccoOperator: req.user.saccoOperator }
  } else {
    req.scopeFilter = {}
  }
  next()
}

module.exports = scopeToSacco
```

**Step 2: Apply scoping in `controllers/vehicles.js`**

In the `getVehicles` handler, after the advancedResults middleware already runs, the scope filter needs to be applied. The cleanest approach is to add the filter before the advancedResults query. Find `getVehicles` and merge `req.scopeFilter` into the query filter:

In `routes/vehicles.js` (the GET `/` route), add the middleware:
```js
const scopeToSacco = require('../middleware/scopeToSacco')
// ...
router.route('/')
  .get(protect, scopeToSacco, advancedResults(Vehicle, ...), getVehicles)
```

**Step 3: Apply same middleware to `/routes` list in `routes/sacco-routes.js`**
```js
const scopeToSacco = require('../middleware/scopeToSacco')
// ...
router.route('/')
  .get(protect, scopeToSacco, advancedResults(Route, ...), getRoutes)
```

**Step 4: Update `getVehicles` controller to apply scopeFilter**

In `controllers/vehicles.js`, in the `getVehicles` handler, before or instead of `res.advancedResults`:
```js
// advancedResults already runs; we need to merge scopeFilter
// The simplest approach: override the advancedResults query if scopeFilter is set
if (req.scopeFilter && Object.keys(req.scopeFilter).length > 0) {
  const results = await Vehicle.find(req.scopeFilter)
    .populate('currentDriver', 'driverName')
    .lean()
  return res.status(200).json({ success: true, count: results.length, data: results })
}
res.status(200).json(res.advancedResults)
```

**Step 5: Commit**
```bash
git add middleware/scopeToSacco.js routes/vehicles.js routes/sacco-routes.js controllers/vehicles.js
git commit -m "feat: add SaccoOperator scoping middleware for fleet endpoints"
```

---

## Task 11: Populate driver and route on Vehicle list endpoint

**Files:**
- Modify: `controllers/vehicles.js`
- Modify: `routes/vehicles.js`

**Step 1: Update vehicle list query to populate driver and route**

In the `getVehicles` handler (the scoped branch from Task 10), extend the populate chain:
```js
const results = await Vehicle.find(req.scopeFilter)
  .populate('currentDriver', 'driverName phone')
  .populate('saccoOperator', 'name')
  .lean()
```

For the advancedResults (admin/full) path, update the `advancedResults` call in `routes/vehicles.js` to include these populations in the populate option array.

**Step 2: Update Driver list to populate currentVehicle**

In `routes/driverRoutes.js`, find the GET `/` route and add population of `currentVehicle`:
```js
advancedResults(Driver, [{ path: 'currentVehicle', select: 'plateNumber vehicleModel' }])
```

**Step 3: Verify populated data returns**
```bash
curl -s "http://localhost:5000/api/v1/vehicles" \
  -H "Authorization: Bearer <admin-token>" \
  | python -m json.tool | grep -A3 '"currentDriver"'
```

**Step 4: Commit**
```bash
git add controllers/vehicles.js routes/vehicles.js routes/driverRoutes.js
git commit -m "feat: populate driver and saccoOperator on vehicle list endpoint"
```

---

## Task 12: Frontend — Fleet vehicles tab adds Driver and Route columns

**Files:**
- Explore: `fare_rari/src/modules/matatu/` — find the vehicles table component
- Modify: the VehiclesTable component (exact path TBD after exploration)

**Step 1: Find the fleet vehicle table component**
```bash
find fare_rari/src -name "*.jsx" | xargs grep -l "plateNumber\|plate_number" 2>/dev/null
```

**Step 2: Add Driver column**

In the columns array (react-table or similar), add after the existing plate/model columns:
```jsx
{
  Header: 'Driver',
  accessor: 'currentDriver.driverName',
  Cell: ({ value }) => value || 'Unassigned',
},
```

**Step 3: Add SACCO column**

```jsx
{
  Header: 'SACCO',
  accessor: 'saccoOperator.name',
  Cell: ({ value }) => value || '—',
},
```

**Step 4: Verify in browser** — Start dev server, navigate to fleet/matatu page, confirm new columns appear.

**Step 5: Commit**
```bash
cd fare_rari
git add src/modules/matatu/
git commit -m "feat: fleet vehicles table shows driver and SACCO columns"
```

---

## Task 13: Create reusable map interpolation hook

**Files:**
- Create: `fare_rari/src/hooks/useVehicleMarkers.js`

This hook manages animated vehicle markers on a Mapbox map — smooth interpolation between GPS pings and heading rotation.

**Step 1: Create `fare_rari/src/hooks/useVehicleMarkers.js`**

```js
import { useRef, useEffect, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'

const INTERPOLATION_DURATION_MS = 28000

function lerp(a, b, t) {
  return a + (b - a) * t
}

export function useVehicleMarkers(map) {
  const markersRef = useRef({})        // vehicleId → { marker, animFrame, prev, target, startTime }
  const activeRef = useRef(true)

  useEffect(() => {
    return () => {
      activeRef.current = false
      Object.values(markersRef.current).forEach(({ marker, animFrame }) => {
        if (animFrame) cancelAnimationFrame(animFrame)
        marker.remove()
      })
    }
  }, [])

  const animateTo = useCallback((vehicleId, targetLng, targetLat, heading) => {
    if (!map || !activeRef.current) return
    const entry = markersRef.current[vehicleId]
    if (!entry) return

    if (entry.animFrame) cancelAnimationFrame(entry.animFrame)

    const fromLng = entry.marker.getLngLat().lng
    const fromLat = entry.marker.getLngLat().lat
    const startTime = performance.now()

    // Rotate marker element
    entry.marker.getElement().style.transform =
      `rotate(${heading}deg)`

    function tick(now) {
      if (!activeRef.current) return
      const t = Math.min((now - startTime) / INTERPOLATION_DURATION_MS, 1)
      const lng = lerp(fromLng, targetLng, t)
      const lat = lerp(fromLat, targetLat, t)
      entry.marker.setLngLat([lng, lat])
      if (t < 1) {
        entry.animFrame = requestAnimationFrame(tick)
      }
    }

    entry.animFrame = requestAnimationFrame(tick)
  }, [map])

  const upsertMarker = useCallback((vehicle) => {
    if (!map) return
    const { vehicleId, location, heading = 0, plateNumber, speed, status } = vehicle
    const { longitude: lng, latitude: lat } = location

    if (markersRef.current[vehicleId]) {
      animateTo(vehicleId, lng, lat, heading)
      // Update popup content
      const popup = markersRef.current[vehicleId].popup
      if (popup) {
        popup.setHTML(markerPopupHTML(vehicle))
      }
      return
    }

    // Create marker element
    const el = document.createElement('div')
    el.className = 'vehicle-marker'
    el.innerHTML = '🚌'
    el.style.cssText = 'font-size:24px;cursor:pointer;transform-origin:center;'

    const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
      .setHTML(markerPopupHTML(vehicle))

    const marker = new mapboxgl.Marker({ element: el, rotationAlignment: 'map' })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map)

    markersRef.current[vehicleId] = { marker, popup, animFrame: null }
    el.style.transform = `rotate(${heading}deg)`
  }, [map, animateTo])

  const removeMarker = useCallback((vehicleId) => {
    const entry = markersRef.current[vehicleId]
    if (!entry) return
    if (entry.animFrame) cancelAnimationFrame(entry.animFrame)
    entry.marker.remove()
    delete markersRef.current[vehicleId]
  }, [])

  return { upsertMarker, removeMarker }
}

function markerPopupHTML({ plateNumber, speed, status, driverName, routeName }) {
  return `
    <div style="font-size:13px;min-width:140px">
      <strong>${plateNumber || 'Unknown'}</strong><br/>
      ${driverName ? `Driver: ${driverName}<br/>` : ''}
      ${routeName ? `Route: ${routeName}<br/>` : ''}
      Speed: ${Math.round(speed || 0)} km/h<br/>
      <span style="color:${status === 'active' ? 'green' : 'gray'}">${status || 'unknown'}</span>
    </div>`
}
```

**Step 2: Commit**
```bash
cd fare_rari
git add src/hooks/useVehicleMarkers.js
git commit -m "feat: add useVehicleMarkers hook for animated map markers"
```

---

## Task 14: Build animated live fleet map component

**Files:**
- Create: `fare_rari/src/modules/map/FleetLiveMap.jsx`
- Modify: the fleet/matatu page to include the map tab

**Step 1: Check the `utils/websocket.js` in backend for fleet channel protocol**

Read `C:\Os\Dev\Farerare\sacco-api\utils\websocket.js` to confirm the WS message format for fleet updates.

**Step 2: Create `fare_rari/src/modules/map/FleetLiveMap.jsx`**

```jsx
import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useVehicleMarkers } from '../../hooks/useVehicleMarkers'

const NAIROBI = { lng: 36.8219, lat: -1.2921 }
const WS_URL = `${import.meta.env.VITE_WS_URL || 'ws://localhost:5000'}/ws?type=fleet`

export default function FleetLiveMap() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const { upsertMarker } = useVehicleMarkers(mapRef.current)

  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [NAIROBI.lng, NAIROBI.lat],
      zoom: 11,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return () => map.remove()
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    const token = localStorage.getItem('token')
    const ws = new WebSocket(`${WS_URL}${token ? `&token=${token}` : ''}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'VEHICLE_UPDATE') {
          upsertMarker(msg.data)
        }
      } catch (_) {}
    }

    return () => ws.close()
  }, [upsertMarker])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full rounded-lg" />
      <div className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-medium ${
        connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {connected ? 'Live' : 'Reconnecting…'}
      </div>
    </div>
  )
}
```

**Step 3: Add "Live Map" tab to the fleet/matatu page**

Find the matatu page's Tabs component (in `fare_rari/src/modules/matatu/Matatu.jsx` or similar). Add a "Live" tab:
```jsx
<TabsTrigger value="live">Live Map</TabsTrigger>
// ...
<TabsContent value="live" className="h-[600px]">
  <FleetLiveMap />
</TabsContent>
```

**Step 4: Test in browser**
- Start backend with `npm run dev`
- Start frontend with `cd fare_rari && npm run dev`
- Navigate to fleet/vehicles page, click "Live Map" tab
- Confirm map renders centered on Nairobi
- If simulator is running, vehicle markers should appear within 30s

**Step 5: Commit**
```bash
cd fare_rari
git add src/modules/map/FleetLiveMap.jsx src/modules/matatu/Matatu.jsx
git commit -m "feat: add animated live fleet map with WebSocket integration"
```

---

## Task 15: Add "Live" tab to `SchoolPage.jsx`

**Files:**
- Modify: `fare_rari/src/pages/school/SchoolPage.jsx`
- Create: `fare_rari/src/modules/map/SchoolLiveMap.jsx`

**Step 1: Create `fare_rari/src/modules/map/SchoolLiveMap.jsx`**

This component is nearly identical to `FleetLiveMap` but uses the `?schoolId=X` WS channel:

```jsx
import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useVehicleMarkers } from '../../hooks/useVehicleMarkers'

const NAIROBI = { lng: 36.8219, lat: -1.2921 }

export default function SchoolLiveMap({ schoolId, vehicles = [] }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const { upsertMarker } = useVehicleMarkers(mapRef.current)

  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [NAIROBI.lng, NAIROBI.lat],
      zoom: 12,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Seed initial positions from REST data
    map.on('load', () => {
      vehicles.forEach(v => {
        if (v.currentLocation?.latitude) {
          upsertMarker({
            vehicleId: v._id,
            location: { latitude: v.currentLocation.latitude, longitude: v.currentLocation.longitude },
            plateNumber: v.registrationNumber,
            heading: 0, speed: 0, status: v.status,
          })
        }
      })
    })

    return () => map.remove()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!schoolId) return
    const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:5000'
    const ws = new WebSocket(`${wsBase}/ws?schoolId=${schoolId}`)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'VEHICLE_UPDATE') upsertMarker(msg.data)
      } catch (_) {}
    }
    return () => ws.close()
  }, [schoolId, upsertMarker])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full rounded-lg" />
      <div className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-medium ${
        connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}>
        {connected ? 'Live' : 'Static view'}
      </div>
    </div>
  )
}
```

**Step 2: Add "Live" tab to `SchoolPage.jsx`**

In the existing Tabs section (around lines 972-1013), add:

```jsx
// In TabsList, after the Trips trigger:
<TabsTrigger value="live"><MapPin size={13} />Live</TabsTrigger>

// In TabsContent section:
<TabsContent value="live" className="h-[600px]">
  <SchoolLiveMap schoolId={selectedSchool?._id} vehicles={vehicles} />
</TabsContent>
```

Import `MapPin` from `lucide-react` and `SchoolLiveMap` at the top of the file.

**Step 3: Test in browser**
- Navigate to Schools page, select a school
- Click "Live" tab
- Map should render; if school vehicles have `currentLocation` data, markers should appear

**Step 4: Commit**
```bash
cd fare_rari
git add src/modules/map/SchoolLiveMap.jsx src/pages/school/SchoolPage.jsx
git commit -m "feat: add Live Map tab to SchoolPage"
```

---

## Task 16: Seed SaccoOperator data

**Files:**
- Modify: `scripts/seedDatabase.js`

**Step 1: Add SaccoOperator to seed script**

After the existing imports, add:
```js
const SaccoOperator = require('../models/SaccoOperator')
```

Add a seed function before `main()`:
```js
async function seedSaccoOperators() {
  log.section('SACCO Operators');
  await SaccoOperator.deleteMany({});
  const operators = await SaccoOperator.insertMany([
    {
      name: 'Nairobi Express SACCO',
      registrationNumber: 'NTSA/SACCO/2018/001',
      phone: '+254700100001',
      email: 'ops@nairobiexpress.co.ke',
      address: { city: 'Nairobi', county: 'Nairobi' },
      operatingCounties: ['Nairobi', 'Kiambu'],
    },
    {
      name: 'City Hoppa SACCO',
      registrationNumber: 'NTSA/SACCO/2019/002',
      phone: '+254700100002',
      email: 'admin@cityhoppa.co.ke',
      address: { city: 'Nairobi', county: 'Nairobi' },
      operatingCounties: ['Nairobi', 'Machakos'],
    },
  ]);
  log.ok(`${operators.length} SACCO operators`);
  return operators;
}
```

Call it in `main()` after core data seeding:
```js
const saccoOps = await seedSaccoOperators();
```

**Step 2: Run and verify**
```bash
npm run seed:full 2>&1 | grep -E "(SACCO|✅|❌)"
```

**Step 3: Commit**
```bash
git add scripts/seedDatabase.js
git commit -m "feat: seed SACCO operators in full seed script"
```

---

## Final Verification Checklist

After all tasks complete:

```bash
# 1. No Course model imports remain
grep -r "require.*models/Course" . --include="*.js"
# Expected: empty

# 2. Routes endpoint works
curl http://localhost:5000/api/v1/routes | python -m json.tool

# 3. SACCO operators endpoint works
curl http://localhost:5000/api/v1/sacco-operators \
  -H "Authorization: Bearer <admin-token>" | python -m json.tool

# 4. Vehicle list populates driver
curl http://localhost:5000/api/v1/vehicles \
  -H "Authorization: Bearer <admin-token>" \
  | python -m json.tool | grep -A3 "currentDriver"

# 5. Frontend builds clean
cd fare_rari && npm run build 2>&1 | tail -5
```
