const Feedback = require('../models/Feedback');

const feedbackController = {
  submitFeedback: async (req, res) => {
    try {
      const { feedback_text } = req.body;
      const employee_id = req.user.employee_id;

      if (!feedback_text || !feedback_text.trim()) {
        return res.status(400).json({ message: 'Feedback text is required' });
      }

      const feedback_id = await Feedback.create({
        employee_id,
        feedback_text: feedback_text.trim()
      });

      res.status(201).json({ message: 'Feedback submitted successfully', feedback_id });
    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getAllFeedback: async (req, res) => {
    try {
      const feedbackList = await Feedback.getAll();
      res.json(feedbackList);
    } catch (error) {
      console.error('Get all feedback error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = feedbackController;
