// db/scripts/run-migrations.js
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const pgBin = path.join(process.env.USERPROFILE, 'pgsql', 'bin', 'psql.exe');
const psqlCmd = fs.existsSync(pgBin) ? pgBin : 'psql';

const migrationsDir = path.join(__dirname, '..', 'migrations');
const migrationFiles = [
  '001_init_schema.sql',
  '002_triggers_and_audit.sql',
  '003_functions_and_views.sql'
];

console.log('--- RUNNING DATABASE MIGRATIONS ---');

for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  console.log(`Applying migration: ${file}...`);
  try {
    const output = execFileSync(
      psqlCmd,
      ['-U', 'postgres', '-h', '127.0.0.1', '-p', '5432', '-d', 'campus_rides', '-v', 'ON_ERROR_STOP=1', '-f', filePath],
      { encoding: 'utf-8', stdio: ['inherit', 'pipe', 'pipe'] }
    );
    console.log(`  -> OK: ${file}`);
  } catch (err) {
    console.error(`  -> FAILED on ${file}:`);
    console.error(err.stderr || err.message);
    process.exit(1);
  }
}

console.log('--- ALL MIGRATIONS APPLIED SUCCESSFULLY ---');
