async function testAPI() {
  try {
    console.log('Testing API Health...');
    const healthRes = await fetch('http://localhost:5003/api/health');
    const health = await healthRes.json();
    console.log('Health check:', health);

    console.log('\nTesting Login...');
    const loginRes = await fetch('http://localhost:5003/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_email: 'admin@worktrack.com',
        employee_password: 'admin123'
      })
    });
    const login = await loginRes.json();
    console.log('Login successful:', login);

    console.log('\nTesting Get Employees...');
    const empRes = await fetch('http://localhost:5003/api/employees', {
      headers: { Authorization: `Bearer ${login.token}` }
    });
    const employees = await empRes.json();
    console.log('Employees count:', employees.length);
    console.log('First employee:', employees[0]);

    console.log('\n✅ All API tests passed!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();
