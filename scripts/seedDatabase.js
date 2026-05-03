#!/usr/bin/env node
/**
 * scripts/seedDatabase.js
 *
 * Full-stack seed orchestrator. Covers all four domains:
 *   SACCO       — vehicles, drivers, courses (routes)
 *   School      — schools, vehicles, drivers, students, parents
 *   Delivery    — companies, vehicles, drivers, orders
 *   Analytics   — 30 days VehicleLocationHistory + ComplianceProfiles
 *
 * Usage:
 *   node scripts/seedDatabase.js      (from project root)
 *   npm run seed:full
 *
 * Calls the existing DatabaseSeeder for the SACCO + School core data, then
 * supplements with Delivery domain data, location history, and compliance.
 */

'use strict';

const path   = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../config/config.env') });

const mongoose          = require('mongoose');
const bcrypt            = require('bcryptjs');
const DatabaseSeeder    = require('../seed/databaseSeeder');
const complianceService = require('../services/complianceService');

// ── Model imports ─────────────────────────────────────────────────────────────
// Register models that have cross-collection hooks BEFORE using them.
require('../models/IoT');
require('../models/DriverAssignment');
const Vehicle                = require('../models/Vehicle');
const Driver                 = require('../models/Driver');
const SchoolVehicle          = require('../models/SchoolVehicle');
const SchoolDriver           = require('../models/SchoolDriver');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');
const ComplianceProfile      = require('../models/ComplianceProfile');
const DeliveryCompany        = require('../models/DeliveryCompany');
const DeliveryVehicle        = require('../models/DeliveryVehicle');
const DeliveryDriver         = require('../models/DeliveryDriver');
const DeliveryOrder          = require('../models/DeliveryOrder');
const SaccoOperator          = require('../models/SaccoOperator');
const Route                  = require('../models/Route');

// ── Constants ─────────────────────────────────────────────────────────────────
const NAIROBI_CENTER = { lat: -1.2921, lng: 36.8219 };

const SACCO_OPERATORS = [
  {
    name: 'Nairobi City Sacco',
    registrationNumber: 'NTSA/SACCO/2015/0042',
    phone: '+254700100042',
    email: 'admin@nairobicitysacco.co.ke',
    address: { city: 'Nairobi', county: 'Nairobi' },
    contactPerson: { name: 'James Mwangi', phone: '+254722100042', email: 'james@nairobicitysacco.co.ke' },
    operatingCounties: ['Nairobi', 'Kiambu'],
    status: 'active',
  },
  {
    name: 'Eastlands Shuttle Sacco',
    registrationNumber: 'NTSA/SACCO/2017/0118',
    phone: '+254700200118',
    email: 'ops@eastlandsshuttle.co.ke',
    address: { city: 'Nairobi', county: 'Nairobi' },
    contactPerson: { name: 'Grace Wanjiru', phone: '+254733200118', email: 'grace@eastlandsshuttle.co.ke' },
    operatingCounties: ['Nairobi', 'Machakos'],
    status: 'active',
  },
  {
    name: 'Westside Express Sacco',
    registrationNumber: 'NTSA/SACCO/2018/0231',
    phone: '+254700300231',
    email: 'info@westsideexpress.co.ke',
    address: { city: 'Nairobi', county: 'Nairobi' },
    contactPerson: { name: 'Peter Otieno', phone: '+254711300231', email: 'peter@westsideexpress.co.ke' },
    operatingCounties: ['Nairobi', 'Kajiado', 'Kiambu'],
    status: 'active',
  },
];

