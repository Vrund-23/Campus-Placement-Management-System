const payload = { email: 'principal@campus.edu', password: 'password123', role: 'student' };
  
async function testLogin() {
  const response = await fetch(`http://localhost:5000/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  const parseRes = await response.json();
  console.log('Status code:', response.status);
  console.log('Parsed body:', parseRes);
  
  if (parseRes.token) {
    console.log("Logged in!! token exists", parseRes.token);
  } else {
    console.log("Failed. Throwing error...", parseRes);
  }
}

testLogin();
