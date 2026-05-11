/**
 * syncVehicleLocations.js
 * One-shot: set each vehicle's currentLocation to its simState.waypointIdx position
 * so markers appear immediately on the map without waiting for a simulator tick.
 *
 * Run: node seed/syncVehicleLocations.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env') })
const mongoose = require('mongoose')

const fs = require('fs')
fs.readdirSync(require('path').join(__dirname, '../models'))
  .filter(f => f.endsWith('.js'))
  .forEach(f => require(`../models/${f}`))

const Vehicle = require('../models/Vehicle')
const Route   = require('../models/Route')

async function sync() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected\n')

  const vehicles = await Vehicle.find({
    assignedRoute: { $exists: true, $ne: null },
  }).select('_id plateNumber assignedRoute simState').lean()

  for (const v of vehicles) {
    const route = await Route.findById(v.assignedRoute).select('waypoints routeName').lean()
    if (!route || !Array.isArray(route.waypoints) || route.waypoints.length < 2) {
      console.log(`  ${v.plateNumber}: no waypoints on route — skipping`)
      continue
    }

    const idx = Math.min(v.simState?.waypointIdx ?? 0, route.waypoints.length - 1)
    const [longitude, latitude] = route.waypoints[idx]

    await Vehicle.findByIdAndUpdate(v._id, {
      currentLocation: { latitude, longitude, updatedAt: new Date() },
    })
    console.log(`  ${v.plateNumber} → [${longitude.toFixed(4)}, ${latitude.toFixed(4)}] (idx ${idx}) on ${route.routeName}`)
  }

  await mongoose.disconnect()
  console.log('\nDone. Refresh the frontend map.')
}

sync().catch(err => { console.error(err); process.exit(1) })
