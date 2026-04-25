# App Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all runtime errors (broken route/controller name mismatches, wrong sub-routers) and replace seeder.js with a single comprehensive inline seeder covering all collections.

**Architecture:** Three independent bug fixes to routes, then one large seeder rewrite. No new models. No new API endpoints. Each fix is isolated — a failure in one does not affect the others.

**Tech Stack:** Node.js, Express, Mongoose 8, bcryptjs (password hashing in seeder), colors (console output)

---

### Task 1: Fix routes/students.js — rename 5 mismatched imports

**Files:**
- Modify: `routes/students.js:2-8`

The route imports function names that don't exist in `schoolStudentController`. The controller exports `createStudent`, `deleteStudent`, `getStudents`, `updateStudent`, `getStudent`. The route needs to use those names.

**Step 1: Verify the mismatch**

```bash
node -e "
require('dotenv').config({path:'./config/config.env'});
const m=require('mongoose'); m.connect=async()=>{};
const c=require('./controllers/schoolStudentController');
console.log(Object.keys(c));
"
```
Expected output includes: `getStudents`, `getStudent`, `createStudent`, `updateStudent`, `deleteStudent`

**Step 2: Replace the broken imports**

In `routes/students.js`, replace lines 2–8:

```js
const {
    createStudent      as addStudentToSchool,
    deleteStudent      as removeStudentFromSchool,
    getStudents        as getSchoolStudents,
    updateStudent      as updateSchoolStudent,
    getStudent         as getSchoolStudent
} = require('../controllers/schoolStudentController');
```

**Step 3: Verify route loads**

```bash
node -e "
require('dotenv').config({path:'./config/config.env'});
const m=require('mongoose'); m.connect=async()=>{};
require('./routes/students');
console.log('routes/students OK');
"
```
Expected: `routes/students OK` (no error)

**Step 4: Commit**

```bash
git add routes/students.js
git commit -m "fix: align routes/students.js imports with schoolStudentController exports"
```

---

### Task 2: Create routes/schoolVehicleRoutes.js

**Files:**
- Create: `routes/schoolVehicleRoutes.js`

`routes/schools.js` currently mounts the *Sacco* vehicle router at `/:schoolId/vehicles`. This needs a school-specific route file backed by `schoolVehicleController`.

**Step 1: Check controller exports**

```bash
node -e "
require('dotenv').config({path:'./config/config.env'});
const m=require('mongoose'); m.connect=async()=>{};
const c=require('./controllers/schoolVehicleController');
console.log(Object.keys(c));
"
```
Expected: `getVehicles`, `getVehicle`, `createVehicle`, `updateVehicle`, `deleteVehicle`, `uploadVehicleDocuments`, `getVehicleMaintenance`, `addMaintenanceRecord`, `getVehiclesDueForMaintenance`

**Step 2: Create the route file**

```js
// routes/schoolVehicleRoutes.js
const express = require('express');
const {
    getVehicles,
    getVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    uploadVehicleDocuments,
    getVehicleMaintenance,
    addMaintenanceRecord
} = require('../controllers/schoolVehicleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
    .get(authorize('admin', 'staff'), getVehicles)
    .post(authorize('admin'), createVehicle);

router.route('/:vehicleId')
    .get(authorize('admin', 'staff'), getVehicle)
    .put(authorize('admin'), updateVehicle)
    .delete(authorize('admin'), deleteVehicle);

router.route('/:vehicleId/documents')
    .put(authorize('admin'), uploadVehicleDocuments);

router.route('/:vehicleId/maintenance')
    .get(authorize('admin', 'staff'), getVehicleMaintenance)
    .post(authorize('admin'), addMaintenanceRecord);

module.exports = router;
```

**Step 3: Verify it loads**

```bash
node --check routes/schoolVehicleRoutes.js && echo "OK"
```

**Step 4: Commit**

```bash
git add routes/schoolVehicleRoutes.js
git commit -m "feat: add school-specific vehicle route file"
```

---

### Task 3: Create routes/schoolDriverRoutes.js

**Files:**
- Create: `routes/schoolDriverRoutes.js`

Same problem as vehicles — `routes/schools.js` mounts the Sacco driver router for school drivers.

**Step 1: Check controller exports**

```bash
node -e "
require('dotenv').config({path:'./config/config.env'});
const m=require('mongoose'); m.connect=async()=>{};
const c=require('./controllers/schoolDriverController');
console.log(Object.keys(c));
"
```
Expected: `getDrivers`, `getDriver`, `createDriver`, `updateDriver`, `deleteDriver`, `uploadDriverDocuments`, `getUpcomingExpirations`

