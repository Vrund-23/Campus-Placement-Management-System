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
  await pool.query('ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_key');
  await pool.query('ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_enrollment_no_key');
  await pool.query('ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_user_year_unique UNIQUE (user_id, academic_year)');
  await pool.query('ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_enrollment_year_unique UNIQUE (enrollment_no, academic_year)');
  console.log('Successfully updated constraints to support multi-year student data.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
