const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
const dbPath = process.env.NODE_ENV === 'production'
  ? '/data/worktrack_pro.db'
  : path.join(__dirname, '../worktrack_pro.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('SQLite database connected successfully');
    initializeDatabase();
  }
});

// Helper functions for database operations wrapped in Promises
const dbOperations = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
};

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create employees table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS employees (
      employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      employee_email TEXT UNIQUE NOT NULL,
      employee_password TEXT NOT NULL,
      department TEXT,
      designation TEXT,
      annual_package REAL,
      hourly_rate REAL,
      role TEXT DEFAULT 'employee',
      active_token TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create attendance table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS attendance (
      attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      login_time DATETIME,
      logout_time DATETIME,
      total_hours REAL,
      attendance_date DATE,
      work_mode TEXT DEFAULT 'WFO',
      device_info TEXT,
      ip_address TEXT,
      latitude REAL,
      longitude REAL,
      working_hours INTEGER DEFAULT 0,
      working_minutes INTEGER DEFAULT 0,
      working_seconds INTEGER DEFAULT 0,
      total_working_time TEXT DEFAULT '0 Hours 0 Minutes 0 Seconds',
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
    )`);

    // Create leaves table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS leaves (
      leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      leave_type TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      leave_days INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
    )`);

    // Create salary table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS salary (
      salary_id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      month TEXT,
      worked_hours REAL,
      working_time TEXT DEFAULT '0 Hours 0 Minutes 0 Seconds',
      hourly_rate REAL,
      salary_amount REAL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
    )`);

    // Create tasks table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS tasks (
      task_id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      employee_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      employee_reply TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (admin_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
    )`);

    // Create task_messages table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS task_messages (
      message_id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      sender_id INTEGER,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      is_seen INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES employees(employee_id) ON DELETE CASCADE
    )`);

    // Create holidays table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS holidays (
      holiday_id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_name TEXT NOT NULL,
      holiday_date DATE UNIQUE NOT NULL
    )`);

    // Create feedback table
    await dbOperations.run(`CREATE TABLE IF NOT EXISTS feedback (
      feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      feedback_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
    )`);

    // Insert sample holidays if table is empty
    const holidayCheck = await dbOperations.get("SELECT COUNT(*) as count FROM holidays");
    if (holidayCheck.count === 0) {
      const sampleHolidays = [
        ['New Year\'s Day', '2026-01-01'],
        ['Republic Day', '2026-01-26'],
        ['Good Friday', '2026-04-03'],
        ['Independence Day', '2026-08-15'],
        ['Gandhi Jayanti', '2026-10-02'],
        ['Diwali', '2026-11-08'],
        ['Christmas Day', '2026-12-25'],
        ['New Year\'s Day 2027', '2027-01-01'],
        ['Republic Day 2027', '2027-01-26']
      ];
      for (const [name, date] of sampleHolidays) {
        await dbOperations.run("INSERT OR IGNORE INTO holidays (holiday_name, holiday_date) VALUES (?, ?)", [name, date]);
      }
      console.log('Sample holidays inserted');
    }

    // Insert default admin user if not exists
    const adminUser = await dbOperations.get("SELECT * FROM employees WHERE employee_email = ?", ['admin@worktrack.com']);
    if (!adminUser) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await dbOperations.run(`INSERT INTO employees (employee_name, employee_email, employee_password, department, designation, annual_package, hourly_rate, role) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Admin User', 'admin@worktrack.com', hashedPassword, 'Administration', 'System Administrator', 2400000, 1369.86, 'admin']);
      console.log('Default admin user created');
    }

    // Add new columns if they don't exist
    const attendanceColumns = await dbOperations.query("PRAGMA table_info(attendance)");
    const attendanceColumnNames = attendanceColumns.map(col => col.name);
    
    if (!attendanceColumnNames.includes('working_hours')) {
      await dbOperations.run('ALTER TABLE attendance ADD COLUMN working_hours INTEGER DEFAULT 0');
    }
    if (!attendanceColumnNames.includes('working_minutes')) {
      await dbOperations.run('ALTER TABLE attendance ADD COLUMN working_minutes INTEGER DEFAULT 0');
    }
    if (!attendanceColumnNames.includes('working_seconds')) {
      await dbOperations.run('ALTER TABLE attendance ADD COLUMN working_seconds INTEGER DEFAULT 0');
    }
    if (!attendanceColumnNames.includes('total_working_time')) {
      await dbOperations.run('ALTER TABLE attendance ADD COLUMN total_working_time TEXT DEFAULT "0 Hours 0 Minutes 0 Seconds"');
    }

    const leavesColumns = await dbOperations.query("PRAGMA table_info(leaves)");
    const leavesColumnNames = leavesColumns.map(col => col.name);
    
    if (!leavesColumnNames.includes('leave_days')) {
      await dbOperations.run('ALTER TABLE leaves ADD COLUMN leave_days INTEGER DEFAULT 1');
    }

    const salaryColumns = await dbOperations.query("PRAGMA table_info(salary)");
    const salaryColumnNames = salaryColumns.map(col => col.name);
    
    if (!salaryColumnNames.includes('working_time')) {
      await dbOperations.run('ALTER TABLE salary ADD COLUMN working_time TEXT DEFAULT "0 Hours 0 Minutes 0 Seconds"');
    }

    // Add active_token column to employees if it doesn't exist (migration)
    const employeesColumns = await dbOperations.query("PRAGMA table_info(employees)");
    const employeesColumnNames = employeesColumns.map(col => col.name);
    if (!employeesColumnNames.includes('active_token')) {
      await dbOperations.run('ALTER TABLE employees ADD COLUMN active_token TEXT DEFAULT NULL');
    }

    const taskMessagesColumns = await dbOperations.query("PRAGMA table_info(task_messages)");
    const taskMessagesColumnNames = taskMessagesColumns.map(col => col.name);
    if (!taskMessagesColumnNames.includes('is_seen')) {
      await dbOperations.run('ALTER TABLE task_messages ADD COLUMN is_seen INTEGER DEFAULT 0');
    }

    // Initialize database indexes for maximum read performance
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_messages_task ON task_messages(task_id)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_messages_unseen ON task_messages(task_id, is_seen)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_salary_employee ON salary(employee_id)');
    await dbOperations.run('CREATE INDEX IF NOT EXISTS idx_salary_month ON salary(month)');

    console.log('Database tables and indexes initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

module.exports = dbOperations;
