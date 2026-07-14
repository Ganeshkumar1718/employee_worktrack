const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Apply for leave (protected)
router.post('/apply', authMiddleware, leaveController.applyLeave);

// Get my leaves (protected)
router.get('/my', authMiddleware, leaveController.getMyLeaves);

// Get my leave stats (protected)
router.get('/my/stats', authMiddleware, leaveController.getMyLeaveStats);

// Get all leaves (admin only)
router.get('/all', authMiddleware, adminMiddleware, leaveController.getAllLeaves);

// Approve leave (admin only)
router.put('/approve/:leave_id', authMiddleware, adminMiddleware, leaveController.approveLeave);

// Reject leave (admin only)
router.put('/reject/:leave_id', authMiddleware, adminMiddleware, leaveController.rejectLeave);

module.exports = router;
