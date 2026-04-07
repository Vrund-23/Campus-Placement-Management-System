const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

const FIRST_NAMES = ['Aarav', 'Vihaan', 'Advait', 'Ishaan', 'Aryan', 'Arjun', 'Reyansh', 'Kabir', 'Vivaan', 'Anya', 'Myra', 'Ananya', 'Kiara', 'Diya', 'Avni', 'Saanvi', 'Riya', 'Shanaya', 'Ira', 'Sara'];
const LAST_NAMES = ['Patel', 'Shah', 'Sharma', 'Gupta', 'Mehta', 'Singh', 'Desai', 'Verma', 'Kumar', 'Reddy', 'Iyer', 'Joshi', 'Kapoor', 'Malhotra', 'Goel', 'Nair', 'Bhat', 'Khan', 'Menon', 'Kulkarni'];

async function main() {
  const academicYear = '2023-24';
  const deptsRes = await pool.query('SELECT dept_id, name FROM departments');
  const departments = deptsRes.rows;

  console.log(`Generating dummy students for ${academicYear}...`);

  for (const dept of departments) {
    console.log(`Processing branch: ${dept.name}`);
    for (let i = 1; i <= 20; i++) {
      const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const name = `${fName} ${lName}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${Math.floor(1000 + Math.random() * 9000)}@campus.edu`;
      const enrollmentNo = `${academicYear.split('-')[0]}${dept.name.substring(0, 2).toUpperCase()}${i.toString().padStart(3, '0')}`;
      const phone = `9876543${i.toString().padStart(3, '0')}`;
      const isPlaced = Math.random() < 0.75;
      const pass = await bcrypt.hash('STU@1234', 10);

      try {
        const newUser = await pool.query(
          'INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 1, $3) RETURNING user_id',
          [email, pass, name]
        );
        const userId = newUser.rows[0].user_id;

        await pool.query(
          'INSERT INTO student_profiles (user_id, dept_id, enrollment_no, phone_number, academic_year, is_placed, is_verified, tpc_verified) VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)',
          [userId, dept.dept_id, enrollmentNo, phone, academicYear, isPlaced]
        );
      } catch (e) {
        console.error(`Error for ${name}: ${e.message}`);
      }
    }
  }

  console.log('Dummy placement data generation complete!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
