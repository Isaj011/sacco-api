/**
 * patchVehicleRoutes.js
 *
 * Assigns existing fleet vehicles to R001 (Utawala-CBD) and R002 (Syokimau-CBD),
 * then staggers each vehicle's simState.waypointIdx so they spread across the route.
 *
 * Run: node seed/patchVehicleRoutes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env') })
const mongoose = require('mongoose')

// Register all models so Mongoose refs resolve cleanly
require('../models/User')
require('../models/Driver')
require('../models/Stop')
require('../models/Route')
require('../models/SaccoTrip')
require('../models/Vehicle')
require('../models/VehicleLocationHistory')

const Vehicle = require('../models/Vehicle')
const Route   = require('../models/Route')

async function patch() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB\n')

  // Load the two new routes
  const [r001, r002] = await Promise.all([
    Route.findOne({ routeNumber: 'R001' }),
    Route.findOne({ routeNumber: 'R002' }),
  ])
  if (!r001 || !r002) throw new Error('R001 or R002 not found — run seed:routes first')
  console.log(`R001: ${r001.routeName} (${r001.waypoints.length} waypoints)`)
  console.log(`R002: ${r002.routeName} (${r002.waypoints.length} waypoints)\n`)

  // Find fleet vehicles — exclude any already assigned to school routes
  const schoolRouteIds = (await Route.find({ routeType: 'school' }).select('_id').lean())
    .map(r => r._id)

  const vehicles = await Vehicle.find({
    assignedRoute: { $nin: schoolRouteIds },
  }).select('_id plateNumber vehicleModel').lean()

  if (!vehicles.length) throw new Error('No fleet vehicles found in database')
  console.log(`Found ${vehicles.length} fleet vehicles`)

  // Split vehicles evenly: first half → R001, second half → R002
  const half    = Math.ceil(vehicles.length / 2)
  const r001Veh = vehicles.slice(0, half)
  const r002Veh = vehicles.slice(half)

  async function assignVehicles(route, vehicleList) {
    const total = route.waypoints.length
    const step  = vehicleList.length > 1 ? Math.floor(total / vehicleList.length) : 0

    for (let i = 0; i < vehicleList.length; i++) {
      const v           = vehicleList[i]
      const waypointIdx = i * step

      await Vehicle.findByIdAndUpdate(v._id, {
        assignedRoute:           route._id,
        'simState.waypointIdx':   waypointIdx,
        'simState.direction':     1,
        'simState.layoverUntil':  null,
        'simState.currentTripId': null,
        'simState.dataSource':    'simulator',
      })
      console.log(`  ${v.plateNumber} → ${route.routeName} (waypoint ${waypointIdx}/${total})`)
    }

    // Set Route.assignedVehicles to this list
    await Route.findByIdAndUpdate(route._id, {
      assignedVehicles: vehicleList.map(v => v._id),
    })
  }

  console.log(`\nAssigning ${r001Veh.length} vehicles to ${r001.routeName}:`)
  await assignVehicles(r001, r001Veh)

  console.log(`\nAssigning ${r002Veh.length} vehicles to ${r002.routeName}:`)
  await assignVehicles(r002, r002Veh)

  await mongoose.disconnect()
  console.log('\nDone. Restart the backend server for the simulator to pick up the changes.')
}

patch().catch(err => { console.error(err); process.exit(1) })
