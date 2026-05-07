/**
 * seedRoutes.js
 *
 * Seeds R001 and R002 routes with road-accurate waypoints from OSRM.
 * Run: node seed/seedRoutes.js
 * Flags:
 *   --routes-only   Update waypoints on existing routes, skip vehicle stagger reset
 */

require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env') })
const mongoose   = require('mongoose')
const https      = require('https')
const Route      = require('../models/Route')
const Stop       = require('../models/Stop')
const Vehicle    = require('../models/Vehicle')
const User       = require('../models/User')
const ROUTES     = require('./data/routeDefinitions')

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
    const { waypoints, stopWaypointIndices } = await buildWaypoints(def.stops)
    console.log(`  Got ${waypoints.length} waypoints`)

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
        user:              adminUser._id,
      },
      { upsert: true, new: true }
    )
    console.log(`  Route saved: ${route._id}`)

    if (routesOnly) continue

    const vehicles = await Vehicle.find({ assignedRoute: route._id })
    if (!vehicles.length) {
      console.log('  No vehicles assigned yet — skipping stagger')
      continue
    }
    const step = Math.floor(waypoints.length / vehicles.length)
    for (let i = 0; i < vehicles.length; i++) {
      await Vehicle.findByIdAndUpdate(vehicles[i]._id, {
        'simState.waypointIdx':   i * step,
        'simState.direction':     1,
        'simState.layoverUntil':  null,
        'simState.currentTripId': null,
        'simState.dataSource':    'simulator',
      })
    }
    console.log(`  ${vehicles.length} vehicles staggered`)
  }

  await mongoose.disconnect()
  console.log('\nDone.')
}

seedRoutes().catch(err => { console.error(err); process.exit(1) })
