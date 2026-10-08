/**
 * TeleDerma Medicine Alternative Finder
 * Database Initialization Script
 *
 * Connects to PostgreSQL, executes database/schema.sql and database/seed.sql.
 * Usage: npm run db:init
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function initDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('================================================================');
    console.log('ℹ️  DATABASE_URL is not set in your .env file.');
    console.log('----------------------------------------------------------------');
    console.log('You have two ways to run this module:');
    console.log('');
    console.log('1. RUN IMMEDIATELY WITHOUT POSTGRESQL (Embedded Demo Mode):');
    console.log('   You do NOT need PostgreSQL to test this module!');
    console.log('   Simply run:');
    console.log('     npm start');
    console.log('   The server will start at http://localhost:5000 using the');
    console.log('   embedded 35-record synthetic demo catalog.');
    console.log('');
    console.log('2. CONNECT TO A REAL POSTGRESQL DATABASE:');
    console.log('   Open your .env file and set DATABASE_URL with your PostgreSQL credentials:');
    console.log('     DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/telederma_db');
    console.log('   Then re-run:');
    console.log('     npm run db:init');
    console.log('================================================================');
    process.exit(0);
  }

  const client = new Client({ connectionString });

  try {
    console.log('[DB Init] Connecting to PostgreSQL database...');
    await client.connect();
    console.log('[DB Init] Connected successfully.');

    // 1. Run schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log(`[DB Init] Executing schema: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('[DB Init] Schema applied successfully.');

    // 2. Run seed.sql
    const seedPath = path.join(__dirname, '../database/seed.sql');
    console.log(`[DB Init] Executing seed dataset: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('[DB Init] Seed dataset inserted successfully.');

    // Verify row count
    const countRes = await client.query('SELECT COUNT(*) as total FROM medicines');
    console.log(`[DB Init] Total medicines now in database: ${countRes.rows[0].total}`);
    console.log('[DB Init] Database initialization complete.');
  } catch (err) {
    console.error('[DB Init] Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
