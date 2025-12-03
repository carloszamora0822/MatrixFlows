const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const CustomScreen = require('../../models/CustomScreen');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

/**
 * Custom Screens API
 * POST /api/custom-screens - Save a custom screen to library
 * GET /api/custom-screens - Get all saved custom screens
 * PUT /api/custom-screens?id=:id - Update an existing custom screen
 * DELETE /api/custom-screens?id=:id - Delete a custom screen
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

      console.log(`💾 Saving custom screen "${name}"`);
      console.log(`💾 Matrix received: ${Array.isArray(matrix) ? 'YES' : 'NO'}, length: ${matrix?.length}`);

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
      console.log(`✅ Saved matrix is array: ${Array.isArray(customScreen.matrix)}, length: ${customScreen.matrix?.length}`);

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

      console.log(`📚 Returning ${screens.length} custom screens`);
      if (screens.length > 0) {
        console.log(`📚 First screen has matrix: ${!!screens[0].matrix}`);
        console.log(`📚 First screen matrix is array: ${Array.isArray(screens[0].matrix)}`);
      }

      return res.status(200).json(screens);

    } else if (req.method === 'PUT') {
      // Update custom screen
      const screenId = req.query.id;
      const { name, message, borderColor1, borderColor2, matrix, expiresAt } = req.body;

      if (!screenId) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Screen ID required'
          }
        });
      }

      if (!name || !message || !matrix || !expiresAt) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Name, message, matrix, and expiration date are required'
          }
        });
      }

      console.log(`📝 Updating custom screen ${screenId}`);

      const updated = await CustomScreen.findOneAndUpdate(
        { screenId, orgId: ORG_CONFIG.ID },
        {
          name,
          message,
          borderColor1: borderColor1 || 'red',
          borderColor2: borderColor2 || 'orange',
          matrix,
          expiresAt: new Date(expiresAt)
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Custom screen not found'
          }
        });
      }

      console.log(`✅ Custom screen "${name}" updated`);

      return res.status(200).json({
        screenId: updated.screenId,
        name: updated.name,
        message: updated.message,
        borderColor1: updated.borderColor1,
        borderColor2: updated.borderColor2,
        matrix: updated.matrix,
        expiresAt: updated.expiresAt,
        createdAt: updated.createdAt
      });

    } else if (req.method === 'DELETE') {
      // Delete custom screen AND remove it from all workflows
      const screenId = req.query.id;
      
      if (!screenId) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Screen ID is required'
          }
        });
      }

      const Workflow = require('../../models/Workflow');

      // Delete the custom screen
      await CustomScreen.deleteOne({ screenId, orgId: ORG_CONFIG.ID });
      console.log(`✅ Custom screen ${screenId} deleted from library`);

      // Remove this screen from ALL workflows
      const customScreenConfig = { customScreenId: screenId };
      const result = await Workflow.updateMany(
        { orgId: ORG_CONFIG.ID },
        { 
          $pull: { 
            steps: { 
              'step.screenType': 'CUSTOM_MESSAGE',
              'step.screenConfig.customScreenId': screenId
            }
          }
        }
      );

      console.log(`✅ Removed custom screen ${screenId} from ${result.modifiedCount} workflow(s)`);
      
      return res.status(200).json({ 
        success: true,
        workflowsUpdated: result.modifiedCount
      });

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
