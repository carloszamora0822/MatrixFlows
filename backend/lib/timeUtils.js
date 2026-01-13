const moment = require('moment-timezone');

const TIMEZONE = 'America/Chicago';

class TimeUtils {
  /**
   * Get current time in Central Time
   * @returns {moment.Moment} Current time in America/Chicago timezone
   */
  static now() {
    return moment().tz(TIMEZONE);
  }

  /**
   * Convert any date to Central Time
   * @param {Date|moment.Moment|string} date - Date to convert
   * @returns {moment.Moment} Date in America/Chicago timezone
   */
  static toCentral(date) {
    return moment(date).tz(TIMEZONE);
  }

  /**
   * Get current minutes since midnight in Central Time
   * @returns {number} Minutes since midnight (0-1439)
   */
  static getCurrentMinutes() {
    const now = this.now();
    return now.hours() * 60 + now.minutes();
  }

  /**
   * Get current day of week in Central Time
   * @returns {number} Day of week (0=Sunday, 6=Saturday)
   */
  static getCurrentDay() {
    return this.now().day();
  }

  /**
   * Format time for display (12-hour format)
   * @param {Date|moment.Moment|string} date - Date to format
   * @returns {string} Formatted time (e.g., "3:45 PM")
   */
  static formatTime(date) {
    return this.toCentral(date).format('h:mm A');
  }

  /**
   * Format date and time for display
   * @param {Date|moment.Moment|string} date - Date to format
   * @returns {string} Formatted date and time (e.g., "Jan 12, 2026 3:45 PM")
   */
  static formatDateTime(date) {
    return this.toCentral(date).format('MMM D, YYYY h:mm A');
  }

  /**
   * Format minutes since midnight to HH:MM
   * @param {number} minutes - Minutes since midnight (0-1439)
   * @returns {string} Formatted time (e.g., "15:45")
   */
  static formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Parse HH:MM time string to minutes since midnight
   * @param {string} timeString - Time in HH:MM format
   * @returns {number} Minutes since midnight
   */
  static parseTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check if current time is within a daily window (Central Time)
   * @param {string} startTime - Start time in HH:MM format
   * @param {string} endTime - End time in HH:MM format
   * @param {number[]} [daysOfWeek] - Optional array of valid days (0=Sunday, 6=Saturday)
   * @returns {boolean} True if current time is within window
   */
  static isInWindow(startTime, endTime, daysOfWeek = null) {
    const now = this.now();
    const currentMinutes = now.hours() * 60 + now.minutes();
    const currentDay = now.day();

    // Check day of week if specified
    if (daysOfWeek && daysOfWeek.length > 0) {
      if (!daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Check time window
    const startMinutes = this.parseTimeToMinutes(startTime);
    const endMinutes = this.parseTimeToMinutes(endTime);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Calculate next trigger time based on interval and window constraints
   * @param {number} intervalMinutes - Interval in minutes
   * @param {Object} [windowConfig] - Optional window configuration
   * @param {string} windowConfig.startTime - Start time in HH:MM format
   * @param {string} windowConfig.endTime - End time in HH:MM format
   * @param {number[]} windowConfig.daysOfWeek - Valid days of week
   * @returns {Date} Next trigger time as UTC Date
   */
  static calculateNextTrigger(intervalMinutes, windowConfig = null) {
    const now = this.now();
    const currentMinutes = now.hours() * 60 + now.minutes();
    const currentDay = now.day();

    // If we have window config with day restrictions, check if we're on a valid day
    let needsToMoveToNextDay = false;
    if (windowConfig && windowConfig.daysOfWeek && windowConfig.daysOfWeek.length > 0) {
      if (!windowConfig.daysOfWeek.includes(currentDay)) {
        needsToMoveToNextDay = true;
      }
    }

    // Calculate next aligned interval
    let nextTriggerMinutes = Math.ceil((currentMinutes + 1) / intervalMinutes) * intervalMinutes;

    // Create next trigger moment
    let nextTrigger = moment(now).seconds(0).milliseconds(0);

    // If we need to move to next day due to day-of-week, skip interval calculation
    if (needsToMoveToNextDay && windowConfig) {
      const [startHour, startMin] = windowConfig.startTime.split(':').map(Number);
      nextTrigger = nextTrigger
        .add(1, 'day')
        .hours(startHour)
        .minutes(startMin);
    } else {
      // Handle midnight rollover
      if (nextTriggerMinutes >= 1440) {
        nextTriggerMinutes = nextTriggerMinutes - 1440;
        nextTrigger = nextTrigger
          .add(1, 'day')
          .hours(Math.floor(nextTriggerMinutes / 60))
          .minutes(nextTriggerMinutes % 60);
      } else {
        nextTrigger = nextTrigger
          .hours(Math.floor(nextTriggerMinutes / 60))
          .minutes(nextTriggerMinutes % 60);
      }
    }

    // Apply window constraints if provided
    if (windowConfig && windowConfig.startTime && windowConfig.endTime) {
      const startMinutes = this.parseTimeToMinutes(windowConfig.startTime);
      const endMinutes = this.parseTimeToMinutes(windowConfig.endTime);
      let triggerMinutes = nextTrigger.hours() * 60 + nextTrigger.minutes();

      // If before window start on same day, move to window start
      if (triggerMinutes < startMinutes && nextTrigger.isSame(now, 'day')) {
        const [startHour, startMin] = windowConfig.startTime.split(':').map(Number);
        nextTrigger = nextTrigger
          .hours(startHour)
          .minutes(startMin)
          .seconds(0)
          .milliseconds(0);
        triggerMinutes = startMinutes;
      }
      
      // If outside window (after end or before start on different day), move to next day's start time
      if (triggerMinutes > endMinutes || triggerMinutes < startMinutes) {
        const [startHour, startMin] = windowConfig.startTime.split(':').map(Number);
        nextTrigger = nextTrigger
          .add(1, 'day')
          .hours(startHour)
          .minutes(startMin)
          .seconds(0)
          .milliseconds(0);
      }

      // Apply day-of-week restrictions (skip invalid days)
      if (windowConfig.daysOfWeek && windowConfig.daysOfWeek.length > 0) {
        let daysChecked = 0;
        const maxDaysToCheck = 7;

        while (daysChecked < maxDaysToCheck && !windowConfig.daysOfWeek.includes(nextTrigger.day())) {
          const [startHour, startMin] = windowConfig.startTime.split(':').map(Number);
          nextTrigger = nextTrigger
            .add(1, 'day')
            .hours(startHour)
            .minutes(startMin)
            .seconds(0)
            .milliseconds(0);
          daysChecked++;
        }
      }
    }

    return nextTrigger.toDate();
  }

  /**
   * Get timezone name
   * @returns {string} Timezone identifier
   */
  static getTimezone() {
    return TIMEZONE;
  }
}

module.exports = TimeUtils;
