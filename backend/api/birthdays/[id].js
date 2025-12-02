const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const Birthday = require('../../models/Birthday');
const { validateBirthdayInput, createValidationError } = require('../../lib/validation');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

/**
 * Single Birthday CRUD endpoint
 * GET /api/birthdays/:id - Get birthday by ID
 * PUT /api/birthdays/:id - Update birthday
 * DELETE /api/birthdays/:id - Delete birthday
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

    const birthdayId = req.query.id || req.params.id;

    if (!birthdayId) {
      return res.status(400).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Birthday ID is required'
        }
      });
    }

    switch (req.method) {
      case 'GET':
        return await getBirthday(req, res, birthdayId);
      case 'PUT':
        return await updateBirthday(req, res, birthdayId);
      case 'DELETE':
        return await deleteBirthday(req, res, birthdayId);
      default:
        return res.status(405).json({
          error: {
            code: ERROR_CODES.METHOD_NOT_ALLOWED,
            message: 'Method not allowed'
          }
        });
    }
  } catch (error) {
    console.error('❌ Birthday API error:', error);
    return res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * Get birthday by ID
 */
const getBirthday = async (req, res, birthdayId) => {
  const birthday = await Birthday.findOne({ 
    id: birthdayId,
    orgId: ORG_CONFIG.ID 
  });

  if (!birthday) {
    return res.status(404).json({
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Birthday not found'
      }
    });
  }

  res.status(200).json(birthday);
};

/**
 * Update birthday
 */
const updateBirthday = async (req, res, birthdayId) => {
  // Apply editor authorization
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const { firstName, date } = req.body;
  
  // Validate input
  const validation = validateBirthdayInput({ firstName, date });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const birthday = await Birthday.findOne({ 
    id: birthdayId,
    orgId: ORG_CONFIG.ID 
  });

  if (!birthday) {
    return res.status(404).json({
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Birthday not found'
      }
    });
  }

  // Update fields
  birthday.firstName = firstName.trim();
  birthday.date = date.trim();
  
  await birthday.save();

  console.log(`✅ Birthday updated: ${birthday.id} by ${req.user.email}`);

  res.status(200).json(birthday);
};

/**
 * Delete birthday
 */
const deleteBirthday = async (req, res, birthdayId) => {
  // Apply editor authorization
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const birthday = await Birthday.findOne({ 
    id: birthdayId,
    orgId: ORG_CONFIG.ID 
  });

  if (!birthday) {
    return res.status(404).json({
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Birthday not found'
      }
    });
  }

  await Birthday.deleteOne({ id: birthdayId });

  console.log(`✅ Birthday deleted: ${birthdayId} by ${req.user.email}`);

  res.status(200).json({
    message: 'Birthday deleted successfully',
    id: birthdayId
  });
};
