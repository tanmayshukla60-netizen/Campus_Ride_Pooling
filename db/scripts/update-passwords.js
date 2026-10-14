const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  database: 'campus_rides',
});

async function main() {
  const hash = await bcrypt.hash('Password123!', 10);
  console.log('Generated hash:', hash);
  const res = await pool.query('UPDATE users SET password_hash = $1', [hash]);
  console.log('Updated users count:', res.rowCount);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
