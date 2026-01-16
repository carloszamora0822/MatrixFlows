const Workflow = require('../models/Workflow');
const Vestaboard = require('../models/Vestaboard');
const { ORG_CONFIG } = require('../../shared/constants');
const moment = require('moment-timezone');

const TIMEZONE = 'America/Chicago';

class WorkflowService {
  /**
   * Get the active workflow for a board at the current time
   * @param {object} board - The board object with defaultWorkflowId
   * @returns {Promise<object|null>} Active workflow or null
   */
  async getActiveWorkflow(board) {
    try {
      const now = new Date();
      
      // 🚫 CRITICAL SAFEGUARD: PINNED SCREEN BLOCKING LOGIC
      // ========================================================
      // When a custom screen is "Pinned for Today", it BLOCKS ALL other workflows
      // from running. This ensures ONLY the pinned screen displays on the board.
      // 
      // Workflows remain BLOCKED until:
      // 1. The pin expires (date/time range ends)
      // 2. The pin is manually removed/deactivated
      // 
      // This check runs FIRST before any other workflow logic.
      // ========================================================
      const pinnedWorkflow = await Workflow.findOne({
        orgId: ORG_CONFIG.ID,
        isActive: true,
        name: { $regex: /^Pinned -/ },
        'schedule.type': 'specificDateRange'
      });

      if (pinnedWorkflow && this.isWorkflowActiveNow(pinnedWorkflow, now)) {
        return pinnedWorkflow;
      }

      // Get the board's assigned workflow
      if (!board.defaultWorkflowId) {
        return null;
      }

      const workflow = await Workflow.findOne({
        workflowId: board.defaultWorkflowId,
        orgId: ORG_CONFIG.ID,
        isActive: true
      });

      if (!workflow) {
        return null;
      }
      
      // Check if workflow should be active at this time
      if (this.isWorkflowActiveNow(workflow, now)) {
        return workflow;
      }

      return null;

    } catch (error) {
      console.error('Error getting active workflow:', error);
      return null;
    }
  }

  /**
   * Check if a workflow should be active at the given time
   * @param {object} workflow
   * @param {Date} now
   * @returns {boolean}
   */
  isWorkflowActiveNow(workflow, now) {
    const schedule = workflow.schedule;

    if (!schedule || schedule.type === 'always') {
      return true;
    }

    if (schedule.type === 'dailyWindow' || schedule.type === 'timeWindow') {
      return this.isInDailyWindow(schedule, now);
    }

    if (schedule.type === 'specificDateRange') {
      return this.isInDateRange(schedule, now);
    }

    return false;
  }

  /**
   * Check if current time is within daily window
   * @param {object} schedule
   * @param {Date} now
   * @returns {boolean}
   */
  isInDailyWindow(schedule, now) {
    try {
      // Convert to Central Time using moment-timezone (handles DST automatically)
      const centralTime = moment(now).tz(TIMEZONE);
      
      // Check day of week (using Central Time)
      if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
        const currentDay = centralTime.day(); // 0=Sunday, 6=Saturday
        if (!schedule.daysOfWeek.includes(currentDay)) {
          return false;
        }
      }

      // Check time window (using Central Time)
      if (schedule.startTimeLocal && schedule.endTimeLocal) {
        const currentTime = centralTime.format('HH:mm');
        
        if (currentTime < schedule.startTimeLocal || currentTime > schedule.endTimeLocal) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in isInDailyWindow:', error);
      return false; // Fail safe
    }
  }

  /**
   * Check if current date is within date range (using Central Time)
   * @param {object} schedule
   * @param {Date} now
   * @returns {boolean}
   */
  isInDateRange(schedule, now) {
    // FIX: Use Central Time for date comparison, not UTC
    // At 23:59 CT, toISOString() would return next day's UTC date (05:59 UTC)
    // This caused day-boundary failures where workflows ended 6 hours early
    const currentDate = moment(now).tz(TIMEZONE).format('YYYY-MM-DD');

    if (schedule.startDate && currentDate < schedule.startDate) {
      return false;
    }

    if (schedule.endDate && currentDate > schedule.endDate) {
      return false;
    }

    return true;
  }

  /**
   * Get all boards for the organization
   * @returns {Promise<Array>}
   */
  async getAllBoards() {
    try {
      return await Vestaboard.find({
        orgId: ORG_CONFIG.ID,
        isActive: true
      });
    } catch (error) {
      console.error('Error getting boards:', error);
      return [];
    }
  }

  /**
   * Get current step in workflow (the one to display now)
   * @param {object} workflow
   * @param {number} currentStepIndex
   * @returns {object|null} Current step or null if workflow empty
   */
  getNextStep(workflow, currentStepIndex) {
    if (!workflow.steps || workflow.steps.length === 0) {
      return null;
    }

    // Filter enabled steps
    const enabledSteps = workflow.steps
      .filter(step => step.isEnabled)
      .sort((a, b) => a.order - b.order);

    if (enabledSteps.length === 0) {
      return null;
    }

    // Return CURRENT step (don't advance yet - scheduler does that after displaying)
    const currentIndex = currentStepIndex % enabledSteps.length;
    return {
      step: enabledSteps[currentIndex],
      index: currentIndex
    };
  }
}

module.exports = new WorkflowService();
