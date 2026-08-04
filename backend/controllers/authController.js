const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const LoginHistory = require('../models/LoginHistory');

const authController = {
  register: async (req, res) => {
    try {
      const { employee_name, employee_email, employee_password, department, designation, annual_package, role } = req.body;

      if (!employee_name || !employee_email || !employee_password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
      }

      // Check if employee/employer already exists
      const existingEmployee = await Employee.findByEmail(employee_email.trim().toLowerCase());
      if (existingEmployee) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      // Normalize role: employer / admin -> admin, otherwise employee
      const normalizedRole = (role === 'employer' || role === 'admin') ? 'admin' : 'employee';

      // Calculate hourly rate safely (prevent NaN)
      const packageValue = (annual_package !== undefined && annual_package !== null && annual_package !== '') ? Number(annual_package) : 0;
      const monthly_salary = packageValue / 12;
      const daily_rate = monthly_salary / 22;
      const hourly_rate = (daily_rate / 8) || 0;

      // Hash password
      const hashedPassword = await bcrypt.hash(employee_password, 10);

      // Create employee / employer record
      const employeeId = await Employee.create({
        employee_name: employee_name.trim(),
        employee_email: employee_email.trim().toLowerCase(),
        employee_password: hashedPassword,
        department: department ? department.trim() : (normalizedRole === 'admin' ? 'Management' : 'General'),
        designation: designation ? designation.trim() : (normalizedRole === 'admin' ? 'Employer / Administrator' : 'Staff'),
        annual_package: packageValue,
        hourly_rate: Number(hourly_rate.toFixed(2)),
        role: normalizedRole
      });

      // Generate JWT token
      const token = jwt.sign(
        { employee_id: employeeId, role: normalizedRole },
        process.env.JWT_SECRET || 'worktrack_pro_secret_key_2024',
        { expiresIn: '24h' }
      );

      // Save active session token
      await Employee.saveActiveToken(employeeId, token);

      // Record initial login in database
      const login_time = new Date().toISOString();
      const ip_address = req.body.ip_address || 
        req.headers['x-forwarded-for']?.split(',')[0].trim() || 
        req.socket.remoteAddress || 
        req.ip || 
        '127.0.0.1';
      const user_agent = req.headers['user-agent'] || '';
      const device_info = req.body.device_info || (
        user_agent.includes('Mobile') ? 'Mobile Device' :
        user_agent.includes('Windows') ? 'Windows PC' :
        user_agent.includes('Mac') ? 'Mac OS' :
        user_agent.includes('Linux') ? 'Linux PC' : 'Web Browser'
      );

      await Employee.recordLogin(employeeId, login_time);
      await LoginHistory.create({
        employee_id: employeeId,
        employee_name: employee_name.trim(),
        employee_email: employee_email.trim().toLowerCase(),
        role: normalizedRole,
        login_time,
        ip_address,
        device_info,
        user_agent,
        status: 'Registered & Logged In'
      });

      res.status(201).json({
        token,
        employee: {
          employee_id: employeeId,
          employee_name: employee_name.trim(),
          employee_email: employee_email.trim().toLowerCase(),
          department: department ? department.trim() : (normalizedRole === 'admin' ? 'Management' : 'General'),
          designation: designation ? designation.trim() : (normalizedRole === 'admin' ? 'Employer / Administrator' : 'Staff'),
          role: normalizedRole,
          annual_package: packageValue,
          hourly_rate: Number(hourly_rate.toFixed(2)),
          last_login: login_time
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  },

  login: async (req, res) => {
    try {
      const { employee_email, employee_password } = req.body;

      const ip_address = req.body.ip_address || 
        req.headers['x-forwarded-for']?.split(',')[0].trim() || 
        req.socket.remoteAddress || 
        req.ip || 
        '127.0.0.1';
      const user_agent = req.headers['user-agent'] || '';
      const device_info = req.body.device_info || (
        user_agent.includes('Mobile') ? 'Mobile Device' :
        user_agent.includes('Windows') ? 'Windows PC' :
        user_agent.includes('Mac') ? 'Mac OS' :
        user_agent.includes('Linux') ? 'Linux PC' : 'Web Browser'
      );

      // Find employee
      const employee = await Employee.findByEmail(employee_email ? employee_email.trim().toLowerCase() : '');
      if (!employee) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await bcrypt.compare(employee_password, employee.employee_password);
      if (!isMatch) {
        // Record failed login attempt for audit
        try {
          await LoginHistory.create({
            employee_id: employee.employee_id,
            employee_name: employee.employee_name,
            employee_email: employee.employee_email,
            role: employee.role,
            login_time: new Date().toISOString(),
            ip_address,
            device_info,
            user_agent,
            status: 'Failed (Wrong Password)'
          });
        } catch (e) {
          console.error('Failed to log failed login attempt:', e);
        }
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { employee_id: employee.employee_id, role: employee.role },
        process.env.JWT_SECRET || 'worktrack_pro_secret_key_2024',
        { expiresIn: '24h' }
      );

      const login_time = new Date().toISOString();

      // Save active session token and update last login / activity in database
      await Employee.saveActiveToken(employee.employee_id, token);
      await Employee.recordLogin(employee.employee_id, login_time);

      // Store complete login details in database login_history table
      await LoginHistory.create({
        employee_id: employee.employee_id,
        employee_name: employee.employee_name,
        employee_email: employee.employee_email,
        role: employee.role,
        login_time,
        ip_address,
        device_info,
        user_agent,
        status: 'Success'
      });

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
          hourly_rate: employee.hourly_rate,
          profile_photo: employee.profile_photo,
          status: 'Active',
          last_login: login_time
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
  },

  getLoginHistory: async (req, res) => {
    try {
      const user = req.user;
      let history;
      if (user.role === 'admin') {
        history = await LoginHistory.getAll(req.query.limit ? parseInt(req.query.limit) : 100);
      } else {
        history = await LoginHistory.findByEmployeeId(user.employee_id, req.query.limit ? parseInt(req.query.limit) : 50);
      }
      res.json(history);
    } catch (error) {
      console.error('Get login history error:', error);
      res.status(500).json({ message: 'Server error fetching login history' });
    }
  }
};

module.exports = authController;
