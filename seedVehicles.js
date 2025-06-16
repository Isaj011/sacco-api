const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });

const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle'); // Adjust the path if needed

const ObjectId = mongoose.Types.ObjectId;


const sampleVehicles = [
    {
      plateNumber: "KDG 123A",
      slug: "kdg-123a",
      vehicleModel: "Toyota Hiace",
      vehicleCondition: "Good",
      operationalStatus: true,
      currentLocation: { latitude: -1.2921, longitude: 36.8219 }, // Nairobi CBD
      fuelType: "Petrol",
      insuranceExpiry: new Date("2025-11-30"),
      lastMaintenance: new Date("2025-03-20"),
      nextMaintenance: new Date("2025-06-20"),
      seatingCapacity: 14,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDH 456B",
      slug: "kdh-456b",
      vehicleModel: "Nissan Caravan",
      vehicleCondition: "Fair",
      operationalStatus: true,
      currentLocation: { latitude: -1.0333, longitude: 37.0693 }, // Thika Stage
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-12-15"),
      lastMaintenance: new Date("2025-03-10"),
      nextMaintenance: new Date("2025-06-10"),
      seatingCapacity: 14,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDJ 789C",
      slug: "kdj-789c",
      vehicleModel: "Isuzu NPR",
      vehicleCondition: "Excellent",
      operationalStatus: true,
      currentLocation: { latitude: -1.1833, longitude: 36.9333 }, // Githurai
      fuelType: "Diesel",
      insuranceExpiry: new Date("2026-01-01"),
      lastMaintenance: new Date("2025-04-01"),
      nextMaintenance: new Date("2025-07-01"),
      seatingCapacity: 33,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDK 112D",
      slug: "kdk-112d",
      vehicleModel: "Toyota Coaster",
      vehicleCondition: "Good",
      operationalStatus: true,
      currentLocation: { latitude: -1.1500, longitude: 36.9667 }, // Ruiru Bypass
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-10-12"),
      lastMaintenance: new Date("2025-02-20"),
      nextMaintenance: new Date("2025-05-20"),
      seatingCapacity: 26,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDL 334E",
      slug: "kdl-334e",
      vehicleModel: "Ford Transit",
      vehicleCondition: "Fair",
      operationalStatus: true,
      currentLocation: { latitude: -1.2211, longitude: 36.8867 }, // Garden City
      fuelType: "Petrol",
      insuranceExpiry: new Date("2025-09-01"),
      lastMaintenance: new Date("2025-01-15"),
      nextMaintenance: new Date("2025-04-15"),
      seatingCapacity: 18,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDM 556F",
      slug: "kdm-556f",
      vehicleModel: "Mazda Bongo",
      vehicleCondition: "Good",
      operationalStatus: true,
      currentLocation: { latitude: -1.2827, longitude: 36.8219 }, // Ngara
      fuelType: "Petrol",
      insuranceExpiry: new Date("2026-03-12"),
      lastMaintenance: new Date("2025-03-25"),
      nextMaintenance: new Date("2025-06-25"),
      seatingCapacity: 12,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDN 778G",
      slug: "kdn-778g",
      vehicleModel: "Hyundai County",
      vehicleCondition: "Excellent",
      operationalStatus: true,
      currentLocation: { latitude: -1.2345, longitude: 36.8901 }, // Roasters Roundabout
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-08-30"),
      lastMaintenance: new Date("2025-02-28"),
      nextMaintenance: new Date("2025-05-28"),
      seatingCapacity: 29,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDP 999H",
      slug: "kdp-999h",
      vehicleModel: "Mercedes Sprinter",
      vehicleCondition: "Good",
      operationalStatus: true,
      currentLocation: { latitude: -1.2500, longitude: 36.9000 }, // Kasarani
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-11-01"),
      lastMaintenance: new Date("2025-04-10"),
      nextMaintenance: new Date("2025-07-10"),
      seatingCapacity: 20,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDQ 100J",
      slug: "kdq-100j",
      vehicleModel: "Suzuki Every",
      vehicleCondition: "Fair",
      operationalStatus: true,
      currentLocation: { latitude: -1.2667, longitude: 36.8167 }, // Muthaiga
      fuelType: "Petrol",
      insuranceExpiry: new Date("2025-07-20"),
      lastMaintenance: new Date("2025-03-01"),
      nextMaintenance: new Date("2025-06-01"),
      seatingCapacity: 11,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    {
      plateNumber: "KDR 202K",
      slug: "kdr-202k",
      vehicleModel: "Mitsubishi Rosa",
      vehicleCondition: "Good",
      operationalStatus: true,
      currentLocation: { latitude: -1.2500, longitude: 36.9000 }, // Roy Sambu
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-06-15"),
      lastMaintenance: new Date("2025-03-18"),
      nextMaintenance: new Date("2025-06-18"),
      seatingCapacity: 30,
      photo: "no-photo.jpg",
      user: new ObjectId()
    },
    // Add 5 more below if you'd like (want me to complete the rest too?)
  ];
  

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }
};

const seedVehicles = async () => {
  try {
    await Vehicle.deleteMany(); // Optional: Clears old data
    await Vehicle.insertMany(sampleVehicles);
    console.log('✅ Vehicle data seeded');
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    mongoose.disconnect();
  }
};

(async () => {
  await connectDB();
  await seedVehicles();
})();
