const { connectDB } = require('../../lib/db');
const schedulerService = require('../../lib/schedulerService');
const { ERROR_CODES } = require('../../../shared/constants');

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

    // Process all boards
    const result = await schedulerService.processAllBoards();

    return res.status(200).json({
      success: result.success,
      timestamp: new Date().toISOString(),
      boardsProcessed: result.boardsProcessed,
      successCount: result.successCount,
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
