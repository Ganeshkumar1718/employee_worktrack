const axios = require('axios');
axios.post('http://localhost:5003/api/auth/login', {
  employee_email: 'admin@worktrack.com',
  employee_password: 'admin123'
}).then(r => console.log('SUCCESS', r.status, r.data))
  .catch(e => {
    if (e.response) {
      console.log('HTTP ERROR:', e.response.status, e.response.data);
    } else {
      console.log('NETWORK ERROR:', e.message);
    }
  });
