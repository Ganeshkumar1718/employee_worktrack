const db = require('../config/db');
const { calculateTotalWorkingTime } = require('../utils/timeFormatter');

class Salary {
  static async calculateSalary(employee_id, month, worked_hours, working_time, hourly_rate) {
    const salary_amount = worked_hours * hourly_rate;
    
    // Check if salary already exists for this month
    const existing = await db.get(
      'SELECT salary_id FROM salary WHERE employee_id = ? AND month = ?',
      [employee_id, month]
    );
    
    if (existing) {
      await db.run(
        'UPDATE salary SET worked_hours = ?, working_time = ?, hourly_rate = ?, salary_amount = ?, calculated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND month = ?',
        [worked_hours, working_time, hourly_rate, salary_amount, employee_id, month]
      );
      return existing.salary_id;
    } else {
      const result = await db.run(
        'INSERT INTO salary (employee_id, month, worked_hours, working_time, hourly_rate, salary_amount) VALUES (?, ?, ?, ?, ?, ?)',
        [employee_id, month, worked_hours, working_time, hourly_rate, salary_amount]
      );
      return result.id;
    }
  }

  static async findByEmployeeId(employee_id) {
    const rows = await db.query('SELECT * FROM salary WHERE employee_id = ? ORDER BY month DESC', [employee_id]);
    return rows;
  }

  static async getAll() {
    const rows = await db.query('SELECT s.*, e.employee_name, e.department FROM salary s JOIN employees e ON s.employee_id = e.employee_id ORDER BY s.month DESC');
    return rows;
  }

  static async getByMonth(month) {
    const rows = await db.query('SELECT s.*, e.employee_name, e.department FROM salary s JOIN employees e ON s.employee_id = e.employee_id WHERE s.month = ? ORDER BY s.salary_amount DESC', [month]);
    return rows;
  }

  static async getMonthlyStats(month) {
    const rows = await db.query(
      'SELECT COUNT(*) as total_employees, SUM(salary_amount) as total_payout, AVG(salary_amount) as avg_salary FROM salary WHERE month = ?',
      [month]
    );
    return rows[0];
  }
}

module.exports = Salary;
