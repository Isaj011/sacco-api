#!/usr/bin/env node

/**
 * Quick Seeder Test
 * 
 * This script runs a minimal version of the seeder to test
 * if the database connection and basic operations work.
 */

require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const colors = require('colors');

const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`.blue),
    success: (msg) => console.log(`✅ ${msg}`.green),
    warning: (msg) => console.log(`⚠️  ${msg}`.yellow),
    error: (msg) => console.log(`❌ ${msg}`.red)
};

async function testSeeder() {
    try {
        log.info('Testing database connection...');

        if (!process.env.MONGO_URI) {
            log.error('MONGO_URI not found in environment variables');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        log.success('Database connection successful');

        // Test basic model imports
        const School = require('../models/School');
        const User = require('../models/User');
        const SchoolVehicle = require('../models/SchoolVehicle');
        const SchoolDriver = require('../models/SchoolDriver');
        const SchoolStudent = require('../models/SchoolStudent');
        const Parent = require('../models/Parent');

        log.success('All models imported successfully');

        // Test creating a simple school
        const testSchool = await School.create({
            name: 'Test School',
            code: 'TEST001',
            address: {
                street: '123 Test Street',
                city: 'Nairobi',
                state: 'Nairobi County',
                postalCode: '00100',
                country: 'Kenya',
                coordinates: {
                    type: 'Point',
                    coordinates: [-1.2921, 36.8219]
                }
            },
            contact: {
                name: 'Test Contact',
                email: 'test@test.com',
                phone: '+254-712-345-678',
                designation: 'Principal'
            }
        });

        log.success('Test school created successfully');

        // Clean up test data
        await School.deleteOne({ _id: testSchool._id });
        log.success('Test data cleaned up');

        await mongoose.connection.close();
        log.success('Database connection closed');

        log.info('✅ Seeder test passed! Ready to run full seeder.');
        log.info('Run: npm run seed');

        process.exit(0);

    } catch (error) {
        log.error('Test failed:', error.message);
        log.error('Full error:', error);

        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        process.exit(1);
    }
}

testSeeder();
