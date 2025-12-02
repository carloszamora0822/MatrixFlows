const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const CustomScreen = require('../../models/CustomScreen');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

/**
 * Custom Screens API
 * POST /api/custom-screens - Save a custom screen to library
 * GET /api/custom-screens - Get all saved custom screens
 * DELETE /api/custom-screens/:id - Delete a custom screen
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
      const { name, message, borderColor1, borderColor2, matrix, expiresAt } = req.body;

      // Validation
      if (!name || !message || !matrix || !expiresAt) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Name, message, matrix, and expiration date are required'
          }
        });
      }

      const customScreen = new CustomScreen({
        orgId: ORG_CONFIG.ID,
        name,
        message,
        borderColor1: borderColor1 || 'red',
        borderColor2: borderColor2 || 'orange',
        matrix,
        expiresAt: new Date(expiresAt),
        createdBy: req.user?.userId
      });

      await customScreen.save();

      console.log(`✅ Custom screen "${name}" saved (expires: ${expiresAt})`);

      return res.status(201).json({
        screenId: customScreen.screenId,
        name: customScreen.name,
        message: customScreen.message,
        borderColor1: customScreen.borderColor1,
        borderColor2: customScreen.borderColor2,
        matrix: customScreen.matrix,
        expiresAt: customScreen.expiresAt,
        createdAt: customScreen.createdAt
      });

    } else if (req.method === 'GET') {
      // Get all non-expired custom screens
      const now = new Date();
      const screens = await CustomScreen.find({
        orgId: ORG_CONFIG.ID,
        expiresAt: { $gt: now }
      }).sort({ createdAt: -1 });

      return res.status(200).json(screens);

    } else if (req.method === 'DELETE') {
      // Delete custom screen
      const screenId = req.query.id;
      
      if (!screenId) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Screen ID is required'
          }
        });
      }

      await CustomScreen.deleteOne({ screenId, orgId: ORG_CONFIG.ID });
      
      console.log(`✅ Custom screen ${screenId} deleted`);
      
      return res.status(200).json({ success: true });

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
