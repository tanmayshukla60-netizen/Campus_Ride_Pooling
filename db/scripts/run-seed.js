// db/scripts/run-seed.js
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const pgBin = path.join(process.env.USERPROFILE, 'pgsql', 'bin', 'psql.exe');
const psqlCmd = fs.existsSync(pgBin) ? pgBin : 'psql';

const seedFile = path.join(__dirname, '..', 'seed.sql');

console.log('--- SEEDING DATABASE ---');
try {
  const output = execFileSync(
    psqlCmd,
    ['-U', 'postgres', '-h', '127.0.0.1', '-p', '5432', '-d', 'campus_rides', '-v', 'ON_ERROR_STOP=1', '-f', seedFile],
    { encoding: 'utf-8', stdio: ['inherit', 'pipe', 'pipe'] }
  );
  console.log('--- SEED COMPLETED SUCCESSFULLY ---');
} catch (err) {
  console.error('--- SEED FAILED ---');
  console.error(err.stderr || err.message);
  process.exit(1);
}
