import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for detecting user inactivity
 * @param {number} timeout - Timeout in milliseconds before considering user inactive (default: 10 minutes)
 * @param {Function} onIdle - Callback function when user becomes inactive
 * @returns {Object} Object containing isIdle, reset, and countdown
 * 
 * Features:
 * - Resets the timer on any user interaction (mouse, keyboard, touch, scroll)
 * - Uses a robust setInterval to check time elapsed, bypassing browser tab-suspend issues
 * - Sends a system notification exactly 1 minute before the idle timeout
 * - Throttles activity events for performance
 */

const PRE_WARNING_OFFSET = 60 * 1000; // 60 seconds (1 minute before timeout)

/**
 * Request browser notification permission on first call.
 * Returns true if permission is granted.
 */
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

/**
 * Send a system notification via the Browser Notification API.
 */
const sendSystemNotification = (title, body) => {
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notification = new Notification(title, {
      body,
      tag: 'worktrack-idle-warning', // Prevents duplicate notifications
      requireInteraction: true, // Stays visible until user interacts
    });

    // Clicking the notification brings the user back to the app
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return notification;
  } catch (err) {
    // Fallback: some environments don't support the Notification constructor
    console.warn('System notification failed:', err);
    return null;
  }
};

const useIdleTimer = (timeout = 10 * 60 * 1000, onIdle) => {
  const [isIdle, setIsIdle] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const lastActivityRef = useRef(Date.now());
  const throttleRef = useRef(null);
  const onIdleRef = useRef(onIdle);
  const preWarningSentRef = useRef(false);
  const preWarningNotificationRef = useRef(null);
  const idleTriggeredRef = useRef(false);

  // Keep onIdle ref current to avoid stale closures
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  // Request notification permission when the hook mounts
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const sendPreWarning = useCallback(() => {
    if (preWarningSentRef.current) return; // Already sent for this idle cycle
    preWarningSentRef.current = true;
    const notification = sendSystemNotification(
      '⚠️ WorkTrack Pro — Inactivity Warning',
      `You have been inactive for ${Math.floor((timeout - PRE_WARNING_OFFSET) / 60000)} minutes. You will be automatically clocked out in 1 minute if no activity is detected.`
    );
    preWarningNotificationRef.current = notification;
  }, [timeout]);

  const reset = useCallback(() => {
    setIsIdle(false);
    setCountdown(0);
    lastActivityRef.current = Date.now();
    preWarningSentRef.current = false;
    idleTriggeredRef.current = false;

    // Dismiss the pre-warning notification if visible
    if (preWarningNotificationRef.current) {
      try {
        preWarningNotificationRef.current.close();
      } catch (_) {}
      preWarningNotificationRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Robust background-friendly interval to check time elapsed
    // Checks every 2 seconds
    const checkInterval = setInterval(() => {
      if (idleTriggeredRef.current) return; // Already triggered idle

      // If the browser tab is hidden/minimized, assume the employee is working in another app or tab
      // We reset the timer so they do not get incorrectly clocked out.
      if (document.visibilityState === 'hidden') {
        lastActivityRef.current = Date.now();
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;

      // 1. Send warning at 9 minutes (if timeout is 10 mins)
      if (elapsed >= (timeout - PRE_WARNING_OFFSET) && !preWarningSentRef.current) {
        sendPreWarning();
      }

      // 2. Start the final 10-second UI countdown if we are extremely close
      if (elapsed >= timeout && !isIdle) {
        setIsIdle(true);
        // We set 10 seconds for the UI modal, but if they are tabbed out, it will still trigger the actual logout shortly
      }

      if (isIdle) {
        // If we are in the isIdle state, we handle the countdown
        // We use Math.max to prevent negative countdowns
        const uiCountdown = Math.max(0, 10 - Math.floor((elapsed - timeout) / 1000));
        setCountdown(uiCountdown);

        if (uiCountdown <= 0) {
          idleTriggeredRef.current = true;
          if (onIdleRef.current) {
            onIdleRef.current();
          }
        }
      }
    }, 2000); // Check every 2 seconds to be highly responsive even in background tabs

    return () => clearInterval(checkInterval);
  }, [timeout, isIdle, sendPreWarning]);

  useEffect(() => {
    // Throttled activity handler — resets the timer on every user interaction
    // Throttled to once per 5 seconds for performance
    const handleActivity = () => {
      if (idleTriggeredRef.current) return;

      const now = Date.now();
      if (throttleRef.current && now - throttleRef.current < 5000) {
        lastActivityRef.current = now;
        return;
      }
      
      throttleRef.current = now;
      lastActivityRef.current = now;
      
      if (preWarningSentRef.current) {
        preWarningSentRef.current = false;
        // Dismiss the pre-warning notification if visible
        if (preWarningNotificationRef.current) {
          try {
            preWarningNotificationRef.current.close();
          } catch (_) {}
          preWarningNotificationRef.current = null;
        }
      }

      // If user became active during the final 10 second countdown, reset it
      if (isIdle) {
        setIsIdle(false);
        setCountdown(0);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isIdle]);

  return { isIdle, reset, countdown };
};

export default useIdleTimer;
