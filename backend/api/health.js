const { connectDB } = require('../lib/db');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { ERROR_CODES } = require('../../shared/constants');

/**
 * Health check endpoint
 * GET /api/health
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: {
        code: ERROR_CODES.METHOD_NOT_ALLOWED,
        message: 'Method not allowed'
      }
    });
  }

  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    checks: {}
  };

  try {
    // Database connectivity check
    await connectDB();
    
    const userCount = await User.countDocuments({ isActive: true });
    const orgCount = await Organization.countDocuments({ isActive: true });
    
    healthCheck.checks.database = {
      status: 'ok',
      userCount,
      organizationCount: orgCount
    };

    // Environment variables check
    const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    healthCheck.checks.environment = {
      status: missingEnvVars.length === 0 ? 'ok' : 'warning',
      missingVariables: missingEnvVars
    };

    // Memory usage check
    const memoryUsage = process.memoryUsage();
    healthCheck.checks.memory = {
      status: 'ok',
      usage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
      }
    };

    // Overall status
    const hasErrors = Object.values(healthCheck.checks).some(check => check.status === 'error');
    const hasWarnings = Object.values(healthCheck.checks).some(check => check.status === 'warning');
    
    if (hasErrors) {
      healthCheck.status = 'error';
    } else if (hasWarnings) {
      healthCheck.status = 'warning';
    }

    const statusCode = healthCheck.status === 'error' ? 503 : 200;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    console.error('❌ Health check error:', error);
    
    healthCheck.status = 'error';
    healthCheck.checks.database = {
      status: 'error',
      error: error.message
    };
    
    res.status(503).json(healthCheck);
  }
};
