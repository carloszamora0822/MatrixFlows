const { clearAuthCookie } = require('../../lib/auth');
const { ERROR_CODES } = require('../../../shared/constants');

/**
 * User logout endpoint
 * POST /api/auth/logout
 */
module.exports = async (req, res) => {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: {
        code: ERROR_CODES.METHOD_NOT_ALLOWED,
        message: 'Method not allowed'
      }
    });
  }

  try {
    // Clear authentication cookie
    clearAuthCookie(res);
    
    console.log('✅ User logged out successfully');

    res.status(200).json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Logout failed due to server error'
      }
    });
  }
};
