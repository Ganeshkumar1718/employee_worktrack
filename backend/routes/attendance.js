const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Login (protected)
router.post('/login', authMiddleware, attendanceController.login);

// Logout (protected)
router.post('/logout', authMiddleware, attendanceController.logout);

// Get my attendance (protected)
router.get('/my', authMiddleware, attendanceController.getMyAttendance);

// Get my stats (protected)
router.get('/my/stats', authMiddleware, attendanceController.getMyStats);

// Get my summary (protected)
router.get('/summary/my', authMiddleware, attendanceController.getMySummary);

// Get employee summary (admin only)
router.get('/summary/:employee_id', authMiddleware, adminMiddleware, attendanceController.getEmployeeSummary);

// Get system idle time (protected)
router.get('/system-idle', authMiddleware, attendanceController.getSystemIdleTime);

// Get all attendance (admin only)
router.get('/all', authMiddleware, adminMiddleware, attendanceController.getAllAttendance);

// Get today's attendance (admin only)
router.get('/today', authMiddleware, adminMiddleware, attendanceController.getTodayAttendance);

// Auto clockout (protected)
router.post('/auto-clockout', authMiddleware, attendanceController.autoClockout);

module.exports = router;
