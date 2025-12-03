const { connectDB } = require('../../lib/db');
const User = require('../../models/User');
const { generateToken, setAuthCookie } = require('../../lib/auth');
const { validateLoginInput, createValidationError } = require('../../lib/validation');
const { loginRateLimit } = require('../../lib/middleware');
const { ERROR_CODES } = require('../../../shared/constants');

/**
 * User login endpoint
 * POST /api/auth/login
 */
const loginHandler = async (req, res) => {
  try {
    await connectDB();

    const { email, password } = req.body;
    
    // Validate input
    const validation = validateLoginInput({ email, password });
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.errors));
    }

    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid email or password'
        }
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid email or password'
        }
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = generateToken(user.userId);

    // Set HTTP-only cookie
    setAuthCookie(res, token);

    // Return user data (without sensitive information)
    const safeUser = user.toSafeObject();
    
    console.log(`✅ User logged in: ${user.email} (${user.role})`);

    res.status(200).json({
      user: {
        userId: safeUser.userId,
        email: safeUser.email,
        role: safeUser.role,
        lastLoginAt: safeUser.lastLoginAt
      },
      token: token, // Return token for localStorage storage
      message: 'Login successful'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Login failed due to server error'
      }
    });
  }
};

module.exports = async (req, res) => {
  // Apply rate limiting
  loginRateLimit(req, res, async (err) => {
    if (err) {
      return res.status(429).json({
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Too many login attempts, please try again later'
        }
      });
    }

    // Only allow POST method
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: {
          code: ERROR_CODES.METHOD_NOT_ALLOWED,
          message: 'Method not allowed'
        }
      });
    }

    await loginHandler(req, res);
  });
};
