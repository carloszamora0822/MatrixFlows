const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const schedulerService = require('../../lib/schedulerService');
const Vestaboard = require('../../models/Vestaboard');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

/**
 * Manual trigger endpoint for MULTIPLE boards sharing a workflow
 * POST /api/workflows/trigger-multi?workflowId=xxx
 * 
 * This triggers ALL boards simultaneously (like the cron does)
 * ✅ CRITICAL FIX: Prevents sequential triggering that causes desynchronization
 */
module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireEditor(req, res, (err) => err ? reject(err) : resolve());
    });

    const { workflowId } = req.query;
    
    if (!workflowId) {
      return res.status(400).json({
        error: { 
          code: ERROR_CODES.VALIDATION_ERROR, 
          message: 'Workflow ID required' 
        }
      });
    }

    console.log(`🚀 MULTI-BOARD TRIGGER requested for workflow: ${workflowId}`);

    // Find ALL boards using this workflow
    const boards = await Vestaboard.find({
      orgId: ORG_CONFIG.ID,
      defaultWorkflowId: workflowId,
      isActive: true
    });

    if (boards.length === 0) {
      return res.status(404).json({
        error: { 
          code: ERROR_CODES.NOT_FOUND, 
          message: 'No active boards found for this workflow' 
        }
      });
    }

    console.log(`   📺 Found ${boards.length} board(s): ${boards.map(b => b.name).join(', ')}`);
    
    // ✅ Use the SAME method as cron - triggers all boards simultaneously
    const results = await schedulerService.checkAndRunWorkflowForBoards(boards);

    const successCount = results.filter(r => r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.skipped).length;

    console.log(`✅ Multi-board trigger complete: ${successCount} executed, ${skippedCount} skipped`);

    return res.status(200).json({
      success: true,
      message: `Triggered ${boards.length} board(s) simultaneously`,
      boards: boards.map(b => ({ boardId: b.boardId, name: b.name })),
      results,
      stats: {
        total: boards.length,
        executed: successCount,
        skipped: skippedCount
      }
    });

  } catch (error) {
    console.error('❌ Multi-board trigger error:', error);
    return res.status(500).json({
      error: { 
        code: ERROR_CODES.INTERNAL_ERROR, 
        message: error.message 
      }
    });
  }
};
