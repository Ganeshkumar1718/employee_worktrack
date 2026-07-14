const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Get all holidays (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const holidays = await db.query('SELECT * FROM holidays ORDER BY holiday_date ASC');
    res.json(holidays);
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
