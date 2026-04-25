# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server (with nodemon auto-reload)
npm run dev

# Start production server
npm start

# Seed database with sample data
npm run seed

# Seed location triggers
npm run seed:triggers

# Run background job tests
npm run test:background
```

The server runs on `PORT` from environment (default: 5000). A health check is at `GET /health` and a debug endpoint at `GET /debug`.

## Seeding & Dev Credentials

The cluster starts empty. Run `npm run seed` once before attempting any login. The seeder clears all collections then repopulates them.

**What gets created:**

| Collection | Count |
|---|---|
| Schools | 5 |
| Users | 259 |
| School Vehicles | 15 |
| Regular Vehicles | 10 |
| School Drivers | 20 |
| Regular Drivers | 8 |
| Routes | 20 |
| Students | 125 |
| Parents | 250 |
| Courses | 15 |
| Incidents | 10 |
| Alerts | 25 |

**Login credentials after seeding:**

| Role | Email | Password |
|---|---|---|
| `admin` | admin@sacco.com | admin123 |
| `ntsa_officer` | j.kamau@ntsa.go.ke | ntsa123 |
| `ntsa_inspector` | g.wanjiru@ntsa.go.ke | ntsa123 |
| `ntsa_analyst` | p.ochieng@ntsa.go.ke | ntsa123 |
| `staff` | staff@[school-code].edu | staff123 |
| `parent` | (generated per parent) | parent123 |

## Environment Configuration

Config is loaded from `config/config.env`. Required variables:
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — Secret for signing JWTs
- `JWT_EXPIRE` — JWT expiry duration (e.g., `30d`)
- `NODE_ENV` — `development` or `production`
- `PORT` — Server port
- Optional: `SMTP_HOST`, `FILE_UPLOAD_PATH`, Cloudinary credentials

## Architecture Overview

This is a **Node.js/Express REST API** for a Kenya Sacco (transport cooperative) fleet management system. It uses MongoDB via Mongoose and exposes all routes under `/api/v1/`.

### Core Domain Models

The central entity relationships:

- **Vehicle** — fleet vehicles with real-time location, IoT device linkage, and rich `contextData` for environmental/performance metrics. A `post('save')` hook automatically creates a `VehicleLocationHistory` entry whenever `currentLocation`, `contextData`, or `currentSpeed` is modified.
- **Course** — routes (called "courses") that vehicles are assigned to. Contains embedded `StopSchema`, `ScheduleSchema`, `FareSchema`, and `PerformanceSchema` sub-documents.
- **Driver / DriverAssignment** — driver profiles and their assignment to vehicles.
- **IoT** — raw IoT device telemetry records. Devices link to vehicles via `vehicleId`. Pre-save middleware auto-generates alerts for low battery, high speed, low fuel, and high temperature.
- **PassengerEvent** — discrete events (`PASSENGER_BOARDED`, `PASSENGER_ALIGHTED`, `DOOR_OPENED`, etc.) generated from IoT sensor data.
- **VehicleLocationHistory** — time-series location records, created both directly by the IoT processing service and automatically via the Vehicle model's post-save hook.
- **User** — accounts with roles: `user`, `publisher`, `admin`, `parent`, `driver`, `staff`, `ntsa_officer`, `ntsa_inspector`, `ntsa_analyst`.
- **School** / **SchoolTrip** / **SchoolRoute** / **SchoolStudent** / **SchoolDriver** / **SchoolVehicle** — school transport module (separate from the core Sacco fleet).
- **Alert** / **LocationTrigger** — alerting and geofence trigger system.

### Authentication & Authorization

Three distinct auth layers:

1. **User JWT auth** (`middleware/auth.js`) — `protect` extracts Bearer token, attaches `req.user`. `authorize(...roles)` restricts by role.
2. **NTSA auth** (`middleware/ntsaAuth.js`) — additional role check for NTSA-specific routes (roles: `ntsa_officer`, `ntsa_inspector`, `ntsa_analyst`, `admin`). Uses `ntsaAuth`, `ntsaPermission`, and `logNtsaAccess` middleware.
3. **IoT device auth** (`middleware/simpleDeviceAuth.js`) — key-based device authentication. Hard-coded demo keys (`demo_key_123`, `demo_key_456`, `test_key_789`). In development, any key starting with `demo_` or `test_` is accepted. `POST /api/v1/iot/data` uses `optionalDeviceAuth` so it accepts unauthenticated devices.

### IoT Data Pipeline

Data flows through the system as:

```
IoT Device → POST /api/v1/iot/data
  → iotProcessingService (updateVehicleLocation, updateVehicleStatus, generateEventsFromSensorData, processDeviceHealth)
  → routeIoTService / scheduleIoTService
  → Vehicle model post-save hook → VehicleLocationHistory (automatic)
  → WebSocket broadcast to connected school clients
```

The `services/vehicleDataSimulator.js` simulates GPS devices for background job testing. Background jobs are managed through `services/backgroundJobService.js` and exposed via `routes/backgroundJobs.js`.

### WebSocket

`utils/websocket.js` sets up a WebSocket server at path `/ws`. Clients subscribe by school: `ws://host/ws?schoolId=<id>`. The server stores clients in a `Map<schoolId, Set<WebSocket>>` and provides `broadcastToSchool(schoolId, data)`. This is attached to the Express app as `app.get('broadcastToSchool')` and `app.get('io')`.

### Route-to-Controller Mapping

All routes mount under `/api/v1/`:

| Route prefix | Controller |
|---|---|
| `/vehicles` | `controllers/vehicles.js` |
| `/courses` | `controllers/courseController.js` |
| `/auth` | `controllers/auth.js` |
| `/users` | `controllers/users.js` |
| `/drivers` | `controllers/driverController.js` |
| `/background-jobs` | `controllers/backgroundJobController.js` |
| `/vehicle-location-history` | `controllers/vehicleLocationHistory.js` |
| `/analytics` | `controllers/analyticsController.js` |
| `/alerts` | `controllers/alertsController.js` |
| `/ntsa` | `controllers/ntsaController.js` |
| `/ntsa-dashboard` | `controllers/ntsaDashboardController.js` |
| `/iot` | `controllers/iot.js` |
| `/events` | `controllers/passengerEvents.js` |
| `/devices` | `controllers/deviceRegistration.js` |
| `/iot-system` | routes/iotSystem.js |

### Middleware Stack

Applied globally in order: CORS → body parsing → cookie-parser → morgan (dev) → fileupload → mongoSanitize → helmet → xss-clean → rateLimit (100 req/10min in prod, 1000 in dev) → hpp → static files → routes → errorHandler.

Error handling uses `utils/errorResponse.js` (a custom `ErrorResponse` extends `Error`) and the `middleware/async.js` wrapper that catches promise rejections and passes them to `next()`.

### CORS Configuration

Development allows `http://localhost:5173` only. Production also allows `https://sacco-3mhcvjas5-isajs-projects.vercel.app` and `https://fare-rari.netlify.app`.

### Swagger

API documentation is auto-generated via `swagger-jsdoc` and served at `/api-docs` (see `swagger.js`).

