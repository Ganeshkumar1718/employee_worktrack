const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('worktrack_pro.db');
db.all('SELECT employee_email, employee_name, role FROM employees', (err, rows) => {
  console.log(rows);
  db.close();
});
