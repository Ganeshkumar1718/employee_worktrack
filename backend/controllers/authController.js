const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const authController = {
  register: async (req, res) => {
    try {
      const { employee_name, employee_email, employee_password, department, designation, annual_package, role } = req.body;

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

      // Hash password
      const hashedPassword = await bcrypt.hash(employee_password, 10);

      // Create employee
      const employee_id = await Employee.create({
        employee_name,
        employee_email,
        employee_password: hashedPassword,
        department,
        designation,
        annual_package,
        hourly_rate,
        role: role || 'employee'
      });

      const employee = await Employee.findById(employee_id);

      // Generate JWT token
      const token = jwt.sign(
        { employee_id: employee.employee_id, role: employee.role },
        process.env.JWT_SECRET || 'worktrack_pro_secret_key_2024',
        { expiresIn: '24h' }
      );

      // Single-device enforcement: save as the active token, overwriting any previous session
      await Employee.saveActiveToken(employee.employee_id, token);

      const { employee_password: _, ...employeeData } = employee;

      res.status(201).json({
        message: 'Employee registered successfully',
        token,
        employee: employeeData
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  login: async (req, res) => {
    try {
      const { employee_email, employee_password } = req.body;

      // Find employee
      const employee = await Employee.findByEmail(employee_email);
      if (!employee) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await bcrypt.compare(employee_password, employee.employee_password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { employee_id: employee.employee_id, role: employee.role },
        process.env.JWT_SECRET || 'worktrack_pro_secret_key_2024',
        { expiresIn: '24h' }
      );

      // Single-device enforcement: save as the active token, overwriting any previous session
      await Employee.saveActiveToken(employee.employee_id, token);

      res.json({
        token,
        employee: {
          employee_id: employee.employee_id,
          employee_name: employee.employee_name,
          employee_email: employee.employee_email,
          department: employee.department,
          designation: employee.designation,
          role: employee.role,
          annual_package: employee.annual_package,
          hourly_rate: employee.hourly_rate
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const employee = await Employee.findById(req.user.employee_id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Remove password from response
      const { employee_password, ...employeeData } = employee;
      res.json(employeeData);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { employee_name, employee_email, department, designation, current_password, new_password, confirm_password, profile_photo } = req.body;
      const currentEmployee = await Employee.findById(req.user.employee_id);

      if (!currentEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      if (employee_email !== currentEmployee.employee_email) {
        const existingEmployee = await Employee.findByEmail(employee_email);
        if (existingEmployee && existingEmployee.employee_id !== currentEmployee.employee_id) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ message: 'Current password is required to change your password' });
        }

        if (new_password !== confirm_password) {
          return res.status(400).json({ message: 'New password and confirmation do not match' });
        }

        const passwordMatches = await bcrypt.compare(current_password, currentEmployee.employee_password);
        if (!passwordMatches) {
          return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await Employee.updatePassword(req.user.employee_id, hashedPassword);
      }

      // Only administrators can change department and designation
      const updatedFields = {
        employee_name,
        employee_email,
        department: req.user.role === 'admin' ? department : currentEmployee.department,
        designation: req.user.role === 'admin' ? designation : currentEmployee.designation,
        profile_photo: profile_photo !== undefined ? profile_photo : currentEmployee.profile_photo
      };

      await Employee.updateProfile(req.user.employee_id, updatedFields);

      const updatedEmployee = await Employee.findById(req.user.employee_id);
      const { employee_password, ...employeeData } = updatedEmployee;

      res.json({
        message: 'Profile updated successfully',
        employee: employeeData
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  logout: async (req, res) => {
    try {
      // Clear the active token so that any previously issued tokens for this user become invalid
      await Employee.clearActiveToken(req.user.employee_id);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = authController;
