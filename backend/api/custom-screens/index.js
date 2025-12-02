const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const { ERROR_CODES } = require('../../../shared/constants');

/**
 * Custom Screens API
 * POST /api/custom-screens - Save a custom screen to library
 * GET /api/custom-screens - Get all saved custom screens
 */
module.exports = async (req, res) => {
  try {
    await connectDB();
    
    // Apply authentication middleware
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (req.method === 'POST') {
      // Save custom screen
      const { name, message, borderColor1, borderColor2, matrix } = req.body;

      // Validation
      if (!name || !message || !matrix) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Name, message, and matrix are required'
          }
        });
      }

      // For now, just return success (we'll add database storage later)
      const savedScreen = {
        id: `screen_${Date.now()}`,
        name,
        message,
        borderColor1,
        borderColor2,
        matrix,
        createdAt: new Date().toISOString(),
        createdBy: req.user?.userId
      };

      console.log(`✅ Custom screen "${name}" saved`);

      return res.status(201).json(savedScreen);

    } else if (req.method === 'GET') {
      // Get all custom screens (placeholder for now)
      return res.status(200).json([]);

    } else {
      return res.status(405).json({
        error: {
          code: ERROR_CODES.METHOD_NOT_ALLOWED,
          message: 'Method not allowed'
        }
      });
    }

  } catch (error) {
    console.error('❌ Custom screens API error:', error);
    
    // Handle authentication errors
    if (error.message && error.message.includes('Authentication')) {
      return;
    }
    
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to process custom screen request'
      }
    });
  }
};
