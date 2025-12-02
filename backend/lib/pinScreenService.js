const Workflow = require('../models/Workflow');
const moment = require('moment-timezone');

class PinScreenService {
  /**
   * Create a temporary pinned workflow
   * This workflow will override the default workflow for a specific time period
   */
  async createPinnedWorkflow({
    boardId,
    screenConfigs, // Array of {screenType, screenConfig, displaySeconds}
    startDate,
    endDate,
    startTimeLocal,
    endTimeLocal,
    createdBy
  }) {
    // Generate unique workflow name with timestamp
    const workflowName = `Pinned - ${moment().format('MM/DD HH:mm')}`;

    // Create workflow steps from screen configs
    const steps = screenConfigs.map((config, index) => ({
      order: index,
      screenType: config.screenType,
      screenConfig: config.screenConfig || {},
      displaySeconds: config.displaySeconds || 20,
      isEnabled: true
    }));

    // Create workflow with specific date range schedule
    const workflow = new Workflow({
      orgId: 'VBT',
      name: workflowName,
      isDefault: false,
      isActive: true,
      schedule: {
        type: 'specificDateRange',
        startDate,
        endDate,
        startTimeLocal,
        endTimeLocal,
        daysOfWeek: [] // All days in range
      },
      steps,
      createdBy
    });

    await workflow.save();
    
    console.log(`✅ Created pinned workflow: ${workflowName} for board ${boardId}`);
    console.log(`   Schedule: ${startDate} ${startTimeLocal} - ${endDate} ${endTimeLocal}`);
    console.log(`   Steps: ${steps.length} screens`);
    
    return workflow;
  }

  /**
   * Clean up expired pinned workflows
   * Called by scheduler to deactivate workflows that have passed their end time
   */
  async cleanupExpiredPinnedWorkflows() {
    const now = moment().tz('America/Chicago');
    const currentDate = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');

    // Find expired pinned workflows
    const expiredWorkflows = await Workflow.find({
      orgId: 'VBT',
      isDefault: false,
      isActive: true,
      name: { $regex: /^Pinned -/ },
      $or: [
        { 'schedule.endDate': { $lt: currentDate } },
        {
          'schedule.endDate': currentDate,
          'schedule.endTimeLocal': { $lte: currentTime }
        }
      ]
    });

    console.log(`🧹 Found ${expiredWorkflows.length} expired pinned workflows`);

    // Deactivate expired workflows
    for (const workflow of expiredWorkflows) {
      workflow.isActive = false;
      await workflow.save();
      console.log(`   Deactivated: ${workflow.name}`);
    }

    return expiredWorkflows.length;
  }

  /**
   * Get active pinned workflows for a board
   */
  async getActivePinnedWorkflows(boardId) {
    const now = moment().tz('America/Chicago');
    const currentDate = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');

    return await Workflow.find({
      orgId: 'VBT',
      isDefault: false,
      isActive: true,
      name: { $regex: /^Pinned -/ },
      'schedule.type': 'specificDateRange',
      'schedule.startDate': { $lte: currentDate },
      'schedule.endDate': { $gte: currentDate }
    });
  }
}

module.exports = new PinScreenService();
