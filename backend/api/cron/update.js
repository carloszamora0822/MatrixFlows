const { connectDB } = require('../../lib/db');
const schedulerService = require('../../lib/schedulerService');
const CustomScreen = require('../../models/CustomScreen');
const Workflow = require('../../models/Workflow');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

/**
 * Cron endpoint to trigger board updates
 * POST /api/cron/update?secret=YOUR_CRON_SECRET
 * 
 * POWER AUTOMATE SETUP:
 * 1. Create a "Recurrence" trigger set to run every 1 minute
 * 2. Add an "HTTP" action with:
 *    - Method: POST
 *    - URI: https://your-domain.com/api/cron/update?secret=YOUR_CRON_SECRET
 *    - Headers: (none needed, secret is in URL)
 * 3. That's it! The backend handles all timing logic.
 * 
 * SECURITY:
 * - Uses CRON_SECRET environment variable for authentication
 * - No user authentication needed (this is a system endpoint)
 * - Secret can be passed as query param or X-Cron-Secret header
 * 
 * WHAT IT DOES:
 * - Cleans up expired screens
 * - Groups boards by workflow
 * - Runs each workflow once, posts to all assigned boards simultaneously
 * - Respects workflow schedules and intervals
 * - Only processes active boards
 */
module.exports = async (req, res) => {
  const startTime = Date.now();
  
  try {
    await connectDB();

    // Verify cron secret for security (skip in development)
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
    const expectedSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.CRON_SECRET) {
        console.error('❌ CRON_SECRET not configured in production!');
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
    } else {
      console.log('⚠️  Development mode - using default secret');
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
      const expiredScreenIds = expiredScreens.map(s => s.screenId);

      for (const workflow of workflows) {
        const originalLength = workflow.steps.length;
        
        // Filter out steps with expired custom screens
        workflow.steps = workflow.steps.filter(step => {
          // Check if screen expired from library
          if (step.screenType === 'CUSTOM_MESSAGE' && step.screenConfig?.customScreenId) {
            if (expiredScreenIds.includes(step.screenConfig.customScreenId)) {
              console.log(`🗑️  Removing library-expired screen from workflow: ${workflow.name}`);
              return false;
            }
          }
          
          // Check if screen has workflow-specific expiration
          if (step.screenType === 'CUSTOM_MESSAGE' && step.screenConfig?.hasExpiration && step.screenConfig?.expiresAt) {
            const expiresDateTime = new Date(`${step.screenConfig.expiresAt}T${step.screenConfig.expiresAtTime || '23:59'}:00.000Z`);
            if (expiresDateTime <= now) {
              console.log(`🗑️  Removing workflow-expired screen from workflow: ${workflow.name}`);
              return false;
            }
          }
          
          return true;
        });

        // Reorder remaining steps
        workflow.steps = workflow.steps.map((s, i) => ({ ...s, order: i }));

        if (workflow.steps.length < originalLength) {
          console.log(`✅ Removed ${originalLength - workflow.steps.length} expired screen(s) from workflow: ${workflow.name}`);
          await workflow.save();
          workflowsUpdated++;
        }
      }

      console.log(`✅ Updated ${workflowsUpdated} workflows (removed expired screens)`);
    }

    // Respond immediately, then process boards in background
    const duration = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      expiredScreensDeleted: expiredScreens.length || 0,
      workflowsUpdated: expiredScreens.length > 0 ? workflowsUpdated : 0,
      message: 'Cron job started - processing boards in background'
    });

    // Process all boards asynchronously (don't await)
    schedulerService.processAllBoards()
      .then(result => {
        const totalDuration = Date.now() - startTime;
        console.log(`✅ Cron job completed in ${totalDuration}ms`);
        console.log(`📊 Processed ${result.boardsProcessed} boards, ${result.successCount} successful`);
      })
      .catch(error => {
        console.error('❌ Error processing boards:', error);
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
