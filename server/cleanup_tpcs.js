const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function cleanup() {
  console.log('Cleaning up 2025-26 TPC duplicates...');
  
  // These are the ONLY legitimate TPCs for 2025-26 based on my generation logic and original state
  const legitimateEmails = [
    'reyansh.singh@gmail.com', 'sara.ali@gmail.com', 'vedant.joshi@gmail.com', 
    'ira.sharma@gmail.com', 'arjun.verma@gmail.com', 'riya.nair@gmail.com', 
    'dhruv.goel@gmail.com', 'tanya.gupta@gmail.com', 'vivaan.kapoor@gmail.com', 
    'shanaya.singh@gmail.com', 'atharv.patil@gmail.com', 'navya.shah@gmail.com',
    'tpc@campus.edu' // Existing system account
  ];

  // Delete from faculty_profiles where year is 2025-26 but email is NOT in legitimate list
  // and the user is a TPC (role_id = 2)
  const res = await pool.query(`
    DELETE FROM faculty_profiles 
    WHERE academic_year = '2025-26' 
    AND user_id IN (
        SELECT user_id FROM users 
        WHERE role_id = 2 
        AND email NOT IN (${legitimateEmails.map((_, i) => '$' + (i+1)).join(',')})
    )
  `, legitimateEmails);

  console.log(`Deleted ${res.rowCount} incorrect TPC records from 2025-26.`);
  
  // Double check distribution
  const checkRes = await pool.query(`
    SELECT fp.academic_year, COUNT(*) 
    FROM faculty_profiles fp 
    JOIN users u ON fp.user_id = u.user_id 
    WHERE u.role_id = 2 
    GROUP BY fp.academic_year
  `);
  console.log('\nNew Distribution:');
  console.log(checkRes.rows);
  
  process.exit(0);
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
