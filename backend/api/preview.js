const { connectDB } = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const screenEngine = require('../lib/screenEngine');
const { ERROR_CODES } = require('../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    const { type } = req.query;

    if (!type) {
      return res.status(400).json({ 
        error: { 
          code: ERROR_CODES.VALIDATION_ERROR, 
          message: 'Screen type required' 
        } 
      });
    }

    console.log(`📺 Generating preview for screen type: ${type}`);

    // Render the screen
    const matrix = await screenEngine.render(type, {});

    console.log(`✅ Preview generated successfully`);
    
    res.status(200).json({ 
      success: true,
      matrix,
      screenType: type
    });

  } catch (error) {
    console.error('❌ Preview API error:', error);
    return res.status(500).json({ 
      error: { 
        code: ERROR_CODES.INTERNAL_ERROR, 
        message: 'Failed to generate preview',
        details: error.message
      } 
    });
  }
};
