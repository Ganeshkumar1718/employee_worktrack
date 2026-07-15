import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const useActivityTracker = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('Active');
  const lastActivityRef = useRef(Date.now());
  const currentStatusRef = useRef('Active');
  const timeoutRef = useRef(null);

  const sendStatusUpdate = useCallback(async (newStatus, timestamp) => {
    if (!user) return;
    try {
      await api.post('/api/employee/status', {
        employeeId: user.employee_id,
        status: newStatus,
        lastActivity: new Date(timestamp).toISOString()
      });
      console.log(`Employee activity status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update employee status:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setStatus('Inactive');
      currentStatusRef.current = 'Inactive';
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Set initial status as Active
    setStatus('Active');
    currentStatusRef.current = 'Active';
    lastActivityRef.current = Date.now();
    
    // Send initial status update
    sendStatusUpdate('Active', Date.now());

    const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

    const handleInactivityTimeout = () => {
      if (currentStatusRef.current !== 'Inactive') {
        setStatus('Inactive');
        currentStatusRef.current = 'Inactive';
        sendStatusUpdate('Inactive', lastActivityRef.current);
      }
    };

    const resetTimer = () => {
      if (!user) return;

      lastActivityRef.current = Date.now();

      // If they were inactive and now interact, immediately set status back to Active
      if (currentStatusRef.current === 'Inactive') {
        setStatus('Active');
        currentStatusRef.current = 'Active';
        sendStatusUpdate('Active', Date.now());
      }

      // Reset the 10 minute timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(handleInactivityTimeout, INACTIVITY_LIMIT);
    };

    // Events to monitor
    const events = ['mousemove', 'click', 'keydown', 'scroll'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Start initial timer
    timeoutRef.current = setTimeout(handleInactivityTimeout, INACTIVITY_LIMIT);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, sendStatusUpdate]);

  return { status, lastActivity: lastActivityRef.current };
};

export default useActivityTracker;
