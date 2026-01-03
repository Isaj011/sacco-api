const mongoose = require('mongoose');
require('dotenv').config({ path: './config/config.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sacco-api')
    .then(async () => {
        console.log('🔍 Checking MongoDB connection and collections...');

        // Get database info
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log('\n📁 Available collections:');
        collections.forEach(collection => {
            console.log(`- ${collection.name}`);
        });

        // Check if PassengerEvent collection exists
        const passengerEventCollection = collections.find(c => c.name === 'passengerevents');
        if (passengerEventCollection) {
            console.log('\n✅ PassengerEvents collection found');

            const count = await db.collection('passengerevents').countDocuments();
            console.log(`📊 Total documents in passengerevents: ${count}`);

            if (count > 0) {
                const sample = await db.collection('passengerevents').findOne();
                console.log('\n📄 Sample document structure:');
                console.log(JSON.stringify(sample, null, 2));
            }
        } else {
            console.log('\n❌ PassengerEvents collection NOT found');
        }

        // Check database name
        console.log(`\n🗄️ Database name: ${db.databaseName}`);
        console.log(`🔗 Connection string: ${process.env.MONGO_URI || 'mongodb://localhost:27017/sacco-api'}`);

        mongoose.connection.close();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
    });
