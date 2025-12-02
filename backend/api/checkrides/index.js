const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const Checkride = require('../../models/Checkride');
const { validateCheckrideInput, createValidationError } = require('../../lib/validation');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    switch (req.method) {
      case 'GET':
        return await getCheckrides(req, res);
      case 'POST':
        return await createCheckride(req, res);
      case 'DELETE':
        return await deleteCheckride(req, res);
      default:
        return res.status(405).json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' } });
    }
  } catch (error) {
    console.error('❌ Checkrides API error:', error);
    return res.status(500).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' } });
  }
};

const getCheckrides = async (req, res) => {
  const checkrides = await Checkride.find({ orgId: ORG_CONFIG.ID }).sort({ date: 1, time: 1 });
  res.status(200).json(checkrides);
};

const createCheckride = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { time, callsign, type, destination, date } = req.body;
  const validation = validateCheckrideInput({ time, callsign, type, destination, date });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const newCheckride = new Checkride({
    time: time.trim(),
    callsign: callsign.trim().toUpperCase(),
    type: type.trim().toUpperCase(),
    destination: destination.trim().toUpperCase(),
    date: date.trim(),
    orgId: ORG_CONFIG.ID,
    createdBy: req.user.userId
  });

  await newCheckride.save();
  console.log(`✅ Checkride created: ${newCheckride.callsign} by ${req.user.email}`);
  res.status(201).json(newCheckride);
};

const deleteCheckride = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  await Checkride.deleteOne({ id, orgId: ORG_CONFIG.ID });
  console.log(`✅ Checkride deleted: ${id} by ${req.user.email}`);
  res.status(200).json({ message: 'Checkride deleted successfully', id });
};
