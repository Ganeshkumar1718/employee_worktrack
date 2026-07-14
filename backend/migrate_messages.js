const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'worktrack_pro.db');
const db = new sqlite3.Database(dbPath);

db.run(`CREATE TABLE IF NOT EXISTS task_messages (
  message_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  sender_id INTEGER,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES employees(employee_id) ON DELETE CASCADE
)`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  } else {
    console.log('Successfully created task_messages table.');
  }
  db.close();
});
