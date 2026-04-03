const pool = require('./config/db');
async function fixDB() {
  try {
    await pool.query('ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS selection_process JSONB DEFAULT \'[]\'');
    await pool.query('ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS eligible_branches JSONB DEFAULT \'[\"All\"]\', ADD COLUMN IF NOT EXISTS max_backlogs INT DEFAULT 0;');
    console.log('Fixed DB');
  } catch(e) { console.error(e); }
  finally { pool.end(); }
}
fixDB();