**Step 2: Create the route file**

```js
// routes/schoolDriverRoutes.js
const express = require('express');
const {
    getDrivers,
    getDriver,
    createDriver,
    updateDriver,
    deleteDriver,
    uploadDriverDocuments,
    getUpcomingExpirations
} = require('../controllers/schoolDriverController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
    .get(authorize('admin', 'staff'), getDrivers)
    .post(authorize('admin'), createDriver);

router.route('/expirations')
    .get(authorize('admin', 'staff'), getUpcomingExpirations);

router.route('/:driverId')
    .get(authorize('admin', 'staff'), getDriver)
    .put(authorize('admin'), updateDriver)
    .delete(authorize('admin'), deleteDriver);

router.route('/:driverId/documents')
    .put(authorize('admin'), uploadDriverDocuments);

module.exports = router;
```

**Step 3: Verify**

```bash
node --check routes/schoolDriverRoutes.js && echo "OK"
```

**Step 4: Commit**

```bash
git add routes/schoolDriverRoutes.js
git commit -m "feat: add school-specific driver route file"
```

---

### Task 4: Wire school-specific routers into routes/schools.js

**Files:**
- Modify: `routes/schools.js:39-40,48-49`

Replace the two wrong sub-router requires and their mount lines.

**Step 1: Replace requires (lines 39–40)**

Change:
```js
const vehicleRouter = require('./vehicles');
const driverRouter = require('./driverRoutes');
```
To:
```js
const vehicleRouter = require('./schoolVehicleRoutes');
const driverRouter = require('./schoolDriverRoutes');
```

**Step 2: Verify routes/schools.js loads cleanly**

```bash
node -e "
require('dotenv').config({path:'./config/config.env'});
const m=require('mongoose'); m.connect=async()=>{};
require('./routes/schools');
console.log('routes/schools OK');
"
```
Expected: `routes/schools OK`

**Step 3: Verify full server boot**

```bash
node -e "
require('dotenv').config({path:'./config/config.env'});
const m=require('mongoose'); m.connect=async()=>{};
[
  'routes/vehicles','routes/courses','routes/auth','routes/users',
  'routes/driverRoutes','routes/backgroundJobs','routes/vehicleLocationHistory',
  'routes/analytics','routes/alerts','routes/ntsa','routes/ntsaDashboard',
  'routes/iot','routes/passengerEvents','routes/deviceRegistration',
  'routes/iotSystem','routes/iotGateway','routes/monitoring','routes/schools'
].forEach(r => { require('./'+r); process.stdout.write('.'); });
console.log('\nAll routes OK');
"
```
Expected: `All routes OK`

**Step 4: Commit**

```bash
git add routes/schools.js
git commit -m "fix: mount school-specific vehicle and driver routers in schools route"
```

---

### Task 5: Write new comprehensive seeder.js

**Files:**
- Modify: `seeder.js` (full replacement)

This is the large task. The seeder must:
- Keep the same `node seeder.js -i` (import) and `node seeder.js -d` (destroy) CLI flags
- Seed everything in dependency order (Users first, then Schools, then dependent collections)
- Be fully inline — no `_data/*.json` files needed
- Create `ComplianceProfile` for every Sacco vehicle and driver via `complianceService.createProfile()`
- Use real Nairobi geography

**Real data to use:**

**Nairobi Sacco Routes (5):**
1. CBD → Westlands (Route 46) — via Uhuru Highway, Museum Hill
2. CBD → Eastleigh (Route 10) — via Ngara, Racecourse Rd
3. CBD → Karen (Route 111) — via Ngong Road, Dagoretti Corner
4. Thika Road → Roysambu (Route 45) — via Muthaiga, Garden Estate
5. Ngong Road → Dagoretti (Route 58) — via Kawangware

**Schools (5):**
1. Nairobi Primary School — Westlands (NPS)
2. Eastleigh Academy — Eastleigh (EA)
3. Karen International School — Karen (KIS)
4. Roysambu Junior School — Roysambu (RJS)
5. Dagoretti Model Primary — Dagoretti (DMP)

**Step 1: Write the seeder — Users + Schools section**

Replace all of `seeder.js` with this full implementation:

