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
  const tableName = process.argv[2] || 'users';
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [tableName]);
  console.log(res.rows.map(r => r.column_name));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
