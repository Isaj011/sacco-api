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
require('./models/LocationTrigger')
require('./models/VehicleLocationHistory')
const { createSampleTriggers } = require('./utils/sampleLocationTriggers')

// ── DB connect ────────────────────────────────────────────────────────────────
const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI)
  console.log(`MongoDB: ${conn.connection.host}`.cyan.underline)
}

// ── Destroy ───────────────────────────────────────────────────────────────────
const destroyData = async () => {
  try {
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
  } catch (err) {
    console.error('Error destroying data:'.red, err.message)
    process.exit(1)
  }
}

// ── Import ────────────────────────────────────────────────────────────────────
const importData = async () => {
  try {
    await connectDB()

    // ── 1. Users ──────────────────────────────────────────────────────────────
    const rawUsers = [
      { name: 'System Admin',     email: 'admin@sacco.com',        role: 'admin',          password: 'admin123' },
      { name: 'James Kamau',      email: 'j.kamau@ntsa.go.ke',     role: 'ntsa_officer',   password: 'ntsa123' },
      { name: 'Grace Wanjiru',    email: 'g.wanjiru@ntsa.go.ke',   role: 'ntsa_inspector', password: 'ntsa123' },
      { name: 'Peter Ochieng',    email: 'p.ochieng@ntsa.go.ke',   role: 'ntsa_analyst',   password: 'ntsa123' },
      { name: 'Staff NPS',        email: 'staff@nps.edu',          role: 'staff',          password: 'staff123' },
      { name: 'Staff EA',         email: 'staff@ea.edu',           role: 'staff',          password: 'staff123' },
      { name: 'Staff KIS',        email: 'staff@kis.edu',          role: 'staff',          password: 'staff123' },
      { name: 'Staff RJS',        email: 'staff@rjs.edu',          role: 'staff',          password: 'staff123' },
      { name: 'Staff DMP',        email: 'staff@dmp.edu',          role: 'staff',          password: 'staff123' },
      { name: 'John Mwangi',      email: 'j.mwangi@driver.com',    role: 'driver',         password: 'driver123' },
      { name: 'Samuel Otieno',    email: 's.otieno@driver.com',    role: 'driver',         password: 'driver123' },
      { name: 'David Njoroge',    email: 'd.njoroge@driver.com',   role: 'driver',         password: 'driver123' },
      { name: 'Patrick Kamande',  email: 'p.kamande@driver.com',   role: 'driver',         password: 'driver123' },
      { name: 'Charles Muriithi', email: 'c.muriithi@driver.com',  role: 'driver',         password: 'driver123' },
      { name: 'Joseph Kariuki',   email: 'j.kariuki@driver.com',   role: 'driver',         password: 'driver123' },
      { name: 'Francis Wambua',   email: 'f.wambua@driver.com',    role: 'driver',         password: 'driver123' },
      { name: 'Anthony Mutua',    email: 'a.mutua@driver.com',     role: 'driver',         password: 'driver123' },
    ]
    const users = await User.create(rawUsers)
    console.log(`Users created: ${users.length}`.green.inverse)

    const adminUser   = users[0]

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
        principal: { name: "Ms. Patricia Ndungu", email: 'principal@kis.edu', phone: '0700123020' },
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
    const routeData = [
      { routeName: 'CBD – Westlands (Route 46)',       routeNumber: '46',  desc: 'Kencom CBD to Westlands Stage',        dist: 6.2,  dur: '25 minutes' },
      { routeName: 'CBD – Eastleigh (Route 10)',       routeNumber: '10',  desc: 'Kencom CBD to Eastleigh Stage 6',       dist: 5.8,  dur: '30 minutes' },
      { routeName: 'CBD – Karen (Route 111)',           routeNumber: '111', desc: 'GPO CBD to Karen Shopping Centre',      dist: 18.5, dur: '50 minutes' },
      { routeName: 'Thika Rd – Roysambu (Route 45)',   routeNumber: '45',  desc: 'TRM Stage to Roysambu Stage',           dist: 8.1,  dur: '35 minutes' },
      { routeName: 'Ngong Rd – Dagoretti (Route 58)',  routeNumber: '58',  desc: 'Prestige Plaza to Dagoretti Corner',    dist: 9.4,  dur: '40 minutes' }
    ]
    const courses = await Course.create(routeData.map(r => ({
      routeName:         r.routeName,
      routeNumber:       r.routeNumber,
      description:       r.desc,
      totalDistance:     r.dist,
      estimatedDuration: r.dur,
      user:              adminUser._id,
      stops:             [],
      status:            'Active'
    })))
    console.log(`Courses created: ${courses.length}`.green.inverse)

    // ── 4. Sacco Drivers ──────────────────────────────────────────────────────
    const licExpiry = new Date('2027-06-30')
    const psvExpiry = new Date('2026-12-31')
    const driverData = [
      { driverName: 'John Mwangi',      nationalId: '12345001', lic: 'DL001NBI', psv: 'PSV001NBI', phone: '0712001001', email: 'j.mwangi@driver.com' },
      { driverName: 'Samuel Otieno',    nationalId: '12345002', lic: 'DL002NBI', psv: 'PSV002NBI', phone: '0712001002', email: 's.otieno@driver.com' },
      { driverName: 'David Njoroge',    nationalId: '12345003', lic: 'DL003NBI', psv: 'PSV003NBI', phone: '0712001003', email: 'd.njoroge@driver.com' },
      { driverName: 'Patrick Kamande',  nationalId: '12345004', lic: 'DL004NBI', psv: 'PSV004NBI', phone: '0712001004', email: 'p.kamande@driver.com' },
      { driverName: 'Charles Muriithi', nationalId: '12345005', lic: 'DL005NBI', psv: 'PSV005NBI', phone: '0712001005', email: 'c.muriithi@driver.com' },
      { driverName: 'Joseph Kariuki',   nationalId: '12345006', lic: 'DL006NBI', psv: 'PSV006NBI', phone: '0712001006', email: 'j.kariuki@driver.com' },
      { driverName: 'Francis Wambua',   nationalId: '12345007', lic: 'DL007NBI', psv: 'PSV007NBI', phone: '0712001007', email: 'f.wambua@driver.com' },
      { driverName: 'Anthony Mutua',    nationalId: '12345008', lic: 'DL008NBI', psv: 'PSV008NBI', phone: '0712001008', email: 'a.mutua@driver.com' },
    ]
    const drivers = await Driver.create(driverData.map(d => ({
      driverName:     d.driverName,
      nationalId:     d.nationalId,
      driverLicense:  { number: d.lic, expiryDate: licExpiry },
      psvLicense:     { number: d.psv, expiryDate: psvExpiry },
      contactDetails: { phone: d.phone, email: d.email },
      status:         'active'
    })))
    console.log(`Sacco Drivers created: ${drivers.length}`.green.inverse)

    // ── 5. Sacco Vehicles ─────────────────────────────────────────────────────
    const plates = ['KBZ 001A','KBZ 002B','KBZ 003C','KBZ 004D','KBZ 005E',
                    'KCX 101F','KCX 102G','KCX 103H','KDA 201J','KDA 202K']
    const saccoVehicles = await Vehicle.create(plates.map((plate, i) => ({
      plateNumber:          plate,
      vehicleModel:         i % 2 === 0 ? 'Toyota Hiace' : 'Nissan Matatu',
      vehicleCondition:     'Good',
      seatingCapacity:      14,
      assignedRoute:        courses[i % courses.length]._id,
      currentDriver:        drivers[i % drivers.length]._id,
      averageSpeed:         45,
      estimatedArrivalTime: '30 minutes',
      status:               'available',
      currentLocation:      { latitude: -1.2921, longitude: 36.8219 },
      user:                 adminUser._id
    })))
    console.log(`Sacco Vehicles created: ${saccoVehicles.length}`.green.inverse)

    // ── 6. School Vehicles (3 per school = 15) ────────────────────────────────
    const svPlates = [
      'KAA 001S','KAA 002S','KAA 003S',
      'KAB 001S','KAB 002S','KAB 003S',
      'KAC 001S','KAC 002S','KAC 003S',
      'KAD 001S','KAD 002S','KAD 003S',
      'KAE 001S','KAE 002S','KAE 003S'
    ]
    const schoolVehicles = await SchoolVehicle.create(svPlates.map((plate, i) => ({
      registrationNumber: plate,
      school:      schools[Math.floor(i / 3)]._id,
      make:        'Toyota',
      model:       'Coaster',
      year:        2020,
      color:       'Yellow',
      vehicleType: 'bus',
      capacity:    { students: 30, seats: 30 },
      fuelType:    'diesel',
      transmission:'manual',
      owner:       { type: 'school', name: schools[Math.floor(i / 3)].name },
      safety:      { gpsEnabled: true, speedGovernor: true, speedLimit: 80, firstAidKit: true, fireExtinguisher: true, emergencyExit: true, seatBelts: true },
      status:      'active'
    })))
    console.log(`School Vehicles created: ${schoolVehicles.length}`.green.inverse)

    // ── 7. School Drivers (10) ────────────────────────────────────────────────
    const sdFirstNames = ['Michael','Brian','George','Edwin','Victor','Newton','Dennis','Kelvin','Lawrence','Amos']
    const sdLastNames  = ['Odhiambo','Kiplagat','Njoroge','Gitau','Wekesa','Ruto','Cheruiyot','Tanui','Kosgei','Bett']
    const schoolCodes = schools.map(s => s.code)
    const schoolDrivers = await SchoolDriver.create(sdFirstNames.map((fn, i) => {
      const schoolIdx = i % schools.length
      const nthForSchool = Math.floor(i / schools.length) + 1
      return {
        driverId:    `DRV-${schoolCodes[schoolIdx]}-25-${String(nthForSchool).padStart(4, '0')}`,
        school:      schools[schoolIdx]._id,
        firstName:   fn,
        lastName:    sdLastNames[i],
        dateOfBirth: new Date('1985-03-15'),
        gender:      'male',
        contact: {
          phone: `07130${String(i + 1).padStart(5, '0')}`,
          email: `${fn.toLowerCase()}.${sdLastNames[i].toLowerCase()}@school.com`
        },
        address: { street: 'Nairobi CBD', city: 'Nairobi', state: 'Nairobi County', postalCode: '00100', coordinates: { type: 'Point', coordinates: [36.8219, -1.2921] } },
        license: {
          number:    `SDL${String(i + 1).padStart(3, '0')}NBI`,
          type:      'B',
          issueDate: new Date('2020-01-15'),
          expiryDate:new Date('2027-12-31')
        },
        status: 'active'
      }
    }))
    console.log(`School Drivers created: ${schoolDrivers.length}`.green.inverse)

    // ── 8. School Routes (2 per school = 10) ─────────────────────────────────
    const srData = [
      { name: 'Route A – Westlands to NPS',      school: 0, dist: 5.2, dur: 20, routeId: 'RT-NPS-25-0001' },
      { name: 'Route B – Parklands to NPS',      school: 0, dist: 3.8, dur: 15, routeId: 'RT-NPS-25-0002' },
      { name: 'Route C – Eastleigh North to EA', school: 1, dist: 4.1, dur: 18, routeId: 'RT-EA-25-0001'  },
      { name: 'Route D – Eastleigh South to EA', school: 1, dist: 3.5, dur: 14, routeId: 'RT-EA-25-0002'  },
      { name: 'Route E – Karen to KIS',          school: 2, dist: 7.2, dur: 30, routeId: 'RT-KIS-25-0001' },
      { name: 'Route F – Langata to KIS',        school: 2, dist: 6.8, dur: 28, routeId: 'RT-KIS-25-0002' },
      { name: 'Route G – Roysambu to RJS',       school: 3, dist: 4.5, dur: 22, routeId: 'RT-RJS-25-0001' },
      { name: 'Route H – Githurai to RJS',       school: 3, dist: 8.1, dur: 35, routeId: 'RT-RJS-25-0002' },
      { name: 'Route I – Dagoretti to DMP',      school: 4, dist: 3.9, dur: 16, routeId: 'RT-DMP-25-0001' },
      { name: 'Route J – Kawangware to DMP',     school: 4, dist: 5.5, dur: 24, routeId: 'RT-DMP-25-0002' }
    ]
    const schoolRoutes = await SchoolRoute.create(srData.map(r => ({
      routeId:     r.routeId,
      name:        r.name,
      school:      schools[r.school]._id,
      description: `${r.name} school transport route`,
      stops:       [],
      status:      'active',
      distance:    r.dist,
      duration:    r.dur
    })))
    console.log(`School Routes created: ${schoolRoutes.length}`.green.inverse)

    // ── 9. School Students (10 per school = 50) ───────────────────────────────
    const sFirstNames = ['Amara','Binti','Ciku','Diana','Esther','Fatouma','Grace','Hana','Ivy','Jasmine',
                         'Kevin','Liam','Moses','Noah','Oscar','Peter','Quinn','Ryan','Sam','Tom']
    const lastNames   = ['Mwangi','Otieno','Kamau','Okonkwo','Njoroge','Hassan','Wanjiku','Abubakar','Mutua','Kariuki']
    const students = await SchoolStudent.create(
      Array.from({ length: 50 }, (_, i) => ({
        studentId:       `${schools[Math.floor(i / 10)].code}25${String((i % 10) + 1).padStart(4, '0')}`,
        admissionNumber: `ADM-${schools[Math.floor(i / 10)].code}-26-${String((i % 10) + 1).padStart(4, '0')}`,
        school:          schools[Math.floor(i / 10)]._id,
        firstName:    sFirstNames[i % sFirstNames.length],
        lastName:     lastNames[i % lastNames.length],
        dateOfBirth:  new Date('2015-06-01'),
        gender:       i % 2 === 0 ? 'female' : 'male',
        grade:        `Grade ${(i % 8) + 1}`,
        academicYear: '2025',
        address: {
          street:     `${i + 1} School Lane`,
          city:       'Nairobi',
          state:      'Nairobi County',
          postalCode: '00100',
          coordinates: { type: 'Point', coordinates: [36.8219 + (i * 0.001), -1.2921 + (i * 0.001)] }
        },
        parents: [{
          relation:   'guardian',
          name:       `Guardian ${i + 1} ${lastNames[i % lastNames.length]}`,
          phone:      `0720${String(i + 1).padStart(6, '0')}`,
          isPrimary:  true,
          canPickup:  true
        }],
        transportation: {
          usesTransport: true,
          routeId: schoolRoutes[Math.floor(i / 5) % schoolRoutes.length]._id,
          pickupPoint: {
            name: `Stop ${i + 1}`,
            address: `${i + 1} School Lane, Nairobi`,
            coordinates: { type: 'Point', coordinates: [36.8219 + (i * 0.001), -1.2921 - (i * 0.001)] }
          },
          dropPoint: {
            name: 'School Gate',
            address: `${schools[Math.floor(i / 10)].name}, Nairobi`,
            coordinates: { type: 'Point', coordinates: [schools[Math.floor(i / 10)].address.coordinates.coordinates[0], schools[Math.floor(i / 10)].address.coordinates.coordinates[1]] }
          }
        },
        status: 'active'
      }))
    )
    console.log(`School Students created: ${students.length}`.green.inverse)

    // ── 10. Parents (1 per student = 50) ─────────────────────────────────────
    const parents = await Parent.create(
      students.map((s, i) => ({
        school:     s.school,
        firstName:  `Guardian${i + 1}`,
        lastName:   lastNames[i % lastNames.length],
        phone:      `0722${String(i + 1).padStart(6, '0')}`,
        email:      `parent${String(i + 1).padStart(3, '0')}@parent.com`,
        address:    'Nairobi',
        city:       'Nairobi',
        state:      'Nairobi County',
        postalCode: '00100',
        children:   [{ student: s._id, relationship: 'guardian', isPrimary: true }]
      }))
    )
    console.log(`Parents created: ${parents.length}`.green.inverse)

    // ── 11. Parent login accounts (50) ────────────────────────────────────────
    await User.create(
      students.map((s, i) => ({
        name:     `Parent of ${s.firstName}`,
        email:    `parent${String(i + 1).padStart(3, '0')}@parent.com`,
        role:     'parent',
        password: 'parent123'
      }))
    )
    console.log(`Parent user accounts created: 50`.green.inverse)

    // ── 12. Sample Alerts ─────────────────────────────────────────────────────
    await Alert.create([
      { type: 'speed_violation',     severity: 'high',     title: 'Speed Violation – KBZ 001A',      message: 'Vehicle recorded 95 km/h on Thika Road (limit: 80 km/h).',                                entityId: saccoVehicles[0]._id, entityType: 'vehicle', status: 'active',       metadata: { speed: 95, limit: 80 } },
      { type: 'capacity_overflow',   severity: 'high',     title: 'Overloading – KBZ 002B',           message: 'Vehicle has 18 passengers (capacity: 14).',                                               entityId: saccoVehicles[1]._id, entityType: 'vehicle', status: 'active',       metadata: { count: 18, capacity: 14 } },
      { type: 'insurance_expiry',    severity: 'critical', title: 'PSV Insurance Expiring',            message: 'PSV Insurance for KBZ 003C expires in 5 days.',                                           entityId: saccoVehicles[2]._id, entityType: 'vehicle', status: 'active' },
      { type: 'license_expiry',      severity: 'high',     title: 'PSV Badge Expiring – John Mwangi', message: 'PSV Badge expires in 10 days.',                                                            entityId: drivers[0]._id,       entityType: 'driver',  status: 'active' },
      { type: 'maintenance_due',     severity: 'medium',   title: 'NTSA Inspection Due – KBZ 004D',   message: 'Annual NTSA inspection is overdue by 15 days.',                                            entityId: saccoVehicles[3]._id, entityType: 'vehicle', status: 'active' },
      { type: 'compliance_breach',   severity: 'critical', title: 'Operating Hours Violation',         message: 'School vehicle KAA 001S was operating at 19:30 EAT (allowed: 06:00–18:00).',              entityId: schoolVehicles[0]._id,entityType: 'vehicle', status: 'active' },
      { type: 'revenue_target_missed',severity:'high',     title: 'Revenue Discrepancy – KBZ 005E',   message: 'Collected KES 1,400 vs reported KES 800. Variance: KES 600.',                              entityId: saccoVehicles[4]._id, entityType: 'vehicle', status: 'active' },
      { type: 'route_deviation',     severity: 'medium',   title: 'Route Deviation – KCX 101F',        message: 'Vehicle deviated 2.3 km from assigned Route 46.',                                         entityId: saccoVehicles[5]._id, entityType: 'vehicle', status: 'acknowledged' },
      { type: 'safety_incident',     severity: 'critical', title: 'Emergency – KAB 001S',              message: 'Panic button activated on school vehicle. Students on board.',                             entityId: schoolVehicles[3]._id,entityType: 'vehicle', status: 'active' },
      { type: 'maintenance_due',     severity: 'medium',   title: 'Speed Limiter Silent – KCX 102G',  message: 'Speed limiter has not transmitted to NTSA IRSMS for 72 hours.',                            entityId: saccoVehicles[6]._id, entityType: 'vehicle', status: 'active' }
    ])
    console.log(`Alerts created: 10`.green.inverse)

    // ── 13. ComplianceProfiles ────────────────────────────────────────────────
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

    // ── 14. Location Triggers ─────────────────────────────────────────────────
    try {
      const triggers = await createSampleTriggers(adminUser._id)
      console.log(`Location Triggers created: ${triggers ? triggers.length : 0}`.green.inverse)
    } catch (e) {
      console.log(`Location Triggers: skipped (${e.message})`.yellow)
    }

    console.log('\n=== SEED COMPLETE ==='.cyan.bold)
    console.log('Login credentials:'.yellow)
    console.log('  admin@sacco.com / admin123'.white)
    console.log('  j.kamau@ntsa.go.ke / ntsa123'.white)
    console.log('  staff@nps.edu / staff123  (also ea, kis, rjs, dmp)'.white)
    console.log('  j.mwangi@driver.com / driver123'.white)
    console.log('  parent001@parent.com / parent123'.white)
    process.exit(0)
  } catch (err) {
    console.error('Error importing data:'.red, err)
    process.exit(1)
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (process.argv[2] === '-i') {
  importData()
} else if (process.argv[2] === '-d') {
  destroyData()
} else {
  console.log('Usage: node seeder.js -i (import) | -d (destroy)')
  process.exit(1)
}
