const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  const users = ['student@campus.edu', 'tpc@campus.edu', 'tpf@campus.edu', 'tpo@campus.edu', 'principal@campus.edu', 'admin@campus.edu'];
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);
  
  for (const email of users) {
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
    console.log('Reset password for', email);
  }
  process.exit(0);
}
resetPasswords();
