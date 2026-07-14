/**
 * Time Formatter Utility (Frontend)
 * Handles time calculations and formatting for attendance tracking
 */

/**
 * Calculate live working time from login time to current time
 * @param {string} loginTime - Login time in YYYY-MM-DD HH:mm:ss format
 * @returns {Object} Object containing workingHours, workingMinutes, workingSeconds, totalWorkingTime
 */
export const calculateLiveWorkingTime = (loginTime) => {
  try {
    const login = new Date(loginTime);
    const now = new Date();
    
    if (isNaN(login.getTime())) {
      return {
        workingHours: 0,
        workingMinutes: 0,
        workingSeconds: 0,
        totalWorkingTime: '0 Hours 0 Minutes 0 Seconds'
      };
    }
    
    const diffMs = now.getTime() - login.getTime();
    
    if (diffMs < 0) {
      return {
        workingHours: 0,
        workingMinutes: 0,
        workingSeconds: 0,
        totalWorkingTime: '0 Hours 0 Minutes 0 Seconds'
      };
    }
    
    const totalSeconds = Math.floor(diffMs / 1000);
    const workingHours = Math.floor(totalSeconds / 3600);
    const remainingSeconds = totalSeconds % 3600;
    const workingMinutes = Math.floor(remainingSeconds / 60);
    const workingSeconds = remainingSeconds % 60;
    
    const totalWorkingTime = `${workingHours} Hours ${workingMinutes} Minutes ${workingSeconds} Seconds`;
    
    return {
      workingHours,
      workingMinutes,
      workingSeconds,
      totalWorkingTime
    };
  } catch (error) {
    console.error('Error calculating live working time:', error);
    return {
      workingHours: 0,
      workingMinutes: 0,
      workingSeconds: 0,
      totalWorkingTime: '0 Hours 0 Minutes 0 Seconds'
    };
  }
};

/**
 * Format total working time string from hours, minutes, seconds
 * @param {number} hours - Hours
 * @param {number} minutes - Minutes
 * @param {number} seconds - Seconds
 * @returns {string} Formatted string
 */
export const formatWorkingTime = (hours, minutes, seconds) => {
  return `${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
};

/**
 * Calculate number of leave days between start and end date
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {number} Number of leave days
 */
export const calculateLeaveDays = (startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 1;
    }
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return diffDays > 0 ? diffDays : 1;
  } catch (error) {
    console.error('Error calculating leave days:', error);
    return 1;
  }
};
