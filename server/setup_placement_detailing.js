const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

const COMPANIES = [
  { name: 'Google', website: 'google.com' },
  { name: 'Microsoft', website: 'microsoft.com' },
  { name: 'Amazon', website: 'amazon.com' },
  { name: 'TCS', website: 'tcs.com' },
  { name: 'Infosys', website: 'infosys.com' },
  { name: 'Wipro', website: 'wipro.com' },
  { name: 'Tesla', website: 'tesla.com' },
  { name: 'Netflix', website: 'netflix.com' }
];

async function main() {
  console.log('Setting up companies and placement details...');

  // 1. Create Companies
  for (const c of COMPANIES) {
     await pool.query(
       "INSERT INTO companies (name, website) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING",
       [c.name, c.website]
     );
  }

  // 2. Create placement_records table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS placement_records (
      placement_id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES student_profiles(student_id) ON DELETE CASCADE,
      company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
      package_lpa DECIMAL(10, 2),
      designation VARCHAR(255),
      offer_date DATE,
      academic_year VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, company_id) -- To keep it simple, one record per student-company for now
    )
  `);

  // 3. Map placed students to random companies and packages
  const placedStudents = await pool.query(
    "SELECT student_id, academic_year FROM student_profiles WHERE is_placed = TRUE"
  );
  
  const allCompanies = await pool.query("SELECT company_id FROM companies");
  const companyIds = allCompanies.rows.map(r => r.company_id);

  console.log(`Mapping ${placedStudents.rows.length} placed students to detailed records...`);

  for (const student of placedStudents.rows) {
     const randomCompany = companyIds[Math.floor(Math.random() * companyIds.length)];
     const randomPackage = (Math.random() * (25 - 4) + 4).toFixed(2); // 4LPA to 25LPA
     const designation = ['Software Engineer', 'Data Analyst', 'QA Engineer', 'Product Manager', 'System Admin'][Math.floor(Math.random() * 5)];
     const offerDate = new Date();
     offerDate.setFullYear(parseInt(student.academic_year.split('-')[0]));
     offerDate.setMonth(Math.floor(Math.random() * 12));

     await pool.query(
       `INSERT INTO placement_records (student_id, company_id, package_lpa, designation, offer_date, academic_year)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (student_id, company_id) DO NOTHING`,
       [student.student_id, randomCompany, randomPackage, designation, offerDate, student.academic_year]
     );
  }

  console.log('Placement detailing complete!');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
