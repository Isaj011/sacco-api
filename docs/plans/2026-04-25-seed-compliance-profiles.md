# Seed Compliance Profiles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `scripts/seedComplianceProfiles.js` — a standalone runnable script that creates `ComplianceProfile` documents for every Vehicle, Driver, SchoolVehicle, and SchoolDriver in the database, then optionally recalculates scores so monitoring endpoints have real data immediately.

**Architecture:** Single self-contained Node.js script. Loads env, connects to MongoDB, iterates each entity collection in order, calls `complianceService.createProfile()` per entity (idempotent — skips if profile already exists), and optionally calls `complianceService.recalculate()` per profile. Per-entity try/catch keeps one failure from aborting the batch. Two new `package.json` npm scripts expose it.

**Tech Stack:** Node.js, Mongoose, dotenv (`config/config.env`), existing `services/complianceService.js`, existing models `Vehicle`, `Driver`, `SchoolVehicle`, `SchoolDriver`.

---

## Key Reference: Model Display Fields

| Model | Display identifier used in progress output |
|---|---|
| `Vehicle` | `vehicle.plateNumber` |
| `Driver` | `driver.driverName` |
| `SchoolVehicle` | `vehicle.registrationNumber` |
| `SchoolDriver` | `` `${driver.firstName} ${driver.lastName}` `` |

## Key Reference: complianceService API

```js
// Returns existing profile if one already exists for entityId — never throws on duplicate
const profile = await complianceService.createProfile(domain, entityType, entityId);

// Recalculates score in-place, saves, returns updated profile
await complianceService.recalculate(profile);
```

---

### Task 1: Create `scripts/seedComplianceProfiles.js`

**Files:**
- Create: `scripts/seedComplianceProfiles.js`

**Step 1: Confirm the `scripts/` directory exists**

```bash
ls C:/Os/Dev/Farerare/sacco-api/scripts
```

Expected: directory listed (it was created in the previous session). If missing: `mkdir -p C:/Os/Dev/Farerare/sacco-api/scripts`

**Step 2: Write the script**

Create `scripts/seedComplianceProfiles.js` with this exact content:

```js
// scripts/seedComplianceProfiles.js
// Run with: node scripts/seedComplianceProfiles.js
// Or:       node scripts/seedComplianceProfiles.js --recalculate

'use strict';

require('dotenv').config({ path: './config/config.env' });

const mongoose   = require('mongoose');
const connectDB  = require('../config/db');

// Models — import all four so Mongoose registers them before querying
const Vehicle      = require('../models/Vehicle');
const Driver       = require('../models/Driver');
const SchoolVehicle = require('../models/SchoolVehicle');
const SchoolDriver  = require('../models/SchoolDriver');

const complianceService = require('../services/complianceService');

// ── CLI flag ──────────────────────────────────────────────────────────────────
const RECALCULATE = process.argv.includes('--recalculate');

// ── Counters ──────────────────────────────────────────────────────────────────
const stats = {
  created:      0,
  existed:      0,
  recalculated: 0,
  errors:       0
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Seed one entity. Returns the profile (created or existing).
 * Per-entity try/catch: errors are logged, counted, and execution continues.
 *
 * @param {'sacco'|'school'} domain
 * @param {'vehicle'|'driver'} entityType
 * @param {mongoose.Document} entity
 * @param {string} label  — human-readable identifier for progress output
 */
async function seedOne(domain, entityType, entity, label) {
  try {
    // complianceService.createProfile is idempotent:
    // returns existing profile without error if one already exists.
    const before = await require('../models/ComplianceProfile').findOne({ entityId: entity._id });
    const profile = await complianceService.createProfile(domain, entityType, entity._id);

    if (before) {
      stats.existed++;
      process.stdout.write(`  (exists) ${domain} ${entityType} ${label}\n`);
    } else {
      stats.created++;
      process.stdout.write(`  ✓ created ${domain} ${entityType} ${label}\n`);
    }

    if (RECALCULATE) {
      await complianceService.recalculate(profile);
      stats.recalculated++;
      process.stdout.write(`    → recalculated score: ${profile.complianceScore}\n`);
    }

    return profile;
  } catch (err) {
    stats.errors++;
    console.error(`  ✗ ERROR — ${domain} ${entityType} ${label}: ${err.message}`);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Compliance Profile Seeder ===');
  if (RECALCULATE) {
    console.log('Mode: create + recalculate');
  } else {
    console.log('Mode: create only  (pass --recalculate to also compute scores)');
  }
  console.log('');

  // Connect
  const connected = await connectDB();
  if (!connected) {
    console.error('Failed to connect to MongoDB. Check MONGO_URI in config/config.env.');
    process.exit(1);
  }

  // ── 1. Sacco Vehicles ────────────────────────────────────────────────────────
  console.log('── Sacco Vehicles ──────────────────────────────────────────');
  const saccoVehicles = await Vehicle.find({}).select('_id plateNumber').lean();
  console.log(`   Found ${saccoVehicles.length} vehicles`);
  for (const v of saccoVehicles) {
    await seedOne('sacco', 'vehicle', v, v.plateNumber || String(v._id));
  }

  // ── 2. Sacco Drivers ─────────────────────────────────────────────────────────
  console.log('\n── Sacco Drivers ───────────────────────────────────────────');
  const saccoDrivers = await Driver.find({}).select('_id driverName').lean();
  console.log(`   Found ${saccoDrivers.length} drivers`);
  for (const d of saccoDrivers) {
    await seedOne('sacco', 'driver', d, d.driverName || String(d._id));
  }

  // ── 3. School Vehicles ────────────────────────────────────────────────────────
  console.log('\n── School Vehicles ─────────────────────────────────────────');
  const schoolVehicles = await SchoolVehicle.find({}).select('_id registrationNumber').lean();
  console.log(`   Found ${schoolVehicles.length} school vehicles`);
  for (const v of schoolVehicles) {
    await seedOne('school', 'vehicle', v, v.registrationNumber || String(v._id));
  }

  // ── 4. School Drivers ─────────────────────────────────────────────────────────
  console.log('\n── School Drivers ──────────────────────────────────────────');
  const schoolDrivers = await SchoolDriver.find({}).select('_id firstName lastName').lean();
  console.log(`   Found ${schoolDrivers.length} school drivers`);
  for (const d of schoolDrivers) {
    const label = [d.firstName, d.lastName].filter(Boolean).join(' ') || String(d._id);
    await seedOne('school', 'driver', d, label);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n=== Summary ================================================');
  console.log(`  Profiles created:      ${stats.created}`);
  console.log(`  Already existed:       ${stats.existed}`);
  if (RECALCULATE) {
    console.log(`  Scores recalculated:   ${stats.recalculated}`);
  }
  console.log(`  Errors:                ${stats.errors}`);
  console.log('============================================================\n');

  await mongoose.disconnect();

  // Exit 1 if any entity failed — detectable in CI
  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unhandled error in seeder:', err);
  process.exit(1);
});
```

