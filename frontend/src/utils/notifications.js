/**
 * System & Website Screen Notification Utility for WorkTrack Pro
 * 
 * Sends all notifications to:
 * 1. The browser's native OS system notification panel (HTML5 Notification API)
 * 2. An on-screen website toast (via CustomEvent dispatcher)
 */

let permissionGranted = false;

/**
 * Request browser notification permission.
 * Call this once on app load.
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
};

/**
 * Send a system & website notification.
 * @param {string} title - Notification title / message
 * @param {object} options - Optional config
 * @param {string} options.body - Notification detail/description
 * @param {string} options.type - 'success' | 'error' | 'warning' | 'info' (for styling and icon)
 * @param {string} options.tag - Unique tag to prevent duplicate notifications
 * @param {boolean} options.requireInteraction - If true, notification stays until dismissed
 */
export const sendSystemNotification = (title, options = {}) => {
  const { body = '', type = 'info', tag, requireInteraction = false } = options;

  // 1. Dispatch custom event for on-screen website toast
  const event = new CustomEvent('worktrack-notification', {
    detail: { message: title, body, type }
  });
  window.dispatchEvent(event);

  // 2. Call OS system notification
  const typeIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };
  const icon = typeIcons[type] || typeIcons.info;
  const fullTitle = `${icon} WorkTrack Pro`;

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(fullTitle, {
        body: title + (body ? '\n' + body : ''),
        tag: tag || `worktrack-${Date.now()}`,
        requireInteraction,
      });

      // Clicking the notification brings focus back to the app
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 6 seconds for non-persistent notifications
      if (!requireInteraction) {
        setTimeout(() => notification.close(), 6000);
      }
    } catch (err) {
      console.warn('System notification failed:', err);
    }
  }
};

/**
 * Convenience methods
 */
export const notifySuccess = (message, body = '') => {
  sendSystemNotification(message, { body, type: 'success' });
};

export const notifyError = (message, body = '') => {
  sendSystemNotification(message, { body, type: 'error' });
};

export const notifyWarning = (message, body = '') => {
  sendSystemNotification(message, { body, type: 'warning', requireInteraction: true, tag: 'worktrack-warning' });
};

export const notifyInfo = (message, body = '') => {
  sendSystemNotification(message, { body, type: 'info' });
};
