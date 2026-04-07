const pool = require('./config/db');

async function limitJobsTo75() {
  try {
    const targetCount = 75;
    const academicYear = '2025-26';
    
    const existingCountRes = await pool.query(
      "SELECT COUNT(DISTINCT company_id) as count FROM job_postings WHERE academic_year = $1", 
      [academicYear]
    );
    let existingCount = parseInt(existingCountRes.rows[0].count, 10);
    
    if (existingCount <= targetCount) {
      console.log(`Already at or below ${targetCount} companies. Current count: ${existingCount}`);
      return;
    }

    const toRemoveCount = existingCount - targetCount;
    console.log(`Need to remove jobs for ${toRemoveCount} companies.`);
    
    // Find companies that ONLY have jobs in 2025-26 WITHOUT any applications, so we can safely delete them
    const safeDeleteJobsRes = await pool.query(`
      SELECT j.job_id
      FROM job_postings j
      LEFT JOIN applications a ON j.job_id = a.job_id
      WHERE j.academic_year = $1 AND a.app_id IS NULL
    `, [academicYear]);

    let deletedCompanies = new Set();
    let deletedJobsCount = 0;
    
    for (const row of safeDeleteJobsRes.rows) {
      if (deletedCompanies.size >= toRemoveCount) {
        break; 
      }
      
      const compRes = await pool.query("SELECT company_id FROM job_postings WHERE job_id = $1", [row.job_id]);
      const companyId = compRes.rows[0].company_id;
      
      await pool.query("DELETE FROM job_postings WHERE job_id = $1", [row.job_id]);
      deletedCompanies.add(companyId);
      deletedJobsCount++;
    }
    
    console.log(`Successfully removed ${deletedCompanies.size} companies. Removed ${deletedJobsCount} jobs.`);
    
    const finalCountRes = await pool.query(
      "SELECT COUNT(DISTINCT company_id) as count FROM job_postings WHERE academic_year = $1", 
      [academicYear]
    );
    console.log(`Final companies visited for 2025-26: ${finalCountRes.rows[0].count}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

limitJobsTo75();
