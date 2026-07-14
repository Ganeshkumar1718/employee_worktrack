const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API Health...');
    const health = await axios.get('http://localhost:5003/api/health');
    console.log('Health check:', health.data);

    console.log('\nTesting Login...');
    const login = await axios.post('http://localhost:5003/api/auth/login', {
      employee_email: 'admin@worktrack.com',
      employee_password: 'admin123'
    });
    console.log('Login successful:', login.data);

    console.log('\nTesting Get Employees...');
    const employees = await axios.get('http://localhost:5003/api/employees', {
      headers: { Authorization: `Bearer ${login.data.token}` }
    });
    console.log('Employees:', employees.data);

    console.log('\n✅ All API tests passed!');
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

testAPI();
