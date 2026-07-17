import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  LogOut, 
  Clock, 
  Calendar, 
  Home,
  Building,
  CheckCircle,
  Bell,
  MessageSquare,
  AlertTriangle,
  XCircle,
  Users,
  Moon,
  Sun,
  Menu
} from 'lucide-react';
import TaskChatModal from '../components/TaskChatModal';
import { calculateLiveWorkingTime } from '../utils/timeFormatter';
import useActivityTracker from '../hooks/useActivityTracker';
import { notifySuccess, notifyError, notifyWarning, notifyInfo, requestNotificationPermission } from '../utils/notifications';

const getCurrentLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Location is not supported by this browser'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    },
    (error) => reject(error),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

const EmployeeDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  useActivityTracker();
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [stats, setStats] = useState({});
  const [leaveStats, setLeaveStats] = useState({});
  const [liveWorkingTime, setLiveWorkingTime] = useState({
    workingHours: 0,
    workingMinutes: 0,
    workingSeconds: 0,
    totalWorkingTime: '0 Hours 0 Minutes 0 Seconds'
  });
  const [tasks, setTasks] = useState([]);
  const [taskReplies, setTaskReplies] = useState({});
  const [toast, setToast] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [workMode, setWorkMode] = useState('WFO');
  const [captureLocation, setCaptureLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Location enabled');
  const [profileForm, setProfileForm] = useState({
    employee_name: '',
    employee_email: '',
    department: '',
    designation: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profileError, setProfileError] = useState('');
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'sick',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [selectedTaskForChat, setSelectedTaskForChat] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
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
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const timerRef = useRef(null);
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

  const authConfig = useCallback(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }), []);

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

  const notificationTasks = tasks
    .filter(t => t.status === 'pending')
    .filter(t => !readNotifications.includes(`task-${t.task_id}`));
  const notificationCount = notificationTasks.length;

  // Removed getCurrentLocation from inside the component

  const fetchData = useCallback(async () => {
    try {
      const [attendanceRes, leavesRes, salariesRes, statsRes, leaveStatsRes, tasksRes] = await Promise.all([
        api.get('/api/attendance/my', authConfig()),
        api.get('/api/leaves/my', authConfig()),
        api.get('/api/salary/my', authConfig()),
        api.get('/api/attendance/my/stats', authConfig()),
        api.get('/api/leaves/my/stats', authConfig()),
        api.get('/api/tasks/my', authConfig())
      ]);
      setAttendance(attendanceRes.data);
      setLeaves(leavesRes.data);
      setSalaries(salariesRes.data);
      setStats(statsRes.data);
      setLeaveStats(leaveStatsRes.data);
      setTasks(tasksRes.data);
      isInitialTasksLoaded.current = true;
      
      // Check today's attendance - find active session first, then latest session
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = attendanceRes.data.filter(a => a.attendance_date === today);
      // Sort by attendance_id descending to get most recent first
      todayRecords.sort((a, b) => b.attendance_id - a.attendance_id);
      const activeSession = todayRecords.find(a => !a.logout_time);
      const latestSession = todayRecords.length > 0 ? todayRecords[0] : null;
      setTodayAttendance(activeSession || latestSession);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [authConfig]);

  useEffect(() => {
    requestNotificationPermission();
    fetchData();
    const pollInterval = setInterval(async () => {
      try {
        const tasksRes = await api.get('/api/tasks/my', authConfig());
        setTasks(prevTasks => {
          const prevPending = prevTasks.filter(t => t.status === 'pending').length;
          const newPending = tasksRes.data.filter(t => t.status === 'pending').length;
          if (isInitialTasksLoaded.current && newPending > prevPending) {
            showNotification('You have a new task assigned!', 'info');
          }
          return tasksRes.data;
        });
      } catch (err) {}
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchData, authConfig, showNotification]);

  // Check for day change every minute to refresh today's attendance
  useEffect(() => {
    const dayCheckInterval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      if (todayAttendance) {
        // If today's date doesn't match attendance date, refresh data
        if (todayAttendance.attendance_date !== today) {
          fetchData();
        }
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(dayCheckInterval);
    };
  }, [todayAttendance, fetchData]);

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

  // Live timer for working time when clocked in
  useEffect(() => {
    if (todayAttendance && todayAttendance.login_time && !todayAttendance.logout_time) {
      // Start live timer
      timerRef.current = setInterval(() => {
        const liveTime = calculateLiveWorkingTime(todayAttendance.login_time);
        setLiveWorkingTime(liveTime);
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else {
      // Stop timer if not clocked in
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Reset live working time
      setLiveWorkingTime({
        workingHours: 0,
        workingMinutes: 0,
        workingSeconds: 0,
        totalWorkingTime: '0 Hours 0 Minutes 0 Seconds'
      });
    }
  }, [todayAttendance]);

  const handleLogin = async () => {
    try {
      let locationPayload = {};

      if (captureLocation) {
        setLocationStatus('Requesting location permission...');
        const location = await getCurrentLocation().catch(() => null);
        if (location) {
          locationPayload = {
            latitude: location.latitude,
            longitude: location.longitude
          };
          setLocationStatus(`Location captured: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
        } else {
          setLocationStatus('Location permission blocked. Clocked in without location.');
        }
      } else {
        setLocationStatus('Location disabled for this session');
      }

      const response = await api.post('/api/attendance/login', {
        work_mode: workMode,
        device_info: navigator.userAgent,
        ...locationPayload
      }, authConfig());
      
      console.log('Clock in successful:', response.data);
      showNotification('Clock in successful!', 'success');
      
      // Refresh data to update UI
      await fetchData();
    } catch (error) {
      setLocationStatus('Location enabled');
      console.error('Clock in error:', error);
      showNotification(error.response?.data?.message || error.message || 'Clock in failed', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await api.post('/api/attendance/logout', {}, authConfig());
      
      console.log('Clock out successful:', response.data);
      showNotification('Clock out successful! Working time: ' + response.data.totalWorkingTime, 'success');
      
      // Refresh data to update UI
      await fetchData();
    } catch (error) {
      console.error('Clock out error:', error);
      showNotification(error.response?.data?.message || 'Clock out failed', 'error');
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/leaves/apply', leaveForm, authConfig());
      showNotification('Leave applied successfully', 'success');
      setLeaveForm({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Leave application failed', 'error');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    try {
      setSubmittingFeedback(true);
      await api.post('/api/feedback', {
        feedback_text: feedbackText
      }, authConfig());
      showNotification('Feedback submitted successfully. Thank you!', 'success');
      setFeedbackText('');
    } catch (error) {
      console.error('Feedback submit error:', error);
      showNotification(error.response?.data?.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleTaskComplete = async (taskId) => {
    const reply = taskReplies[taskId] || '';
    if (!reply.trim()) {
      showNotification('Please enter a reply message before marking as completed.', 'warning');
      return;
    }
    try {
      await api.put(`/api/tasks/${taskId}/complete`, { employee_reply: reply }, authConfig());
      showNotification('Task marked as completed!', 'success');
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Task completion failed', 'error');
    }
  };

  const handleLogoutClick = async () => {
    try {
      // Check if user has an active session (clocked in but not clocked out)
      if (todayAttendance && todayAttendance.login_time && !todayAttendance.logout_time) {
        // Auto clock out before logout
        await api.post('/api/attendance/logout', {}, authConfig());
      }
      // Call server-side logout to clear active_token (single-device enforcement)
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if clockout fails, logout safely
      await logout(false);
      navigate('/login');
    }
  };

  useEffect(() => {
    if (user) {
      setProfileForm({
        employee_name: user.employee_name || '',
        employee_email: user.employee_email || '',
        department: user.department || '',
        designation: user.designation || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setProfileError('');
    }
  }, [user, activeTab]);

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
    } catch (error) {
      const msg = error.response?.data?.message || 'Profile update failed';
      setProfileError(msg);
      showNotification(msg, 'error');
    }
  };

  // Dynamic metrics calculation

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
          {['overview', 'attendance', 'leaves', 'salary', 'tasks', 'feedback', 'profile'].map((tab) => (
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
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.employee_name?.charAt(0)}
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
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {notificationTasks.length > 0 ? (
                        notificationTasks.map(task => (
                          <div key={task.task_id} className="p-4 border-b dark:border-slate-700 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">New Task Assigned</p>
                            <p className="text-sm font-bold text-slate-800">{task.title}</p>
                            <p className="text-xs text-slate-600 mt-1">Assigned by: {task.admin_name}</p>
                            <div className="mt-3 flex gap-2">
                              <button 
                                onClick={() => { 
                                  setActiveTab('tasks'); 
                                  setShowNotifications(false); 
                                  markAsRead(`task-${task.task_id}`); 
                                }} 
                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-xs text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors"
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
                        ))
                      ) : (
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {!todayAttendance || !todayAttendance.login_time || todayAttendance.logout_time ? (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Clock In</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300">Choose your work mode and decide whether to capture your live location.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWorkMode('WFO')}
                      className={`p-4 rounded-xl border dark:border-slate-700 text-left ${workMode === 'WFO' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 bg-gray-50 dark:bg-slate-900'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Building className={`w-5 h-5 ${workMode === 'WFO' ? 'text-blue-600' : 'text-gray-500 dark:text-slate-400'}`} />
                        <div>
                          <p className="font-semibold">Work From Office</p>
                          <p className="text-sm text-gray-600 dark:text-slate-300">Office attendance with location capture.</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkMode('WFH')}
                      className={`p-4 rounded-xl border dark:border-slate-700 text-left ${workMode === 'WFH' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 bg-gray-50 dark:bg-slate-900'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Home className={`w-5 h-5 ${workMode === 'WFH' ? 'text-blue-600' : 'text-gray-500 dark:text-slate-400'}`} />
                        <div>
                          <p className="font-semibold">Work From Home</p>
                          <p className="text-sm text-gray-600 dark:text-slate-300">Remote work without office check-in.</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 dark:bg-slate-900 p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={captureLocation}
                      onChange={(e) => {
                        setCaptureLocation(e.target.checked);
                        setLocationStatus(e.target.checked ? 'Location enabled' : 'Location disabled');
                      }}
                      className="mt-1 h-4 w-4"
                    />
                    <div>
                      <p className="font-semibold">Enable location</p>
                      <p className="text-sm text-gray-600 dark:text-slate-300">Capture your current coordinates when you clock in.</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{locationStatus}</p>
                    </div>
                  </label>

                  <button
                    onClick={handleLogin}
                    className="w-full bg-green-500 text-white p-5 rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-3"
                  >
                    <Clock className="w-6 h-6" />
                    <span className="text-xl font-semibold">Clock In</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Currently Working</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300">You clocked in at {todayAttendance.login_time}</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl text-center">
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">Working Time</p>
                    <p className="text-3xl font-bold text-blue-600">{liveWorkingTime.totalWorkingTime}</p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-500 text-white p-5 rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-3"
                  >
                    <Clock className="w-6 h-6" />
                    <span className="text-xl font-semibold">Clock Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600 dark:text-slate-300">Total Working Time</span>
                </div>
                <p className="text-2xl font-bold">{stats.total_working_time || '0 Hours 0 Minutes 0 Seconds'}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-gray-600 dark:text-slate-300">Total Days</span>
                </div>
                <p className="text-2xl font-bold">{stats.total_days || 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Building className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-600 dark:text-slate-300">WFO Days</span>
                </div>
                <p className="text-2xl font-bold">{stats.wfo_days || 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Home className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-600 dark:text-slate-300">WFH Days</span>
                </div>
                <p className="text-2xl font-bold">{stats.wfh_days || 0}</p>
              </div>
            </div>

            {/* Leave Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600 dark:text-slate-300">Applied Leaves</span>
                </div>
                <p className="text-2xl font-bold">{leaveStats.total_leaves || 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-gray-600 dark:text-slate-300">Approved Leaves</span>
                </div>
                <p className="text-2xl font-bold">{leaveStats.approved_leaves || 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-600 dark:text-slate-300">Pending Leaves</span>
                </div>
                <p className="text-2xl font-bold">{leaveStats.pending_leaves || 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <span className="text-gray-600 dark:text-slate-300">Rejected Leaves</span>
                </div>
                <p className="text-2xl font-bold">{leaveStats.rejected_leaves || 0}</p>
              </div>
            </div>

            {/* Today's Status */}
            {todayAttendance && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-lg font-semibold mb-4">Today's Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-600 dark:text-slate-300">Latest Login Time</p>
                    <p className="font-semibold">{todayAttendance.login_time}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-slate-300">Latest Logout Time</p>
                    <p className="font-semibold">{todayAttendance.logout_time || 'Not yet'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-slate-300">Current Session Working Time</p>
                    <p className="font-semibold">
                      {todayAttendance.logout_time 
                        ? todayAttendance.total_working_time || '0 Hours 0 Minutes 0 Seconds'
                        : liveWorkingTime.totalWorkingTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-slate-300">Location</p>
                    <p className="font-semibold">
                      {todayAttendance.latitude && todayAttendance.longitude
                        ? `${Number(todayAttendance.latitude).toFixed(4)}, ${Number(todayAttendance.longitude).toFixed(4)}`
                        : 'Not captured'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700">
              <h2 className="text-xl font-semibold">Attendance History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Logout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendance.map((record) => (
                    <tr key={record.attendance_id}>
                      <td className="px-6 py-4 whitespace-nowrap">{record.attendance_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{record.login_time}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{record.logout_time || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{record.total_working_time || '0 Hours 0 Minutes 0 Seconds'}</td>
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
        )}

        {activeTab === 'leaves' && (
          <div>
            {/* Leave Application Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Apply for Leave</h2>
              <form onSubmit={handleLeaveSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Leave Type</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="earned">Earned Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Reason</label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg"
                    rows="3"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Submit Leave Request
                  </button>
                </div>
              </form>
            </div>

            {/* Leave History */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700">
                <h2 className="text-xl font-semibold">Leave History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Number of Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Applied Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaves.map((leave) => (
                      <tr key={leave.leave_id}>
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
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(leave.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b dark:border-slate-700 dark:border-slate-700">
              <h2 className="text-xl font-semibold">Salary Details</h2>
              <p className="text-gray-600 dark:text-slate-300 mt-2">Hourly Rate: ₹{user?.hourly_rate?.toFixed(2)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Working Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Hourly Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Salary Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salaries.map((salary) => (
                    <tr key={salary.salary_id}>
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
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-6">My Assigned Tasks</h2>
            {tasks.length === 0 && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md text-center text-gray-500 dark:text-slate-400">
                You have no assigned tasks at the moment.
              </div>
            )}
            {tasks.map(task => (
              <div key={task.task_id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border-l-4 ${task.status === 'completed' ? 'border-green-500' : 'border-yellow-500'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{task.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Assigned by {task.admin_name} on {new Date(task.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTaskForChat(task)}
                      className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-300 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
                    >
                      <MessageSquare className="w-4 h-4" /> Discussion
                    </button>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${task.status === 'completed' ? 'bg-green-100 text-green-800 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:text-yellow-300'}`}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg mb-4 text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                  {task.description}
                </div>
                
                {task.status === 'pending' ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Your Reply Message:</label>
                    <textarea
                      className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      placeholder="Type your reply to the admin here..."
                      value={taskReplies[task.task_id] || ''}
                      onChange={(e) => setTaskReplies({...taskReplies, [task.task_id]: e.target.value})}
                    />
                    <button
                      onClick={() => handleTaskComplete(task.task_id)}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" /> Mark as Completed
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 p-4 rounded-lg mt-4">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">Your Reply:</p>
                    <p className="text-green-700 italic">"{task.employee_reply}"</p>
                    <p className="text-xs text-green-600 mt-2">Completed on {new Date(task.completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 max-w-2xl mx-auto border border-gray-100">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-slate-100">Submit Feedback / Suggestion</h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">
              Your feedback is valuable to us. Please share any suggestions, issues, or ideas for improving our workplace environment or processes.
            </p>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Feedback Details</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  rows="6"
                  placeholder="Describe your suggestion or feedback in detail..."
                  required
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
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
                    disabled
                    className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed text-gray-500 dark:text-slate-400"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Designation</label>
                  <input
                    type="text"
                    value={profileForm.designation}
                    disabled
                    className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed text-gray-500 dark:text-slate-400"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Note: Department and Designation can only be changed by an administrator.</p>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 dark:bg-slate-900 p-4">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">Change Password</p>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Current Password</label>
                    <input
                      type="password"
                      value={profileForm.current_password}
                      onChange={(e) => setProfileForm({ ...profileForm, current_password: e.target.value })}
                      className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      placeholder="Enter current password to change it"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">New Password</label>
                      <input
                        type="password"
                        value={profileForm.new_password}
                        onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })}
                        className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        placeholder="Leave blank"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Confirm Password</label>
                      <input
                        type="password"
                        value={profileForm.confirm_password}
                        onChange={(e) => setProfileForm({ ...profileForm, confirm_password: e.target.value })}
                        className="w-full px-4 py-3 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        placeholder="Repeat new password"
                      />
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
          currentUser={{ employee_id: user?.employee_id, role: 'employee' }}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
