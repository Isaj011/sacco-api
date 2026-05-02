require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const School = require('../models/School');
const User = require('../models/User');
const SchoolVehicle = require('../models/SchoolVehicle');
const SchoolDriver = require('../models/SchoolDriver');
const SchoolRoute = require('../models/SchoolRoute');
const SchoolStudent = require('../models/SchoolStudent');
const Parent = require('../models/Parent');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Route = require('../models/Route');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');

// Seed data configuration
const seedConfig = {
    schools: 5,
    vehiclesPerSchool: 3,
    driversPerSchool: 4,
    routesPerSchool: 4,
    studentsPerSchool: 25,
    parentsPerStudent: 2,
    coursesPerSchool: 3,
    incidentsPerSchool: 2,
    alertsPerSchool: 5
};

// Helper functions
const generateRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const generateRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const generateRandomBoolean = () => Math.random() > 0.5;
const generateRandomChoice = (array) => array[Math.floor(Math.random() * array.length)];

// Kenyan locations for realistic data
const kenyanLocations = [
    { city: 'Nairobi', coordinates: [-1.2921, 36.8219] },
    { city: 'Mombasa', coordinates: [-4.0435, 39.6682] },
    { city: 'Kisumu', coordinates: [-0.1022, 34.7617] },
    { city: 'Nakuru', coordinates: [-0.3031, 36.0639] },
    { city: 'Eldoret', coordinates: [0.5143, 35.2698] },
    { city: 'Thika', coordinates: [-1.0320, 37.0714] },
    { city: 'Kitale', coordinates: [1.0153, 35.0043] },
    { city: 'Garissa', coordinates: [-0.4528, 39.6460] },
    { city: 'Kakamega', coordinates: [0.2842, 34.7535] },
    { city: 'Nyeri', coordinates: [-0.4201, 36.9538] }
];

// Vehicle makes and models common in Kenya
const vehicleModels = [
    { make: 'Toyota', model: 'Hiace', type: 'bus', capacity: 25, fuel: 'diesel', transmission: 'manual' },
    { make: 'Toyota', model: 'Coaster', type: 'bus', capacity: 30, fuel: 'diesel', transmission: 'manual' },
    { make: 'Nissan', model: 'Civilian', type: 'bus', capacity: 25, fuel: 'diesel', transmission: 'manual' },
    { make: 'Isuzu', model: 'NPR', type: 'bus', capacity: 18, fuel: 'diesel', transmission: 'manual' },
    { make: 'Mitsubishi', model: 'Rosa', type: 'bus', capacity: 25, fuel: 'diesel', transmission: 'manual' },
    { make: 'Toyota', model: 'Land Cruiser', type: 'van', capacity: 8, fuel: 'diesel', transmission: 'automatic' },
    { make: 'Toyota', model: 'Hiace', type: 'minibus', capacity: 15, fuel: 'diesel', transmission: 'manual' }
];

// Kenyan first and last names
const kenyanFirstNames = ['John', 'Mary', 'Joseph', 'Grace', 'Peter', 'Susan', 'David', 'Sarah', 'Michael', 'Elizabeth', 'James', 'Faith', 'Samuel', 'Joyce', 'Daniel', 'Hannah', 'Robert', 'Rebecca', 'William', 'Rachel'];
const kenyanLastNames = ['Kamau', 'Wanjiru', 'Ochieng', 'Achieng', 'Mutua', 'Mwangi', 'Odhiambo', 'Akinyi', 'Kiplagat', 'Jepkosgei', 'Njoroge', 'Wairimu', 'Kirui', 'Chebet', 'Karanja', 'Njeri', 'Kiprop', 'Jepkemoi', 'Thiongo', 'Wanjiku'];

class DatabaseSeeder {
    constructor() {
        this.schools = [];
        this.users = [];
        this.vehicles = [];
        this.drivers = [];
        this.routes = [];
        this.students = [];
        this.parents = [];
        this.incidents = [];
        this.alerts = [];
    }

    async seedDatabase() {
        try {
            console.log('🌱 Starting database seeding...');

            await this.clearDatabase();
            await this.seedUsers();
            await this.seedSchools();
            await this.seedVehicles();
            await this.seedDrivers();
            await this.seedSchoolRoutes();
            await this.seedStudents();
            await this.seedParents();
            await this.seedRoutes();
            await this.seedIncidents();
            await this.seedAlerts();
            await this.seedRegularVehiclesAndDrivers();
            // await this.seedRegularCourses();

            console.log('✅ Database seeding completed successfully!');
            this.printSummary();

        } catch (error) {
            console.error('❌ Error seeding database:', error);
            throw error;
        }
    }

    async clearDatabase() {
        console.log('🧹 Clearing existing data...');

        const models = [
            Alert, Incident, SchoolStudent, Parent, SchoolRoute,
            SchoolDriver, SchoolVehicle, Route, Driver, Vehicle,
            User, School
        ];

        for (const model of models) {
            await model.deleteMany({});
        }

        console.log('✅ Database cleared');
    }

