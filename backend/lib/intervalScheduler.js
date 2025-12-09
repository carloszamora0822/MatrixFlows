/**
 * Interval Scheduler Service
 * 
 * Handles time-aligned interval scheduling for workflows.
 * Example: If interval is 30 minutes, triggers at 8:00, 8:30, 9:00, 9:30, etc.
 * NOT "30 minutes after last run" but aligned to clock times.
 */

const moment = require('moment-timezone');

/**
 * Check if workflow should update based on interval scheduling
 * @param {Object} workflow - Workflow with schedule.updateIntervalMinutes
 * @param {Date} lastUpdateAt - Last time the workflow was updated
 * @param {Date} currentTime - Current time (defaults to now)
 * @returns {boolean} - True if workflow should update now
 */
function shouldUpdateNow(workflow, lastUpdateAt, currentTime = new Date()) {
  const schedule = workflow.schedule || {};
  const intervalMinutes = schedule.updateIntervalMinutes || 30; // Default to 30 if not set
  
  // Convert to Central Time for consistency with workflow time windows
  const currentCentral = moment(currentTime).tz('America/Chicago');
  const currentMinutes = currentCentral.hours() * 60 + currentCentral.minutes();
  
  // Calculate the next aligned trigger time after last update
  if (!lastUpdateAt) {
    // Never updated before - check if current time aligns with interval
    return isAlignedTime(currentMinutes, intervalMinutes);
  }
  
  // Check if last update was on a different day (in Central Time)
  const lastUpdateCentral = moment(lastUpdateAt).tz('America/Chicago');
  const isSameDay = currentCentral.format('YYYY-MM-DD') === lastUpdateCentral.format('YYYY-MM-DD');
  
  if (!isSameDay) {
    // Last update was yesterday or earlier - definitely time to update
    console.log(`⏰ Last update was on a different day - triggering now`);
    return true;
  }
  
  // Get last update time in minutes since midnight (same day, Central Time)
  const lastUpdateMinutes = lastUpdateCentral.hours() * 60 + lastUpdateCentral.minutes();
  
  // Calculate next aligned trigger time after last update
  const nextTriggerMinutes = getNextAlignedTime(lastUpdateMinutes, intervalMinutes);
  
  console.log(`🔍 Interval check: current=${formatTime(currentMinutes)} (${currentMinutes}), last=${formatTime(lastUpdateMinutes)} (${lastUpdateMinutes}), next=${formatTime(nextTriggerMinutes)} (${nextTriggerMinutes})`);
  
  // Update if current time has reached or passed the next trigger time
  // We don't require exact alignment because scheduler might run at :35 seconds
  if (currentMinutes >= nextTriggerMinutes) {
    console.log(`⏰ Interval trigger: Last update at ${formatTime(lastUpdateMinutes)}, next trigger at ${formatTime(nextTriggerMinutes)}, current time ${formatTime(currentMinutes)}`);
    return true;
  }
  
  return false;
}

/**
 * Check if a time (in minutes since midnight) is aligned to the interval
 * Example: For 30-min interval, only :00 and :30 are aligned
 * @param {number} minutes - Minutes since midnight (0-1439)
 * @param {number} intervalMinutes - Interval in minutes
 * @returns {boolean}
 */
function isAlignedTime(minutes, intervalMinutes) {
  return minutes % intervalMinutes === 0;
}

/**
 * Get the next aligned time after a given time
 * @param {number} minutes - Current minutes since midnight
 * @param {number} intervalMinutes - Interval in minutes
 * @returns {number} - Next aligned minutes since midnight
 */
function getNextAlignedTime(minutes, intervalMinutes) {
  // Round up to next interval boundary
  return Math.ceil((minutes + 1) / intervalMinutes) * intervalMinutes;
}

/**
 * Format minutes since midnight to HH:MM
 * @param {number} minutes
 * @returns {string}
 */
function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Get all trigger times for a day within a time window
 * Used for preview/debugging
 * @param {string} startTime - HH:MM
 * @param {string} endTime - HH:MM
 * @param {number} intervalMinutes
 * @returns {string[]} - Array of HH:MM times
 */
function getTriggerTimes(startTime, endTime, intervalMinutes) {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  const times = [];
  
  // Find first aligned time at or after start
  let current = Math.ceil(startMinutes / intervalMinutes) * intervalMinutes;
  
  while (current <= endMinutes) {
    times.push(formatTime(current));
    current += intervalMinutes;
  }
  
  return times;
}

module.exports = {
  shouldUpdateNow,
  isAlignedTime,
  getNextAlignedTime,
  getTriggerTimes,
  formatTime
};
