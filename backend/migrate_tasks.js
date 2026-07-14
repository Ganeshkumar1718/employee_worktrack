const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'worktrack_pro.db');
const db = new sqlite3.Database(dbPath);

db.run("ALTER TABLE tasks ADD COLUMN admin_reply TEXT", (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('Column admin_reply already exists.');
    } else {
      console.error('Error adding column:', err.message);
    }
  } else {
    console.log('Successfully added admin_reply column to tasks table.');
  }
  db.close();
});
