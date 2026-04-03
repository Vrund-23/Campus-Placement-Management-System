require('dotenv').config();
const pool = require('./config/db');
pool.query("INSERT INTO job_postings (company_id, posted_by, title, min_cgpa, min_10th_percent, min_12th_percent, deadline, max_backlogs, eligible_branches, selection_process) VALUES(1, (SELECT user_id FROM users WHERE role_id = (SELECT role_id FROM roles WHERE name='tpo') LIMIT 1), 'Test', 7, 60, 60, CURRENT_TIMESTAMP, 0, '[\"All\"]', '[\"Applied\", \"Placed\"]') RETURNING *")
.then(res => console.log('success', res.rows))
.catch(err => {
  console.log('--- DB ERROR ---');
  console.log(err.message);
  console.log('----------------');
})
.finally(() => pool.end());
