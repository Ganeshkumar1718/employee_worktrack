const db = require('../config/db');

const Task = {
  create: async (taskData) => {
    const { admin_id, employee_id, title, description } = taskData;
    const result = await db.run(
      'INSERT INTO tasks (admin_id, employee_id, title, description) VALUES (?, ?, ?, ?)',
      [admin_id, employee_id, title, description]
    );
    return result.id;
  },

  getAll: async () => {
    return await db.query(`
      SELECT t.*, e.employee_name, a.employee_name as admin_name 
      FROM tasks t
      LEFT JOIN employees e ON t.employee_id = e.employee_id
      LEFT JOIN employees a ON t.admin_id = a.employee_id
      ORDER BY t.created_at DESC
    `);
  },

  getByEmployeeId: async (employee_id) => {
    return await db.query(`
      SELECT t.*, a.employee_name as admin_name 
      FROM tasks t
      LEFT JOIN employees a ON t.admin_id = a.employee_id
      WHERE t.employee_id = ?
      ORDER BY t.created_at DESC
    `, [employee_id]);
  },

  updateStatus: async (task_id, status, employee_reply = null) => {
    const completed_at = status === 'completed' ? new Date().toISOString() : null;
    await db.run(
      'UPDATE tasks SET status = ?, employee_reply = ?, completed_at = ? WHERE task_id = ?',
      [status, employee_reply, completed_at, task_id]
    );
    return true;
  },

  getMessages: async (task_id) => {
    return await db.query(`
      SELECT m.*, e.employee_name as sender_name
      FROM task_messages m
      LEFT JOIN employees e ON m.sender_id = e.employee_id
      WHERE m.task_id = ?
      ORDER BY m.created_at ASC
    `, [task_id]);
  },

  markMessagesAsSeen: async (task_id, receiver_role) => {
    // If receiver is admin, we mark messages sent by employee as seen.
    // If receiver is employee, we mark messages sent by admin as seen.
    const sender_role = receiver_role === 'admin' ? 'employee' : 'admin';
    await db.run(`
      UPDATE task_messages
      SET is_seen = 1
      WHERE task_id = ? AND sender_role = ? AND is_seen = 0
    `, [task_id, sender_role]);
    return true;
  },

  createMessage: async (messageData) => {
    const { task_id, sender_id, sender_role, message } = messageData;
    const result = await db.run(`
      INSERT INTO task_messages (task_id, sender_id, sender_role, message, is_seen)
      VALUES (?, ?, ?, ?, 0)
    `, [task_id, sender_id, sender_role, message]);
    return result.id;
  }
};

module.exports = Task;
