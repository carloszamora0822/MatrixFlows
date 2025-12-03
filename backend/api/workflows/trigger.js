const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const schedulerService = require('../../lib/schedulerService');
const { ERROR_CODES } = require('../../../shared/constants');

/**
 * Manual trigger endpoint for board updates
 * POST /api/workflows/trigger?boardId=xxx
 */
module.exports = async (req, res) => {
  try {
    console.log('🔍 Trigger endpoint hit');
    
    await connectDB();
    
    // SKIP AUTH IN DEVELOPMENT
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️ SKIPPING AUTH IN DEVELOPMENT MODE');
    } else {
      await new Promise((resolve, reject) => {
        requireEditor(req, res, (err) => err ? reject(err) : resolve());
      });
    }

    const { boardId } = req.query;
    
    if (!boardId) {
      return res.status(400).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Board ID required'
        }
      });
    }

    console.log(`🎯 Manual trigger requested for board ${boardId} - Running complete workflow`);
    
    const result = await schedulerService.triggerBoardUpdate(boardId);

    return res.status(200).json({
      success: true,
      message: 'Board updated successfully',
      result
    });

  } catch (error) {
    console.error('❌ Manual trigger error:', error);
    return res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message
      }
    });
  }
};
