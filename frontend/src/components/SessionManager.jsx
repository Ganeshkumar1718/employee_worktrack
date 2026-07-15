import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import useIdleTimer from '../hooks/useIdleTimer';
import IdleWarningModal from './IdleWarningModal';
import { notifyWarning } from '../utils/notifications';

/**
 * SessionManager Component
 * Manages global idle detection and auto-clockout functionality
 * Wraps the application to provide session management across all authenticated pages
 */
const SessionManager = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showIdleModal, setShowIdleModal] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);

  const authConfig = useCallback(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }), []);

  // Fetch today's attendance to check if user is clocked in
  const fetchTodayAttendance = useCallback(async () => {
    try {
      const response = await api.get('/api/attendance/my', authConfig());
      const today = new Date().toISOString().split('T')[0];
      // Find the most recent active session (no logout_time) or the latest session
      const todayRecords = response.data.filter(a => a.attendance_date === today);
      const activeSession = todayRecords.find(a => !a.logout_time);
      const latestSession = todayRecords.length > 0 ? todayRecords[0] : null;
      setTodayAttendance(activeSession || latestSession);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  }, [authConfig]);

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
    }
  }, [user, fetchTodayAttendance]);

  // Cursor Inactivity Tracking Logic
  useEffect(() => {
    if (!user) return;

    const threshold = 30 * 1000; // 30 seconds threshold
    const lastActivityRef = { current: Date.now() };
    let warningSent = false;

    const handleMouseMove = () => {
      lastActivityRef.current = Date.now();
      warningSent = false;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= threshold && !warningSent) {
        warningSent = true;
        notifyWarning(
          'Cursor Inactivity Warning',
          'Your mouse cursor has not moved for 30 seconds.'
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, [user]);

  // Check for day change every minute
  useEffect(() => {
    const dayCheckInterval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      if (todayAttendance) {
        if (todayAttendance.attendance_date !== today) {
          fetchTodayAttendance();
        }
      }
    }, 60000);

    return () => {
      clearInterval(dayCheckInterval);
    };
  }, [todayAttendance, fetchTodayAttendance]);

  // Handle auto-clockout when countdown reaches zero
  const handleAutoClockout = useCallback(async () => {
    try {
      // Check if user is clocked in today
      if (todayAttendance && todayAttendance.login_time && !todayAttendance.logout_time) {
        // Auto-clockout
        await api.post('/api/attendance/auto-clockout', {}, authConfig());
      }
      // Clear active_token server-side before redirecting
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Auto clockout error:', error);
      await logout(false);
      navigate('/login');
    }
  }, [todayAttendance, logout, navigate, authConfig]);

  // Use idle timer hook — declared before handlers that need `reset`
  const { isIdle, reset, countdown } = useIdleTimer(
    10 * 60 * 1000, // 10 minutes
    handleAutoClockout  // When the 10-second countdown finishes, auto-clockout
  );

  // Show modal when idle state changes
  useEffect(() => {
    if (isIdle) {
      setShowIdleModal(true);
    }
  }, [isIdle]);

  // Handle continue working button
  const handleContinueWorking = useCallback(() => {
    setShowIdleModal(false);
    reset(); // Restart the 10-minute idle timer from scratch
  }, [reset]);

  // Handle logout now button
  const handleLogoutNow = useCallback(async () => {
    try {
      // Check if user has an active session (clocked in but not clocked out)
      if (todayAttendance && todayAttendance.login_time && !todayAttendance.logout_time) {
        // Clock out
        await api.post('/api/attendance/logout', {}, authConfig());
      }
      // Clear active_token server-side before redirecting
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      await logout(false);
      navigate('/login');
    }
  }, [todayAttendance, logout, navigate, authConfig]);

  // Only enable idle detection for authenticated users
  if (!user) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <IdleWarningModal
        isOpen={showIdleModal}
        countdown={countdown}
        onContinue={handleContinueWorking}
        onLogout={handleLogoutNow}
      />
    </>
  );
};

export default SessionManager;
