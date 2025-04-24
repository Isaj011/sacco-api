const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('./models/Course');

// Load environment variables
dotenv.config({ path: './config/config.env' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const ObjectId = mongoose.Types.ObjectId;


// Course data to seed
const sampleCourses = [
  {
    routeName: 'Thika Superhighway Express',
    totalDistance: 45,
    estimatedDuration: '1 hour',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Thika',
  },
  {
    routeName: 'Nairobi - Mombasa Highway',
    totalDistance: 488,
    estimatedDuration: '8 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Mombasa',
  },
  {
    routeName: 'Nairobi - Kisumu Road',
    totalDistance: 350,
    estimatedDuration: '6 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Kisumu',
  },
  {
    routeName: 'Nairobi - Nakuru Route',
    totalDistance: 160,
    estimatedDuration: '3 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Nakuru',
  },
  {
    routeName: 'Nairobi - Eldoret Express',
    totalDistance: 310,
    estimatedDuration: '5.5 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Eldoret',
  },
  {
    routeName: 'Nairobi - Meru Highway',
    totalDistance: 280,
    estimatedDuration: '4.5 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Meru',
  },
  {
    routeName: 'Nairobi - Nyeri Road',
    totalDistance: 150,
    estimatedDuration: '3 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Nyeri',
  },
  {
    routeName: 'Nairobi - Embu Route',
    totalDistance: 135,
    estimatedDuration: '2.5 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Embu',
  },
  {
    routeName: 'Nairobi - Machakos',
    totalDistance: 63,
    estimatedDuration: '1.5 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Machakos',
  },
  {
    routeName: 'Nairobi - Naivasha',
    totalDistance: 90,
    estimatedDuration: '2 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Naivasha',
  },
  {
    routeName: 'Nairobi - Garissa',
    totalDistance: 370,
    estimatedDuration: '7 hours',
    origin: 'Nairobi',
          user: new ObjectId()
,destination: 'Garissa',
  },
];

// Seed function
const seedRoutes = async () => {
  await connectDB();

  try {
    await Course.deleteMany();
    console.log('Old courses removed.');

    await Course.insertMany(sampleCourses);
    console.log('Courses seeded successfully.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    mongoose.connection.close();
  }
};

seedRoutes();
