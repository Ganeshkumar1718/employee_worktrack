const axios = require('axios');
axios.post('https://employee-worktrack-1.onrender.com/api/auth/login', {
  employee_email: 'admin@worktrack.com',
  employee_password: 'admin123'
}).then(r => console.log(r.status, r.data))
  .catch(e => console.log(e.response ? e.response.status + ' ' + e.response.data + ' headers: ' + JSON.stringify(e.response.headers) : e.message));
