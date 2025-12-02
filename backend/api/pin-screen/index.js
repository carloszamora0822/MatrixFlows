const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const pinScreenService = require('../../lib/pinScreenService');
const { ERROR_CODES } = require('../../../shared/constants');

/**
 * Create Pin Screen API
 * POST /api/pin-screen/create
 * 
 * Creates a temporary workflow that overrides the default workflow
 * for a specific time period
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

    const {
      boardId,
      screenConfigs,
      startDate,
      endDate,
      startTimeLocal,
      endTimeLocal
    } = req.body;

    // Validation
    const errors = {};
    
    if (!boardId) {
      errors.boardId = 'Board ID is required';
    }
    
    if (!screenConfigs || !Array.isArray(screenConfigs) || screenConfigs.length === 0) {
      errors.screenConfigs = 'At least one screen configuration is required';
    }
    
    if (!startDate) {
      errors.startDate = 'Start date is required';
    }
    
    if (!endDate) {
      errors.endDate = 'End date is required';
    }
    
    if (!startTimeLocal) {
      errors.startTimeLocal = 'Start time is required';
    }
    
    if (!endTimeLocal) {
      errors.endTimeLocal = 'End time is required';
    }

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      errors.endDate = 'End date must be after start date';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid input',
          details: { fieldErrors: errors }
        }
      });
    }

    // Create pinned workflow
    const workflow = await pinScreenService.createPinnedWorkflow({
      boardId,
      screenConfigs,
      startDate,
      endDate,
      startTimeLocal,
      endTimeLocal,
      createdBy: req.user?.userId
    });

    console.log(`✅ Pin screen created by ${req.user?.email || 'unknown'}`);

    res.status(201).json({
      workflowId: workflow.workflowId,
      name: workflow.name,
      schedule: workflow.schedule,
      stepsCount: workflow.steps.length,
      message: 'Pinned screen created successfully'
    });

  } catch (error) {
    console.error('❌ Pin screen creation error:', error);
    
    // Handle authentication errors
    if (error.message && error.message.includes('Authentication')) {
      return;
    }
    
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to create pinned screen',
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          stack: error.stack
        } : undefined
      }
    });
  }
};
