require('dotenv').config({ path: '.env' });

async function testLogin() {
  try {
    const res = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tpo@campus.edu', password: 'password123' })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error(err);
  }
}

testLogin();
