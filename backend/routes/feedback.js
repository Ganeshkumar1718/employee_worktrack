const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Submit feedback (Employee)
router.post('/', authMiddleware, feedbackController.submitFeedback);

// View all feedback (Admin only)
router.get('/', authMiddleware, adminMiddleware, feedbackController.getAllFeedback);

module.exports = router;
