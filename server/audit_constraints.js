const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function main() {
  const res = await pool.query(`
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'student_profiles'::regclass
  `);
  console.log('Constraints:', res.rows.map(r => r.conname));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
