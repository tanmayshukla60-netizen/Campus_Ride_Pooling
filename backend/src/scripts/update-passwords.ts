import bcrypt from 'bcryptjs';
import { query } from '../db';

async function main() {
  const hash = await bcrypt.hash('Password123!', 10);
  console.log('Real bcrypt hash generated:', hash);
  const res = await query('UPDATE users SET password_hash = $1', [hash]);
  console.log('Successfully updated users with verified hash! Count:', res.rowCount);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