    async seedUsers() {
        console.log('👥 Seeding users...');

        // Admin user
        const admin = await User.create({
            name: 'System Administrator',
            email: 'admin@sacco.com',
            password: 'admin123',
            role: 'admin',
            isFirstLogin: false
        });
        this.users.push(admin);

        // NTSA Officers
        const ntsaRoles = ['ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'];
        const ntsaNames = [
            { name: 'James Kamau', email: 'j.kamau@ntsa.go.ke' },
            { name: 'Grace Wanjiru', email: 'g.wanjiru@ntsa.go.ke' },
            { name: 'Peter Ochieng', email: 'p.ochieng@ntsa.go.ke' }
        ];

        for (let i = 0; i < ntsaNames.length; i++) {
            const ntsaUser = await User.create({
                name: ntsaNames[i].name,
                email: ntsaNames[i].email,
                password: 'ntsa123',
                role: ntsaRoles[i],
                isFirstLogin: false
            });
            this.users.push(ntsaUser);
        }

        // School Staff users (will be created with schools)
        console.log('✅ Users seeded');
    }

    async seedSchools() {
        console.log('🏫 Seeding schools...');

        const schoolData = [
            {
                name: 'Nairobi Primary School',
                code: 'NPS001',
                type: 'primary',
                ownership: 'private',
                address: {
                    street: '123 Nairobi Road',
                    city: 'Nairobi',
                    state: 'Nairobi County',
                    postalCode: '00100',
                    country: 'Kenya',
                    coordinates: {
                        type: 'Point',
                        coordinates: [-1.2921, 36.8219]
                    }
                },
                contacts: [
                    {
                        name: 'Main Office',
                        email: 'info@nairobi-primary.edu',
                        phone: '+254-712-345-678',
                        designation: 'Administration'
                    }
                ],
                principal: {
                    name: 'Dr. James Kamau',
                    email: 'principal@nairobi-primary.edu',
                    phone: '+254-712-345-679'
                },
                academicYear: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31')
                },
                settings: {
                    timezone: 'Africa/Nairobi',
                    language: 'en',
                    currency: 'KES'
                }
            },
            {
                name: 'Mombasa Academy',
                code: 'MAS002',
                type: 'primary',
                ownership: 'private',
                address: {
                    street: '456 Diani Road',
                    city: 'Mombasa',
                    state: 'Mombasa County',
                    postalCode: '80100',
                    country: 'Kenya',
                    coordinates: {
                        type: 'Point',
                        coordinates: [-4.0435, 39.6682]
                    }
                },
                contacts: [
                    {
                        name: 'Main Office',
                        email: 'info@mombasa-academy.edu',
                        phone: '+254-712-345-680',
                        designation: 'Administration'
                    }
                ],
                principal: {
                    name: 'Mrs. Grace Wanjiru',
                    email: 'principal@mombasa-academy.edu',
                    phone: '+254-712-345-681'
                },
                academicYear: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31')
                },
                settings: {
                    timezone: 'Africa/Nairobi',
                    language: 'en',
                    currency: 'KES'
                }
            },
            {
                name: 'Kisumu International School',
                code: 'KIS003',
                type: 'international',
                ownership: 'private',
                address: {
                    street: '789 Kisumu Highway',
                    city: 'Kisumu',
                    state: 'Kisumu County',
                    postalCode: '40100',
                    country: 'Kenya',
                    coordinates: {
                        type: 'Point',
                        coordinates: [-0.1022, 34.7617]
                    }
                },
                contacts: [
                    {
                        name: 'Main Office',
                        email: 'info@kisumu-intl.edu',
                        phone: '+254-712-345-682',
                        designation: 'Administration'
                    }
                ],
                principal: {
                    name: 'Mr. Peter Ochieng',
                    email: 'principal@kisumu-intl.edu',
                    phone: '+254-712-345-683'
                },
                academicYear: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31')
                },
                settings: {
                    timezone: 'Africa/Nairobi',
                    language: 'en',
                    currency: 'KES'
                }
            },
            {
                name: 'Nakuru Heights Academy',
                code: 'NHA004',
                type: 'primary',
                ownership: 'private',
                address: {
                    street: '321 Nakuru Road',
                    city: 'Nakuru',
                    state: 'Nakuru County',
                    postalCode: '20100',
                    country: 'Kenya',
                    coordinates: {
                        type: 'Point',
                        coordinates: [-0.3031, 36.0639]
                    }
                },
                contacts: [
                    {
                        name: 'Main Office',
                        email: 'info@nakuru-heights.edu',
                        phone: '+254-712-345-684',
                        designation: 'Administration'
                    }
                ],
                principal: {
                    name: 'Mrs. Sarah Kimani',
                    email: 'principal@nakuru-heights.edu',
                    phone: '+254-712-345-685'
                },
                academicYear: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31')
                },
                settings: {
                    timezone: 'Africa/Nairobi',
                    language: 'en',
                    currency: 'KES'
                }
            },
            {
                name: 'Eldoret Elite School',
                code: 'EES005',
                type: 'primary',
                ownership: 'private',
                address: {
                    street: '654 Eldoret Highway',
                    city: 'Eldoret',
                    state: 'Uasin Gishu County',
                    postalCode: '30100',
                    country: 'Kenya',
                    coordinates: {
                        type: 'Point',
                        coordinates: [0.5143, 35.2698]
                    }
                },
                contacts: [
                    {
                        name: 'Main Office',
                        email: 'info@eldoret-elite.edu',
                        phone: '+254-712-345-686',
                        designation: 'Administration'
                    }
                ],
                principal: {
                    name: 'Dr. Michael Kiprop',
                    email: 'principal@eldoret-elite.edu',
                    phone: '+254-712-345-687'
                },
                academicYear: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31')
                },
                settings: {
                    timezone: 'Africa/Nairobi',
                    language: 'en',
                    currency: 'KES'
                }
            }
        ];

        for (let i = 0; i < seedConfig.schools; i++) {
            const schoolDataItem = schoolData[i];

            // Create staff user for school
            const staffUser = await User.create({
                name: `${schoolDataItem.name} Staff`,
                email: `staff@${schoolDataItem.code.toLowerCase()}.edu`,
                password: 'staff123',
                role: 'staff',
                isFirstLogin: false
            });

            const school = await School.create({
                ...schoolDataItem,
                user: staffUser._id
            });

            this.schools.push(school);
            this.users.push(staffUser);
        }

        console.log('✅ Schools seeded');
    }

    async seedVehicles() {
        console.log('🚌 Seeding school vehicles...');

        let regCounter = 100;

        for (const school of this.schools) {
            for (let i = 0; i < seedConfig.vehiclesPerSchool; i++) {
                const vehicleModel = generateRandomChoice(vehicleModels);
                const registrationNumber = `KAB${String(regCounter).padStart(3, '0')}${String.fromCharCode(65 + i)}`;
                regCounter++;

                const vehicle = await SchoolVehicle.create({
                    school: school._id,
                    registrationNumber,
                    make: vehicleModel.make,
                    model: vehicleModel.model,
                    year: generateRandomNumber(2018, 2023),
                    color: generateRandomChoice(['White', 'Blue', 'Yellow', 'Green', 'Red']),
                    vehicleType: vehicleModel.type,
                    capacity: {
                        students: vehicleModel.capacity,
                        seats: vehicleModel.capacity + 5
                    },
                    fuelType: vehicleModel.fuel,
                    transmission: vehicleModel.transmission,
                    owner: {
                        type: 'school',
                        name: school.name,
                        contactPerson: 'Transport Manager',
                        phone: '+254-712-345-678',
                        email: `transport@${school.code.toLowerCase()}.edu`,
                        address: school.address.street
                    },
                    registration: {
                        number: registrationNumber,
                        authority: 'NTSA',
                        issueDate: generateRandomDate(new Date(2020, 0, 1), new Date(2023, 0, 1)),
                        expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2025, 6, 1))
                    },
                    insurance: {
                        provider: 'Jubilee Insurance',
                        policyNumber: `POL${generateRandomNumber(100000, 999999)}`,
                        type: 'comprehensive',
                        startDate: generateRandomDate(new Date(2023, 0, 1), new Date(2024, 0, 1)),
                        expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2025, 6, 1)),
                        premiumAmount: generateRandomNumber(50000, 100000)
                    },
                    safety: {
                        gpsEnabled: generateRandomBoolean(),
                        speedGovernor: generateRandomBoolean(),
                        firstAidKit: true,
                        fireExtinguisher: true,
                        emergencyExit: true,
                        seatBelts: true,
                        cctv: generateRandomBoolean(),
                        panicButton: generateRandomBoolean(),
                        inspectionStatus: generateRandomChoice(['passed', 'pending', 'failed']),
                        lastInspectionDate: generateRandomDate(new Date(2023, 0, 1), new Date(2024, 0, 1))
                    },
                    maintenance: {
                        lastService: generateRandomDate(new Date(2023, 6, 1), new Date(2024, 0, 1)),
                        nextService: generateRandomDate(new Date(2024, 0, 1), new Date(2024, 6, 1)),
                        mileage: generateRandomNumber(10000, 50000),
                        serviceInterval: 10000
                    },
                    currentLocation: {
                        coordinates: school.address.coordinates.coordinates,
                        lastUpdated: new Date()
                    },
                    status: generateRandomChoice(['active', 'maintenance', 'inactive'])
                });

                this.vehicles.push(vehicle);
            }
        }

        console.log('✅ School vehicles seeded');
    }

    async seedDrivers() {
        console.log('👨‍✈️ Seeding school drivers...');

        for (const school of this.schools) {
            for (let i = 0; i < seedConfig.driversPerSchool; i++) {
                const firstName = generateRandomChoice(kenyanFirstNames);
                const lastName = generateRandomChoice(kenyanLastNames);
                const driverId = `${school.code}DRV${String(i + 1).padStart(3, '0')}`;

                const driver = await SchoolDriver.create({
                    school: school._id,
                    driverId,
                    firstName,
                    lastName,
                    dateOfBirth: generateRandomDate(new Date(1970, 0, 1), new Date(1990, 0, 1)),
                    gender: generateRandomChoice(['male', 'female']),
                    contact: {
                        phone: `+254-7${generateRandomNumber(10, 99)}-${generateRandomNumber(100, 999)}-${generateRandomNumber(100, 999)}`,
                        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${school.code.toLowerCase()}.edu`
                    },
                    address: {
                        street: `${generateRandomNumber(100, 999)} ${generateRandomChoice(kenyanLocations).city} Street`,
                        city: generateRandomChoice(kenyanLocations).city,
                        state: `${generateRandomChoice(kenyanLocations).city} County`,
                        postalCode: generateRandomNumber(10000, 99999).toString(),
                        country: 'Kenya',
                        coordinates: {
                            type: 'Point',
                            coordinates: [
                                generateRandomChoice(kenyanLocations).coordinates[0] + (Math.random() - 0.5) * 0.1,
                                generateRandomChoice(kenyanLocations).coordinates[1] + (Math.random() - 0.5) * 0.1
                            ]
                        }
                    },
                    license: {
                        number: `DL${generateRandomNumber(100000, 999999)}`,
                        type: generateRandomChoice(['A', 'B', 'C', 'D', 'E']),
                        issueDate: generateRandomDate(new Date(2015, 0, 1), new Date(2020, 0, 1)),
                        expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2026, 0, 1))
                    },
                    employment: {
                        employeeId: driverId,
                        position: 'School Bus Driver',
                        hireDate: generateRandomDate(new Date(2020, 0, 1), new Date(2023, 0, 1)),
                        salary: generateRandomNumber(25000, 45000),
                        contractType: 'permanent'
                    },
                    medical: {
                        bloodPressure: '120/80',
                        vision: '20/20',
                        medicalConditions: [],
                        allergies: [],
                        lastCheckup: generateRandomDate(new Date(2023, 6, 1), new Date(2024, 0, 1)),
                        nextCheckup: generateRandomDate(new Date(2024, 0, 1), new Date(2024, 6, 1))
                    },
                    training: [
                        {
                            name: 'Defensive Driving',
                            type: 'defensive_driving',
                            issueDate: generateRandomDate(new Date(2023, 0, 1), new Date(2024, 0, 1)),
                            expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2025, 0, 1)),
                            certificateNumber: `DD${generateRandomNumber(100000, 999999)}`
                        },
                        {
                            name: 'First Aid Training',
                            type: 'first_aid',
                            issueDate: generateRandomDate(new Date(2023, 0, 1), new Date(2024, 0, 1)),
                            expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2025, 0, 1)),
                            certificateNumber: `FA${generateRandomNumber(100000, 999999)}`
                        }
                    ],
                    status: 'active'
                });

                this.drivers.push(driver);
            }
        }

        console.log('✅ School drivers seeded');
    }

    async seedSchoolRoutes() {
        console.log('🛣️ Seeding school routes...');

        for (const school of this.schools) {
            for (let i = 0; i < seedConfig.routesPerSchool; i++) {
                const routeId = `${school.code}RTE${String(i + 1).padStart(2, '0')}`;
                const routeName = `${generateRandomChoice(kenyanLocations).city} Route ${i + 1}`;

                const route = await SchoolRoute.create({
                    school: school._id,
                    routeId,
                    name: routeName,
                    description: `Route ${i + 1} serving ${generateRandomChoice(kenyanLocations).city} area`,
                    type: generateRandomChoice(['morning', 'afternoon']),
                    distance: generateRandomNumber(10, 50),
                    duration: generateRandomNumber(20, 60),
                    capacity: generateRandomNumber(30, 60),
                    currentOccupancy: generateRandomNumber(0, 40),
                    status: 'active',
                    stops: this.generateRouteStops(school.address, generateRandomNumber(5, 8)),
                    schedule: [
                        {
                            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                            startTime: '07:00',
                            endTime: '08:30',
                            isActive: true
                        },
                        {
                            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                            startTime: '15:30',
                            endTime: '17:00',
                            isActive: true
                        }
                    ]
                });

                this.routes.push(route);
            }
        }

        console.log('✅ School routes seeded');
    }

    generateRouteStops(schoolLocation, stopCount) {
        const stops = [];

        // Add school as first stop
        stops.push({
            name: `${schoolLocation.city} Central School`,
            address: schoolLocation.street,
            type: 'dropoff',
            sequence: 1,
            location: {
                type: 'Point',
                coordinates: schoolLocation.coordinates.coordinates
            },
            estimatedTime: 0,
            arrivalTime: '07:45',
            departureTime: '15:30'
        });

        // Add pickup stops with valid time calculations
        for (let i = 1; i < stopCount && i <= 8; i++) { // Limit to 8 stops to avoid time overflow
            const location = generateRandomChoice(kenyanLocations);
            const arrivalMinutes = Math.min(45 + i * 2, 59); // Ensure minutes don't exceed 59
            const departureMinutes = Math.max(30 - i * 2, 0); // Ensure minutes don't go below 0

            stops.push({
                name: `${location.city} Pickup Point ${i}`,
                address: `${generateRandomNumber(100, 999)} ${location.city} Street`,
                type: 'pickup',
                sequence: i + 1,
                location: {
                    type: 'Point',
                    coordinates: [
                        location.coordinates[0] + (Math.random() - 0.5) * 0.1,
                        location.coordinates[1] + (Math.random() - 0.5) * 0.1
                    ]
                },
                estimatedTime: i * 2,
                arrivalTime: `07:${String(arrivalMinutes).padStart(2, '0')}`,
                departureTime: `15:${String(departureMinutes).padStart(2, '0')}`
            });
        }

        return stops;
    }

    generateWaypoints(schoolLocation, waypointCount) {
        const waypoints = [];

        for (let i = 0; i < waypointCount; i++) {
            const location = generateRandomChoice(kenyanLocations);
            waypoints.push({
                name: `Waypoint ${i + 1}`,
                coordinates: [
                    location.coordinates[0] + (Math.random() - 0.5) * 0.05,
                    location.coordinates[1] + (Math.random() - 0.5) * 0.05
                ],
                estimatedTime: `${generateRandomNumber(2, 10)} min`
            });
        }

        return waypoints;
    }

    async seedStudents() {
        console.log('👨‍🎓 Seeding students...');

        for (const school of this.schools) {
            for (let i = 0; i < seedConfig.studentsPerSchool; i++) {
                const firstName = generateRandomChoice(kenyanFirstNames);
                const lastName = generateRandomChoice(kenyanLastNames);
                const studentId = `${school.code}STU${String(i + 1).padStart(3, '0')}`;
                const admissionNumber = `ADM${school.code}${String(i + 1).padStart(4, '0')}`;

                const student = await SchoolStudent.create({
                    school: school._id,
                    studentId,
                    admissionNumber,
                    firstName,
                    lastName,
                    dateOfBirth: generateRandomDate(new Date(2010, 0, 1), new Date(2018, 0, 1)),
                    gender: generateRandomChoice(['male', 'female']),
                    grade: `Grade ${generateRandomNumber(1, 8)}`,
                    academicYear: '2024',
                    address: {
                        street: `${generateRandomNumber(100, 999)} ${generateRandomChoice(kenyanLocations).city} Street`,
                        city: generateRandomChoice(kenyanLocations).city,
                        state: `${generateRandomChoice(kenyanLocations).city} County`,
                        postalCode: generateRandomNumber(10000, 99999).toString(),
                        country: 'Kenya',
                        coordinates: {
                            type: 'Point',
                            coordinates: [
                                generateRandomChoice(kenyanLocations).coordinates[0] + (Math.random() - 0.5) * 0.1,
                                generateRandomChoice(kenyanLocations).coordinates[1] + (Math.random() - 0.5) * 0.1
                            ]
                        }
                    },
                    transportation: null,
                    medical: {
                        bloodGroup: generateRandomChoice(['A+', 'A-', 'B+', 'B-', 'O+', 'O-']),
                        allergies: [],
                        medicalConditions: [],
                        emergencyContact: {
                            name: 'Emergency Contact',
                            phone: `+254-7${generateRandomNumber(10, 99)}-${generateRandomNumber(100, 999)}-${generateRandomNumber(100, 999)}`
                        }
                    },
                    status: 'active'
                });

                this.students.push(student);
            }
        }

        console.log('✅ Students seeded');
    }

    async seedParents() {
        console.log('👨‍👩‍👧‍👦 Seeding parents...');

        let parentEmailCounter = 1000;

        for (const student of this.students) {
            for (let i = 0; i < seedConfig.parentsPerStudent; i++) {
                const firstName = generateRandomChoice(kenyanFirstNames);
                const lastName = generateRandomChoice(kenyanLastNames);
                const relation = i === 0 ? 'father' : 'mother';

                // Create parent user
                const parentEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${parentEmailCounter}@parent.com`;
                parentEmailCounter++;

                const parentUser = await User.create({
                    name: `${firstName} ${lastName}`,
                    email: parentEmail,
                    password: 'parent123',
                    role: 'parent',
                    isFirstLogin: false
                });

                const parent = await Parent.create({
                    school: student.school,
                    firstName,
                    lastName,
                    contact: {
                        phone: `+254-7${generateRandomNumber(10, 99)}-${generateRandomNumber(100, 999)}-${generateRandomNumber(100, 999)}`,
                        email: parentEmail,
                        address: `${generateRandomNumber(100, 999)} Parent Street, ${generateRandomChoice(kenyanLocations).city}`
                    },
                    email: parentEmail,
                    phone: `+254-7${generateRandomNumber(10, 99)}-${generateRandomNumber(100, 999)}-${generateRandomNumber(100, 999)}`,
                    address: `${generateRandomNumber(100, 999)} Parent Street`,
                    city: generateRandomChoice(kenyanLocations).city,
                    state: `${generateRandomChoice(kenyanLocations).city} County`,
                    postalCode: generateRandomNumber(10000, 99999).toString(),
                    country: 'Kenya',
                    children: [{
                        student: student._id,
                        relationship: relation
                    }],
                    notificationPreferences: {
                        sms: true,
                        email: true,
                        push: true
                    }
                });

                // Update student with parent reference
                await SchoolStudent.findByIdAndUpdate(student._id, {
                    $push: { parents: { parent: parent._id, relation } }
                });

                this.parents.push(parent);
                this.users.push(parentUser);
            }
        }

        console.log('✅ Parents seeded');
    }

    async seedRoutes() {
        console.log('🚌 Seeding courses...');

        let routeCounter = 1000;

        for (const school of this.schools) {
            for (let i = 0; i < seedConfig.coursesPerSchool; i++) {
                const routeNumber = `R${String(routeCounter).padStart(3, '0')}`;
                routeCounter++;
                const routeName = `${school.name} - ${generateRandomChoice(kenyanLocations).city} Route`;

                const course = await Route.create({
                    routeName,
                    routeNumber,
                    description: `Course connecting ${school.name} to ${generateRandomChoice(kenyanLocations).city}`,
                    totalDistance: generateRandomNumber(15, 45),
                    estimatedDuration: `${generateRandomNumber(30, 90)} minutes`,
                    maxCapacity: generateRandomNumber(40, 60),
                    currentPassengers: generateRandomNumber(0, 45),
                    status: 'Active',
                    assignedVehicles: this.getRandomVehiclesForSchool(school._id, 2),
                    totalPassengersFerried: generateRandomNumber(1000, 5000),
                    user: generateRandomChoice(this.users.filter(u => u.role === 'staff'))._id,
                    schedule: {
                        startTime: '07:00',
                        endTime: '16:30',
                        frequency: 30,
                        isActive: true
                    },
                    performance: {
                        averageSpeed: generateRandomNumber(40, 60),
                        onTimePercentage: generateRandomNumber(85, 98),
                        passengerSatisfaction: generateRandomNumber(3.5, 4.8),
                        totalTrips: generateRandomNumber(500, 1500)
                    }
                });

                this.routes.push(course);
            }
        }

        console.log('✅ Courses seeded');
    }

    getRandomVehiclesForSchool(schoolId, count) {
        const schoolVehicles = this.vehicles.filter(v => v.school.toString() === schoolId.toString());
        const selectedVehicles = [];

        for (let i = 0; i < Math.min(count, schoolVehicles.length); i++) {
            const randomVehicle = generateRandomChoice(schoolVehicles);
            if (!selectedVehicles.includes(randomVehicle._id)) {
                selectedVehicles.push(randomVehicle._id);
            }
        }

        return selectedVehicles;
    }

    async seedIncidents() {
        console.log('🚨 Seeding incidents...');

        const incidentTypes = ['accident', 'traffic_violation', 'speed_violation', 'route_deviation', 'harsh_braking', 'vehicle_breakdown', 'driver_violation', 'safety_incident', 'compliance_breach', 'other'];
        const severityLevels = ['low', 'medium', 'high', 'critical'];

        for (const school of this.schools) {
            for (let i = 0; i < seedConfig.incidentsPerSchool; i++) {
                const incident = await Incident.create({
                    school: school._id,
                    incidentType: generateRandomChoice(incidentTypes),
                    severity: generateRandomChoice(severityLevels),
                    status: generateRandomChoice(['reported', 'investigating', 'resolved', 'closed']),
                    location: {
                        latitude: school.address.coordinates.coordinates[1] + (Math.random() - 0.5) * 0.1,
                        longitude: school.address.coordinates.coordinates[0] + (Math.random() - 0.5) * 0.1,
                        address: `${generateRandomNumber(100, 999)} Incident Street, ${generateRandomChoice(kenyanLocations).city}`
                    },
                    timestamp: generateRandomDate(new Date(2024, 0, 1), new Date()),
                    vehicle: generateRandomChoice(this.vehicles.filter(v => v.school.toString() === school._id.toString()))._id,
                    driver: generateRandomChoice(this.drivers.filter(d => d.school.toString() === school._id.toString()))._id,
                    description: `Incident occurred during morning transport service`,
                    details: {
                        passengerCount: generateRandomNumber(0, 60),
                        injuries: generateRandomNumber(0, 3)
                    },
                    createdBy: generateRandomChoice(this.users.filter(u => u.role === 'staff'))._id
                });

                this.incidents.push(incident);
            }
        }

        console.log('✅ Incidents seeded');
    }

    async seedAlerts() {
        console.log('🔔 Seeding alerts...');

        const alertTypes = ['vehicle_breakdown', 'maintenance_due', 'insurance_expiry', 'route_deviation', 'speed_violation', 'license_expiry', 'psv_expiry', 'medical_expiry', 'safety_incident', 'compliance_breach', 'route_delay', 'schedule_conflict', 'capacity_overflow'];
        const severityLevels = ['critical', 'high', 'medium', 'low'];

        for (const school of this.schools) {
            for (let i = 0; i < seedConfig.alertsPerSchool; i++) {
                const alertType = generateRandomChoice(alertTypes);
                const entityType = generateRandomChoice(['vehicle', 'driver', 'system', 'financial', 'service']);

                let entityId;
                if (entityType === 'vehicle') {
                    entityId = generateRandomChoice(this.vehicles.filter(v => v.school.toString() === school._id.toString()))._id;
                } else if (entityType === 'driver') {
                    entityId = generateRandomChoice(this.drivers.filter(d => d.school.toString() === school._id.toString()))._id;
                } else {
                    entityId = generateRandomChoice(this.users)._id;
                }

                const alert = await Alert.create({
                    type: alertType,
                    severity: generateRandomChoice(severityLevels),
                    title: `${alertType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Alert`,
                    message: `Alert regarding ${alertType.replace(/_/g, ' ')} requires attention`,
                    entityId: entityId,
                    entityType: entityType,
                    status: generateRandomChoice(['active', 'acknowledged', 'resolved', 'dismissed'])
                });

                this.alerts.push(alert);
            }
        }

        console.log('✅ Alerts seeded');
    }

    async seedRegularVehiclesAndDrivers() {
        console.log('🚗 Seeding regular vehicles and drivers...');

        // Regular vehicles (non-school)
        for (let i = 0; i < 10; i++) {
            const vehicleModel = generateRandomChoice(vehicleModels);
            const plateNumber = `KBC${String(generateRandomNumber(100, 999)).padStart(3, '0')}${String.fromCharCode(65 + i)}`;

            const vehicle = await Vehicle.create({
                plateNumber,
                slug: plateNumber.toLowerCase().replace(/\s+/g, '-'),
                vehicleModel: `${vehicleModel.make} ${vehicleModel.model}`,
                vehicleCondition: generateRandomChoice(['Excellent', 'Good', 'Fair', 'Poor']),
                operationalStatus: generateRandomBoolean(),
                currentLocation: {
                    latitude: generateRandomChoice(kenyanLocations).coordinates[0],
                    longitude: generateRandomChoice(kenyanLocations).coordinates[1],
                    updatedAt: new Date()
                },
                currentDriver: null,
                currentAssignment: null,
                seatingCapacity: vehicleModel.capacity,
                assignedRoute: null,
                averageSpeed: generateRandomNumber(40, 80),
                estimatedArrivalTime: 'Not Available',
                status: generateRandomChoice(['available', 'in_use', 'maintenance', 'out_of_service']),
                totalPassengersFerried: generateRandomNumber(0, 10000),
                averageDailyIncome: generateRandomNumber(5000, 15000),
                totalIncome: generateRandomNumber(100000, 500000),
                totalTrips: generateRandomNumber(0, 1000),
                mileage: generateRandomNumber(0, 100000),
                lastMaintenance: generateRandomDate(new Date(2023, 0, 1), new Date(2024, 0, 1)),
                nextMaintenance: generateRandomDate(new Date(2024, 0, 1), new Date(2024, 6, 1)),
                fuelType: generateRandomChoice(['Petrol', 'Diesel', 'Electric', 'Hybrid']),
                insuranceExpiry: generateRandomDate(new Date(2024, 6, 1), new Date(2025, 0, 1)),
                user: generateRandomChoice(this.users.filter(u => u.role === 'admin'))._id
            });

            this.vehicles.push(vehicle);
        }

        // Regular drivers (non-school)
        for (let i = 0; i < 8; i++) {
            const firstName = generateRandomChoice(kenyanFirstNames);
            const lastName = generateRandomChoice(kenyanLastNames);

            const driver = await Driver.create({
                driverName: `${firstName} ${lastName}`,
                employeeId: `EMP${String(generateRandomNumber(1000, 9999))}`,
                nationalId: generateRandomNumber(10000000, 99999999).toString(),
                contactDetails: {
                    phone: `+254-7${generateRandomNumber(10, 99)}-${generateRandomNumber(100, 999)}-${generateRandomNumber(100, 999)}`,
                    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@driver.com`,
                    address: `${generateRandomNumber(100, 999)} Driver Street, ${generateRandomChoice(kenyanLocations).city}`
                },
                bloodType: generateRandomChoice(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
                medicalConditions: [],
                allergies: [],
                driverLicense: {
                    number: `DL${generateRandomNumber(100000, 999999)}`,
                    expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2026, 0, 1))
                },
                psvLicense: {
                    number: `PSV${generateRandomNumber(100000, 999999)}`,
                    expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2026, 0, 1))
                },
                medicalCertificate: {
                    expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2025, 0, 1))
                },
                policeClearance: {
                    certificateNumber: `PC${generateRandomNumber(100000, 999999)}`,
                    issueDate: generateRandomDate(new Date(2023, 0, 1), new Date(2024, 0, 1)),
                    expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2025, 0, 1))
                },
                trainingCertificates: [
                    {
                        certificateType: 'Defensive Driving',
                        issueDate: generateRandomDate(new Date(2023, 0, 1), new Date(2024, 0, 1)),
                        expiryDate: generateRandomDate(new Date(2024, 6, 1), new Date(2025, 0, 1))
                    }
                ],
                emergencyContacts: [
                    {
                        name: 'Emergency Contact',
                        relationship: 'Spouse',
                        phone: `+254-7${generateRandomNumber(10, 99)}-${generateRandomNumber(100, 999)}-${generateRandomNumber(100, 999)}`,
                        isPrimary: true
                    }
                ],
                status: 'active'
            });

            this.drivers.push(driver);
        }

        console.log('✅ Regular vehicles and drivers seeded');
    }

    async seedRegularCourses() {
        console.log('🛣️ Seeding regular courses...');

        for (let i = 0; i < 8; i++) {
            const routeNumber = `R${String(generateRandomNumber(100, 999)).padStart(3, '0')}`;
            const routeName = `${generateRandomChoice(kenyanLocations).city} to ${generateRandomChoice(kenyanLocations).city} Express`;

            const course = await Route.create({
                routeName,
                routeNumber,
                description: `Express route between cities`,
                totalDistance: generateRandomNumber(50, 200),
                estimatedDuration: `${generateRandomNumber(60, 180)} minutes`,
                maxCapacity: generateRandomNumber(40, 70),
                currentPassengers: generateRandomNumber(0, 60),
                status: 'Active',
                assignedVehicles: this.getRandomRegularVehicles(2),
                totalPassengersFerried: generateRandomNumber(5000, 20000),
                user: generateRandomChoice(this.users.filter(u => u.role === 'admin'))._id,
                schedule: {
                    startTime: '06:00',
                    endTime: '22:00',
                    frequency: 60,
                    isActive: true
                },
                performance: {
                    averageSpeed: generateRandomNumber(60, 100),
                    onTimePercentage: generateRandomNumber(80, 95),
                    passengerSatisfaction: generateRandomChoice([3.0, 3.5, 4.0, 4.5]),
                    totalTrips: generateRandomNumber(1000, 5000)
                }
            });

            this.routes.push(course);
        }

        console.log('✅ Regular courses seeded');
    }

    getRandomRegularVehicles(count) {
        const regularVehicles = this.vehicles.filter(v => !v.school); // Non-school vehicles
        const selectedVehicles = [];

        for (let i = 0; i < Math.min(count, regularVehicles.length); i++) {
            const randomVehicle = generateRandomChoice(regularVehicles);
            if (!selectedVehicles.includes(randomVehicle._id)) {
                selectedVehicles.push(randomVehicle._id);
            }
        }

        return selectedVehicles;
    }

    printSummary() {
        console.log('\n📊 Seeding Summary:');
        console.log('==================');
        console.log(`Schools: ${this.schools.length}`);
        console.log(`Users: ${this.users.length}`);
        console.log(`School Vehicles: ${this.vehicles.filter(v => v.school).length}`);
        console.log(`Regular Vehicles: ${this.vehicles.filter(v => !v.school).length}`);
        console.log(`School Drivers: ${this.drivers.filter(d => d.school).length}`);
        console.log(`Regular Drivers: ${this.drivers.filter(d => !d.school).length}`);
        console.log(`Routes: ${this.routes.length}`);
        console.log(`Students: ${this.students.length}`);
        console.log(`Parents: ${this.parents.length}`);
        console.log(`Incidents: ${this.incidents.length}`);
        console.log(`Alerts: ${this.alerts.length}`);

        console.log('\n🔑 Login Credentials:');
        console.log('==================');
        console.log('Admin: admin@sacco.com / admin123');
        console.log('NTSA Officer: j.kamau@ntsa.go.ke / ntsa123');
        console.log('NTSA Inspector: g.wanjiru@ntsa.go.ke / ntsa123');
        console.log('NTSA Analyst: p.ochieng@ntsa.go.ke / ntsa123');
        console.log('Staff: staff@[school-code].edu / staff123');
        console.log('Parent: [parent-email] / parent123');

        console.log('\n🚀 Ready for testing!');
    }
}

// Run the seeder
const runSeeder = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sacco_transport', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to database');

        const seeder = new DatabaseSeeder();
        await seeder.seedDatabase();

        process.exit(0);
    } catch (error) {
        console.error('❌ Error running seeder:', error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    runSeeder();
}

module.exports = DatabaseSeeder;
