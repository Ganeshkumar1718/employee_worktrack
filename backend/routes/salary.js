const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Calculate salary (admin only)
router.post('/calculate', authMiddleware, adminMiddleware, salaryController.calculateSalary);

// Calculate all salaries (admin only)
router.post('/calculate-all', authMiddleware, adminMiddleware, salaryController.calculateAllSalaries);

// Get my salary (protected)
router.get('/my', authMiddleware, salaryController.getMySalary);

// Get all salaries (admin only)
router.get('/all', authMiddleware, adminMiddleware, salaryController.getAllSalaries);

// Get salaries by month (admin only)
router.get('/month/:month', authMiddleware, adminMiddleware, salaryController.getSalariesByMonth);

// Get monthly stats (admin only)
router.get('/stats/:month', authMiddleware, adminMiddleware, salaryController.getMonthlyStats);

module.exports = router;
