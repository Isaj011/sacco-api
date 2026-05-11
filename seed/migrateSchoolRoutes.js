/**
 * migrateSchoolRoutes.js
 * Sets routeType='school' on any Route whose name matches school naming patterns
 * (seeded before the routeType field existed).
 *
 * Run: node seed/migrateSchoolRoutes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env') })
const mongoose = require('mongoose')
const Route    = require('../models/Route')

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected\n')

  const result = await Route.updateMany(
    {
      routeType: { $ne: 'school' },
      $or: [
        { routeName: /school/i },
        { routeName: /\s[-–]\s.+\sRoute$/i },
        { routeName: /morning route|afternoon route|pickup route|dropoff route/i },
      ],
    },
    { routeType: 'school' }
  )

  console.log(`Updated ${result.modifiedCount} routes → routeType: 'school'`)
  await mongoose.disconnect()
}

migrate().catch(err => { console.error(err); process.exit(1) })
