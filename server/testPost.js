async function testPost() {
  require('dotenv').config();
  const pool = require('./config/db');
  
  const tpo = await pool.query("SELECT * FROM users WHERE role_id = (SELECT role_id FROM roles WHERE name='tpo') LIMIT 1");
  if (tpo.rows.length === 0) { console.log('No TPO user found'); pool.end(); return; }
  
  const jwtGenerator = require('./utils/jwtGenerator');
  const token = jwtGenerator(tpo.rows[0].user_id);
  
  pool.end();
  
  try {
    const res = await fetch('http://localhost:5000/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'jwt_token': token },
      body: JSON.stringify({
        company_name: 'Test Company ' + Date.now(),
        title: 'Software Engineer',
        min_cgpa: 7.5,
        min_10th_percent: 60,
        min_12th_percent: 60,
        max_backlogs: 0,
        deadline: new Date().toISOString(),
        selection_process: ['Applied', 'Placed']
      })
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (err) { console.error(err); }
}
testPost();
