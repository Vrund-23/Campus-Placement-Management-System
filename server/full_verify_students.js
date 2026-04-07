const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, host: process.env.DB_HOST,
  port: process.env.DB_PORT, database: process.env.DB_NAME,
});

async function main() {
  const years = ['2023-24', '2024-25'];
  console.log(`Verifying students for years: ${years.join(', ')}...`);

  // Update ALL verification flags for students in those batches
  // is_verified is for generic admin status
  // tpc_verified is for Coordinator level
  // tpo_verified is for Final Manager level
  const res = await pool.query(`
    UPDATE student_profiles 
    SET is_verified = TRUE, tpc_verified = TRUE, tpo_verified = TRUE, tpf_verified = TRUE
    WHERE academic_year = ANY($1)
  `, [years]);

  console.log(`Successfully verified ${res.rowCount} student profiles.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
