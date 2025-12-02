const Workflow = require('../models/Workflow');
const Vestaboard = require('../models/Vestaboard');
const { ORG_CONFIG } = require('../../shared/constants');

class WorkflowService {
  /**
   * Get the active workflow for a board at the current time
   * @param {string} boardId
   * @returns {Promise<object|null>} Active workflow or null
   */
  async getActiveWorkflow(boardId) {
    try {
      // Get all active workflows for this board
      const workflows = await Workflow.find({
        orgId: ORG_CONFIG.ID,
        boardId,
        isActive: true
      }).sort({ isDefault: -1, createdAt: -1 });

      if (workflows.length === 0) {
        console.log(`⚠️  No workflows found for board ${boardId}`);
        return null;
      }

      const now = new Date();
      
      // Check each workflow's schedule
      for (const workflow of workflows) {
        if (this.isWorkflowActiveNow(workflow, now)) {
          console.log(`✅ Active workflow: ${workflow.name} (${workflow.workflowId})`);
          return workflow;
        }
      }

      // If no scheduled workflow is active, use the default
      const defaultWorkflow = workflows.find(w => w.isDefault);
      if (defaultWorkflow) {
        console.log(`✅ Using default workflow: ${defaultWorkflow.name}`);
        return defaultWorkflow;
      }

      console.log(`⚠️  No active workflow for board ${boardId} at this time`);
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

    if (schedule.type === 'dailyWindow') {
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
    // Check day of week
    if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
      const currentDay = now.getDay(); // 0=Sunday, 6=Saturday
      if (!schedule.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Check time window
    if (schedule.startTimeLocal && schedule.endTimeLocal) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (currentTime < schedule.startTimeLocal || currentTime > schedule.endTimeLocal) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current date is within date range
   * @param {object} schedule
   * @param {Date} now
   * @returns {boolean}
   */
  isInDateRange(schedule, now) {
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

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
