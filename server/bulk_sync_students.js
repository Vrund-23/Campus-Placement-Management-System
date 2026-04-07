const { Pool } = require('pg');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function main() {
  const academicYear = '2023-24';
  const deptsRes = await pool.query("SELECT dept_id, name FROM departments");
  const departments = deptsRes.rows;

  console.log(`Starting bulk sync for ${academicYear}...`);

  for (const dept of departments) {
    const excelFilename = `${dept.name}_Students.xlsx`;
    const excelPath = path.join(__dirname, 'data', 'students', academicYear, excelFilename);

    if (!fs.existsSync(excelPath)) {
      console.log(`Skipping ${dept.name}: ${excelPath} not found`);
      continue;
    }

    console.log(`Processing ${dept.name}...`);
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const students = xlsx.utils.sheet_to_json(sheet);

    for (const row of students) {
      const name = row.name || row.Name || row['Full Name'] || 'Student';
      const email = row.email || row.Email || row['Email Address'];
      const college_id = row.college_id || row.Id || row['College ID'];
      const mobile = row.mobile || row.Mobile || row['Mobile Number'];
      
      if (!email) continue;

      try {
        const userCheck = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
        let userId;

        if (userCheck.rows.length === 0) {
          const pass = await bcrypt.hash('STU@1234', 10);
          const newUser = await pool.query(
            "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 1, $3) RETURNING user_id",
            [email, pass, name]
          );
          userId = newUser.rows[0].user_id;
        } else {
          userId = userCheck.rows[0].user_id;
        }

        // Randomly decide if student is placed (75% chance for dummy data in past year)
        const isPlaced = Math.random() < 0.75;

        await pool.query(
          `INSERT INTO student_profiles (user_id, dept_id, enrollment_no, phone_number, academic_year, is_placed) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (user_id, academic_year) DO UPDATE SET is_placed = EXCLUDED.is_placed`,
          [userId, dept.dept_id, college_id || null, mobile ? String(mobile) : null, academicYear, isPlaced]
        );
      } catch (e) {
        console.error(`Error syncing ${email}: ${e.message}`);
      }
    }
  }

  console.log('Bulk sync done!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
