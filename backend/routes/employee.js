const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { authMiddleware } = require('../middleware/auth');

router.post('/status', authMiddleware, async (req, res) => {
  try {
    const { employeeId, status, lastActivity } = req.body;

    if (!employeeId || !status || !lastActivity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (status !== 'Active' && status !== 'Inactive') {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Security check: Make sure employees can only update their own status (unless admin)
    if (req.user.role !== 'admin' && Number(req.user.employee_id) !== Number(employeeId)) {
      return res.status(403).json({ message: 'Unauthorized status update' });
    }

    await Employee.updateStatus(employeeId, status, lastActivity);
    res.json({ message: 'Status updated successfully', status, lastActivity });
  } catch (error) {
    console.error('Update employee status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
