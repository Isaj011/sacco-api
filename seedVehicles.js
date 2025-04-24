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
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 4500,
      averageSpeed: 65,
      currentLocation: "Nairobi CBD",
      driverName: "James Mwangi",
      estimatedArrivalTime: "1hr",
      fuelType: "Petrol",
      insuranceExpiry: new Date("2025-11-30"),
      lastMaintenance: new Date("2025-03-20"),
      nextMaintenance: new Date("2025-06-20"),
      mileage: 128000,
      seatingCapacity: 14,
      photo: "no-photo.jpg",
      totalIncome: 400000,
      totalPassengersFerried: 13000,
      totalTrips: 900,
      user: new ObjectId()
    },
    {
      plateNumber: "KDH 456B",
      slug: "kdh-456b",
      vehicleModel: "Nissan Caravan",
      vehicleCondition: "Fair",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 4200,
      averageSpeed: 60,
      currentLocation: "Thika Stage",
      driverName: "Samuel Kipkoech",
      estimatedArrivalTime: "45min",
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-12-15"),
      lastMaintenance: new Date("2025-03-10"),
      nextMaintenance: new Date("2025-06-10"),
      mileage: 140000,
      seatingCapacity: 14,
      photo: "no-photo.jpg",
      totalIncome: 350000,
      totalPassengersFerried: 12000,
      totalTrips: 870,
      user: new ObjectId()
    },
    {
      plateNumber: "KDJ 789C",
      slug: "kdj-789c",
      vehicleModel: "Isuzu NPR",
      vehicleCondition: "Excellent",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 5000,
      averageSpeed: 70,
      currentLocation: "Githurai",
      driverName: "Anne Wanjiru",
      estimatedArrivalTime: "30min",
      fuelType: "Diesel",
      insuranceExpiry: new Date("2026-01-01"),
      lastMaintenance: new Date("2025-04-01"),
      nextMaintenance: new Date("2025-07-01"),
      mileage: 90000,
      seatingCapacity: 33,
      photo: "no-photo.jpg",
      totalIncome: 500000,
      totalPassengersFerried: 15000,
      totalTrips: 1050,
      user: new ObjectId()
    },
    {
      plateNumber: "KDK 112D",
      slug: "kdk-112d",
      vehicleModel: "Toyota Coaster",
      vehicleCondition: "Good",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 4700,
      averageSpeed: 60,
      currentLocation: "Ruiru Bypass",
      driverName: "Peter Otieno",
      estimatedArrivalTime: "1hr 10min",
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-10-12"),
      lastMaintenance: new Date("2025-02-20"),
      nextMaintenance: new Date("2025-05-20"),
      mileage: 155000,
      seatingCapacity: 26,
      photo: "no-photo.jpg",
      totalIncome: 420000,
      totalPassengersFerried: 14000,
      totalTrips: 970,
      user: new ObjectId()
    },
    {
      plateNumber: "KDL 334E",
      slug: "kdl-334e",
      vehicleModel: "Ford Transit",
      vehicleCondition: "Fair",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 4100,
      averageSpeed: 58,
      currentLocation: "Garden City",
      driverName: "John Mugo",
      estimatedArrivalTime: "50min",
      fuelType: "Petrol",
      insuranceExpiry: new Date("2025-09-01"),
      lastMaintenance: new Date("2025-01-15"),
      nextMaintenance: new Date("2025-04-15"),
      mileage: 110000,
      seatingCapacity: 18,
      photo: "no-photo.jpg",
      totalIncome: 330000,
      totalPassengersFerried: 11000,
      totalTrips: 850,
      user: new ObjectId()
    },
    {
      plateNumber: "KDM 556F",
      slug: "kdm-556f",
      vehicleModel: "Mazda Bongo",
      vehicleCondition: "Good",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 3900,
      averageSpeed: 62,
      currentLocation: "Ngara",
      driverName: "Lilian Chebet",
      estimatedArrivalTime: "55min",
      fuelType: "Petrol",
      insuranceExpiry: new Date("2026-03-12"),
      lastMaintenance: new Date("2025-03-25"),
      nextMaintenance: new Date("2025-06-25"),
      mileage: 98000,
      seatingCapacity: 12,
      photo: "no-photo.jpg",
      totalIncome: 300000,
      totalPassengersFerried: 10000,
      totalTrips: 800,
      user: new ObjectId()
    },
    {
      plateNumber: "KDN 778G",
      slug: "kdn-778g",
      vehicleModel: "Hyundai County",
      vehicleCondition: "Excellent",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 4900,
      averageSpeed: 68,
      currentLocation: "Roasters Roundabout",
      driverName: "Francis Kariuki",
      estimatedArrivalTime: "40min",
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-08-30"),
      lastMaintenance: new Date("2025-02-28"),
      nextMaintenance: new Date("2025-05-28"),
      mileage: 102000,
      seatingCapacity: 29,
      photo: "no-photo.jpg",
      totalIncome: 370000,
      totalPassengersFerried: 12500,
      totalTrips: 890,
      user: new ObjectId()
    },
    {
      plateNumber: "KDP 999H",
      slug: "kdp-999h",
      vehicleModel: "Mercedes Sprinter",
      vehicleCondition: "Good",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 4800,
      averageSpeed: 67,
      currentLocation: "Kasarani",
      driverName: "Sarah Nduta",
      estimatedArrivalTime: "35min",
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-11-01"),
      lastMaintenance: new Date("2025-04-10"),
      nextMaintenance: new Date("2025-07-10"),
      mileage: 89000,
      seatingCapacity: 20,
      photo: "no-photo.jpg",
      totalIncome: 390000,
      totalPassengersFerried: 13200,
      totalTrips: 910,
      user: new ObjectId()
    },
    {
      plateNumber: "KDQ 100J",
      slug: "kdq-100j",
      vehicleModel: "Suzuki Every",
      vehicleCondition: "Fair",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 3600,
      averageSpeed: 55,
      currentLocation: "Muthaiga",
      driverName: "Moses Njuguna",
      estimatedArrivalTime: "65min",
      fuelType: "Petrol",
      insuranceExpiry: new Date("2025-07-20"),
      lastMaintenance: new Date("2025-03-01"),
      nextMaintenance: new Date("2025-06-01"),
      mileage: 112000,
      seatingCapacity: 11,
      photo: "no-photo.jpg",
      totalIncome: 310000,
      totalPassengersFerried: 9800,
      totalTrips: 840,
      user: new ObjectId()
    },
    {
      plateNumber: "KDR 202K",
      slug: "kdr-202k",
      vehicleModel: "Mitsubishi Rosa",
      vehicleCondition: "Good",
      operationalStatus: true,
      assignedRoute: "Nairobi - Thika",
      averageDailyIncome: 5100,
      averageSpeed: 70,
      currentLocation: "Roy Sambu",
      driverName: "Emily Achieng",
      estimatedArrivalTime: "50min",
      fuelType: "Diesel",
      insuranceExpiry: new Date("2025-06-15"),
      lastMaintenance: new Date("2025-03-18"),
      nextMaintenance: new Date("2025-06-18"),
      mileage: 135000,
      seatingCapacity: 30,
      photo: "no-photo.jpg",
      totalIncome: 455000,
      totalPassengersFerried: 14300,
      totalTrips: 920,
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
