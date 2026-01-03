#!/usr/bin/env node

/**
 * Database Seeder Runner
 * 
 * Usage:
 * node seed/runSeeder.js
 * 
 * This script will populate the database with comprehensive test data
 * for the School Transport Management System with NTSA integration.
 */

require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const DatabaseSeeder = require('./databaseSeeder');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`)
};

async function main() {
    try {
        log.info('Starting database seeder...');

        // Check environment variables
        if (!process.env.MONGO_URI) {
            log.error('MONGO_URI not found in environment variables');
            log.info('Please check your config.env file');
            process.exit(1);
        }

        // Connect to database
        log.info('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        log.success('Connected to database');

        // Run seeder
        const seeder = new DatabaseSeeder();
        await seeder.seedDatabase();

        log.success('Database seeding completed successfully!');

        // Close connection
        await mongoose.connection.close();
        log.info('Database connection closed');

        process.exit(0);

    } catch (error) {
        log.error('Error running seeder:', error.message);

        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    log.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    log.error('Uncaught Exception:', err);
    process.exit(1);
});

// Run the seeder
main();
