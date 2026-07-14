const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Logout (protected) - clears active_token server-side
router.post('/logout', authMiddleware, authController.logout);

// Get Profile (protected)
router.get('/profile', authMiddleware, authController.getProfile);

// Update Profile (protected)
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
