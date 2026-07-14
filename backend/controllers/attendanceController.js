const Attendance = require('../models/Attendance');
const moment = require('moment');
const { calculateWorkingTime, calculateTotalHours } = require('../utils/timeFormatter');

const attendanceController = {
  login: async (req, res) => {
    try {
      const { work_mode, latitude, longitude, device_info, ip_address } = req.body;
      const employee_id = req.user.employee_id;
      
      const today = moment().format('YYYY-MM-DD');
      const login_time = moment().format('YYYY-MM-DD HH:mm:ss');

      // Check if there's an active session (clocked in but not clocked out)
      const activeSession = await Attendance.findActiveSession(employee_id, today);
      if (activeSession) {
        return res.status(400).json({ message: 'You have an active session. Please clock out first.' });
      }

      const attendance_id = await Attendance.create({
        employee_id,
        login_time,
        attendance_date: today,
        work_mode: work_mode || 'WFO',
        device_info,
        ip_address,
        latitude,
        longitude
      });

      res.status(201).json({ message: 'Login recorded successfully', attendance_id, login_time });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  logout: async (req, res) => {
    try {
      const employee_id = req.user.employee_id;
      const today = moment().format('YYYY-MM-DD');
      const logout_time = moment().format('YYYY-MM-DD HH:mm:ss');

      // Find the most recent active session
      const attendance = await Attendance.findActiveSession(employee_id, today);
      if (!attendance) {
        return res.status(400).json({ message: 'No active session found. Please clock in first.' });
      }

      // Calculate working time using time formatter
      const timeData = calculateWorkingTime(attendance.login_time, logout_time);
      const total_hours = calculateTotalHours(timeData.workingHours, timeData.workingMinutes, timeData.workingSeconds);

      await Attendance.updateLogout(
        attendance.attendance_id,
        logout_time,
        total_hours,
        timeData.workingHours,
        timeData.workingMinutes,
        timeData.workingSeconds,
        timeData.totalWorkingTime
      );

      res.json({ 
        message: 'Logout recorded successfully', 
        logout_time, 
        total_hours,
        workingHours: timeData.workingHours,
        workingMinutes: timeData.workingMinutes,
        workingSeconds: timeData.workingSeconds,
        totalWorkingTime: timeData.totalWorkingTime
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMyAttendance: async (req, res) => {
    try {
      const employee_id = req.user.employee_id;
      const attendance = await Attendance.findByEmployeeId(employee_id);
      res.json(attendance);
    } catch (error) {
      console.error('Get attendance error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getAllAttendance: async (req, res) => {
    try {
      const attendance = await Attendance.getAll();
      res.json(attendance);
    } catch (error) {
      console.error('Get all attendance error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getTodayAttendance: async (req, res) => {
    try {
      const attendance = await Attendance.getTodayAttendance();
      res.json(attendance);
    } catch (error) {
      console.error('Get today attendance error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMyStats: async (req, res) => {
    try {
      const employee_id = req.user.employee_id;
      const month = req.query.month || moment().format('YYYY-MM');
      const stats = await Attendance.getEmployeeStats(employee_id, month);
      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  autoClockout: async (req, res) => {
    try {
      const employee_id = req.user.employee_id;
      const today = moment().format('YYYY-MM-DD');
      const logout_time = moment().format('YYYY-MM-DD HH:mm:ss');

      // Find the most recent active session
      const attendance = await Attendance.findActiveSession(employee_id, today);
      if (!attendance) {
        return res.status(400).json({ message: 'No active session found for auto clockout' });
      }

      // Calculate working time using time formatter
      const timeData = calculateWorkingTime(attendance.login_time, logout_time);
      const total_hours = calculateTotalHours(timeData.workingHours, timeData.workingMinutes, timeData.workingSeconds);

      await Attendance.updateLogout(
        attendance.attendance_id,
        logout_time,
        total_hours,
        timeData.workingHours,
        timeData.workingMinutes,
        timeData.workingSeconds,
        timeData.totalWorkingTime
      );

      res.json({ 
        message: 'Auto clockout recorded successfully', 
        logout_time, 
        total_hours,
        workingHours: timeData.workingHours,
        workingMinutes: timeData.workingMinutes,
        workingSeconds: timeData.workingSeconds,
        totalWorkingTime: timeData.totalWorkingTime
      });
    } catch (error) {
      console.error('Auto clockout error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = attendanceController;
