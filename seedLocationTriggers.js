const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');
const { createSampleTriggers, getTriggerStats } = require('./utils/sampleLocationTriggers');

// Register all models to avoid MissingSchemaError
require('./models/Driver');
require('./models/Vehicle');
require('./models/Course');
require('./models/Stop');
require('./models/LocationTrigger');
require('./models/VehicleLocationHistory');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Connect to DB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

// Seed location triggers
const seedLocationTriggers = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting location trigger seeding...'.yellow);
    
    // Create sample triggers
    const createdTriggers = await createSampleTriggers();
    
    if (createdTriggers && createdTriggers.length > 0) {
      console.log(`✅ Successfully created ${createdTriggers.length} location triggers`.green);
    } else {
      console.log('ℹ️ No new triggers created (they may already exist)'.blue);
    }
    
    // Get trigger statistics
    const stats = await getTriggerStats();
    console.log('\n📊 Location Trigger Statistics:'.cyan);
    console.log(`Total Triggers: ${stats.total}`.white);
    console.log(`Active Triggers: ${stats.active}`.green);
    
    console.log('\nBy Type:'.yellow);
    stats.byType.forEach(type => {
      console.log(`  ${type._id}: ${type.count} total, ${type.activeCount} active`.white);
    });
    
    console.log('\nBy Vehicle:'.yellow);
    if (stats.byVehicle && stats.byVehicle.length > 0) {
      stats.byVehicle.forEach(vehicle => {
        console.log(`  ${vehicle._id}: ${vehicle.triggerCount} triggers, ${vehicle.activeTriggers} active`.white);
      });
    } else {
      console.log('  No vehicle-specific triggers found'.gray);
    }
    
    console.log('\n🎉 Location trigger seeding completed!'.green);
    console.log('\n💡 Next steps:'.cyan);
    console.log('  1. Start the background job service:'.white);
    console.log('     curl -X POST http://localhost:5000/api/v1/background-jobs/initialize'.gray);
    console.log('     curl -X POST http://localhost:5000/api/v1/background-jobs/start-simulation'.gray);
    console.log('  2. Monitor triggers:'.white);
    console.log('     curl http://localhost:5000/api/v1/background-jobs/simulation-status'.gray);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding location triggers:'.red, error);
    process.exit(1);
  }
};

// Run the seeder
seedLocationTriggers(); 