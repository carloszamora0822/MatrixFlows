/**
 * Interval Scheduler Service
 * 
 * Handles RELATIVE interval scheduling for workflows.
 * Example: If interval is 60 minutes and last run was 6:18 PM, next run is 7:18 PM.
 * This is "X minutes after last run", NOT aligned to midnight.
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
  const intervalMinutes = schedule.updateIntervalMinutes || 30;
  
  // Convert to Central Time
  const currentCentral = moment(currentTime).tz('America/Chicago');
  
  if (!lastUpdateAt) {
    // Never updated before - trigger now if we're in the time window
    console.log(`⏰ No previous update - triggering now`);
    return true;
  }
  
  // Convert last update to Central Time
  const lastUpdateCentral = moment(lastUpdateAt).tz('America/Chicago');
  
  // Calculate time elapsed since last update (in minutes)
  const minutesElapsed = currentCentral.diff(lastUpdateCentral, 'minutes');
  
  console.log(`🔍 Interval check: last update ${lastUpdateCentral.format('YYYY-MM-DD HH:mm')}, current ${currentCentral.format('YYYY-MM-DD HH:mm')}, elapsed ${minutesElapsed}min, interval ${intervalMinutes}min`);
  
  // Trigger if enough time has passed
  if (minutesElapsed >= intervalMinutes) {
    console.log(`⏰ Interval reached: ${minutesElapsed}min >= ${intervalMinutes}min - triggering now`);
    return true;
  }
  
  console.log(`⏳ Not time yet: ${minutesElapsed}min < ${intervalMinutes}min (${intervalMinutes - minutesElapsed}min remaining)`);
  return false;
}

/**
 * Check if a time (in minutes since midnight) is aligned to the interval
 * @param {number} minutes - Minutes since midnight (0-1439)
 * @param {number} intervalMinutes - Interval in minutes
 * @returns {boolean}
 */
function isAlignedTime(minutes, intervalMinutes) {
  return minutes % intervalMinutes === 0;
}

/**
 * Get the next trigger time based on last update
 * @param {Date} lastUpdateAt - Last update time
 * @param {number} intervalMinutes - Interval in minutes
 * @returns {Date} - Next trigger time
 */
function getNextTriggerTime(lastUpdateAt, intervalMinutes) {
  if (!lastUpdateAt) {
    return new Date(); // Trigger now if never run
  }
  const lastUpdate = moment(lastUpdateAt).tz('America/Chicago');
  return lastUpdate.add(intervalMinutes, 'minutes').toDate();
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
  getNextTriggerTime,
  getTriggerTimes,
  formatTime
};
