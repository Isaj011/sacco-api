const mongoose = require('mongoose');
require('dotenv').config({ path: './config/config.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sacco-api')
    .then(async () => {
        console.log('🔍 Checking database integrity...');

        const PassengerEvent = require('./models/PassengerEvent');

        // Count total events
        const totalCount = await PassengerEvent.countDocuments();
        console.log('📊 Total events in database:', totalCount);

        // Get last 3 events
        const recentEvents = await PassengerEvent.find()
            .sort({ receivedAt: -1 })
            .limit(3)
            .select('eventType tripId zoneId gps timestamp receivedAt deviceId');

        console.log('\n📋 Recent events:');
        recentEvents.forEach((event, index) => {
            console.log(`${index + 1}. ${event.eventType} - Trip: ${event.tripId} - ${event.receivedAt}`);
        });

        // Verify data integrity
        const testEvent = await PassengerEvent.findOne({ tripId: 'TRIP_001' });
        if (testEvent) {
            console.log('\n✅ Test event verification:');
            console.log('- Event Type matches:', testEvent.eventType === 'PASSENGER_SEATED');
            console.log('- GPS coordinates valid:', testEvent.gps.latitude && testEvent.gps.longitude);
            console.log('- Timestamp present:', !!testEvent.timestamp);
            console.log('- Raw data stored:', !!testEvent.rawData);
            console.log('- ReceivedAt timestamp present:', !!testEvent.receivedAt);
        }

        mongoose.connection.close();
        console.log('\n🎯 Database verification complete!');
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
    });
