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
  const years = ['2023-24', '2024-25', '2025-26'];
  for (const year of years) {
    const res = await pool.query("SELECT COUNT(*) FROM student_profiles WHERE academic_year = $1", [year]);
    console.log(`${year}: ${res.rows[0].count} students`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
