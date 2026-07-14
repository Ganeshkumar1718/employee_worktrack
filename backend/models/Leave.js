const db = require('../config/db');
const moment = require('moment');

class Leave {
  static async create(leaveData) {
    const { employee_id, leave_type, start_date, end_date, reason, leave_days } = leaveData;
    const result = await db.run(
      'INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, leave_days) VALUES (?, ?, ?, ?, ?, ?)',
      [employee_id, leave_type, start_date, end_date, reason, leave_days || 1]
    );
    return result.id;
  }

  static async findByEmployeeId(employee_id) {
    const rows = await db.query('SELECT * FROM leaves WHERE employee_id = ? ORDER BY created_at DESC', [employee_id]);
    return rows;
  }

  static async getAll() {
    const rows = await db.query('SELECT l.*, e.employee_name, e.department FROM leaves l JOIN employees e ON l.employee_id = e.employee_id ORDER BY l.created_at DESC');
    return rows;
  }

  static async updateStatus(leave_id, status) {
    await db.run('UPDATE leaves SET status = ? WHERE leave_id = ?', [status, leave_id]);
  }

  static async findById(leave_id) {
    const row = await db.get('SELECT * FROM leaves WHERE leave_id = ?', [leave_id]);
    return row;
  }

  static async getLeaveStats(employee_id) {
    const rows = await db.query(
      'SELECT start_date, end_date, status FROM leaves WHERE employee_id = ?',
      [employee_id]
    );

    const appliedDates = new Set();
    const approvedDates = new Set();
    const pendingDates = new Set();
    const rejectedDates = new Set();

    for (const row of rows) {
      const start = moment(row.start_date);
      const end = moment(row.end_date);
      if (start.isValid() && end.isValid()) {
        const current = start.clone();
        while (current.isSameOrBefore(end, 'day')) {
          const dateStr = current.format('YYYY-MM-DD');
          appliedDates.add(dateStr);
          if (row.status === 'approved') {
            approvedDates.add(dateStr);
          } else if (row.status === 'pending') {
            pendingDates.add(dateStr);
          } else if (row.status === 'rejected') {
            rejectedDates.add(dateStr);
          }
          current.add(1, 'days');
        }
      }
    }

    return {
      total_leaves: appliedDates.size,
      approved_leaves: approvedDates.size,
      pending_leaves: pendingDates.size,
      rejected_leaves: rejectedDates.size,
      approved_leave_days: approvedDates.size,
      total_leave_days: appliedDates.size
    };
  }
}

module.exports = Leave;
