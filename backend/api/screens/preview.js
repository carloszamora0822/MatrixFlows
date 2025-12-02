const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const screenEngine = require('../../lib/screenEngine');
const { ERROR_CODES, SCREEN_TYPES } = require('../../../shared/constants');

/**
 * Screen preview endpoint
 * POST /api/screens/preview
 * 
 * Request body:
 * {
 *   screenType: string (required) - Type of screen to render
 *   screenConfig: object (optional) - Configuration for the screen
 * }
 * 
 * Response:
 * {
 *   matrix: number[][] - 6x22 matrix of character codes
 * }
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

    const { screenType, screenConfig = {} } = req.body;

    // Validate screen type
    if (!screenType) {
      return res.status(400).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'screenType is required',
          details: {
            fieldErrors: {
              screenType: 'Screen type is required'
            }
          }
        }
      });
    }

    // Validate screen type is supported
    const validScreenTypes = Object.values(SCREEN_TYPES);
    if (!validScreenTypes.includes(screenType)) {
      return res.status(400).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid screen type',
          details: {
            fieldErrors: {
              screenType: `Screen type must be one of: ${validScreenTypes.join(', ')}`
            }
          }
        }
      });
    }

    console.log(`🎨 Generating preview for ${screenType} screen`);

    // Generate matrix using screen engine
    const matrix = await screenEngine.render(screenType, screenConfig);

    // Validate generated matrix
    if (!screenEngine.validateMatrix(matrix)) {
      throw new Error('Generated matrix is invalid');
    }

    console.log(`✅ Preview generated successfully for ${screenType}`);

    res.status(200).json({
      matrix,
      screenType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Preview generation error:', error);
    
    // Handle authentication errors (already sent by requireAuth)
    if (error.message && error.message.includes('Authentication')) {
      return;
    }
    
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to generate preview',
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          stack: error.stack
        } : undefined
      }
    });
  }
};
