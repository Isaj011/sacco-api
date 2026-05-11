/**
 * seedRoutes.js
 *
 * Seeds fleet routes (R001, R002, R003) with road-accurate waypoints from OSRM,
 * then assigns and staggers fleet vehicles across all three routes.
 *
 * Run: node seed/seedRoutes.js
 * Flags:
 *   --routes-only   Update waypoints only; skip vehicle assignment and stagger
 */

require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env') })
const mongoose = require('mongoose')
const https    = require('https')
const Route             = require('../models/Route')
const Stop              = require('../models/Stop')
const Vehicle           = require('../models/Vehicle')
const Driver            = require('../models/Driver')
const DriverAssignment  = require('../models/DriverAssignment')
const SaccoOperator     = require('../models/SaccoOperator')
const User              = require('../models/User')
const ROUTES   = require('./data/routeDefinitions')

const OSRM_BASE = 'https://router.project-osrm.org'

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) }
        catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

async function fetchSegmentWaypoints(from, to) {
  const coord = `${from[0]},${from[1]};${to[0]},${to[1]}`
  const url   = `${OSRM_BASE}/route/v1/driving/${coord}?geometries=geojson&overview=full`
  const data  = await fetchJSON(url)
  return data.routes?.[0]?.geometry?.coordinates ?? []
}

async function buildWaypoints(stops) {
  const waypoints           = []
  const stopWaypointIndices = []

  for (let i = 0; i < stops.length; i++) {
    const s    = stops[i]
    const from = [s.coordinates.longitude, s.coordinates.latitude]
    stopWaypointIndices.push(waypoints.length)

    if (i < stops.length - 1) {
      const next    = stops[i + 1]
      const to      = [next.coordinates.longitude, next.coordinates.latitude]
      const segment = await fetchSegmentWaypoints(from, to)
      const pts     = i === 0 ? segment : segment.slice(1)
      waypoints.push(...pts)
      await new Promise(r => setTimeout(r, 300))
    } else {
      waypoints.push(from)
    }
  }

  return { waypoints, stopWaypointIndices }
}

