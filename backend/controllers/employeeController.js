const Employee = require('../models/Employee');

const employeeController = {
  getAllEmployees: async (req, res) => {
    try {
      const employees = await Employee.getAll();
      res.json(employees);
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getEmployeeById: async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      const { employee_password, ...employeeData } = employee;
      res.json(employeeData);
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  createEmployee: async (req, res) => {
    try {
      const { employee_name, employee_email, employee_password, department, designation, annual_package, role, profile_photo } = req.body;

      if (!employee_name || !employee_email || !employee_password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
      }

      // Check if employee already exists
      const existingEmployee = await Employee.findByEmail(employee_email);
      if (existingEmployee) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      const normalizedRole = (role === 'admin' || role === 'employer') ? 'admin' : (role || 'employee');

      // Calculate hourly rate safely
      const packageValue = (annual_package !== undefined && annual_package !== null && annual_package !== '') ? Number(annual_package) : 0;
      const monthly_salary = packageValue / 12;
      const working_days = 22;
      const daily_hours = 8;
      const hourly_rate = packageValue > 0 ? (monthly_salary / (working_days * daily_hours)) : 0;

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(employee_password, 10);

      const employee_id = await Employee.create({
        employee_name,
        employee_email,
        employee_password: hashedPassword,
        department: department || (normalizedRole === 'admin' ? 'Management' : 'General'),
        designation: designation || (normalizedRole === 'admin' ? 'Employer / Administrator' : 'Staff Member'),
        annual_package: packageValue,
        hourly_rate: Number(hourly_rate.toFixed(2)),
        role: normalizedRole,
        profile_photo: profile_photo || null
      });

      res.status(201).json({ message: 'Account created successfully', employee_id });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ message: 'Server error creating account' });
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const { employee_name, employee_email, employee_password, department, designation, annual_package, role, profile_photo } = req.body;
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if email already in use by another user
      if (employee_email && employee_email !== employee.employee_email) {
        const existingEmployee = await Employee.findByEmail(employee_email);
        if (existingEmployee && existingEmployee.employee_id !== Number(req.params.id)) {
          return res.status(400).json({ message: 'Email is already in use by another account' });
        }
      }

      // Calculate hourly rate based on new or existing annual package
      const packageValue = (annual_package !== undefined && annual_package !== null && annual_package !== '') ? Number(annual_package) : (employee.annual_package || 0);
      const monthly_salary = packageValue / 12;
      const working_days = 22;
      const daily_hours = 8;
      const hourly_rate = packageValue > 0 ? (monthly_salary / (working_days * daily_hours)) : 0;

      const normalizedRole = (role === 'admin' || role === 'employer') ? 'admin' : (role || employee.role);

      await Employee.update(req.params.id, {
        employee_name: employee_name || employee.employee_name,
        employee_email: employee_email || employee.employee_email,
        department: department !== undefined ? department : employee.department,
        designation: designation !== undefined ? designation : employee.designation,
        annual_package: packageValue,
        hourly_rate: Number(hourly_rate.toFixed(2)),
        role: normalizedRole,
        profile_photo: profile_photo !== undefined ? profile_photo : employee.profile_photo
      });

      // If password is provided, hash it and update it
      if (employee_password && employee_password.trim() !== '') {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(employee_password, 10);
        await Employee.updatePassword(req.params.id, hashedPassword);
      }

      res.json({ message: 'Account updated successfully' });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({ message: 'Server error updating account' });
    }
  },

  deleteEmployee: async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      await Employee.delete(req.params.id);
      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
module.exports = employeeController;
