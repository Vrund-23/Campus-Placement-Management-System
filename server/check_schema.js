const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function check() {
  const table = process.argv[2] || 'faculty_profiles';
  const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [table]);
  console.log(`\n--- Schema for ${table} ---\n`);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
