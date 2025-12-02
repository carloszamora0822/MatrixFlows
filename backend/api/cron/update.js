const { connectDB } = require('../../lib/db');
const schedulerService = require('../../lib/schedulerService');
const CustomScreen = require('../../models/CustomScreen');
const Workflow = require('../../models/Workflow');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

/**
 * Cron endpoint to trigger board updates
 * POST /api/cron/update
 * 
 * This endpoint should be called by a cron service (e.g., Vercel Cron, external scheduler)
 * to update all Vestaboards based on their active workflows
 */
module.exports = async (req, res) => {
  try {
    await connectDB();

    // Verify cron secret for security
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('❌ CRON_SECRET not configured');
      return res.status(500).json({
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Cron secret not configured'
        }
      });
    }

    if (cronSecret !== expectedSecret) {
      console.error('❌ Invalid cron secret');
      return res.status(401).json({
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid cron secret'
        }
      });
    }

    console.log('\n🕐 Cron job triggered at', new Date().toISOString());

    // Clean up expired custom screens
    const now = new Date();
    const expiredScreens = await CustomScreen.find({
      orgId: ORG_CONFIG.ID,
      expiresAt: { $lte: now }
    });

    if (expiredScreens.length > 0) {
      console.log(`🗑️ Found ${expiredScreens.length} expired custom screens`);
      
      // Delete expired screens
      const deleteResult = await CustomScreen.deleteMany({
        orgId: ORG_CONFIG.ID,
        expiresAt: { $lte: now }
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} expired custom screens`);

      // Remove expired screens from workflows
      const workflows = await Workflow.find({ orgId: ORG_CONFIG.ID });
      let workflowsUpdated = 0;

      for (const workflow of workflows) {
        const expiredMessages = expiredScreens.map(s => s.message);
        const originalLength = workflow.steps.length;
        
        // Filter out steps with expired custom screens
        workflow.steps = workflow.steps.filter(step => {
          if (step.screenType === 'CUSTOM_MESSAGE' && step.screenConfig?.message) {
            return !expiredMessages.includes(step.screenConfig.message);
          }
          return true;
        });

        // Reorder remaining steps
        workflow.steps = workflow.steps.map((s, i) => ({ ...s, order: i }));

        if (workflow.steps.length < originalLength) {
          await workflow.save();
          workflowsUpdated++;
        }
      }

      if (workflowsUpdated > 0) {
        console.log(`✅ Updated ${workflowsUpdated} workflows (removed expired screens)`);
      }
    }

    // Process all boards
    const result = await schedulerService.processAllBoards();

    return res.status(200).json({
      success: result.success,
      timestamp: new Date().toISOString(),
      boardsProcessed: result.boardsProcessed,
      successCount: result.successCount,
      expiredScreensDeleted: expiredScreens.length,
      workflowsUpdated: expiredScreens.length > 0 ? workflowsUpdated : 0,
      results: result.results
    });

  } catch (error) {
    console.error('❌ Cron endpoint error:', error);
    return res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Cron job failed',
        details: {
          error: error.message
        }
      }
    });
  }
};
