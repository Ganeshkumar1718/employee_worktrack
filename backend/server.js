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
const employeeStatusRoutes = require('./routes/employee');

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
app.use('/api/employee', employeeStatusRoutes);

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


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