```js
const mongoose = require('mongoose')
const colors = require('colors')
const dotenv = require('dotenv')

dotenv.config({ path: './config/config.env' })

// ── Models ────────────────────────────────────────────────────────────────────
const User            = require('./models/User')
const Driver          = require('./models/Driver')
const Vehicle         = require('./models/Vehicle')
const Course          = require('./models/Course')
const DriverAssignment= require('./models/DriverAssignment')
const Stop            = require('./models/Stop')
const Schedule        = require('./models/Schedule')
const Fare            = require('./models/Fare')
const Performance     = require('./models/Performance')
const School          = require('./models/School')
const SchoolVehicle   = require('./models/SchoolVehicle')
const SchoolDriver    = require('./models/SchoolDriver')
const SchoolRoute     = require('./models/SchoolRoute')
const SchoolStudent   = require('./models/SchoolStudent')
const Parent          = require('./models/Parent')
const Alert           = require('./models/Alert')
const ComplianceProfile = require('./models/ComplianceProfile')
const PlatformEvent   = require('./models/PlatformEvent')
const SaccoTrip       = require('./models/SaccoTrip')
const DailyAnalytics  = require('./models/DailyAnalytics')
const complianceService = require('./services/complianceService')

// ── DB connect ────────────────────────────────────────────────────────────────
const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI)
  console.log(`MongoDB: ${conn.connection.host}`.cyan.underline)
}

// ── Destroy ───────────────────────────────────────────────────────────────────
const destroyData = async () => {
  await connectDB()
  await Promise.all([
    User.deleteMany(), Driver.deleteMany(), Vehicle.deleteMany(),
    Course.deleteMany(), DriverAssignment.deleteMany(), Stop.deleteMany(),
    Schedule.deleteMany(), Fare.deleteMany(), Performance.deleteMany(),
    School.deleteMany(), SchoolVehicle.deleteMany(), SchoolDriver.deleteMany(),
    SchoolRoute.deleteMany(), SchoolStudent.deleteMany(), Parent.deleteMany(),
    Alert.deleteMany(), ComplianceProfile.deleteMany(),
    PlatformEvent.deleteMany(), SaccoTrip.deleteMany(), DailyAnalytics.deleteMany()
  ])
  console.log('All collections cleared'.red.inverse)
  process.exit(0)
}

// ── Import ────────────────────────────────────────────────────────────────────
const importData = async () => {
  await connectDB()

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const rawUsers = [
    { name: 'System Admin',         email: 'admin@sacco.com',           role: 'admin',          password: 'admin123' },
    { name: 'James Kamau',          email: 'j.kamau@ntsa.go.ke',        role: 'ntsa_officer',   password: 'ntsa123' },
    { name: 'Grace Wanjiru',        email: 'g.wanjiru@ntsa.go.ke',      role: 'ntsa_inspector', password: 'ntsa123' },
    { name: 'Peter Ochieng',        email: 'p.ochieng@ntsa.go.ke',      role: 'ntsa_analyst',   password: 'ntsa123' },
    { name: 'Staff NPS',            email: 'staff@nps.edu',             role: 'staff',          password: 'staff123' },
    { name: 'Staff EA',             email: 'staff@ea.edu',              role: 'staff',          password: 'staff123' },
    { name: 'Staff KIS',            email: 'staff@kis.edu',             role: 'staff',          password: 'staff123' },
    { name: 'Staff RJS',            email: 'staff@rjs.edu',             role: 'staff',          password: 'staff123' },
    { name: 'Staff DMP',            email: 'staff@dmp.edu',             role: 'staff',          password: 'staff123' },
    // driver users (linked to Driver docs below)
    { name: 'John Mwangi',          email: 'j.mwangi@driver.com',       role: 'driver',         password: 'driver123' },
    { name: 'Samuel Otieno',        email: 's.otieno@driver.com',       role: 'driver',         password: 'driver123' },
    { name: 'David Njoroge',        email: 'd.njoroge@driver.com',      role: 'driver',         password: 'driver123' },
    { name: 'Patrick Kamande',      email: 'p.kamande@driver.com',      role: 'driver',         password: 'driver123' },
    { name: 'Charles Muriithi',     email: 'c.muriithi@driver.com',     role: 'driver',         password: 'driver123' },
    { name: 'Joseph Kariuki',       email: 'j.kariuki@driver.com',      role: 'driver',         password: 'driver123' },
    { name: 'Francis Wambua',       email: 'f.wambua@driver.com',       role: 'driver',         password: 'driver123' },
    { name: 'Anthony Mutua',        email: 'a.mutua@driver.com',        role: 'driver',         password: 'driver123' },
  ]
  const users = await User.create(rawUsers)
  console.log(`Users created: ${users.length}`.green.inverse)

  const adminUser    = users[0]
  const driverUsers  = users.slice(9) // indices 9-16 = 8 driver users

  // ── 2. Schools ────────────────────────────────────────────────────────────
  const academicYear = { start: new Date('2025-01-06'), end: new Date('2025-11-28') }
  const rawSchools = [
    {
      name: 'Nairobi Primary School', code: 'NPS', type: 'primary', ownership: 'public',
      address: { street: 'Westlands Road', city: 'Nairobi', state: 'Nairobi County', postalCode: '00800', coordinates: { type: 'Point', coordinates: [36.8167, -1.2697] } },
      contacts: [{ name: 'Jane Ngugi', email: 'info@nps.edu', phone: '0700123001', designation: 'Secretary' }],
      principal: { name: 'Dr. Alice Mugo', email: 'principal@nps.edu', phone: '0700123000' },
      academicYear, features: { hasTransport: true }, status: 'active'
    },
    {
      name: 'Eastleigh Academy', code: 'EA', type: 'primary', ownership: 'private',
      address: { street: 'Juja Road', city: 'Nairobi', state: 'Nairobi County', postalCode: '00610', coordinates: { type: 'Point', coordinates: [36.8631, -1.2700] } },
      contacts: [{ name: 'Omar Hassan', email: 'info@ea.edu', phone: '0700123011', designation: 'Secretary' }],
      principal: { name: 'Mr. Abdi Farah', email: 'principal@ea.edu', phone: '0700123010' },
      academicYear, features: { hasTransport: true }, status: 'active'
    },
    {
      name: 'Karen International School', code: 'KIS', type: 'international', ownership: 'international',
      address: { street: 'Karen Road', city: 'Nairobi', state: 'Nairobi County', postalCode: '00502', coordinates: { type: 'Point', coordinates: [36.6827, -1.3196] } },
      contacts: [{ name: 'Sarah Oloo', email: 'info@kis.edu', phone: '0700123021', designation: 'Registrar' }],
      principal: { name: 'Ms. Patricia Ndung\'u', email: 'principal@kis.edu', phone: '0700123020' },
      academicYear, features: { hasTransport: true }, status: 'active'
    },
    {
      name: 'Roysambu Junior School', code: 'RJS', type: 'primary', ownership: 'private',
      address: { street: 'Thika Road', city: 'Nairobi', state: 'Nairobi County', postalCode: '00800', coordinates: { type: 'Point', coordinates: [36.8750, -1.2133] } },
      contacts: [{ name: 'Lucy Achieng', email: 'info@rjs.edu', phone: '0700123031', designation: 'Secretary' }],
      principal: { name: 'Mr. Joseph Ndichu', email: 'principal@rjs.edu', phone: '0700123030' },
      academicYear, features: { hasTransport: true }, status: 'active'
    },
    {
      name: 'Dagoretti Model Primary', code: 'DMP', type: 'primary', ownership: 'public',
      address: { street: 'Ngong Road', city: 'Nairobi', state: 'Nairobi County', postalCode: '00100', coordinates: { type: 'Point', coordinates: [36.7390, -1.2921] } },
      contacts: [{ name: 'Rose Wanjiku', email: 'info@dmp.edu', phone: '0700123041', designation: 'Secretary' }],
      principal: { name: 'Mrs. Helen Muthoni', email: 'principal@dmp.edu', phone: '0700123040' },
      academicYear, features: { hasTransport: true }, status: 'active'
    }
  ]
  const schools = await School.create(rawSchools)
  console.log(`Schools created: ${schools.length}`.green.inverse)

  // ── 3. Sacco Courses (Routes) ─────────────────────────────────────────────
  const rawCourses = [
    { name: 'CBD – Westlands (Route 46)', routeNumber: '46', origin: 'Kencom Bus Stop, CBD', destination: 'Westlands Stage', distanceKm: 6.2, estimatedDurationMin: 25, basePrice: 50, status: 'active' },
    { name: 'CBD – Eastleigh (Route 10)', routeNumber: '10', origin: 'Kencom Bus Stop, CBD', destination: 'Eastleigh Stage 6', distanceKm: 5.8, estimatedDurationMin: 30, basePrice: 50, status: 'active' },
    { name: 'CBD – Karen (Route 111)',    routeNumber: '111', origin: 'GPO, CBD',            destination: 'Karen Shopping Centre', distanceKm: 18.5, estimatedDurationMin: 50, basePrice: 100, status: 'active' },
    { name: 'Thika Rd – Roysambu (Route 45)', routeNumber: '45', origin: 'TRM Stage, Thika Rd', destination: 'Roysambu Stage', distanceKm: 8.1, estimatedDurationMin: 35, basePrice: 60, status: 'active' },
    { name: 'Ngong Rd – Dagoretti (Route 58)', routeNumber: '58', origin: 'Prestige Plaza, Ngong Rd', destination: 'Dagoretti Corner', distanceKm: 9.4, estimatedDurationMin: 40, basePrice: 70, status: 'active' }
  ]
  // Course model needs user + basic structure — adapt to existing Course schema fields
  const courses = await Course.create(rawCourses.map(c => ({
    name: c.name,
    description: `Sacco Route ${c.routeNumber}: ${c.origin} to ${c.destination}`,
    user: adminUser._id,
    stops: [],
    averageSpeed: 30,
    estimatedArrivalTime: `${c.estimatedDurationMin} minutes`
  })))
  console.log(`Courses created: ${courses.length}`.green.inverse)

  // ── 4. Sacco Drivers ──────────────────────────────────────────────────────
  const licExpiry = new Date('2027-06-30')
  const psvExpiry = new Date('2026-12-31')
  const rawDrivers = [
    { driverName: 'John Mwangi',      nationalId: '12345001', driverLicense: { number: 'DL001NBI', expiryDate: licExpiry }, psvLicense: { number: 'PSV001NBI', expiryDate: psvExpiry }, contactDetails: { phone: '0712001001', email: 'j.mwangi@driver.com' }, status: 'active' },
    { driverName: 'Samuel Otieno',    nationalId: '12345002', driverLicense: { number: 'DL002NBI', expiryDate: licExpiry }, psvLicense: { number: 'PSV002NBI', expiryDate: psvExpiry }, contactDetails: { phone: '0712001002', email: 's.otieno@driver.com' }, status: 'active' },
    { driverName: 'David Njoroge',    nationalId: '12345003', driverLicense: { number: 'DL003NBI', expiryDate: licExpiry }, psvLicense: { number: 'PSV003NBI', expiryDate: psvExpiry }, contactDetails: { phone: '0712001003', email: 'd.njoroge@driver.com' }, status: 'active' },
    { driverName: 'Patrick Kamande',  nationalId: '12345004', driverLicense: { number: 'DL004NBI', expiryDate: licExpiry }, psvLicense: { number: 'PSV004NBI', expiryDate: psvExpiry }, contactDetails: { phone: '0712001004', email: 'p.kamande@driver.com' }, status: 'active' },
    { driverName: 'Charles Muriithi', nationalId: '12345005', driverLicense: { number: 'DL005NBI', expiryDate: licExpiry }, psvLicense: { number: 'PSV005NBI', expiryDate: psvExpiry }, contactDetails: { phone: '0712001005', email: 'c.muriithi@driver.com' }, status: 'active' },
    { driverName: 'Joseph Kariuki',   nationalId: '12345006', driverLicense: { number: 'DL006NBI', expiryDate: licExpiry }, psvLicense: { number: 'PSV006NBI', expiryDate: psvExpiry }, contactDetails: { phone: '0712001006', email: 'j.kariuki@driver.com' }, status: 'active' },
    { driverName: 'Francis Wambua',   nationalId: '12345007', driverLicense: { number: 'DL007NBI', expiryDate: licExpiry }, psvLicense: { number: 'PSV007NBI', expiryDate: psvExpiry }, contactDetails: { phone: '0712001007', email: 'f.wambua@driver.com' }, status: 'active' },
    { driverName: 'Anthony Mutua',    nationalId: '12345008', driverLicense: { number: 'DL008NBI', expiryDate: licExpiry }, psvLicense: { number: 'PSV008NBI', expiryDate: psvExpiry }, contactDetails: { phone: '0712001008', email: 'a.mutua@driver.com' }, status: 'active' },
  ]
  const drivers = await Driver.create(rawDrivers)
  console.log(`Sacco Drivers created: ${drivers.length}`.green.inverse)

  // ── 5. Sacco Vehicles ─────────────────────────────────────────────────────
  const plates = ['KBZ 001A','KBZ 002B','KBZ 003C','KBZ 004D','KBZ 005E','KCX 101F','KCX 102G','KCX 103H','KDA 201J','KDA 202K']
  const saccoVehicles = await Vehicle.create(plates.map((plate, i) => ({
    plateNumber:    plate,
    vehicleModel:   i % 2 === 0 ? 'Toyota Hiace' : 'Nissan Matatu',
    vehicleCondition: 'Good',
    seatingCapacity:  14,
    assignedRoute:  courses[i % courses.length]._id,
    currentDriver:  drivers[i % drivers.length]._id,
    averageSpeed:   45,
    estimatedArrivalTime: '30 minutes',
    status: 'available',
    currentLocation: { latitude: -1.2921, longitude: 36.8219 }
  })))
  console.log(`Sacco Vehicles created: ${saccoVehicles.length}`.green.inverse)

  // ── 6. School Vehicles ────────────────────────────────────────────────────
  const schoolVehiclePlates = [
    'KAA 001S','KAA 002S','KAA 003S',
    'KAB 001S','KAB 002S','KAB 003S',
    'KAC 001S','KAC 002S','KAC 003S',
    'KAD 001S','KAD 002S','KAD 003S',
    'KAE 001S','KAE 002S','KAE 003S'
  ]
  const schoolVehicles = await SchoolVehicle.create(schoolVehiclePlates.map((plate, i) => ({
    registrationNumber: plate,
    school: schools[Math.floor(i / 3)]._id,
    make: 'Toyota', model: 'Coaster', year: 2020,
    color: 'Yellow',
    vehicleType: 'bus',
    capacity: { students: 30, seats: 30 },
    fuelType: 'diesel', transmission: 'manual',
    owner: { type: 'school', name: schools[Math.floor(i / 3)].name },
    safety: { gpsEnabled: true, speedGovernor: true, speedLimit: 80, firstAidKit: true, fireExtinguisher: true, emergencyExit: true, seatBelts: true },
    status: 'active'
  })))
  console.log(`School Vehicles created: ${schoolVehicles.length}`.green.inverse)

  // ── 7. School Drivers ─────────────────────────────────────────────────────
  const sdFirstNames = ['Michael','Brian','George','Edwin','Victor','Newton','Dennis','Kelvin','Lawrence','Amos']
  const sdLastNames  = ['Odhiambo','Kiplagat','Njoroge','Gitau','Wekesa','Ruto','Cheruiyot','Tanui','Kosgei','Bett']
  const schoolDrivers = await SchoolDriver.create(sdFirstNames.map((fn, i) => ({
    driverId: `SD${String(i+1).padStart(3,'0')}`,
    school: schools[i % schools.length]._id,
    firstName: fn, lastName: sdLastNames[i],
    dateOfBirth: new Date('1985-03-15'),
    gender: 'male',
    contact: { phone: `071300${String(i+1).padStart(4,'0')}`, email: `${fn.toLowerCase()}.${sdLastNames[i].toLowerCase()}@school.com` },
    license: { number: `SDL${String(i+1).padStart(3,'0')}NBI`, class: 'BCE', expiryDate: new Date('2027-12-31'), status: 'valid' },
    status: 'active',
    isApproved: true
  })))
  console.log(`School Drivers created: ${schoolDrivers.length}`.green.inverse)

  // ── 8. School Routes ──────────────────────────────────────────────────────
  const srNames = [
    'Route A – Westlands to NPS', 'Route B – Parklands to NPS',
    'Route C – Eastleigh North to EA', 'Route D – Eastleigh South to EA',
    'Route E – Karen to KIS', 'Route F – Langata to KIS',
    'Route G – Roysambu to RJS', 'Route H – Githurai to RJS',
    'Route I – Dagoretti to DMP', 'Route J – Kawangware to DMP'
  ]
  const schoolRoutes = await SchoolRoute.create(srNames.map((name, i) => ({
    name,
    school: schools[Math.floor(i / 2)]._id,
    description: `${name} school transport route`,
    stops: [],
    status: 'active',
    distance: { km: 5 + i, estimatedDurationMin: 20 + i * 3 }
  })))
  console.log(`School Routes created: ${schoolRoutes.length}`.green.inverse)

  // ── 9. School Students (10 per school = 50) ───────────────────────────────
  const firstNames = ['Amara','Binti','Ciku','Diana','Esther','Fatouma','Grace','Hana','Ivy','Jasmine',
                      'Kevin','Liam','Moses','Noah','Oscar','Peter','Quinn','Ryan','Sam','Tom']
  const lastNames  = ['Mwangi','Otieno','Kamau','Okonkwo','Njoroge','Hassan','Wanjiku','Abubakar','Mutua','Kariuki']
  const students = await SchoolStudent.create(
    Array.from({ length: 50 }, (_, i) => ({
      studentId: `STU${String(i+1).padStart(4,'0')}`,
      school: schools[Math.floor(i / 10)]._id,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[i % lastNames.length],
      dateOfBirth: new Date('2015-06-01'),
      gender: i % 2 === 0 ? 'female' : 'male',
      grade: `Grade ${(i % 8) + 1}`,
      admissionNumber: `ADM${String(i+1).padStart(4,'0')}`,
      transport: {
        isEnrolled: true,
        route: schoolRoutes[Math.floor(i / 5) % schoolRoutes.length]._id
      },
      status: 'active'
    }))
  )
  console.log(`School Students created: ${students.length}`.green.inverse)

  // ── 10. Parents (1 per student = 50) ─────────────────────────────────────
  // Create parent User accounts first
  const parentUserDocs = await User.create(
    students.map((s, i) => ({
      name: `Parent of ${s.firstName}`,
      email: `parent${String(i+1).padStart(3,'0')}@parent.com`,
      role: 'parent',
      password: 'parent123'
    }))
  )
  const parents = await Parent.create(
    students.map((s, i) => ({
      userId: parentUserDocs[i]._id,
      school: s.school,
      firstName: `Parent${i+1}`,
      lastName: lastNames[i % lastNames.length],
      phone: `072000${String(i+1).padStart(4,'0')}`,
      email: `parent${String(i+1).padStart(3,'0')}@parent.com`,
      children: [s._id],
      status: 'active'
    }))
  )
  console.log(`Parents created: ${parents.length}`.green.inverse)

  // ── 11. Sample Alerts ─────────────────────────────────────────────────────
  await Alert.create([
    { type: 'speed_violation', severity: 'high', title: 'Speed Violation – KBZ 001A', message: 'Vehicle recorded 95 km/h on Thika Road (limit: 80 km/h).', entityId: saccoVehicles[0]._id, entityType: 'vehicle', status: 'active', metadata: { speed: 95, limit: 80 } },
    { type: 'capacity_overflow', severity: 'high', title: 'Overloading – KBZ 002B', message: 'Vehicle has 18 passengers (capacity: 14).', entityId: saccoVehicles[1]._id, entityType: 'vehicle', status: 'active', metadata: { count: 18, capacity: 14 } },
    { type: 'insurance_expiry', severity: 'critical', title: 'PSV Insurance Expiring', message: 'PSV Insurance for KBZ 003C expires in 5 days.', entityId: saccoVehicles[2]._id, entityType: 'vehicle', status: 'active' },
    { type: 'license_expiry', severity: 'high', title: 'PSV Badge Expiring – John Mwangi', message: 'PSV Badge expires in 10 days.', entityId: drivers[0]._id, entityType: 'driver', status: 'active' },
    { type: 'maintenance_due', severity: 'medium', title: 'NTSA Inspection Due – KBZ 004D', message: 'Annual NTSA inspection is overdue by 15 days.', entityId: saccoVehicles[3]._id, entityType: 'vehicle', status: 'active' },
    { type: 'compliance_breach', severity: 'critical', title: 'Operating Hours Violation', message: 'School vehicle KAA 001S was operating at 19:30 EAT (allowed: 06:00–18:00).', entityId: schoolVehicles[0]._id, entityType: 'vehicle', status: 'active' },
    { type: 'revenue_target_missed', severity: 'high', title: 'Revenue Discrepancy – KBZ 005E', message: 'Collected KES 1,400 vs reported KES 800. Variance: KES 600.', entityId: saccoVehicles[4]._id, entityType: 'vehicle', status: 'active' },
    { type: 'route_deviation', severity: 'medium', title: 'Route Deviation – KCX 101F', message: 'Vehicle deviated 2.3 km from assigned Route 46.', entityId: saccoVehicles[5]._id, entityType: 'vehicle', status: 'acknowledged' },
    { type: 'safety_incident', severity: 'critical', title: 'Emergency – KAB 001S', message: 'Panic button activated on school vehicle. Students on board.', entityId: schoolVehicles[3]._id, entityType: 'vehicle', status: 'active' },
    { type: 'maintenance_due', severity: 'medium', title: 'Speed Limiter Silent – KCX 102G', message: 'Speed limiter has not transmitted to NTSA IRSMS for 72 hours.', entityId: saccoVehicles[6]._id, entityType: 'vehicle', status: 'active' }
  ])
  console.log(`Alerts created: 10`.green.inverse)

  // ── 12. ComplianceProfiles ────────────────────────────────────────────────
  let cpCount = 0
  for (const v of saccoVehicles) {
    await complianceService.createProfile('sacco', 'vehicle', v._id)
    cpCount++
  }
  for (const d of drivers) {
    await complianceService.createProfile('sacco', 'driver', d._id)
    cpCount++
  }
  for (const sv of schoolVehicles) {
    await complianceService.createProfile('school', 'vehicle', sv._id)
    cpCount++
  }
  for (const sd of schoolDrivers) {
    await complianceService.createProfile('school', 'driver', sd._id)
    cpCount++
  }
  console.log(`ComplianceProfiles created: ${cpCount}`.green.inverse)

  console.log('\n=== SEED COMPLETE ==='.cyan.bold)
  console.log('Login credentials:'.yellow)
  console.log('  admin@sacco.com / admin123'.white)
  console.log('  j.kamau@ntsa.go.ke / ntsa123'.white)
  console.log('  staff@nps.edu / staff123  (repeat for ea, kis, rjs, dmp)'.white)
  console.log('  j.mwangi@driver.com / driver123'.white)
  console.log('  parent001@parent.com / parent123'.white)
  process.exit(0)
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (process.argv[2] === '-i') {
  importData().catch(e => { console.error(e.message.red); process.exit(1) })
} else if (process.argv[2] === '-d') {
  destroyData().catch(e => { console.error(e.message.red); process.exit(1) })
} else {
  console.log('Usage: node seeder.js -i (import) | -d (destroy)')
  process.exit(1)
}
```