async function seedRoutes() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  const routesOnly = process.argv.includes('--routes-only')

  const adminUser = await User.findOne({ role: 'admin' })
  if (!adminUser) throw new Error('No admin user found — run main seeder first')

  const savedRoutes = []

  // ── 1. Upsert each route with OSRM waypoints ──────────────────────────────
  for (const def of ROUTES) {
    console.log(`\nProcessing ${def.routeNumber}: ${def.routeName}`)

    const stopDocs = []
    for (const s of def.stops) {
      const doc = await Stop.findOneAndUpdate(
        { stopId: s.stopId },
        { ...s },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      stopDocs.push(doc)
    }
    console.log(`  ${stopDocs.length} stops upserted`)

    console.log('  Fetching OSRM waypoints…')
    let waypoints = [], stopWaypointIndices = []
    try {
      ;({ waypoints, stopWaypointIndices } = await buildWaypoints(def.stops))
      console.log(`  Got ${waypoints.length} waypoints`)
    } catch (err) {
      // Fall back to straight-line stop coordinates if OSRM is unreachable
      console.warn(`  OSRM unavailable (${err.message}) — using stop coordinates as fallback`)
      waypoints = def.stops.map(s => [s.coordinates.longitude, s.coordinates.latitude])
      stopWaypointIndices = waypoints.map((_, i) => i)
    }

    const route = await Route.findOneAndUpdate(
      { routeNumber: def.routeNumber },
      {
        routeName:         def.routeName,
        routeType:         def.routeType,
        totalDistance:     def.totalDistance,
        estimatedDuration: String(def.estimatedDuration),
        stops:             stopDocs.map(s => s._id),
        waypoints,
        stopWaypointIndices,
        status:            'Active',
        user:              adminUser._id,
      },
      { upsert: true, new: true }
    )
    console.log(`  Route saved: ${route._id}`)
    savedRoutes.push(route)
  }

  if (routesOnly) {
    await mongoose.disconnect()
    console.log('\nDone (routes only).')
    return
  }

  // ── 2. Assign fleet vehicles across the three routes ──────────────────────
  // Grab every fleet vehicle (Vehicle collection, not SchoolVehicle).
  // Clear any previous route assignment so we start fresh on a full seed.
  const fleetVehicles = await Vehicle.find({}).sort('_id').lean()
  console.log(`\nFound ${fleetVehicles.length} fleet vehicles — distributing across ${savedRoutes.length} routes`)

  for (let i = 0; i < fleetVehicles.length; i++) {
    const route    = savedRoutes[i % savedRoutes.length]
    const startPt  = route.waypoints?.[0]
    await Vehicle.findByIdAndUpdate(fleetVehicles[i]._id, {
      assignedRoute:    route._id,
      // Place vehicle at the start of its route so the simulator begins correctly
      ...(startPt ? {
        currentLocation: { longitude: startPt[0], latitude: startPt[1] }
      } : {}),
    })
  }

  // ── 3. Assign fleet drivers to vehicles ──────────────────────────────────
  const fleetDrivers = await Driver.find({}).sort('_id').lean()
  console.log(`\nFound ${fleetDrivers.length} fleet drivers — assigning to vehicles`)

  for (let i = 0; i < fleetVehicles.length; i++) {
    if (!fleetDrivers.length) break
    const driver = fleetDrivers[i % fleetDrivers.length]
    await Vehicle.findByIdAndUpdate(fleetVehicles[i]._id, {
      currentDriver: driver._id,
    })
  }
  console.log(`  Drivers assigned (${Math.min(fleetVehicles.length, fleetDrivers.length)} unique pairings)`)

  // ── 4. Stagger vehicles along each route ─────────────────────────────────
  for (const route of savedRoutes) {
    const vehicles = await Vehicle.find({ assignedRoute: route._id })
    if (!vehicles.length) {
      console.log(`  ${route.routeName}: no vehicles assigned`)
      continue
    }

    const wps  = route.waypoints ?? []
    const step = wps.length > 1 ? Math.floor(wps.length / vehicles.length) : 0

    for (let i = 0; i < vehicles.length; i++) {
      const idx = Math.min(i * step, Math.max(wps.length - 1, 0))
      await Vehicle.findByIdAndUpdate(vehicles[i]._id, {
        'simState.waypointIdx':   idx,
        'simState.direction':     1,
        'simState.layoverUntil':  null,
        'simState.currentTripId': null,
        'simState.dataSource':    'simulator',
      })
    }
    console.log(`  ${route.routeName}: ${vehicles.length} vehicles staggered`)
  }

  // ── 5. Seed DriverAssignment records ─────────────────────────────────────
  console.log('\nSeeding DriverAssignment records…')
  await DriverAssignment.deleteMany({})
  // Clear employeeId from all drivers so getEmployeeId generates fresh IDs
  await Driver.updateMany({}, { $unset: { employeeId: 1 }, status: 'active' })

  const assignedVehicles = await Vehicle.find({
    currentDriver:  { $ne: null },
    assignedRoute:  { $ne: null },
  }).lean()

  // One assignment per unique driver — round-robin means same driver can appear
  // on multiple vehicles; DriverAssignment.employeeId has a unique index.
  const seenDrivers = new Set()
  let assignmentCount = 0
  for (const v of assignedVehicles) {
    const driverKey = String(v.currentDriver)
    if (seenDrivers.has(driverKey)) continue
    seenDrivers.add(driverKey)
    await DriverAssignment.create({
      driverId: v.currentDriver,
      salary: {
        amount:           35000,
        currency:         'KES',
        paymentFrequency: 'monthly',
      },
      vehicleAssignment: {
        busNumber:      v._id,
        routeAssigned:  v.assignedRoute,
        vehicleType:    'matatu',
        assignmentDate: new Date(),
        assignedBy:     adminUser._id,
      },
    })
    assignmentCount++
  }
  console.log(`  ${assignmentCount} DriverAssignment records created`)

  // ── 6. Upsert SaccoOperator and link all fleet records ───────────────────
  console.log('\nSeeding SaccoOperator…')
  const sacco = await SaccoOperator.findOneAndUpdate(
    { registrationNumber: 'NTSA/SACCO/2024/001' },
    {
      name:               'Farerare Sacco',
      registrationNumber: 'NTSA/SACCO/2024/001',
      phone:              '+254700000001',
      email:              'ops@farerare.co.ke',
      address:            { city: 'Nairobi', county: 'Nairobi' },
      contactPerson:      { name: 'Sacco Admin', phone: '+254700000002', email: 'admin@farerare.co.ke' },
      operatingCounties:  ['Nairobi', 'Kiambu', 'Machakos'],
      status:             'active',
    },
    { upsert: true, new: true }
  )
  console.log(`  SaccoOperator: ${sacco.name} (${sacco._id})`)

  const [vCount, dCount, rCount] = await Promise.all([
    Vehicle.updateMany({}, { saccoOperator: sacco._id }),
    Driver.updateMany({},  { saccoOperator: sacco._id }),
    Route.updateMany({},   { saccoOperator: sacco._id }),
  ])
  console.log(`  Linked: ${vCount.modifiedCount} vehicles, ${dCount.modifiedCount} drivers, ${rCount.modifiedCount} routes`)

  await mongoose.disconnect()
  console.log('\nDone.')
}

seedRoutes().catch(err => { console.error(err); process.exit(1) })
