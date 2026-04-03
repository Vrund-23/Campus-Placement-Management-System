const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function updateDepartments() {
  const departments = [
    ['Computer', 'CE'],
    ['IT', 'IT'],
    ['Electronics', 'EC'],
    ['Mechanical', 'ME'],
    ['Civil', 'CIVIL'],
    ['Production', 'PROD'],
    ['Electrical', 'EE']
  ];

  console.log('🔄 Updating department names in database...');

  try {
    for (const [name, code] of departments) {
      const res = await pool.query(
        'INSERT INTO departments (name, code) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING *',
        [name, code]
      );
      if (res.rowCount > 0) {
        console.log(` ✅ Updated ${code} to "${name}"`);
      }
    }
    console.log('\n✨ Database synchronization complete.');
  } catch (err) {
    console.error(' ❌ Error updating departments:', err.message);
  } finally {
    await pool.end();
  }
}

updateDepartments();
