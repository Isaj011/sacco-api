#!/usr/bin/env node
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../config/config.env') });
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const [coursesCol, routesCol] = await Promise.all([
    db.listCollections({ name: 'courses' }).toArray(),
    db.listCollections({ name: 'routes' }).toArray(),
  ]);

  if (coursesCol.length === 0) {
    console.log('courses collection does not exist — nothing to migrate');
  } else if (routesCol.length > 0) {
    console.log('routes collection already exists — skipping rename to avoid data loss');
    console.log('If you intended to overwrite, drop the routes collection first.');
  } else {
    await db.collection('courses').rename('routes', { dropTarget: false });
    console.log('✅ Renamed collection: courses → routes');
  }

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
