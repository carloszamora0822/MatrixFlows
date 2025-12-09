const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const BoardState = require('../../models/BoardState');
const Vestaboard = require('../../models/Vestaboard');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');
const moment = require('moment-timezone');

/**
 * Force immediate workflow trigger
 * POST /api/workflows/trigger-now?workflowId=xxx
 * 
 * This resets all boards using this workflow and forces immediate trigger
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

    // Find all boards using this workflow
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

    console.log(`🚀 MANUAL TRIGGER: Forcing ${boards.length} board(s) to trigger immediately`);

    // Reset all board states and force immediate trigger
    for (const board of boards) {
      await BoardState.findOneAndUpdate(
        {
          orgId: ORG_CONFIG.ID,
          boardId: board.boardId
        },
        {
          workflowRunning: false,
          nextScheduledTrigger: moment().tz('America/Chicago').toDate(),
          currentStepIndex: 0
        },
        { upsert: true }
      );
      console.log(`   ✅ ${board.name} will trigger on next cron (within 60s)`);
    }

    return res.status(200).json({
      success: true,
      message: `Triggered ${boards.length} board(s). Workflow will execute on next cron run (within 60 seconds).`,
      boards: boards.map(b => ({ boardId: b.boardId, name: b.name }))
    });

  } catch (error) {
    console.error('❌ Trigger now error:', error);
    return res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message
      }
    });
  }
};
