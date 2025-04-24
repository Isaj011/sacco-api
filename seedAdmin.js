require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // adjust path if needed

const dotenv = require('dotenv')

// load env vars

dotenv.config({ path: './config/config.env' })


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    const existingUser = await User.findOne({ email: 'admin@gmail.com' });
    if (existingUser) {
      console.log('ℹ️ Admin user already exists');
    } else {
      const adminUser = await User.create({
        name: 'Admin',
        email: 'admin@gmail.com',
        password: '123456', // Will be hashed by pre-save hook
        role: 'admin',
      });
      console.log('✅ Admin user created:', adminUser.email);
    }
  } catch (err) {
    console.error('❌ Error seeding admin user:', err.message);
  } finally {
    mongoose.disconnect();
  }
};

(async () => {
  await connectDB();
  await seedAdmin();
})();
