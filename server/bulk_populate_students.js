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

const FIRST_NAMES = ['Aarav', 'Vihaan', 'Advait', 'Ishaan', 'Aryan', 'Arjun', 'Reyansh', 'Kabir', 'Vivaan', 'Anya', 'Myra', 'Ananya', 'Kiara', 'Diya', 'Avni', 'Saanvi', 'Riya', 'Shanaya', 'Ira', 'Sara', 'Aditya', 'Rohan', 'Neel', 'Dev', 'Manav', 'Arnav', 'Rishi', 'Kabir', 'Yash', 'Tanvi', 'Ishita', 'Navya', 'Isha', 'Kavya', 'Krisha', 'Bala', 'Siddharth', 'Varun', 'Gaurav', 'Sania'];
const LAST_NAMES = ['Patel', 'Shah', 'Sharma', 'Gupta', 'Mehta', 'Singh', 'Desai', 'Verma', 'Kumar', 'Reddy', 'Iyer', 'Joshi', 'Kapoor', 'Malhotra', 'Goel', 'Nair', 'Bhat', 'Khan', 'Menon', 'Kulkarni', 'Dubey', 'Trivedi', 'Pandey', 'Mishra', 'Choudhary', 'Rao', 'Vaidya', 'Hegde', 'Shenoy', 'Prabhu', 'Bose', 'Das', 'Sen', 'Banerjee', 'Chatterjee', 'Mukherjee', 'Roy', 'Dutta', 'Sarkar', 'Ghosal', 'Basu'];

async function main() {
  const years = [
    { year: '2023-24', placementRate: 0.82, studentsPerDept: 60 },
    { year: '2024-25', placementRate: 0.45, studentsPerDept: 60 },
    { year: '2025-26', placementRate: 0.00, studentsPerDept: 60 }
  ];

  const deptsRes = await pool.query('SELECT dept_id, name FROM departments');
  const departments = deptsRes.rows;

  console.log(`Starting bulk population for ALL years...`);
  const pass = await bcrypt.hash('STU@1234', 10);

  for (const config of years) {
    console.log(`\n--- Batch: ${config.year} (Target: ${config.studentsPerDept} per branch) ---`);
    for (const dept of departments) {
      console.log(`Branch: ${dept.name}`);
      for (let i = 1; i <= config.studentsPerDept; i++) {
        const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        const name = `${fName} ${lName}`;
        const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${config.year.split('-')[0]}.${Math.floor(100+i)}@campus.edu`;
        const enrollmentNo = `${config.year.split('-')[0]}${dept.name.substring(0, 2).toUpperCase()}${i.toString().padStart(3, '0')}`;
        const isPlaced = Math.random() < config.placementRate;

        try {
          // INSERT into users or IGNORE if email exists
          const userRes = await pool.query(
            'INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 1, $3) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING user_id',
            [email, pass, name]
          );
          const userId = userRes.rows[0].user_id;

          // INSERT into student_profiles
          await pool.query(
            `INSERT INTO student_profiles (user_id, dept_id, enrollment_no, phone_number, academic_year, is_placed, is_verified, tpc_verified) 
             VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
             ON CONFLICT (user_id, academic_year) DO UPDATE SET is_placed = EXCLUDED.is_placed`,
            [userId, dept.dept_id, enrollmentNo, `98765${Math.floor(10000+Math.random()*90000)}`, config.year, isPlaced]
          );
        } catch (e) {
          // Log errors for debugging but keep going
          if (!e.message.includes('unique constraint')) console.error(`Error for ${name}: ${e.message}`);
        }
      }
    }
  }

  console.log('\nBulk population finished successfully!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
