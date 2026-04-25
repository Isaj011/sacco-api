#!/usr/bin/env node
/**
 * Compliance Profile Seeder
 * Usage: node scripts/seedComplianceProfiles.js [--recalculate]
 *
 * Creates ComplianceProfile documents for all existing vehicles and drivers.
 * Safe to re-run — createProfile() is idempotent (returns existing if found).
 *
 * Processes four entity groups:
 *   sacco/vehicle  — Vehicle (plateNumber)
 *   sacco/driver   — Driver  (driverName)
 *   school/vehicle — SchoolVehicle (registrationNumber)
 *   school/driver  — SchoolDriver  (firstName + lastName)
 */

'use strict';

const path    = require('path');
const dotenv  = require('dotenv');

// Load env before any other module that might need MONGO_URI
dotenv.config({ path: path.resolve(__dirname, '../config/config.env') });

const mongoose         = require('mongoose');
const complianceService = require('../services/complianceService');

// ── Models ────────────────────────────────────────────────────────────────────
const Vehicle      = require('../models/Vehicle');
const Driver       = require('../models/Driver');
const SchoolVehicle = require('../models/SchoolVehicle');
const SchoolDriver  = require('../models/SchoolDriver');

// ── CLI flags ─────────────────────────────────────────────────────────────────
const RECALCULATE = process.argv.includes('--recalculate');

// ── Counters ──────────────────────────────────────────────────────────────────
const totals = { created: 0, existed: 0, errors: 0 };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Process a single entity: create its ComplianceProfile (idempotent),
 * optionally recalculate, log progress.
 *
 * @param {'sacco'|'school'|'delivery'} domain
 * @param {'vehicle'|'driver'}          entityType
 * @param {mongoose.Types.ObjectId}     entityId
 * @param {string}                      label   — display name for log line
 */
async function processEntity (domain, entityType, entityId, label) {
  const tag = `[${domain}/${entityType}]`;
  try {
    const before  = await require('../models/ComplianceProfile').findOne({ entityId });
    const profile = await complianceService.createProfile(domain, entityType, entityId);
    const isNew   = !before;

    if (isNew) {
      totals.created++;
    } else {
      totals.existed++;
    }

    const outcome = isNew ? 'created' : 'existed';

    if (RECALCULATE) {
      await complianceService.recalculate(profile);
      console.log(`  ${tag} + ${label} (${outcome}, recalculated)`);
    } else {
      console.log(`  ${tag} + ${label} (${outcome})`);
    }
  } catch (err) {
    totals.errors++;
    console.error(`  ${tag} ERROR for "${label}": ${err.message}`);
  }
}

// ── Group processors ──────────────────────────────────────────────────────────

async function processSaccoVehicles () {
  console.log('\n[sacco/vehicle] Fetching vehicles...');
  const vehicles = await Vehicle.find({}, '_id plateNumber').lean();
  console.log(`[sacco/vehicle] Found ${vehicles.length} vehicle(s).`);
  for (const v of vehicles) {
    const label = v.plateNumber || String(v._id);
    await processEntity('sacco', 'vehicle', v._id, label);
  }
}

async function processSaccoDrivers () {
  console.log('\n[sacco/driver] Fetching drivers...');
  const drivers = await Driver.find({}, '_id driverName').lean();
  console.log(`[sacco/driver] Found ${drivers.length} driver(s).`);
  for (const d of drivers) {
    const label = d.driverName || String(d._id);
    await processEntity('sacco', 'driver', d._id, label);
  }
}

async function processSchoolVehicles () {
  console.log('\n[school/vehicle] Fetching school vehicles...');
  const vehicles = await SchoolVehicle.find({}, '_id registrationNumber').lean();
  console.log(`[school/vehicle] Found ${vehicles.length} school vehicle(s).`);
  for (const v of vehicles) {
    const label = v.registrationNumber || String(v._id);
    await processEntity('school', 'vehicle', v._id, label);
  }
}

async function processSchoolDrivers () {
  console.log('\n[school/driver] Fetching school drivers...');
  const drivers = await SchoolDriver.find({}, '_id firstName lastName driverId').lean();
  console.log(`[school/driver] Found ${drivers.length} school driver(s).`);
  for (const d of drivers) {
    const label = [d.firstName, d.lastName].filter(Boolean).join(' ') || d.driverId || String(d._id);
    await processEntity('school', 'driver', d._id, label);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main () {
  console.log('=== Compliance Profile Seeder ===');
  if (RECALCULATE) {
    console.log('Mode: CREATE + RECALCULATE (--recalculate flag detected)');
  } else {
    console.log('Mode: CREATE only  (pass --recalculate to also score profiles)');
  }

  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI is not set. Check config/config.env.');
    process.exit(1);
  }

  console.log('\nConnecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  await processSaccoVehicles();
  await processSaccoDrivers();
  await processSchoolVehicles();
  await processSchoolDrivers();

  console.log('\n=== Summary ===');
  console.log(`  Created  : ${totals.created}`);
  console.log(`  Existed  : ${totals.existed}`);
  console.log(`  Errors   : ${totals.errors}`);
  console.log(`  Total    : ${totals.created + totals.existed + totals.errors}`);

  await mongoose.disconnect();
  console.log('\nDisconnected. Done.');

  if (totals.errors > 0) {
    console.error(`\n${totals.errors} error(s) occurred during seeding.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
