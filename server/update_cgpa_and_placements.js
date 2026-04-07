const pool = require('./config/db');

async function fixPlacements() {
  try {
    console.log('--- Starting Data Fix ---');
    
    // 1. Fix CGPA
    await pool.query(`
      UPDATE student_profiles
      SET cgpa = CEIL((random() * 3.5 + 6.0) * 100) / 100
      WHERE cgpa IS NULL OR cgpa = 0;
    `);
    console.log('Fixed missing CGPAs.');

    // 2. Ensure each academic year has some job postings
    const yearsRes = await pool.query('SELECT DISTINCT academic_year FROM student_profiles');
    const years = yearsRes.rows.map(r => r.academic_year);
    
    const companyIdsRes = await pool.query('SELECT company_id FROM companies LIMIT 10');
    const companyIds = companyIdsRes.rows.map(r => r.company_id);
    
    if (companyIds.length === 0) {
       console.log('No companies found, cannot create jobs.');
       return;
    }

    const jobMap = {}; // year -> array of job_ids

    for (const year of years) {
       // Check if jobs exist
       const jobsRes = await pool.query('SELECT job_id FROM job_postings WHERE academic_year = $1', [year]);
       let jobIds = jobsRes.rows.map(r => r.job_id);
       
       if (jobIds.length === 0) {
           console.log(`Creating missing jobs for ${year}...`);
           for (let i = 0; i < 5; i++) {
               const cid = companyIds[Math.floor(Math.random() * companyIds.length)];
               const newJob = await pool.query(
                   `INSERT INTO job_postings (company_id, title, min_cgpa, deadline, academic_year, status, package) 
                    VALUES ($1, $2, $3, $4, $5, 'CLOSED', $6) RETURNING job_id`,
                   [cid, `Software Engineer ${year}`, 6.0, '2025-12-31', year, (Math.floor(Math.random() * 15) + 3) + 0.5]
               );
               jobIds.push(newJob.rows[0].job_id);
           }
       }
       jobMap[year] = jobIds;
    }

    // 3. For any student who is_placed = true, ensure they have an application
    const placedStudents = await pool.query(`
      SELECT sp.student_id, sp.academic_year 
      FROM student_profiles sp
      LEFT JOIN applications a ON sp.student_id = a.student_id AND a.status = 'PLACED'
      WHERE sp.is_placed = TRUE AND a.app_id IS NULL
    `);
    
    let appCount = 0;
    for (const row of placedStudents.rows) {
        const jobs = jobMap[row.academic_year];
        if (jobs && jobs.length > 0) {
            const jid = jobs[Math.floor(Math.random() * jobs.length)];
            await pool.query(
                `INSERT INTO applications (job_id, student_id, status) VALUES ($1, $2, 'PLACED') ON CONFLICT (job_id, student_id) DO NOTHING`,
                [jid, row.student_id]
            );
            appCount++;
        }
    }
    console.log(`Created ${appCount} missing applications for placed students.`);

    // 4. Randomly place some 2025-26 students if very few are placed!
    const res25 = await pool.query(`SELECT COUNT(*) FROM student_profiles WHERE academic_year='2025-26' AND is_placed=TRUE`);
    if (parseInt(res25.rows[0].count) < 20) {
       console.log('Randomly placing some students for 2025-26...');
       const students25 = await pool.query(`SELECT student_id FROM student_profiles WHERE academic_year='2025-26' AND is_placed=FALSE LIMIT 100`);
       for (const row of students25.rows) {
           const jobs = jobMap['2025-26'];
           if (jobs && jobs.length > 0) {
               const jid = jobs[Math.floor(Math.random() * jobs.length)];
               await pool.query(`UPDATE student_profiles SET is_placed = TRUE WHERE student_id = $1`, [row.student_id]);
               await pool.query(
                   `INSERT INTO applications (job_id, student_id, status) VALUES ($1, $2, 'PLACED') ON CONFLICT (job_id, student_id) DO NOTHING`,
                   [jid, row.student_id]
               );
           }
       }
       console.log(`Placed ${students25.rowCount} random students for 2025-26.`);
    }

    console.log('--- Fix Complete ---');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    pool.end();
  }
}

fixPlacements();
