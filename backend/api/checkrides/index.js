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
      case 'PUT':
        return await updateCheckride(req, res);
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

  const { time, name, callsign, type, date } = req.body;
  const validation = validateCheckrideInput({ time, name, callsign, type, date });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const newCheckride = new Checkride({
    time: time.trim(),
    name: name.trim(),
    callsign: callsign.trim().toUpperCase(),
    type: type.trim().toUpperCase(),
    date: date.trim(),
    borderColor1: req.body.borderColor1 || 'red',
    orgId: ORG_CONFIG.ID,
    createdBy: req.user.userId
  });

  await newCheckride.save();
  console.log(`✅ Checkride created: ${newCheckride.callsign} by ${req.user.email}`);
  res.status(201).json(newCheckride);
};

const updateCheckride = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  const { time, name, callsign, type, date } = req.body;
  const validation = validateCheckrideInput({ time, name, callsign, type, date });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const updatedCheckride = await Checkride.findOneAndUpdate(
    { _id: id, orgId: ORG_CONFIG.ID },
    {
      time: time.trim(),
      name: name.trim(),
      callsign: callsign.trim().toUpperCase(),
      type: type.trim().toUpperCase(),
      date: date.trim(),
      borderColor1: req.body.borderColor1 || 'red'
    },
    { new: true }
  );

  if (!updatedCheckride) {
    return res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Checkride not found' } });
  }

  console.log(`✅ Checkride updated: ${updatedCheckride.callsign} by ${req.user.email}`);
  res.status(200).json(updatedCheckride);
};

const deleteCheckride = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  await Checkride.deleteOne({ _id: id, orgId: ORG_CONFIG.ID });
  console.log(`✅ Checkride deleted: ${id} by ${req.user.email}`);
  res.status(200).json({ message: 'Checkride deleted successfully', id });
};