const DELIVERY_COMPANIES = [
  {
    name: 'NairobiExpress Logistics',
    registrationNumber: 'CPR/2019/001234',
    phone: '+254700111001',
    email: 'ops@nairobiexpress.co.ke',
    address: { city: 'Nairobi', county: 'Nairobi' },
    operatingCounties: ['Nairobi', 'Kiambu', 'Machakos'],
  },
  {
    name: 'SwiftDeliver Kenya',
    registrationNumber: 'CPR/2020/005678',
    phone: '+254700222002',
    email: 'dispatch@swiftdeliver.co.ke',
    address: { city: 'Nairobi', county: 'Nairobi' },
    operatingCounties: ['Nairobi', 'Kajiado'],
  },
  {
    name: 'Mtrani Courier Services',
    registrationNumber: 'CPR/2021/009012',
    phone: '+254700333003',
    email: 'info@mtrani.co.ke',
    address: { city: 'Nairobi', county: 'Nairobi' },
    operatingCounties: ['Nairobi', 'Mombasa', 'Kisumu'],
  },
];

const ORDER_STATUSES = ['pending', 'assigned', 'picked_up', 'in_transit', 'completed', 'cancelled'];

const NAIROBI_ADDRESSES = [
  'Kimathi Street, Nairobi CBD',
  'Moi Avenue, Nairobi CBD',
  'Tom Mboya Street, Nairobi',
  'Kenyatta Avenue, Nairobi',
  'Ngong Road, Nairobi',
  'Langata Road, Nairobi',
  'Thika Road, Nairobi',
  'Mombasa Road, Nairobi',
  'Waiyaki Way, Westlands',
  'Valley Road, Nairobi',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand         = (min, max) => Math.random() * (max - min) + min;
const randInt      = (min, max) => Math.floor(rand(min, max + 1));
const pick         = arr => arr[Math.floor(Math.random() * arr.length)];
const jitter       = (val, spread) => val + rand(-spread, spread);

const nairobiCoord = () => ({
  lat: jitter(NAIROBI_CENTER.lat, 0.08),
  lng: jitter(NAIROBI_CENTER.lng, 0.12),
});

const log = {
  section: msg => console.log(`\n${'─'.repeat(56)}\n  ${msg}\n${'─'.repeat(56)}`),
  ok:      msg => console.log(`  ✅ ${msg}`),
  skip:    msg => console.log(`  ⏭  ${msg}`),
  warn:    msg => console.log(`  ⚠️  ${msg}`),
  err:     msg => console.error(`  ❌ ${msg}`),
};

// ── SACCO Operators ───────────────────────────────────────────────────────────

async function seedSaccoOperators(vehicles, routes) {
  log.section('SACCO Operators');

  await SaccoOperator.deleteMany({});

  const operators = await SaccoOperator.insertMany(SACCO_OPERATORS);
  log.ok(`${operators.length} SACCO operators`);

  // Distribute vehicles evenly across operators
  const vehicleUpdates = vehicles.map((v, i) => ({
    updateOne: {
      filter: { _id: v._id },
      update: { $set: { saccoOperator: operators[i % operators.length]._id } },
    },
  }));
  if (vehicleUpdates.length > 0) {
    await Vehicle.bulkWrite(vehicleUpdates);
    log.ok(`Linked ${vehicles.length} vehicles to operators`);
  }

  // Distribute only SACCO routes (not SchoolRoute) across operators
  const saccoRoutes = routes.filter(r => r.constructor.modelName === 'Route');
  const routeUpdates = saccoRoutes.map((r, i) => ({
    updateOne: {
      filter: { _id: r._id },
      update: { $set: { saccoOperator: operators[i % operators.length]._id } },
    },
  }));
  if (routeUpdates.length > 0) {
    await Route.bulkWrite(routeUpdates);
    log.ok(`Linked ${saccoRoutes.length} SACCO routes to operators`);
  }

  return operators;
}

// ── Delivery domain ───────────────────────────────────────────────────────────

async function clearDeliveryCollections() {
  await Promise.all([
    DeliveryOrder.deleteMany({}),
    DeliveryDriver.deleteMany({}),
    DeliveryVehicle.deleteMany({}),
    DeliveryCompany.deleteMany({}),
  ]);
  log.ok('Cleared delivery collections');
}

async function seedDelivery() {
  log.section('Delivery Domain');

  const firstNames = ['Amos', 'Beatrice', 'Calvin', 'Dorothy', 'Edwin', 'Fatuma'];
  const lastNames  = ['Kariuki', 'Otieno', 'Wambua', 'Njoroge', 'Achieng', 'Mugo'];
  const vehicleTypes = ['van', 'pickup', 'truck', 'motorcycle'];

  const companies = await DeliveryCompany.insertMany(DELIVERY_COMPANIES);
  log.ok(`${companies.length} delivery companies`);

  const deliveryVehicles = [];
  const deliveryDrivers  = [];

  for (let ci = 0; ci < companies.length; ci++) {
    const company = companies[ci];

    // 2 vehicles per company
    for (let vi = 0; vi < 2; vi++) {
      const reg = `KDL ${100 + ci * 10 + vi}${String.fromCharCode(65 + ci)}`;
      const v = await DeliveryVehicle.create({
        registrationNumber: reg,
        company: company._id,
        make: pick(['Toyota', 'Isuzu', 'Nissan', 'Mitsubishi']),
        model: pick(['Hilux', 'NQR', 'Navara', 'L200']),
        year: randInt(2015, 2022),
        vehicleType: pick(vehicleTypes),
        status: pick(['available', 'available', 'in_use', 'maintenance']),
      });
      deliveryVehicles.push(v);
    }

    // 2 drivers per company
    for (let di = 0; di < 2; di++) {
      const firstName = firstNames[(ci * 2 + di) % firstNames.length];
      const lastName  = lastNames[(ci * 2 + di + 1) % lastNames.length];
      const phone     = `+2547${String(4000 + ci * 100 + di).padStart(7, '0')}`;
      const natId     = `${30000000 + ci * 1000 + di}`;
      const d = await DeliveryDriver.create({
        firstName,
        lastName,
        phone,
        nationalId: natId,
        email:      `${firstName.toLowerCase()}.${lastName.toLowerCase()}@delivery.co.ke`,
        company:    company._id,
        drivingLicense: {
          number:     `DL${String(50000 + ci * 100 + di)}`,
          expiryDate: new Date(Date.now() + (365 + randInt(0, 365)) * 86400000),
        },
        status: 'available',
      });
      deliveryDrivers.push(d);
    }
  }

  log.ok(`${deliveryVehicles.length} delivery vehicles`);
  log.ok(`${deliveryDrivers.length} delivery drivers`);

  // 4 orders per company, spread across statuses
  let orderCount = 0;
  const now = Date.now();

  for (let ci = 0; ci < companies.length; ci++) {
    const company   = companies[ci];
    const compVehs  = deliveryVehicles.filter(v => String(v.company) === String(company._id));
    const compDrvrs = deliveryDrivers.filter(d => String(d.company) === String(company._id));

    for (let oi = 0; oi < 4; oi++) {
      const status = ORDER_STATUSES[oi % ORDER_STATUSES.length];
      const daysAgo = randInt(0, 14);
      const hasDriver  = ['assigned', 'picked_up', 'in_transit', 'completed'].includes(status);
      const hasVehicle = hasDriver;

      await DeliveryOrder.create({
        orderNumber:     `ORD-SEED-${String(ci * 4 + oi + 1).padStart(4, '0')}`,
        company:         company._id,
        vehicle:         hasVehicle ? compVehs[oi % compVehs.length]._id : null,
        driver:          hasDriver  ? compDrvrs[oi % compDrvrs.length]._id : null,
        pickupLocation:  { address: pick(NAIROBI_ADDRESSES), latitude: jitter(NAIROBI_CENTER.lat, 0.05), longitude: jitter(NAIROBI_CENTER.lng, 0.05) },
        pricing: {
          baseRateKES:    randInt(500, 3000),
          totalKES:       randInt(600, 3500),
          paid:           status === 'completed',
        },
        status,
        notes: `Seed order ${ci + 1}-${oi + 1}`,
      });
      orderCount++;
    }
  }

  log.ok(`${orderCount} delivery orders`);
}

// ── Vehicle location history (30 days) ───────────────────────────────────────

async function seedLocationHistory(vehicles) {
  log.section('Vehicle Location History (30 days)');

  if (!vehicles || vehicles.length === 0) {
    log.warn('No vehicles found — fetching from DB');
    vehicles = await Vehicle.find({}).select('_id').lean();
  }

  await VehicleLocationHistory.deleteMany({});

  const now  = Date.now();
  const docs = [];

  for (const vehicle of vehicles) {
    // Simulate a base path that shifts day-to-day
    const baseLat = jitter(NAIROBI_CENTER.lat, 0.04);
    const baseLng = jitter(NAIROBI_CENTER.lng, 0.06);

    for (let day = 0; day < 30; day++) {
      // 6 GPS pings per day: morning, mid-morning, noon, afternoon, evening, night
      const hours = [7, 9, 12, 15, 18, 21];
      for (const hour of hours) {
        const ts = new Date(now - day * 86400000 + hour * 3600000);
        docs.push({
          vehicleId: vehicle._id,
          timestamp: ts,
          location: {
            latitude:  jitter(baseLat, 0.02),
            longitude: jitter(baseLng, 0.03),
          },
          speed: { current: randInt(0, 80), average: randInt(20, 60), max: randInt(60, 100) },
          heading: randInt(0, 359),
          context: { triggerType: 'time_based' },
        });
      }
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < docs.length; i += 500) {
    await VehicleLocationHistory.insertMany(docs.slice(i, i + 500), { ordered: false });
  }

  log.ok(`${docs.length} location history records (${vehicles.length} vehicles × 30 days × 6 pings)`);
}

// ── Compliance profiles ───────────────────────────────────────────────────────

async function seedComplianceProfiles() {
  log.section('Compliance Profiles');

  await ComplianceProfile.deleteMany({});

  const groups = [
    { model: Vehicle,       domain: 'sacco',  entityType: 'vehicle', labelField: 'plateNumber'       },
    { model: Driver,        domain: 'sacco',  entityType: 'driver',  labelField: 'driverName'        },
    { model: SchoolVehicle, domain: 'school', entityType: 'vehicle', labelField: 'registrationNumber' },
    { model: SchoolDriver,  domain: 'school', entityType: 'driver',  labelField: 'firstName'         },
  ];

  let total = 0;
  for (const { model, domain, entityType, labelField } of groups) {
    const entities = await model.find({}, `_id ${labelField}`).lean();
    for (const entity of entities) {
      try {
        await complianceService.createProfile(domain, entityType, entity._id);
        total++;
      } catch (err) {
        log.warn(`Profile skipped for ${entity[labelField]}: ${err.message}`);
      }
    }
    log.ok(`${entities.length} ${domain}/${entityType} profiles`);
  }

  log.ok(`${total} compliance profiles total`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║          Full-Stack Database Seeder                 ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  if (!process.env.MONGO_URI) {
    log.err('MONGO_URI not set. Check config/config.env.');
    process.exit(1);
  }

  log.section('Connecting to MongoDB');
  await mongoose.connect(process.env.MONGO_URI);
  log.ok('Connected');

  // ── 1. Core data (SACCO + School) ─────────────────────────────────────────
  log.section('SACCO + School Core Data');
  log.ok('Running DatabaseSeeder (clears all collections)…');
  const seeder = new DatabaseSeeder();
  await seeder.seedDatabase();
  log.ok('DatabaseSeeder complete');

  // ── 2. SACCO Operators ────────────────────────────────────────────────────
  await seedSaccoOperators(seeder.vehicles, seeder.routes);

  // ── 3. Delivery domain ────────────────────────────────────────────────────
  await clearDeliveryCollections();
  await seedDelivery();

  // ── 4. Location history ───────────────────────────────────────────────────
  await seedLocationHistory(seeder.vehicles);

  // ── 5. Compliance profiles ────────────────────────────────────────────────
  await seedComplianceProfiles();

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Seed complete — restart the server to pick up data ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
