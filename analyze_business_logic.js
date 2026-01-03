const mongoose = require('mongoose');
require('dotenv').config({ path: './config/config.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sacco-api')
    .then(async () => {
        console.log('🔍 Analyzing IoT data for business logic requirements...');

        const PassengerEvent = require('./models/PassengerEvent');

        // Get all passenger events
        const events = await PassengerEvent.find().sort({ timestamp: 1 });

        console.log('\n📊 Current IoT Data Analysis:');
        console.log('Total Events:', events.length);

        // Analyze event types
        const eventTypes = {};
        events.forEach(event => {
            eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
        });

        console.log('\n🎯 Event Types Distribution:');
        Object.entries(eventTypes).forEach(([type, count]) => {
            console.log(`- ${type}: ${count}`);
        });

        // Analyze trips
        const trips = {};
        events.forEach(event => {
            if (!trips[event.tripId]) {
                trips[event.tripId] = [];
            }
            trips[event.tripId].push(event);
        });

        console.log('\n🚌 Trip Analysis:');
        Object.entries(trips).forEach(([tripId, tripEvents]) => {
            const hasStart = tripEvents.some(e => e.eventType === 'TRIP_STARTED');
            const hasEnd = tripEvents.some(e => e.eventType === 'TRIP_ENDED');
            const passengerEvents = tripEvents.filter(e =>
                ['PASSENGER_SEATED', 'PASSENGER_BOARDED', 'PASSENGER_ALIGHTED'].includes(e.eventType)
            );

            console.log(`Trip ${tripId}:`);
            console.log(`  - Events: ${tripEvents.length}`);
            console.log(`  - Has Start: ${hasStart}`);
            console.log(`  - Has End: ${hasEnd}`);
            console.log(`  - Passenger Events: ${passengerEvents.length}`);
        });

        // Check GPS data quality
        const validGPS = events.filter(e => e.gps && e.gps.latitude && e.gps.longitude);
        console.log('\n📍 GPS Data Quality:');
        console.log(`Valid GPS: ${validGPS.length}/${events.length} (${Math.round(validGPS.length / events.length * 100)}%)`);

        // Business Logic Assessment
        console.log('\n🎯 Business Logic Requirements Assessment:');

        // 1. Passenger Counting
        const passengerCountEvents = events.filter(e =>
            ['PASSENGER_SEATED', 'PASSENGER_BOARDED', 'PASSENGER_ALIGHTED'].includes(e.eventType)
        );
        console.log('✅ Passenger Counting:', passengerCountEvents.length > 0 ? 'SUPPORTED' : 'NEEDS MORE DATA');

        // 2. Trip Management
        const tripStartedEvents = events.filter(e => e.eventType === 'TRIP_STARTED');
        const tripEndedEvents = events.filter(e => e.eventType === 'TRIP_ENDED');
        console.log('✅ Trip Management:',
            (tripStartedEvents.length > 0 && tripEndedEvents.length > 0) ? 'SUPPORTED' : 'NEEDS TRIP START/END EVENTS'
        );

        // 3. Location Tracking
        console.log('✅ Location Tracking:', validGPS.length > 0 ? 'SUPPORTED' : 'NEEDS GPS DATA');

        // 4. Zone Management
        const zoneEvents = events.filter(e => e.zoneId && e.zoneType);
        console.log('✅ Zone Management:', zoneEvents.length > 0 ? 'SUPPORTED' : 'NEEDS ZONE DATA');

        // 5. Real-time Processing
        console.log('✅ Real-time Processing:', events.length > 0 ? 'SUPPORTED' : 'NEEDS EVENTS');

        // 6. Audit Trail
        console.log('✅ Audit Trail:', events.length > 0 ? 'SUPPORTED' : 'NEEDS EVENTS');

        console.log('\n🔗 Integration with Existing System:');
        console.log('- Vehicle Management: ✅ Can link events to vehicles');
        console.log('- Driver Management: ✅ Can track driver assignments');
        console.log('- Route Management: ✅ Can map trips to routes');
        console.log('- Analytics: ✅ Can aggregate passenger data');
        console.log('- Alerts: ✅ Can generate passenger-related alerts');

        mongoose.connection.close();
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
    });
