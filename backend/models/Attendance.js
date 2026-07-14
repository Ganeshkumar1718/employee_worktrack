const db = require('../config/db');

class Attendance {
  static async create(attendanceData) {
    const { employee_id, login_time, attendance_date, work_mode, device_info, ip_address, latitude, longitude } = attendanceData;
    const result = await db.run(
      'INSERT INTO attendance (employee_id, login_time, attendance_date, work_mode, device_info, ip_address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [employee_id, login_time, attendance_date, work_mode, device_info, ip_address, latitude, longitude]
    );
    return result.id;
  }

  static async updateLogout(attendance_id, logout_time, total_hours, workingHours, workingMinutes, workingSeconds, totalWorkingTime) {
    await db.run(
      'UPDATE attendance SET logout_time = ?, total_hours = ?, working_hours = ?, working_minutes = ?, working_seconds = ?, total_working_time = ? WHERE attendance_id = ?',
      [logout_time, total_hours, workingHours, workingMinutes, workingSeconds, totalWorkingTime, attendance_id]
    );
  }

  static async findByEmployeeId(employee_id) {
    const rows = await db.query('SELECT * FROM attendance WHERE employee_id = ? ORDER BY attendance_date DESC', [employee_id]);
    return rows;
  }

  static async findByDate(employee_id, date) {
    const row = await db.get('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ? ORDER BY attendance_id DESC LIMIT 1', [employee_id, date]);
    return row;
  }

  static async findActiveSession(employee_id, date) {
    const row = await db.get('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ? AND logout_time IS NULL ORDER BY attendance_id DESC LIMIT 1', [employee_id, date]);
    return row;
  }

  static async getAll() {
    const rows = await db.query('SELECT a.*, e.employee_name, e.department FROM attendance a JOIN employees e ON a.employee_id = e.employee_id ORDER BY a.attendance_date DESC');
    return rows;
  }

  static async getTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const rows = await db.query('SELECT a.*, e.employee_name, e.department FROM attendance a JOIN employees e ON a.employee_id = e.employee_id WHERE a.attendance_date = ?', [today]);
    return rows;
  }

  static async getEmployeeStats(employee_id, month) {
    const rows = await db.query(
      'SELECT COUNT(DISTINCT attendance_date) as total_days, SUM(total_hours) as total_hours, COUNT(DISTINCT CASE WHEN work_mode = "WFO" THEN attendance_date END) as wfo_days, COUNT(DISTINCT CASE WHEN work_mode = "WFH" THEN attendance_date END) as wfh_days FROM attendance WHERE employee_id = ? AND strftime("%Y-%m", attendance_date) = ?',
      [employee_id, month]
    );
    return rows[0];
  }
}

module.exports = Attendance;
