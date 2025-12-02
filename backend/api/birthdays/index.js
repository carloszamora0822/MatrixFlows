const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const Birthday = require('../../models/Birthday');
const { validateBirthdayInput, createValidationError } = require('../../lib/validation');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

/**
 * Birthdays CRUD endpoint
 * GET /api/birthdays - List all birthdays
 * POST /api/birthdays - Create new birthday
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
        return await getBirthdays(req, res);
      case 'POST':
        return await createBirthday(req, res);
      default:
        return res.status(405).json({
          error: {
            code: ERROR_CODES.METHOD_NOT_ALLOWED,
            message: 'Method not allowed'
          }
        });
    }
  } catch (error) {
    console.error('❌ Birthdays API error:', error);
    return res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * Get all birthdays
 */
const getBirthdays = async (req, res) => {
  const birthdays = await Birthday.find({ 
    orgId: ORG_CONFIG.ID 
  }).sort({ date: 1, createdAt: -1 });

  res.status(200).json(birthdays);
};

/**
 * Create new birthday
 */
const createBirthday = async (req, res) => {
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

  // Create new birthday
  const newBirthday = new Birthday({
    firstName: firstName.trim(),
    date: date.trim(),
    orgId: ORG_CONFIG.ID,
    createdBy: req.user.userId
  });

  await newBirthday.save();

  console.log(`✅ Birthday created: ${newBirthday.firstName} on ${newBirthday.date} by ${req.user.email}`);

  res.status(201).json(newBirthday);
};
