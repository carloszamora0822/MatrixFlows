const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ERROR_CODES, USER_ROLES } = require('../../shared/constants');

// JWT Configuration
const JWT_CONFIG = {
  expiresIn: '24h',
  algorithm: 'HS256'
};

// Cookie Configuration
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-domain cookies
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(
    { userId, iat: Math.floor(Date.now() / 1000) }, 
    secret, 
    JWT_CONFIG
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Extract token from request
 */
const extractToken = (req) => {
  // Check cookie first
  if (req.cookies && req.cookies.authToken) {
    return req.cookies.authToken;
  }
  
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

/**
 * Authentication middleware
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        }
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Find user
    const user = await User.findOne({ 
      userId: decoded.userId,
      isActive: true 
    });
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid authentication - user not found'
        }
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    return res.status(401).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: error.message || 'Invalid authentication'
      }
    });
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        }
      });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        }
      });
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
const requireAdmin = requireRole([USER_ROLES.ADMIN]);

/**
 * Editor or Admin middleware
 */
const requireEditor = requireRole([USER_ROLES.ADMIN, USER_ROLES.EDITOR]);

/**
 * Set authentication cookie
 */
const setAuthCookie = (res, token) => {
  res.cookie('authToken', token, COOKIE_CONFIG);
};

/**
 * Clear authentication cookie
 */
const clearAuthCookie = (res) => {
  res.clearCookie('authToken', {
    path: COOKIE_CONFIG.path,
    secure: COOKIE_CONFIG.secure,
    sameSite: COOKIE_CONFIG.sameSite
  });
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken,
  requireAuth,
  requireRole,
  requireAdmin,
  requireEditor,
  setAuthCookie,
  clearAuthCookie,
  JWT_CONFIG,
  COOKIE_CONFIG
};
