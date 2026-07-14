import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  XCircle
} from 'lucide-react';
import ProfileModal from '../components/ProfileModal';
import TaskChatModal from '../components/TaskChatModal';
import { calculateLiveWorkingTime } from '../utils/timeFormatter';
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'sick',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [selectedTaskForChat, setSelectedTaskForChat] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
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
        axios.get('http://localhost:5003/api/attendance/my', authConfig()),
        axios.get('http://localhost:5003/api/leaves/my', authConfig()),
        axios.get('http://localhost:5003/api/salary/my', authConfig()),
        axios.get('http://localhost:5003/api/attendance/my/stats', authConfig()),
        axios.get('http://localhost:5003/api/leaves/my/stats', authConfig()),
        axios.get('http://localhost:5003/api/tasks/my', authConfig())
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
        const tasksRes = await axios.get('http://localhost:5003/api/tasks/my', authConfig());
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

      const response = await axios.post('http://localhost:5003/api/attendance/login', {
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
      const response = await axios.post('http://localhost:5003/api/attendance/logout', {}, authConfig());
      
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
      await axios.post('http://localhost:5003/api/leaves/apply', leaveForm, authConfig());
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
      await axios.post('http://localhost:5003/api/feedback', {
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
      await axios.put(`http://localhost:5003/api/tasks/${taskId}/complete`, { employee_reply: reply }, authConfig());
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
        await axios.post('http://localhost:5003/api/attendance/logout', {}, authConfig());
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

  const handleProfileSave = async (profileData) => {
    try {
      const response = await axios.put('http://localhost:5003/api/auth/profile', profileData, authConfig());
      updateUser(response.data.employee);
      setShowProfileModal(false);
      showNotification(response.data.message || 'Profile updated successfully', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Profile update failed', 'error');
    }
  };

  // Dynamic metrics calculation

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md relative z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center sm:text-left">Employee Dashboard</h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
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
                  <div className="max-h-64 overflow-y-auto">
                    {notificationTasks.length > 0 ? (
                      notificationTasks.map(task => (
                        <div key={task.task_id} className="p-4 border-b hover:bg-gray-50">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">New Task Assigned</p>
                          <p className="text-sm font-medium text-gray-800">{task.title}</p>
                          <p className="text-xs text-gray-500">Assigned by: {task.admin_name}</p>
                          <div className="mt-2 flex gap-3">
                            <button 
                              onClick={() => { 
                                setActiveTab('tasks'); 
                                setShowNotifications(false); 
                                markAsRead(`task-${task.task_id}`); 
                              }} 
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">No new tasks</div>
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
            {['overview', 'attendance', 'leaves', 'salary', 'tasks', 'feedback'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium capitalize ${
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {!todayAttendance || !todayAttendance.login_time || todayAttendance.logout_time ? (
                <div className="bg-white p-6 rounded-xl shadow-md space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Clock In</h3>
                    <p className="text-sm text-gray-600">Choose your work mode and decide whether to capture your live location.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWorkMode('WFO')}
                      className={`p-4 rounded-xl border text-left ${workMode === 'WFO' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Building className={`w-5 h-5 ${workMode === 'WFO' ? 'text-blue-600' : 'text-gray-500'}`} />
                        <div>
                          <p className="font-semibold">Work From Office</p>
                          <p className="text-sm text-gray-600">Office attendance with location capture.</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkMode('WFH')}
                      className={`p-4 rounded-xl border text-left ${workMode === 'WFH' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Home className={`w-5 h-5 ${workMode === 'WFH' ? 'text-blue-600' : 'text-gray-500'}`} />
                        <div>
                          <p className="font-semibold">Work From Home</p>
                          <p className="text-sm text-gray-600">Remote work without office check-in.</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 cursor-pointer">
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
                      <p className="text-sm text-gray-600">Capture your current coordinates when you clock in.</p>
                      <p className="text-xs text-gray-500 mt-1">{locationStatus}</p>
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
                <div className="bg-white p-6 rounded-xl shadow-md space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Currently Working</h3>
                    <p className="text-sm text-gray-600">You clocked in at {todayAttendance.login_time}</p>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-xl text-center">
                    <p className="text-sm text-gray-600 mb-2">Working Time</p>
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
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600">Total Working Time</span>
                </div>
                <p className="text-2xl font-bold">{stats.total_working_time || '0 Hours 0 Minutes 0 Seconds'}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-gray-600">Total Days</span>
                </div>
                <p className="text-2xl font-bold">{stats.total_days || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Building className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-600">WFO Days</span>
                </div>
                <p className="text-2xl font-bold">{stats.wfo_days || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Home className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-600">WFH Days</span>
                </div>
                <p className="text-2xl font-bold">{stats.wfh_days || 0}</p>
              </div>
            </div>

            {/* Leave Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-600">Applied Leaves</span>
                </div>
                <p className="text-2xl font-bold">{leaveStats.total_leaves || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-gray-600">Approved Leaves</span>
                </div>
                <p className="text-2xl font-bold">{leaveStats.approved_leaves || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-600">Pending Leaves</span>
                </div>
                <p className="text-2xl font-bold">{leaveStats.pending_leaves || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <span className="text-gray-600">Rejected Leaves</span>
                </div>
                <p className="text-2xl font-bold">{leaveStats.rejected_leaves || 0}</p>
              </div>
            </div>

            {/* Today's Status */}
            {todayAttendance && (
              <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-lg font-semibold mb-4">Today's Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-600">Latest Login Time</p>
                    <p className="font-semibold">{todayAttendance.login_time}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Latest Logout Time</p>
                    <p className="font-semibold">{todayAttendance.logout_time || 'Not yet'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Current Session Working Time</p>
                    <p className="font-semibold">
                      {todayAttendance.logout_time 
                        ? todayAttendance.total_working_time || '0 Hours 0 Minutes 0 Seconds'
                        : liveWorkingTime.totalWorkingTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Location</p>
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
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Attendance History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
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
          <div>
            {/* Leave Application Form */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Apply for Leave</h2>
              <form onSubmit={handleLeaveSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="earned">Earned Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
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
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Leave History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number of Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied Date</th>
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
                            leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                            leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
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
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Salary Details</h2>
              <p className="text-gray-600 mt-2">Hourly Rate: ₹{user?.hourly_rate?.toFixed(2)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hourly Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary Amount</th>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Assigned Tasks</h2>
            {tasks.length === 0 && (
              <div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500">
                You have no assigned tasks at the moment.
              </div>
            )}
            {tasks.map(task => (
              <div key={task.task_id} className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${task.status === 'completed' ? 'border-green-500' : 'border-yellow-500'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{task.title}</h3>
                    <p className="text-sm text-gray-500">Assigned by {task.admin_name} on {new Date(task.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTaskForChat(task)}
                      className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
                    >
                      <MessageSquare className="w-4 h-4" /> Discussion
                    </button>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-gray-700 whitespace-pre-wrap">
                  {task.description}
                </div>
                
                {task.status === 'pending' ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Your Reply Message:</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg mt-4">
                    <p className="text-sm font-semibold text-green-800 mb-1">Your Reply:</p>
                    <p className="text-green-700 italic">"{task.employee_reply}"</p>
                    <p className="text-xs text-green-600 mt-2">Completed on {new Date(task.completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mx-auto border border-gray-100">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Submit Feedback / Suggestion</h2>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Your feedback is valuable to us. Please share any suggestions, issues, or ideas for improving our workplace environment or processes.
            </p>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Details</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
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
      </main>

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onSave={handleProfileSave}
        title="Edit Profile"
        submitLabel="Save Profile"
      />

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
          currentUser={{ employee_id: user?.employee_id, role: 'employee' }}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
