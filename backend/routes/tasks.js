const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Admin routes
router.post('/assign', authMiddleware, adminMiddleware, taskController.assignTask);
router.get('/all', authMiddleware, adminMiddleware, taskController.getAllTasks);

// Employee routes
router.get('/my', authMiddleware, taskController.getMyTasks);
router.put('/:id/complete', authMiddleware, taskController.replyAndCompleteTask);

// Task messaging routes (both admin and employee)
router.get('/:id/messages', authMiddleware, taskController.getTaskMessages);
router.post('/:id/messages', authMiddleware, taskController.sendTaskMessage);

module.exports = router;
