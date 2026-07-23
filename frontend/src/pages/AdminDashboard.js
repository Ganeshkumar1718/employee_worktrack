import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
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
  AlertTriangle,
  Sun,
  Menu,
  Eye,
  EyeOff
} from 'lucide-react';
import TaskChatModal from '../components/TaskChatModal';
import { notifySuccess, notifyError, notifyWarning, notifyInfo, requestNotificationPermission } from '../utils/notifications';
import * as XLSX from 'xlsx';

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
  const [profileForm, setProfileForm] = useState({
    employee_name: '',
    employee_email: '',
    department: '',
    designation: '',
    profile_photo: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  const [showProfileCurrentPassword, setShowProfileCurrentPassword] = useState(false);
  const [showProfileNewPassword, setShowProfileNewPassword] = useState(false);
  const [showProfileConfirmPassword, setShowProfileConfirmPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryMonth, setSummaryMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summaryEmployee, setSummaryEmployee] = useState('');
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedTaskForChat, setSelectedTaskForChat] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

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
        api.get('/api/employees', authConfig()),
        api.get('/api/attendance/all', authConfig()),
        api.get('/api/leaves/all', authConfig()),
        api.get('/api/salary/all', authConfig()),
        api.get('/api/tasks/all', authConfig()),
        api.get('/api/feedback', authConfig())
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

  const fetchEmployeeMonthlySummary = useCallback(async () => {
    if (!summaryEmployee) {
      setMonthlySummary([]);
      setSummaryStats({});
      return;
    }
    try {
      const res = await api.get(`/api/attendance/summary/${summaryEmployee}?month=${summaryMonth}`, authConfig());
      setMonthlySummary(res.data.summary || []);
      setSummaryStats(res.data.stats || {});
    } catch (err) {
      console.error('Error fetching monthly summary:', err);
    }
  }, [summaryEmployee, summaryMonth, authConfig]);

  useEffect(() => {
    fetchEmployeeMonthlySummary();
  }, [fetchEmployeeMonthlySummary]);

  const downloadSummaryExcel = () => {
    if (monthlySummary.length === 0) return;
    
    let data;
    if (summaryEmployee === 'all') {
      data = monthlySummary.map(row => ({
        Employee: row.employee_name,
        Date: row.attendance_date,
        'First Login': row.first_login,
        'Last Logout': row.last_logout || 'Not yet',
        'Total Hours': Number(row.daily_total_hours || 0).toFixed(2)
      }));
      data.push({});
      data.push({ Employee: '--- Monthly Totals ---' });
      if (Array.isArray(summaryStats)) {
        summaryStats.forEach(stat => {
           data.push({
             Employee: stat.employee_name,
             'Total Hours': Number(stat.total_hours || 0).toFixed(2),
             'Total Working Days': stat.total_days || 0
           });
        });
      }
    } else {
      data = monthlySummary.map(row => ({
        Date: row.attendance_date,
        'First Login': row.first_login,
        'Last Logout': row.last_logout || 'Not yet',
        'Total Hours': Number(row.daily_total_hours || 0).toFixed(2)
      }));
      data.push({});
      data.push({
        Date: 'Monthly Total Hours',
        'First Login': Number(summaryStats.total_hours || 0).toFixed(2),
      });
      data.push({
        Date: 'Total Working Days',
        'First Login': summaryStats.total_days || 0,
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
    XLSX.writeFile(workbook, `Employee_Summary_${summaryEmployee}_${summaryMonth}.xlsx`);
  };

  useEffect(() => {
    requestNotificationPermission();
    fetchData();
    const pollInterval = setInterval(async () => {
      try {
        const tasksRes = await api.get('/api/tasks/all', authConfig());
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
        await api.put(`/api/employees/${editingEmployee.employee_id}`, employeeForm, authConfig());
        showNotification('Employee updated successfully', 'success');
      } else {
        await api.post('/api/employees', employeeForm, authConfig());
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
        await api.delete(`/api/employees/${employeeId}`, authConfig());
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
      await api.post('/api/tasks/assign', taskForm, authConfig());
      showNotification('Task assigned successfully', 'success');
      setTaskForm({ employee_id: '', title: '', description: '' });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Task assignment failed', 'error');
    }
  };

  const handleLeaveAction = async (leaveId, action) => {
    try {
      await api.put(`/api/leaves/${action}/${leaveId}`, {}, authConfig());
      showNotification(`Leave ${action}d successfully`, 'success');
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleCalculateAllSalaries = async () => {
    try {
      await api.post('/api/salary/calculate-all', { month: salaryMonth }, authConfig());
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

  useEffect(() => {
    if (user) {
      setProfileForm({
        employee_name: user.employee_name || '',
        employee_email: user.employee_email || '',
        department: user.department || '',
        designation: user.designation || '',
        profile_photo: user.profile_photo || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setProfileError('');
    }
  }, [user, activeTab]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showNotification('Image size must be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({
          ...prev,
          profile_photo: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileFormSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');

    if ((profileForm.new_password || profileForm.confirm_password) && profileForm.new_password !== profileForm.confirm_password) {
      setProfileError('New password and confirmation must match.');
      return;
    }

    if (profileForm.new_password && !profileForm.current_password) {
      setProfileError('Current password is required to change your password.');
      return;
    }

    try {
      const response = await api.put('/api/auth/profile', profileForm, authConfig());
      updateUser(response.data.employee);
      showNotification(response.data.message || 'Profile updated successfully', 'success');
      // Update the employee list state if it contains the updated profile row
      setEmployees(prev => prev.map(emp => emp.employee_id === response.data.employee.employee_id ? response.data.employee : emp));
    } catch (error) {
      const msg = error.response?.data?.message || 'Profile update failed';
      setProfileError(msg);
      showNotification(msg, 'error');
    }
  };

  const exportWorkingHoursToExcel = () => {
    if (!workingHoursReport || workingHoursReport.length === 0) return;
    const data = workingHoursReport.map(row => ({
      Employee: row.employee_name,
      "Today's Hours": row.today_hours,
      "This Week's Hours": row.week_hours,
      "This Month's Hours": row.month_hours
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Working Hours');
    XLSX.writeFile(workbook, `Working_Hours_Overview.xlsx`);
  };

  const workingHoursReport = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);
    
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    return employees.map(emp => {
      const empRecords = attendance.filter(a => a.employee_id === emp.employee_id);
      let todaySecs = 0;
      let weekSecs = 0;
      let monthSecs = 0;

      empRecords.forEach(r => {
        const rDate = new Date(r.attendance_date);
        let secs = 0;
        if (r.working_hours !== undefined) {
           secs = (r.working_hours * 3600) + (r.working_minutes * 60) + (r.working_seconds || 0);
        } else if (r.total_working_time) {
           const match = r.total_working_time.match(/(\d+)\s*Hours\s*(\d+)\s*Minutes\s*(\d+)\s*Seconds/i);
           if (match) {
             secs = (parseInt(match[1]) * 3600) + (parseInt(match[2]) * 60) + parseInt(match[3]);
           }
        }
        
        if (r.attendance_date === todayStr) {
          todaySecs += secs;
        }
        if (r.attendance_date.startsWith(currentMonthStr)) {
          monthSecs += secs;
        }
        if (rDate >= startOfWeek) {
          weekSecs += secs;
        }
      });

      return {
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        today_hours: (todaySecs / 3600).toFixed(2),
        week_hours: (weekSecs / 3600).toFixed(2),
        month_hours: (monthSecs / 3600).toFixed(2)
      };
    });
  }, [attendance, employees]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col md:flex-row transition-colors duration-300">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-slate-950 flex flex-col shadow-2xl z-50 transition-transform duration-300 border-r border-slate-200 dark:border-slate-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b dark:border-slate-700 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/30">
              <Users className="w-6 h-6" />
            </div>
            WorkTrack
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2 custom-scrollbar">
          <p className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Menu</p>
          {['overview', 'employees', 'attendance', 'leaves', 'salary', 'tasks', 'feedback', 'profile'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3.5 rounded-xl font-medium capitalize transition-all duration-300 flex items-center gap-3 ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-900/40 translate-x-1'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-blue-600 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-6 border-t dark:border-slate-700 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={handleLogoutClick}
            className="flex w-full items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500 hover:text-white px-4 py-3 rounded-xl transition-all duration-300 font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">
                {activeTab} Dashboard
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                  {user?.profile_photo ? (
                    <img src={user.profile_photo} alt={user.employee_name} className="w-full h-full object-cover" />
                  ) : (
                    user?.employee_name?.charAt(0)
                  )}
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-medium hidden sm:block">{user?.employee_name}</span>
              </div>
              
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-200"
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>

              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 relative transition-all duration-200"
                >
                  <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                      {notificationCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                    <div className="p-4 border-b dark:border-slate-700 dark:border-slate-700 bg-slate-50">
                      <h3 className="font-semibold text-slate-800">Notifications</h3>
                    </div>
                    <div className="p-4 border-b dark:border-slate-700 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/30/50">
                      <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        {onlineEmployeesCount} employees online
                      </p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {notificationsPendingLeaves.length > 0 && (
                        <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 uppercase sticky top-0">Leaves</div>
                      )}
                      {notificationsPendingLeaves.map(leave => (
                        <div key={`leave-${leave.leave_id}`} className="p-4 border-b dark:border-slate-700 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Leave Request Pending</p>
                          <p className="text-sm font-bold text-slate-800">{leave.employee_name}</p>
                          <p className="text-xs text-slate-600 mt-1">Requested {leave.leave_type} leave from {leave.start_date} to {leave.end_date}</p>
                          <div className="mt-3 flex gap-2">
                            <button 
                              onClick={() => { 
                                setActiveTab('leaves'); 
                                setShowNotifications(false); 
                                markAsRead(`leave-${leave.leave_id}`); 
                              }} 
                              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-xs text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                            >
                              View in Leaves
                            </button>
                            <button 
                              onClick={() => markAsRead(`leave-${leave.leave_id}`)} 
                              className="px-3 py-1.5 bg-slate-50 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                            >
                              Mark as Read
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {notificationsCompletedTasks.length > 0 && (
                        <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 uppercase sticky top-0 mt-2">Completed Tasks</div>
                      )}
                      {notificationsCompletedTasks.map(task => (
                        <div key={`task-${task.task_id}`} className="p-4 border-b dark:border-slate-700 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Task Completed</p>
                          <p className="text-sm font-bold text-slate-800">{task.employee_name}</p>
                          <p className="text-xs text-slate-600 mt-1">Completed task: "{task.title}"</p>
                          <div className="mt-3 flex gap-2">
                            <button 
                              onClick={() => { 
                                setActiveTab('tasks'); 
                                setShowNotifications(false); 
                                markAsRead(`task-${task.task_id}`); 
                              }} 
                              className="px-3 py-1.5 bg-emerald-50 text-xs text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors"
                            >
                              View Task
                            </button>
                            <button 
                              onClick={() => markAsRead(`task-${task.task_id}`)} 
                              className="px-3 py-1.5 bg-slate-50 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                            >
                              Mark as Read
                            </button>
                          </div>
                        </div>
                      ))}

                      {notificationsPendingLeaves.length === 0 && notificationsCompletedTasks.length === 0 && (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Bell className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">No new notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
          {activeTab === 'overview' && (
            <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600 dark:text-slate-300">Total Employees</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalEmployees}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-600 dark:text-slate-300">Present Today</span>
                </div>
                <p className="text-3xl font-bold">{stats.presentToday}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-600 dark:text-slate-300">Pending Leaves</span>
                </div>
                <p className="text-3xl font-bold">{stats.pendingLeaves}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-600 dark:text-slate-300">Total Salary</span>
                </div>
                <p className="text-3xl font-bold">₹{stats.totalSalary?.toFixed(2)}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('employees')}
                  className="flex items-center gap-3 p-4 border dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:bg-slate-900"
                >
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Manage Employees</span>
                </button>
                <button
                  onClick={() => setActiveTab('leaves')}
                  className="flex items-center gap-3 p-4 border dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:bg-slate-900"
                >
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <span>Review Leaves</span>
                </button>
                <button
                  onClick={() => setShowSalaryDialog(true)}
                  className="flex items-center gap-3 p-4 border dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:bg-slate-900"
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <form onSubmit={handleEmployeeSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={employeeForm.employee_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_name: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Email</label>
                  <input
                    type="email"
                    value={employeeForm.employee_email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_email: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showEmployeePassword ? "text" : "password"}
                      value={employeeForm.employee_password}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, employee_password: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg pr-10"
                      required={!editingEmployee}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmployeePassword(!showEmployeePassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showEmployeePassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Department</label>
                  <input
                    type="text"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Designation</label>
                  <input
                    type="text"
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Annual Package</label>
                  <input
                    type="number"
                    value={employeeForm.annual_package}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, annual_package: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Role</label>
                  <select
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-visible">
              <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                <h2 className="text-xl font-semibold text-center lg:text-left">All Employees</h2>
                <div className="flex flex-col sm:flex-row flex-1 w-full lg:w-auto gap-3 justify-end items-stretch sm:items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border dark:border-slate-700 rounded-lg px-4 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 w-full sm:w-auto"
                  >
                    <option value="all">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                  <button
                    onClick={() => exportToCSV(filteredEmployees, 'employees.csv')}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm whitespace-nowrap w-full sm:w-auto font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Designation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.employee_id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                            {employee.profile_photo ? (
                              <img src={employee.profile_photo} alt={employee.employee_name} className="w-full h-full object-cover" />
                            ) : (
                              employee.employee_name?.charAt(0)
                            )}
                          </div>
                          <span>{employee.employee_name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{employee.employee_email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{employee.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{employee.designation}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            employee.current_status === 'Online' ? 'bg-green-100 text-green-800 dark:text-green-300' :
                            employee.current_status === 'On Leave' ? 'bg-yellow-100 text-yellow-800 dark:text-yellow-300' :
                            'bg-gray-100 dark:bg-slate-800/50 text-gray-800 dark:text-slate-100'
                          }`}>
                            {employee.current_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            employee.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800 dark:text-blue-300'
                          }`}>
                            {employee.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.employee_id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-300"
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
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700 flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-xl font-semibold">Employee Monthly Summary</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <select
                    value={summaryEmployee}
                    onChange={(e) => setSummaryEmployee(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600"
                  >
                    <option value="">Select Employee</option>
                    <option value="all">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.employee_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="month"
                    value={summaryMonth}
                    onChange={(e) => setSummaryMonth(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600"
                  />
                  <button onClick={downloadSummaryExcel} disabled={!summaryEmployee || monthlySummary.length === 0} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    Download Excel
                  </button>
                </div>
              </div>
              {summaryEmployee ? (
                <div className="p-6">
                  {summaryEmployee !== 'all' && (
                    <div className="flex gap-6 border-b dark:border-slate-700 pb-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Hours</p>
                        <p className="text-lg font-bold">{Number(summaryStats.total_hours || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Working Days</p>
                        <p className="text-lg font-bold">{summaryStats.total_days || 0}</p>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                        <tr>
                          {summaryEmployee === 'all' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Login</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Logout</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {monthlySummary.map((record, i) => (
                          <tr key={i}>
                            {summaryEmployee === 'all' && (
                              <td className="px-6 py-4 whitespace-nowrap">{record.employee_name}</td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">{record.attendance_date}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{record.first_login}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{record.last_logout || 'Not yet'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{Number(record.daily_total_hours || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  Please select an employee to view their summary.
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Working Hours Overview</h2>
                <button
                  onClick={exportWorkingHoursToExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Download Excel
                </button>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Today's Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">This Week's Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">This Month's Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {workingHoursReport.map((row) => (
                      <tr key={row.employee_id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{row.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.today_hours}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.week_hours}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.month_hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700 flex justify-between items-center">
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
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Logout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Working Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Location</th>
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
                          record.work_mode === 'WFO' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800 dark:text-green-300'
                        }`}>
                          {record.work_mode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
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
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700 flex justify-between items-center">
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
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Leave Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Actions</th>
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
                          leave.status === 'approved' ? 'bg-green-100 text-green-800 dark:text-green-300' :
                          leave.status === 'rejected' ? 'bg-red-100 text-red-800 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleLeaveAction(leave.leave_id, 'approve')}
                              className="text-green-600 hover:text-green-800 dark:text-green-300 mr-3"
                            >
                              <CheckCircle className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => handleLeaveAction(leave.leave_id, 'reject')}
                              className="text-red-600 hover:text-red-800 dark:text-red-300"
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8">
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

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700 flex justify-between items-center">
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
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Working Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Hourly Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Salary Amount</th>
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Assign New Task</h2>
              <form onSubmit={handleTaskSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Employee</label>
                  <select
                    value={taskForm.employee_id}
                    onChange={(e) => setTaskForm({ ...taskForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>{emp.employee_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Task Title</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    rows="3"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" /> Assign Task
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700 flex justify-between items-center">
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
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Task Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase w-1/4">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Employee Reply</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Assigned On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task.task_id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{task.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{task.title}</td>
                        <td className="px-6 py-4"><p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2">{task.description}</p></td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:text-yellow-300'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                          {task.employee_reply ? <p className="italic">"{task.employee_reply}"</p> : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(task.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setSelectedTaskForChat(task)}
                            className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-300 px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" /> Discussion
                          </button>
                        </td>
                      </tr>
                    ))}
                    {tasks.length === 0 && (
                      <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">No tasks assigned yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Employee Feedback & Suggestions</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Review feedback and suggestions submitted by employees.</p>
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
                <div className="text-center py-12 text-gray-500 dark:text-slate-400 border dark:border-slate-700-2 border dark:border-slate-700-dashed border-gray-200 rounded-xl">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-lg">No feedback received yet</p>
                  <p className="text-sm text-gray-400">Employee feedback submissions will show up here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbacks.map((item) => (
                    <div key={item.feedback_id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-150 p-5 shadow-sm hover:shadow-md transition duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">{item.employee_name}</h4>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.designation} &bull; {item.department}</p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-gray-700 dark:text-slate-200 text-sm whitespace-pre-wrap border border-gray-100 italic">
                        "{item.feedback_text}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 max-w-2xl mx-auto border border-gray-100">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-slate-100">Edit Profile</h2>
            <form onSubmit={handleProfileFormSubmit} className="space-y-4">
              {profileError && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700">
                  {profileError}
                </div>
              )}

              <div className="flex flex-col items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 text-center">Profile Photo</label>
                <div className="relative group">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-lg border-2 border-white dark:border-slate-800 flex-shrink-0">
                    {profileForm.profile_photo ? (
                      <img src={profileForm.profile_photo} alt="Profile Preview" className="w-full h-full object-cover" />
                    ) : (
                      user?.employee_name?.charAt(0)
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {profileForm.profile_photo && (
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, profile_photo: '' })}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Full Name</label>
                <input
                  type="text"
                  value={profileForm.employee_name}
                  onChange={(e) => setProfileForm({ ...profileForm, employee_name: e.target.value })}
                  className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Email</label>
                <input
                  type="email"
                  value={profileForm.employee_email}
                  onChange={(e) => setProfileForm({ ...profileForm, employee_email: e.target.value })}
                  className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Designation</label>
                  <input
                    type="text"
                    value={profileForm.designation}
                    onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                    className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 dark:bg-slate-900 p-4">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">Change Password</p>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Current Password</label>
                    <div className="relative">
                      <input
                        type={showProfileCurrentPassword ? "text" : "password"}
                        value={profileForm.current_password}
                        onChange={(e) => setProfileForm({ ...profileForm, current_password: e.target.value })}
                        className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none pr-10"
                        placeholder="Enter current password to change it"
                      />
                      <button
                        type="button"
                        onClick={() => setShowProfileCurrentPassword(!showProfileCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {showProfileCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">New Password</label>
                      <div className="relative">
                        <input
                          type={showProfileNewPassword ? "text" : "password"}
                          value={profileForm.new_password}
                          onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })}
                          className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none pr-10"
                          placeholder="Leave blank to keep current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfileNewPassword(!showProfileNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        >
                          {showProfileNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showProfileConfirmPassword ? "text" : "password"}
                          value={profileForm.confirm_password}
                          onChange={(e) => setProfileForm({ ...profileForm, confirm_password: e.target.value })}
                          className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none pr-10"
                          placeholder="Repeat new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfileConfirmPassword(!showProfileConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        >
                          {showProfileConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      </div>


      {showSalaryDialog && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setShowSalaryDialog(false)}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-2">Calculate all salaries</h3>
            <p className="text-gray-600 dark:text-slate-300 mb-4">Choose the month to calculate salaries for.</p>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Month</label>
            <input
              type="month"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSalaryDialog(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:bg-slate-900"
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
        <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-bounce border dark:border-slate-700 text-white transition-all duration-300 ${
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