**Step 3: Syntax-check the file**

```bash
cd C:/Os/Dev/Farerare/sacco-api && node --check scripts/seedComplianceProfiles.js
```

Expected: no output, exit code 0. If errors appear, fix them before continuing.

**Step 4: Commit**

```bash
cd C:/Os/Dev/Farerare/sacco-api
git add scripts/seedComplianceProfiles.js
git commit -m "feat: add compliance profile seeder script"
```

---

### Task 2: Add npm scripts to `package.json`

**Files:**
- Modify: `package.json` (the `"scripts"` block)

**Step 1: Locate the scripts block**

Current scripts block in `package.json`:

```json
"scripts": {
  "start": "node server",
  "dev": "nodemon server",
  "seed": "node seed/runSeeder.js",
  "seed:old": "node seeder.js -i",
  "seed:triggers": "node seedLocationTriggers.js",
  "test:background": "node testBackgroundJob.js",
  "test:newdata": "node examples/newDataHandling.js"
},
```

**Step 2: Add the two new entries**

Add `seed:compliance` and `seed:compliance:recalculate` at the end of the scripts block:

```json
"scripts": {
  "start": "node server",
  "dev": "nodemon server",
  "seed": "node seed/runSeeder.js",
  "seed:old": "node seeder.js -i",
  "seed:triggers": "node seedLocationTriggers.js",
  "test:background": "node testBackgroundJob.js",
  "test:newdata": "node examples/newDataHandling.js",
  "seed:compliance": "node scripts/seedComplianceProfiles.js",
  "seed:compliance:recalculate": "node scripts/seedComplianceProfiles.js --recalculate"
},
```

**Step 3: Verify JSON is still valid**

```bash
cd C:/Os/Dev/Farerare/sacco-api && node -e "require('./package.json'); console.log('package.json OK')"
```

Expected: `package.json OK`

**Step 4: Commit**

```bash
cd C:/Os/Dev/Farerare/sacco-api
git add package.json
git commit -m "feat: add seed:compliance npm scripts"
```

---

### Task 3: Smoke-test the script (dry run — no live DB required for syntax)

**Step 1: Final syntax check**

```bash
cd C:/Os/Dev/Farerare/sacco-api && node --check scripts/seedComplianceProfiles.js && echo "Syntax OK"
```

Expected: `Syntax OK`

**Step 2: Verify npm script is wired correctly**

```bash
cd C:/Os/Dev/Farerare/sacco-api && npm run seed:compliance -- --help 2>&1 | head -5 || true
```

Expected: script starts to run (will fail at DB connect without a live Mongo, but the require chain should resolve without module-not-found errors). If you see `Cannot find module`, fix the require path.

**Step 3: (Optional — with live DB) Run create-only pass**

```bash
cd C:/Os/Dev/Farerare/sacco-api && npm run seed:compliance
```

Expected output shape:
```
=== Compliance Profile Seeder ===
Mode: create only  (pass --recalculate to also compute scores)

── Sacco Vehicles ──────────────────────────────────────────
   Found 10 vehicles
  ✓ created sacco vehicle KBZ 123A
  ...

── Sacco Drivers ───────────────────────────────────────────
   Found 8 drivers
  ✓ created sacco driver John Kamau
  ...

=== Summary ================================================
  Profiles created:      XX
  Already existed:       0
  Errors:                0
============================================================
```

**Step 4: (Optional — with live DB) Run recalculate pass**

```bash
cd C:/Os/Dev/Farerare/sacco-api && npm run seed:compliance:recalculate
```

Expected: same output but now profiles already exist, so `Already existed` count matches total, `Scores recalculated` matches total, `Errors: 0`.

**Step 5: Final commit (if any fixups were needed)**

```bash
cd C:/Os/Dev/Farerare/sacco-api
git add -p
git commit -m "fix: compliance seeder smoke-test fixups"
```

---

## Done Criteria

- `scripts/seedComplianceProfiles.js` exists and passes `node --check`
- Running without `--recalculate` creates profiles only (idempotent on re-run)
- Running with `--recalculate` creates + scores all profiles
- Per-entity errors are caught and printed; batch continues; exit code 1 if any error occurred
- `npm run seed:compliance` and `npm run seed:compliance:recalculate` both resolve correctly
- `package.json` remains valid JSON
