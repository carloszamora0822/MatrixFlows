const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ERROR_CODES } = require('../../shared/constants');

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // In production, also allow any vercel.app domain
    const isVercelDomain = origin && origin.includes('.vercel.app');
    
    if (allowedOrigins.includes(origin) || isVercelDomain) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

/**
 * Rate limiting configuration
 */
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  // In development, use much higher limits
  const isDev = process.env.NODE_ENV === 'development';
  const actualMax = isDev ? 1000 : max;
  const actualWindow = isDev ? 60 * 1000 : windowMs; // 1 minute in dev
  
  return rateLimit({
    windowMs: actualWindow,
    max: actualMax,
    message: {
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    }
  });
};

/**
 * Login rate limiting (stricter)
 */
const loginRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5 // 5 attempts per window
);

/**
 * General API rate limiting
 */
const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100 // 100 requests per window
);

/**
 * Security headers configuration
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openweathermap.org", "https://aviationweather.gov"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`📝 ${req.method} ${req.path} - ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${statusColor} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    Object.keys(err.errors).forEach(key => {
      errors[key] = err.errors[key].message;
    });
    
    return res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { fieldErrors: errors }
      }
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `${field} already exists`
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid token'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Token expired'
      }
    });
  }

  // Default error
  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    }
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`
    }
  });
};

/**
 * Health check middleware
 */
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
};

module.exports = {
  corsOptions,
  loginRateLimit,
  apiRateLimit,
  helmetOptions,
  requestLogger,
  errorHandler,
  notFoundHandler,
  healthCheck
};
