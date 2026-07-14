import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, 
  Users, 
  DollarSign, 
  FileText,
  CheckCircle,
  XCircle,
  Download,
  Search,
  Bell,
  CheckSquare,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import ProfileModal from '../components/ProfileModal';
import TaskChatModal from '../components/TaskChatModal';
import { notifySuccess, notifyError, notifyWarning, notifyInfo, requestNotificationPermission } from '../utils/notifications';

const AdminDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [taskForm, setTaskForm] = useState({ employee_id: '', title: '', description: '' });
  const [toast, setToast] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    employee_name: '',
    employee_email: '',
    employee_password: '',
    department: '',
    designation: '',
    annual_package: '',
    role: 'employee'
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedTaskForChat, setSelectedTaskForChat] = useState(null);
  const isInitialTasksLoaded = useRef(false);
  const notificationsRef = useRef(null);

  const showNotification = useCallback((message, type = 'success') => {
    setToast({ message, type });
    // Auto-dismiss in-app toast after 5 seconds
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 5000);

    // Call browser system notification helper
    if (type === 'success') notifySuccess(message);
    else if (type === 'error') notifyError(message);
    else if (type === 'warning') notifyWarning(message);
    else notifyInfo(message);
  }, []);

  const getEmployeeStatus = (employeeId) => {
    const today = new Date().toISOString().split('T')[0];
    const isOnline = attendance.some(a => a.employee_id === employeeId && a.attendance_date === today && !a.logout_time);
    if (isOnline) return 'Online';
    const isOnLeave = leaves.some(l => l.employee_id === employeeId && l.status === 'approved' && today >= l.start_date && today <= l.end_date);
    if (isOnLeave) return 'On Leave';
    return 'Offline';
  };

  const filteredEmployees = employees.map(emp => ({
    ...emp,
    current_status: getEmployeeStatus(emp.employee_id)
  })).filter(emp => {
    const matchesSearch = emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.employee_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          emp.current_status.toLowerCase() === statusFilter.toLowerCase().replace('_', ' ');
    return matchesSearch && matchesStatus;
  });

  const onlineEmployeesCount = employees.filter(emp => getEmployeeStatus(emp.employee_id) === 'Online').length;
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const markAsRead = (id) => {
    setReadNotifications(prev => {
      const updated = [...prev, id];
      localStorage.setItem('read_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const notificationsPendingLeaves = pendingLeaves.filter(l => !readNotifications.includes(`leave-${l.leave_id}`));
  const notificationsCompletedTasks = completedTasks.filter(t => !readNotifications.includes(`task-${t.task_id}`));
  const notificationCount = notificationsPendingLeaves.length + notificationsCompletedTasks.length;

  const authConfig = useCallback(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }), []);

  const fetchData = useCallback(async () => {
    try {
      const [employeesRes, attendanceRes, leavesRes, salariesRes, tasksRes, feedbackRes] = await Promise.all([
        axios.get('http://localhost:5003/api/employees', authConfig()),
        axios.get('http://localhost:5003/api/attendance/all', authConfig()),
        axios.get('http://localhost:5003/api/leaves/all', authConfig()),
        axios.get('http://localhost:5003/api/salary/all', authConfig()),
        axios.get('http://localhost:5003/api/tasks/all', authConfig()),
        axios.get('http://localhost:5003/api/feedback', authConfig())
      ]);
      setEmployees(employeesRes.data);
      setAttendance(attendanceRes.data);
      setLeaves(leavesRes.data);
      setSalaries(salariesRes.data);
      setTasks(tasksRes.data);
      setFeedbacks(feedbackRes.data);
      isInitialTasksLoaded.current = true;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [authConfig]);

  useEffect(() => {
    requestNotificationPermission();
    fetchData();
    const pollInterval = setInterval(async () => {
      try {
        const tasksRes = await axios.get('http://localhost:5003/api/tasks/all', authConfig());
        setTasks(prevTasks => {
          const prevCompleted = prevTasks.filter(t => t.status === 'completed').length;
          const newCompleted = tasksRes.data.filter(t => t.status === 'completed').length;
          if (isInitialTasksLoaded.current && newCompleted > prevCompleted) {
            showNotification('An employee just completed a task!', 'success');
          }
          return tasksRes.data;
        });
      } catch (err) {}
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchData, authConfig, showNotification]);

  // Lock body scroll when salary dialog is open
  useEffect(() => {
    if (showSalaryDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSalaryDialog]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await axios.put(`http://localhost:5003/api/employees/${editingEmployee.employee_id}`, employeeForm, authConfig());
        showNotification('Employee updated successfully', 'success');
      } else {
        await axios.post('http://localhost:5003/api/employees', employeeForm, authConfig());
        showNotification('Employee created successfully', 'success');
      }
      setEmployeeForm({
        employee_name: '',
        employee_email: '',
        employee_password: '',
        department: '',
        designation: '',
        annual_package: '',
        role: 'employee'
      });
      setEditingEmployee(null);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      employee_name: employee.employee_name,
      employee_email: employee.employee_email,
      employee_password: '',
      department: employee.department,
      designation: employee.designation,
      annual_package: employee.annual_package,
      role: employee.role
    });
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await axios.delete(`http://localhost:5003/api/employees/${employeeId}`, authConfig());
        showNotification('Employee deleted successfully', 'success');
        fetchData();
      } catch (error) {
        showNotification(error.response?.data?.message || 'Delete failed', 'error');
      }
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5003/api/tasks/assign', taskForm, authConfig());
      showNotification('Task assigned successfully', 'success');
      setTaskForm({ employee_id: '', title: '', description: '' });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Task assignment failed', 'error');
    }
  };

  const handleLeaveAction = async (leaveId, action) => {
    try {
      await axios.put(`http://localhost:5003/api/leaves/${action}/${leaveId}`, {}, authConfig());
      showNotification(`Leave ${action}d successfully`, 'success');
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleCalculateAllSalaries = async () => {
    try {
      await axios.post('http://localhost:5003/api/salary/calculate-all', { month: salaryMonth }, authConfig());
      showNotification('All salaries calculated successfully', 'success');
      setShowSalaryDialog(false);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Calculation failed', 'error');
    }
  };

  const handleLogoutClick = async () => {
    try {
      // Call server-side logout to clear active_token (single-device enforcement)
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      await logout(false);
    }
    navigate('/login');
  };

  const handleProfileSave = async (profileData) => {
    try {
      const response = await axios.put('http://localhost:5003/api/auth/profile', profileData, authConfig());
      updateUser(response.data.employee);
      setShowProfileModal(false);
      showNotification(response.data.message || 'Profile updated successfully', 'success');
      // Update the employee list state if it contains the updated profile row
      setEmployees(prev => prev.map(emp => emp.employee_id === response.data.employee.employee_id ? response.data.employee : emp));
    } catch (error) {
      showNotification(error.response?.data?.message || 'Profile update failed', 'error');
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data.length) {
      showNotification('No records available to export', 'warning');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csv = headers + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  // Calculate stats
  const stats = {
    totalEmployees: employees.length,
    presentToday: attendance.filter(a => a.attendance_date === new Date().toISOString().split('T')[0]).length,
    pendingLeaves: leaves.filter(l => l.status === 'pending').length,
    totalSalary: salaries.reduce((sum, s) => sum + (s.salary_amount || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md relative z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.employee_name}</span>
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700 hover:bg-blue-100"
            >
              Profile
            </button>
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <Bell className="w-6 h-6 text-gray-600" />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                  </div>
                  <div className="p-4 border-b bg-blue-50">
                    <p className="text-sm text-blue-800 font-medium">
                      <span className="w-2 h-2 inline-block bg-green-500 rounded-full mr-2"></span>
                      {onlineEmployeesCount} employees currently online
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notificationsPendingLeaves.length > 0 && (
                      <div className="bg-gray-100 px-4 py-1 text-xs font-bold text-gray-500 uppercase">Leaves</div>
                    )}
                    {notificationsPendingLeaves.map(leave => (
                      <div key={`leave-${leave.leave_id}`} className="p-4 border-b hover:bg-gray-50">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Leave Request Pending</p>
                        <p className="text-sm font-medium text-gray-800">{leave.employee_name}</p>
                        <p className="text-xs text-gray-500">Requested {leave.leave_type} leave from {leave.start_date} to {leave.end_date}</p>
                        <div className="mt-2 flex gap-3">
                          <button 
                            onClick={() => { 
                              setActiveTab('leaves'); 
                              setShowNotifications(false); 
                              markAsRead(`leave-${leave.leave_id}`); 
                            }} 
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View in Leaves
                          </button>
                          <button 
                            onClick={() => markAsRead(`leave-${leave.leave_id}`)} 
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Mark as Read
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {notificationsCompletedTasks.length > 0 && (
                      <div className="bg-gray-100 px-4 py-1 text-xs font-bold text-gray-500 uppercase mt-2">Completed Tasks</div>
                    )}
                    {notificationsCompletedTasks.map(task => (
                      <div key={`task-${task.task_id}`} className="p-4 border-b hover:bg-gray-50">
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Task Completed</p>
                        <p className="text-sm font-medium text-gray-800">{task.employee_name}</p>
                        <p className="text-xs text-gray-500">Completed task: "{task.title}"</p>
                        <div className="mt-2 flex gap-3">
                          <button 
                            onClick={() => { 
                              setActiveTab('tasks'); 
                              setShowNotifications(false); 
                              markAsRead(`task-${task.task_id}`); 
                            }} 
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            View Task
                          </button>
                          <button 
                            onClick={() => markAsRead(`task-${task.task_id}`)} 
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Mark as Read
                          </button>
                        </div>
                      </div>
                    ))}

                    {notificationsPendingLeaves.length === 0 && notificationsCompletedTasks.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">No new notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto">
            {['overview', 'employees', 'attendance', 'leaves', 'salary', 'tasks', 'feedback'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600">Total Employees</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalEmployees}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-600">Present Today</span>
                </div>
                <p className="text-3xl font-bold">{stats.presentToday}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-600">Pending Leaves</span>
                </div>
                <p className="text-3xl font-bold">{stats.pendingLeaves}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-600">Total Salary</span>
                </div>
                <p className="text-3xl font-bold">₹{stats.totalSalary?.toFixed(2)}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('employees')}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Manage Employees</span>
                </button>
                <button
                  onClick={() => setActiveTab('leaves')}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <span>Review Leaves</span>
                </button>
                <button
                  onClick={() => setShowSalaryDialog(true)}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <span>Calculate Salaries</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div>
            {/* Employee Form */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <form onSubmit={handleEmployeeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={employeeForm.employee_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={employeeForm.employee_email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={employeeForm.employee_password}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required={!editingEmployee}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                  <input
                    type="text"
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Annual Package</label>
                  <input
                    type="number"
                    value={employeeForm.annual_package}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, annual_package: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                  </button>
                  {editingEmployee && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEmployee(null);
                        setEmployeeForm({
                          employee_name: '',
                          employee_email: '',
                          employee_password: '',
                          department: '',
                          designation: '',
                          annual_package: '',
                          role: 'employee'
                        });
                      }}
                      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Employees Table */}
            <div className="bg-white rounded-xl shadow-md overflow-visible">
              <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-semibold">All Employees</h2>
                <div className="flex flex-1 w-full md:w-auto gap-4 justify-end">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                  <button
                    onClick={() => exportToCSV(filteredEmployees, 'employees.csv')}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.employee_id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{employee.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{employee.employee_email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{employee.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{employee.designation}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            employee.current_status === 'Online' ? 'bg-green-100 text-green-800' :
                            employee.current_status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {employee.current_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            employee.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {employee.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.employee_id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">All Attendance Records</h2>
              <button
                onClick={() => exportToCSV(attendance, 'attendance.csv')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendance.map((record) => (
                    <tr key={record.attendance_id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{record.employee_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{record.attendance_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{record.login_time}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{record.logout_time || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.total_working_time || '0 Hours 0 Minutes 0 Seconds'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          record.work_mode === 'WFO' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {record.work_mode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.latitude && record.longitude
                          ? `${Number(record.latitude).toFixed(4)}, ${Number(record.longitude).toFixed(4)}`
                          : 'Not captured'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Leave Requests</h2>
              <button
                onClick={() => exportToCSV(leaves, 'leaves.csv')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaves.map((leave) => (
                    <tr key={leave.leave_id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{leave.employee_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize">{leave.leave_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{leave.start_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{leave.end_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{leave.leave_days || 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs truncate">{leave.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                          leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleLeaveAction(leave.leave_id, 'approve')}
                              className="text-green-600 hover:text-green-800 mr-3"
                            >
                              <CheckCircle className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => handleLeaveAction(leave.leave_id, 'reject')}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XCircle className="w-4 h-4 inline" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Salary Management</h2>
                <button
                  onClick={() => setShowSalaryDialog(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Calculate All Salaries
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Salary Records</h2>
                <button
                  onClick={() => exportToCSV(salaries, 'salaries.csv')}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hourly Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {salaries.map((salary) => (
                      <tr key={salary.salary_id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{salary.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{salary.month}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{salary.working_time || '0 Hours 0 Minutes 0 Seconds'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">₹{salary.hourly_rate?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">₹{salary.salary_amount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Assign New Task</h2>
              <form onSubmit={handleTaskSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                  <select
                    value={taskForm.employee_id}
                    onChange={(e) => setTaskForm({ ...taskForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.employee_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" /> Assign Task
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Assigned Tasks</h2>
                <button
                  onClick={() => exportToCSV(tasks, 'tasks.csv')}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Reply</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task.task_id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{task.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{task.title}</td>
                        <td className="px-6 py-4"><p className="text-sm text-gray-600 line-clamp-2">{task.description}</p></td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {task.employee_reply ? <p className="italic">"{task.employee_reply}"</p> : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(task.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setSelectedTaskForChat(task)}
                            className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" /> Discussion
                          </button>
                        </td>
                      </tr>
                    ))}
                    {tasks.length === 0 && (
                      <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">No tasks assigned yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Employee Feedback & Suggestions</h2>
                <p className="text-sm text-gray-500 mt-1">Review feedback and suggestions submitted by employees.</p>
              </div>
              <button
                onClick={() => exportToCSV(feedbacks, 'feedback.csv')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
            
            <div className="p-6">
              {feedbacks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-lg">No feedback received yet</p>
                  <p className="text-sm text-gray-400">Employee feedback submissions will show up here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbacks.map((item) => (
                    <div key={item.feedback_id} className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm hover:shadow-md transition duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">{item.employee_name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{item.designation} &bull; {item.department}</p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-sm whitespace-pre-wrap border border-gray-100 italic">
                        "{item.feedback_text}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onSave={handleProfileSave}
        title="Edit Profile"
        submitLabel="Save Profile"
      />

      {showSalaryDialog && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setShowSalaryDialog(false)}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-2">Calculate all salaries</h3>
            <p className="text-gray-600 mb-4">Choose the month to calculate salaries for.</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <input
              type="month"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSalaryDialog(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCalculateAllSalaries}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Calculate
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-bounce border text-white transition-all duration-300 ${
          toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400' :
          toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600 border-red-400' :
          toast.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400' :
          'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === 'info' && <Bell className="w-5 h-5 flex-shrink-0" />}
          <div>
            <span className="font-semibold text-sm">{toast.message}</span>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-80 text-white text-lg font-bold leading-none"
          >
            ×
          </button>
        </div>
      )}

      {selectedTaskForChat && (
        <TaskChatModal
          isOpen={!!selectedTaskForChat}
          onClose={() => setSelectedTaskForChat(null)}
          taskId={selectedTaskForChat.task_id}
          taskTitle={selectedTaskForChat.title}
          currentUser={{ employee_id: user?.employee_id, role: 'admin' }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