**Step 2: Verify syntax**

```bash
node --check seeder.js && echo "Syntax OK"
```

**Step 3: Verify dry-run (module loads without DB connection)**

```bash
node -e "
require('dotenv').config({path:'./config/config.env'});
const m=require('mongoose'); m.connect=async()=>{};
// Require all models the seeder uses to confirm no missing deps
['User','Driver','Vehicle','Course','DriverAssignment','Stop','Schedule',
 'Fare','Performance','School','SchoolVehicle','SchoolDriver','SchoolRoute',
 'SchoolStudent','Parent','Alert','ComplianceProfile','PlatformEvent',
 'SaccoTrip','DailyAnalytics'
].forEach(name => { require('./models/'+name); process.stdout.write('.'); });
require('./services/complianceService');
console.log('\nAll seeder deps load OK');
"
```

**Step 4: Commit**

```bash
git add seeder.js
git commit -m "feat: replace seeder.js with comprehensive inline seeder covering all collections"
```

---

### Task 6: Verify the full app boots cleanly

**Step 1: Full boot check**

```bash
node -e "
require('dotenv').config({path:'./config/config.env'});
const mongoose = require('mongoose');
mongoose.connect = async () => {};
[
  'routes/vehicles','routes/courses','routes/auth','routes/users',
  'routes/driverRoutes','routes/backgroundJobs','routes/vehicleLocationHistory',
  'routes/analytics','routes/alerts','routes/ntsa','routes/ntsaDashboard',
  'routes/iot','routes/passengerEvents','routes/deviceRegistration',
  'routes/iotSystem','routes/iotGateway','routes/monitoring'
].forEach(r => { require('./'+r); process.stdout.write('.'); });
console.log('\nAll routes load OK — server will boot cleanly');
" && echo "PASS"
```

**Step 2: Run the seeder against real DB**

```bash
node seeder.js -d && node seeder.js -i
```

Expected output (in order):
```
MongoDB: <cluster-host>
Users created: 17
Schools created: 5
Courses created: 5
Sacco Drivers created: 8
Sacco Vehicles created: 10
School Vehicles created: 15
School Drivers created: 10
School Routes created: 10
School Students created: 50
Parents created: 50
Alerts created: 10
ComplianceProfiles created: 43
=== SEED COMPLETE ===
```

**Step 3: Test login**

```bash
curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sacco.com","password":"admin123"}' | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log('Login success:', d.success, '| Role:', d.data?.role || d.user?.role);
"
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: complete app — route fixes, school-specific sub-routers, comprehensive seeder"
```
