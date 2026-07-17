const db = require('../config/db');

class Employee {
  static async create(employeeData) {
    const { employee_name, employee_email, employee_password, department, designation, annual_package, hourly_rate, role, profile_photo } = employeeData;
    const result = await db.run(
      'INSERT INTO employees (employee_name, employee_email, employee_password, department, designation, annual_package, hourly_rate, role, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [employee_name, employee_email, employee_password, department, designation, annual_package, hourly_rate, role, profile_photo || null]
    );
    return result.id;
  }

  static async findByEmail(email) {
    const row = await db.get('SELECT * FROM employees WHERE employee_email = ?', [email]);
    return row;
  }

  static async findById(id) {
    const row = await db.get('SELECT * FROM employees WHERE employee_id = ?', [id]);
    return row;
  }

  static async getAll() {
    const rows = await db.query('SELECT employee_id, employee_name, employee_email, department, designation, annual_package, hourly_rate, role, profile_photo, created_at FROM employees');
    return rows;
  }

  static async update(id, employeeData) {
    const { employee_name, employee_email, department, designation, annual_package, hourly_rate, role, profile_photo } = employeeData;
    await db.run(
      'UPDATE employees SET employee_name = ?, employee_email = ?, department = ?, designation = ?, annual_package = ?, hourly_rate = ?, role = ?, profile_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?',
      [employee_name, employee_email, department, designation, annual_package, hourly_rate, role, profile_photo, id]
    );
  }

  static async updateProfile(id, profileData) {
    const { employee_name, employee_email, department, designation, profile_photo } = profileData;
    await db.run(
      'UPDATE employees SET employee_name = ?, employee_email = ?, department = ?, designation = ?, profile_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?',
      [employee_name, employee_email, department, designation, profile_photo, id]
    );
  }

  static async updatePassword(id, hashedPassword) {
    await db.run(
      'UPDATE employees SET employee_password = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?',
      [hashedPassword, id]
    );
  }

  static async saveActiveToken(id, token) {
    await db.run(
      'UPDATE employees SET active_token = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?',
      [token, id]
    );
  }

  static async getActiveToken(id) {
    const row = await db.get('SELECT active_token FROM employees WHERE employee_id = ?', [id]);
    return row ? row.active_token : null;
  }

  static async clearActiveToken(id) {
    await db.run(
      'UPDATE employees SET active_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?',
      [id]
    );
  }

  static async updateStatus(id, status, lastActivity) {
    await db.run(
      'UPDATE employees SET status = ?, last_activity = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?',
      [status, lastActivity, id]
    );
  }

  static async delete(id) {
    await db.run('DELETE FROM employees WHERE employee_id = ?', [id]);
  }
}

module.exports = Employee;
