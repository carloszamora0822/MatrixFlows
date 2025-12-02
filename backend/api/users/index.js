const { connectDB } = require('../../lib/db');
const { requireAuth, requireAdmin } = require('../../lib/auth');
const User = require('../../models/User');
const { validateUserInput, createValidationError } = require('../../lib/validation');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

/**
 * Users management endpoint
 * GET /api/users - List users (admin only)
 * POST /api/users - Create user (admin only)
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

    switch (req.method) {
      case 'GET':
        return await getUsers(req, res);
      case 'POST':
        return await createUser(req, res);
      default:
        return res.status(405).json({
          error: {
            code: ERROR_CODES.METHOD_NOT_ALLOWED,
            message: 'Method not allowed'
          }
        });
    }
  } catch (error) {
    console.error('❌ Users API error:', error);
    return res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * Get all users (admin only)
 */
const getUsers = async (req, res) => {
  // Apply admin authorization
  await new Promise((resolve, reject) => {
    requireAdmin(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const users = await User.find({ 
    orgId: ORG_CONFIG.ID,
    isActive: true 
  })
  .select('-passwordHash -__v')
  .sort({ createdAt: -1 });

  res.status(200).json(users.map(user => user.toSafeObject()));
};

/**
 * Create new user (admin only)
 */
const createUser = async (req, res) => {
  // Apply admin authorization
  await new Promise((resolve, reject) => {
    requireAdmin(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const { email, password, role } = req.body;
  
  // Validate input
  const validation = validateUserInput({ email, password, role });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ 
    email: email.toLowerCase().trim(),
    orgId: ORG_CONFIG.ID 
  });

  if (existingUser) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'User with this email already exists'
      }
    });
  }

  // Create new user
  const newUser = new User({
    email: email.toLowerCase().trim(),
    passwordHash: password, // Will be hashed by pre-save hook
    role: role || 'editor',
    orgId: ORG_CONFIG.ID
  });

  await newUser.save();

  console.log(`✅ New user created: ${newUser.email} (${newUser.role}) by ${req.user.email}`);

  // Return user data without password
  const safeUser = newUser.toSafeObject();
  
  res.status(201).json({
    user: {
      userId: safeUser.userId,
      email: safeUser.email,
      role: safeUser.role,
      orgId: safeUser.orgId,
      createdAt: safeUser.createdAt
    },
    message: 'User created successfully'
  });
};
