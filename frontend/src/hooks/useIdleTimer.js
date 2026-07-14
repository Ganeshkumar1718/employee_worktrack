import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for detecting user inactivity
 * @param {number} timeout - Timeout in milliseconds before considering user inactive (default: 10 minutes)
 * @param {Function} onIdle - Callback function when user becomes inactive
 * @returns {Object} Object containing isIdle, reset, and countdown
 * 
 * Features:
 * - Resets the timer on any user interaction (mouse, keyboard, touch, scroll)
 * - Detects when the browser tab goes to background (visibility change / window blur)
 *   and checks elapsed idle time when the user returns
 * - Sends a system notification at 9 min 30 sec (30 seconds before idle modal)
 * - Throttles activity events for performance
 */

// Pre-warning notification fires 30 seconds before the idle timeout
const PRE_WARNING_OFFSET = 30 * 1000; // 30 seconds

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
  const timeoutRef = useRef(null);
  const preWarningRef = useRef(null); // Timer for the 9:30 system notification
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const throttleRef = useRef(null);
  const onIdleRef = useRef(onIdle);
  const preWarningSentRef = useRef(false); // Prevents duplicate notifications
  const preWarningNotificationRef = useRef(null); // Ref to active notification to dismiss it on activity

  // Keep onIdle ref current to avoid stale closures
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  // Request notification permission when the hook mounts
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Send the pre-warning system notification
  const sendPreWarning = useCallback(() => {
    if (preWarningSentRef.current) return; // Already sent for this idle cycle
    preWarningSentRef.current = true;
    const notification = sendSystemNotification(
      '⚠️ WorkTrack Pro — Inactivity Warning',
      'You have been inactive for 9 minutes 30 seconds. You will be logged out in 30 seconds if no activity is detected.'
    );
    preWarningNotificationRef.current = notification;
  }, []);

  // Start the 10-second final countdown and then fire onIdle
  const startCountdown = useCallback(() => {
    setIsIdle(true);
    setCountdown(10);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          if (onIdleRef.current) {
            onIdleRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (preWarningRef.current) {
      clearTimeout(preWarningRef.current);
      preWarningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Start both the pre-warning timer and the idle timer
  const startTimers = useCallback((duration) => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (preWarningRef.current) clearTimeout(preWarningRef.current);

    // Pre-warning notification at (duration - 30s), i.e. at 9:30 for a 10 min timeout
    const preWarningDelay = duration - PRE_WARNING_OFFSET;
    if (preWarningDelay > 0) {
      preWarningRef.current = setTimeout(() => {
        sendPreWarning();
      }, preWarningDelay);
    }

    // Main idle timeout
    timeoutRef.current = setTimeout(() => {
      startCountdown();
    }, duration);
  }, [startCountdown, sendPreWarning]);

  // Reset everything and restart the idle timer
  const resetTimer = useCallback(() => {
    setIsIdle(false);
    setCountdown(0);
    lastActivityRef.current = Date.now();
    preWarningSentRef.current = false;

    // Dismiss the pre-warning notification if visible
    if (preWarningNotificationRef.current) {
      try {
        preWarningNotificationRef.current.close();
      } catch (_) {}
      preWarningNotificationRef.current = null;
    }

    clearAllTimers();
    startTimers(timeout);
  }, [timeout, clearAllTimers, startTimers]);

  useEffect(() => {
    // Throttled activity handler — resets the timer on every user interaction
    // Throttled to once per 5 seconds for performance
    const handleActivity = () => {
      // Don't reset if already in the idle countdown phase
      if (isIdle) return;

      const now = Date.now();
      if (throttleRef.current && now - throttleRef.current < 5000) {
        // Just update the last activity timestamp but don't reset the timer
        lastActivityRef.current = now;
        return;
      }
      throttleRef.current = now;
      lastActivityRef.current = now;
      preWarningSentRef.current = false; // Reset notification flag on activity

      // Dismiss the pre-warning notification if visible
      if (preWarningNotificationRef.current) {
        try {
          preWarningNotificationRef.current.close();
        } catch (_) {}
        preWarningNotificationRef.current = null;
      }

      // Reset both timers
      startTimers(timeout);
    };

    // Handle tab visibility changes — when the user leaves and comes back,
    // check if they've been away longer than the timeout
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to the tab — check how long they were away
        const elapsed = Date.now() - lastActivityRef.current;

        if (elapsed >= timeout && !isIdle) {
          // They were away longer than the idle timeout — trigger idle immediately
          startCountdown();
        } else if (elapsed >= (timeout - PRE_WARNING_OFFSET) && !isIdle) {
          // Past the pre-warning mark — send notification and set remaining timer
          sendPreWarning();
          const remaining = timeout - elapsed;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            startCountdown();
          }, remaining);
        } else if (!isIdle) {
          // They came back within time — reset timers with remaining time
          const remaining = timeout - elapsed;
          startTimers(remaining);
        }
      } else {
        // User left the tab — clear JS timers (browser may throttle them anyway)
        // The real check happens when they come back via elapsed time comparison above
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (preWarningRef.current) {
          clearTimeout(preWarningRef.current);
          preWarningRef.current = null;
        }
      }
    };

    // Handle window blur/focus — catches Alt+Tab, clicking another window, etc.
    const handleWindowBlur = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (preWarningRef.current) {
        clearTimeout(preWarningRef.current);
        preWarningRef.current = null;
      }
    };

    const handleWindowFocus = () => {
      if (isIdle) return;

      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeout) {
        startCountdown();
      } else if (elapsed >= (timeout - PRE_WARNING_OFFSET)) {
        sendPreWarning();
        const remaining = timeout - elapsed;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          startCountdown();
        }, remaining);
      } else {
        const remaining = timeout - elapsed;
        startTimers(remaining);
      }
    };

    // User activity events
    const events = [
      'mousemove',
      'mousedown',
      'click',
      'keypress',
      'keydown',
      'keyup',
      'touchstart',
      'touchmove',
      'scroll'
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Tab/window visibility events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Start the initial timers
    if (!isIdle) {
      startTimers(timeout);
    }

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);

      clearAllTimers();
    };
  }, [timeout, isIdle, startCountdown, startTimers, clearAllTimers, sendPreWarning]);

  return { isIdle, reset: resetTimer, countdown };
};

export default useIdleTimer;
