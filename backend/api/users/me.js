const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const { ERROR_CODES } = require('../../../shared/constants');

/**
 * Get current user endpoint
 * GET /api/users/me
 */
module.exports = async (req, res) => {
  // Only allow GET method
  if (req.method !== 'GET') {
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

    // Return user data (already attached by requireAuth middleware)
    const safeUser = req.user.toSafeObject();

    res.status(200).json({
      userId: safeUser.userId,
      email: safeUser.email,
      role: safeUser.role,
      orgId: safeUser.orgId,
      lastLoginAt: safeUser.lastLoginAt,
      createdAt: safeUser.createdAt
    });

  } catch (error) {
    console.error('❌ Get current user error:', error);
    
    // If it's an authentication error, it's already handled by requireAuth
    if (error.message && error.message.includes('Authentication')) {
      return;
    }
    
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to get user information'
      }
    });
  }
};
