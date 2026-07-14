const Leave = require('../models/Leave');
const { calculateLeaveDays } = require('../utils/timeFormatter');

const leaveController = {
  applyLeave: async (req, res) => {
    try {
      const { leave_type, start_date, end_date, reason } = req.body;
      const employee_id = req.user.employee_id;

      // Calculate leave days
      const leave_days = calculateLeaveDays(start_date, end_date);

      const leave_id = await Leave.create({
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        leave_days
      });

      res.status(201).json({ message: 'Leave applied successfully', leave_id, leave_days });
    } catch (error) {
      console.error('Apply leave error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMyLeaves: async (req, res) => {
    try {
      const employee_id = req.user.employee_id;
      const leaves = await Leave.findByEmployeeId(employee_id);
      res.json(leaves);
    } catch (error) {
      console.error('Get leaves error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getAllLeaves: async (req, res) => {
    try {
      const leaves = await Leave.getAll();
      res.json(leaves);
    } catch (error) {
      console.error('Get all leaves error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  approveLeave: async (req, res) => {
    try {
      const { leave_id } = req.params;
      await Leave.updateStatus(leave_id, 'approved');
      res.json({ message: 'Leave approved successfully' });
    } catch (error) {
      console.error('Approve leave error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  rejectLeave: async (req, res) => {
    try {
      const { leave_id } = req.params;
      await Leave.updateStatus(leave_id, 'rejected');
      res.json({ message: 'Leave rejected successfully' });
    } catch (error) {
      console.error('Reject leave error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMyLeaveStats: async (req, res) => {
    try {
      const employee_id = req.user.employee_id;
      const stats = await Leave.getLeaveStats(employee_id);
      res.json(stats);
    } catch (error) {
      console.error('Get leave stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = leaveController;
