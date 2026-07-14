const Salary = require('../models/Salary');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { calculateTotalWorkingTime } = require('../utils/timeFormatter');

const salaryController = {
  calculateSalary: async (req, res) => {
    try {
      const { employee_id, month } = req.body;
      
      // Get employee details
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Get total worked hours for the month
      const stats = await Attendance.getEmployeeStats(employee_id, month);
      const worked_hours = stats.total_hours || 0;
      
      // Calculate total working time in H:M:S format
      const working_time = calculateTotalWorkingTime(worked_hours);

      // Calculate salary
      const salary_id = await Salary.calculateSalary(
        employee_id,
        month,
        worked_hours,
        working_time,
        employee.hourly_rate
      );

      res.json({ message: 'Salary calculated successfully', salary_id, worked_hours, working_time, salary_amount: worked_hours * employee.hourly_rate });
    } catch (error) {
      console.error('Calculate salary error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMySalary: async (req, res) => {
    try {
      const employee_id = req.user.employee_id;
      const salaries = await Salary.findByEmployeeId(employee_id);
      res.json(salaries);
    } catch (error) {
      console.error('Get salary error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getAllSalaries: async (req, res) => {
    try {
      const salaries = await Salary.getAll();
      res.json(salaries);
    } catch (error) {
      console.error('Get all salaries error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getSalariesByMonth: async (req, res) => {
    try {
      const { month } = req.params;
      const salaries = await Salary.getByMonth(month);
      res.json(salaries);
    } catch (error) {
      console.error('Get salaries by month error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMonthlyStats: async (req, res) => {
    try {
      const { month } = req.params;
      const stats = await Salary.getMonthlyStats(month);
      res.json(stats);
    } catch (error) {
      console.error('Get monthly stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  calculateAllSalaries: async (req, res) => {
    try {
      const { month } = req.body;
      const employees = await Employee.getAll();
      
      const results = [];
      for (const employee of employees) {
        const stats = await Attendance.getEmployeeStats(employee.employee_id, month);
        const worked_hours = stats.total_hours || 0;
        
        // Calculate total working time in H:M:S format
        const working_time = calculateTotalWorkingTime(worked_hours);
        
        const salary_id = await Salary.calculateSalary(
          employee.employee_id,
          month,
          worked_hours,
          working_time,
          employee.hourly_rate
        );
        
        results.push({
          employee_id: employee.employee_id,
          employee_name: employee.employee_name,
          worked_hours,
          working_time,
          salary_amount: worked_hours * employee.hourly_rate
        });
      }

      res.json({ message: 'All salaries calculated successfully', results });
    } catch (error) {
      console.error('Calculate all salaries error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = salaryController;
