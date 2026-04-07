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
  const res = await pool.query(`
    SELECT u.name, u.email, fp.academic_year 
    FROM users u 
    JOIN faculty_profiles fp ON u.user_id = fp.user_id 
    WHERE u.role_id = 2 
    ORDER BY fp.academic_year, u.name
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
