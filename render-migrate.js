// render-migrate.js — Run SQL migrations + seed via pg (no psql CLI needed)
// Used by render-build.sh during Render's build phase

const { Client } = require('./backend/node_modules/pg');
const fs = require('fs');
const path = require('path');

const MIGRATION_FILES = [
  'db/migrations/001_init_schema.sql',
  'db/migrations/002_triggers_and_audit.sql',
  'db/migrations/003_functions_and_views.sql',
];
const SEED_FILE = 'db/seed.sql';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Run migrations
    for (const file of MIGRATION_FILES) {
      const filePath = path.resolve(__dirname, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Applying migration: ${file}...`);
      await client.query(sql);
      console.log(`  -> OK: ${file}`);
    }

    // Run seed
    const seedPath = path.resolve(__dirname, SEED_FILE);
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf-8');
      console.log(`Seeding database from: ${SEED_FILE}...`);
      await client.query(seedSql);
      console.log('  -> Seed applied successfully.');
    }

    console.log('All migrations and seed applied successfully!');
  } catch (err) {
    console.error('Migration/seed failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
