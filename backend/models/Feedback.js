const db = require('../config/db');

const Feedback = {
  create: async (feedbackData) => {
    const { employee_id, feedback_text } = feedbackData;
    const result = await db.run(
      'INSERT INTO feedback (employee_id, feedback_text) VALUES (?, ?)',
      [employee_id, feedback_text]
    );
    return result.id;
  },

  getAll: async () => {
    return await db.query(`
      SELECT f.*, e.employee_name, e.department, e.designation
      FROM feedback f
      JOIN employees e ON f.employee_id = e.employee_id
      ORDER BY f.created_at DESC
    `);
  }
};

module.exports = Feedback;
