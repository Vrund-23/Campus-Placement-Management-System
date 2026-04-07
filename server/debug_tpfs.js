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
    SELECT fp.academic_year, COUNT(*) 
    FROM faculty_profiles fp 
    JOIN users u ON fp.user_id = u.user_id 
    WHERE u.role_id = 3 
    GROUP BY fp.academic_year
  `);
  console.log(res.rows);
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
