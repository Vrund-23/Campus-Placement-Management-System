const pool = require('./config/db');

async function fix() {
  try {
    const yearsRes = await pool.query('SELECT DISTINCT academic_year FROM student_profiles');
    const years = yearsRes.rows.map(r => r.academic_year);
    
    for (const year of years) {
      const existingCountRes = await pool.query("SELECT COUNT(DISTINCT company_id) as count FROM job_postings WHERE academic_year = $1", [year]);
      let existingCount = parseInt(existingCountRes.rows[0].count);
      
      let target = 133;
      if (existingCount < target) {
        let needed = target - existingCount;
        
        const unusedCompanies = await pool.query(`
          SELECT company_id FROM companies 
          WHERE company_id NOT IN (
            SELECT company_id FROM job_postings WHERE academic_year = $1
          ) 
          LIMIT $2
        `, [year, needed]);

        for (const row of unusedCompanies.rows) {
          await pool.query(
           `INSERT INTO job_postings (company_id, title, min_cgpa, deadline, academic_year, status, package) 
            VALUES ($1, 'Software Engineer', 6.0, '2025-12-31', $2, 'OPEN', 8.5)`,
           [row.company_id, year]
          );
        }
        console.log(`Added jobs for ${needed} companies in ${year}!`);
      } else {
        console.log(`Already have ${existingCount} companies in ${year}!`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}
fix();
