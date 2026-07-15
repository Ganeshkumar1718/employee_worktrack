const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const salaryRoutes = require('./routes/salary');
const taskRoutes = require('./routes/tasks');
const holidayRoutes = require('./routes/holidays');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/feedback', feedbackRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: "success",
    message: "Employee WorkTrack Backend is Running"
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'WorkTrack Pro API is running' });
});

// Debug DB route
app.get('/api/debug-db', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'worktrack_pro.db');
    const dbExists = fs.existsSync(dbPath);
    
    let dbDetails = {};
    if (dbExists) {
      const stats = fs.statSync(dbPath);
      dbDetails = {
        size: stats.size,
        mode: stats.mode
      };
    }
    
    const dbOperations = require('./config/db');
    const employees = await dbOperations.query('SELECT employee_id, employee_name, employee_email, role FROM employees');
    const holidaysCount = await dbOperations.get('SELECT COUNT(*) as count FROM holidays');
    
    res.json({
      dbPath,
      dbExists,
      dbDetails,
      employees,
      holidaysCount,
      env: {
        JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
        JWT_SECRET_VALUE: process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT
      }
    });
  } catch (err) {
    res.json({
      error: err.message,
      stack: err.stack
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
