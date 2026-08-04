const db = require('../config/db');

const LoginHistory = {
  create: async (data) => {
    const {
      employee_id,
      employee_name,
      employee_email,
      role = 'employee',
      login_time = new Date().toISOString(),
      ip_address = '127.0.0.1',
      device_info = 'Web Browser',
      user_agent = '',
      status = 'Success'
    } = data;

    const result = await db.run(
      `INSERT INTO login_history 
       (employee_id, employee_name, employee_email, role, login_time, ip_address, device_info, user_agent, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, employee_name, employee_email, role, login_time, ip_address, device_info, user_agent, status]
    );

    return result.lastID;
  },

  getAll: async (limit = 100) => {
    return await db.query(
      `SELECT lh.*, e.department, e.designation, e.profile_photo 
       FROM login_history lh
       LEFT JOIN employees e ON lh.employee_id = e.employee_id
       ORDER BY lh.login_time DESC 
       LIMIT ?`,
      [limit]
    );
  },

  findByEmployeeId: async (employee_id, limit = 50) => {
    return await db.query(
      `SELECT * FROM login_history 
       WHERE employee_id = ? 
       ORDER BY login_time DESC 
       LIMIT ?`,
      [employee_id, limit]
    );
  },

  getRecentToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    return await db.query(
      `SELECT lh.*, e.department, e.designation 
       FROM login_history lh
       LEFT JOIN employees e ON lh.employee_id = e.employee_id
       WHERE DATE(lh.login_time) = ? 
       ORDER BY lh.login_time DESC`,
      [today]
    );
  }
};

module.exports = LoginHistory;
