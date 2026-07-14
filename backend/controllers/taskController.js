const Task = require('../models/Task');

const taskController = {
  assignTask: async (req, res) => {
    try {
      const { employee_id, title, description } = req.body;
      const admin_id = req.user.employee_id;

      if (!employee_id || !title || !description) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const task_id = await Task.create({
        admin_id,
        employee_id,
        title,
        description
      });

      res.status(201).json({ message: 'Task assigned successfully', task_id });
    } catch (error) {
      console.error('Assign task error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getAllTasks: async (req, res) => {
    try {
      const tasks = await Task.getAll();
      res.json(tasks);
    } catch (error) {
      console.error('Get all tasks error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMyTasks: async (req, res) => {
    try {
      const employee_id = req.user.employee_id;
      const tasks = await Task.getByEmployeeId(employee_id);
      res.json(tasks);
    } catch (error) {
      console.error('Get my tasks error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  replyAndCompleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      const { employee_reply } = req.body;

      if (!employee_reply) {
        return res.status(400).json({ message: 'Reply message is required to complete the task' });
      }

      await Task.updateStatus(id, 'completed', employee_reply);
      res.json({ message: 'Task marked as completed' });
    } catch (error) {
      console.error('Complete task error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getTaskMessages: async (req, res) => {
    try {
      const { id } = req.params;
      const role = req.user.role;
      await Task.markMessagesAsSeen(id, role);
      const messages = await Task.getMessages(id);
      res.json(messages);
    } catch (error) {
      console.error('Get task messages error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  sendTaskMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const sender_id = req.user.employee_id;
      const sender_role = req.user.role;

      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      const message_id = await Task.createMessage({
        task_id: id,
        sender_id,
        sender_role,
        message
      });

      res.status(201).json({ message: 'Message sent successfully', message_id });
    } catch (error) {
      console.error('Send task message error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = taskController;
