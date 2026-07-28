const axios = require('axios');
axios.post('https://employee-worktrack-1.onrender.com/api/auth/login', {
  employee_email: 'admin@worktrack.com',
  employee_password: 'admin123'
}).then(r => console.log('SUCCESS', r.status, r.data))
  .catch(e => {
    if (e.response) {
      console.log('HTTP ERROR:', e.response.status);
      console.log('HEADERS:', e.response.headers);
      console.log('DATA:', e.response.data);
    } else {
      console.log('NETWORK ERROR:', e.message);
    }
  });
