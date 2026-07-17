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

      // Check if employee already exists
      const existingEmployee = await Employee.findByEmail(employee_email);
      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee already exists' });
      }

      // Calculate hourly rate
      const monthly_salary = annual_package / 12;
      const working_days = 22;
      const daily_hours = 8;
      const hourly_rate = monthly_salary / (working_days * daily_hours);

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(employee_password, 10);

      const employee_id = await Employee.create({
        employee_name,
        employee_email,
        employee_password: hashedPassword,
        department,
        designation,
        annual_package,
        hourly_rate,
        role: role || 'employee',
        profile_photo: profile_photo || null
      });

      res.status(201).json({ message: 'Employee created successfully', employee_id });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const { employee_name, employee_email, employee_password, department, designation, annual_package, role, profile_photo } = req.body;
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Calculate hourly rate based on new or existing annual package
      const pkg = annual_package !== undefined ? annual_package : employee.annual_package;
      const monthly_salary = pkg / 12;
      const working_days = 22;
      const daily_hours = 8;
      const hourly_rate = monthly_salary / (working_days * daily_hours);

      await Employee.update(req.params.id, {
        employee_name,
        employee_email,
        department,
        designation,
        annual_package: pkg,
        hourly_rate,
        role: role || employee.role,
        profile_photo: profile_photo !== undefined ? profile_photo : employee.profile_photo
      });

      // If password is provided, hash it and update it
      if (employee_password) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(employee_password, 10);
        await Employee.updatePassword(req.params.id, hashedPassword);
      }

      res.json({ message: 'Employee updated successfully' });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({ message: 'Server error' });
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
