const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const schedulerService = require('../../lib/schedulerService');
const { ERROR_CODES } = require('../../../shared/constants');

/**
 * Manual Board Update API
 * POST /api/manual-update
 * 
 * Manually triggers workflow processing for all boards
 * This is a replacement for the deprecated cron endpoint
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: {
        code: ERROR_CODES.METHOD_NOT_ALLOWED,
        message: 'Method not allowed'
      }
    });
  }

  try {
    await connectDB();
    
    // Apply authentication middleware
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`🎯 Manual update triggered by ${req.user?.email || 'unknown'}`);

    // Process all boards (same as cron would do)
    const result = await schedulerService.processAllBoards();

    return res.status(200).json({
      success: result.success,
      message: 'Board update completed',
      boardsProcessed: result.boardsProcessed,
      successCount: result.successCount,
      results: result.results
    });

  } catch (error) {
    console.error('❌ Manual update error:', error);
    
    // Handle authentication errors
    if (error.message && error.message.includes('Authentication')) {
      return;
    }
    
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update boards',
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          stack: error.stack
        } : undefined
      }
    });
  }
};
