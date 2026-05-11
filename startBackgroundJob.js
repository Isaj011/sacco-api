const dotenv = require('dotenv');
// Load environment variables
dotenv.config({ path: './config/config.env' });

// Register all models before using them
require('./models/Vehicle');
require('./models/Route');
require('./models/Stop');
require('./models/User');
require('./models/Driver');
require('./models/Fare');
require('./models/Schedule');
require('./models/Performance');
require('./models/VehicleLocationHistory');
require('./models/LocationTrigger');
require('./models/DriverAssignment');

const mongoose = require('mongoose');
const BackgroundJobService = require('./services/backgroundJobService');

async function main() {
  try {
    console.log('🌐 Connecting to MongoDB Cloud...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB Cloud!');

    const service = new BackgroundJobService();
    const initialized = await service.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize background job service.');
      process.exit(1);
    }
    service.startSimulationJob();
    console.log('🚀 Background job started. Vehicle locations will update every 30 seconds.');
    // Keep process alive
    process.stdin.resume();
  } catch (err) {
    console.error('❌ Error starting background job:', err);
    process.exit(1);
  }
}

main(); 