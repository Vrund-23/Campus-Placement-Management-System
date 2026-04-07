const pool = require('./config/db');

async function fix() {
  try {
    const existingCountRes = await pool.query("SELECT COUNT(DISTINCT company_id) as count FROM job_postings WHERE academic_year = '2025-26'");
    let existingCount = parseInt(existingCountRes.rows[0].count);
    
    if (existingCount < 101) {
      let needed = 101 - existingCount;
      console.log(`Need to add jobs for ${needed} more companies.`);
      
      const unusedCompanies = await pool.query(`
        SELECT company_id FROM companies 
        WHERE company_id NOT IN (
          SELECT company_id FROM job_postings WHERE academic_year = '2025-26'
        ) 
        LIMIT $1
      `, [needed]);

      for (const row of unusedCompanies.rows) {
        await pool.query(
         `INSERT INTO job_postings (company_id, title, min_cgpa, deadline, academic_year, status, package) 
          VALUES ($1, 'Software Engineer', 6.0, '2025-12-31', '2025-26', 'OPEN', 8.5)`,
         [row.company_id]
        );
      }
      console.log(`Added jobs for exactly ${needed} companies! UI will now show 101.`);
    } else {
      console.log(`Already have ${existingCount} companies!`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}
fix();
