const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all employees (admin only)
router.get('/', authMiddleware, adminMiddleware, employeeController.getAllEmployees);

// Get employee by ID (admin only)
router.get('/:id', authMiddleware, adminMiddleware, employeeController.getEmployeeById);

// Create employee (admin only)
router.post('/', authMiddleware, adminMiddleware, employeeController.createEmployee);

// Update employee (admin only)
router.put('/:id', authMiddleware, adminMiddleware, employeeController.updateEmployee);

// Delete employee (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, employeeController.deleteEmployee);

module.exports = router;
