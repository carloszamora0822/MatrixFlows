const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const Pilot = require('../../models/Pilot');
const { validatePilotInput, createValidationError } = require('../../lib/validation');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    switch (req.method) {
      case 'GET':
        return await getPilots(req, res);
      case 'POST':
        return await createPilot(req, res);
      case 'PUT':
        return await updatePilot(req, res);
      case 'PATCH':
        return await setCurrentPilot(req, res);
      case 'DELETE':
        return await deletePilot(req, res);
      default:
        return res.status(405).json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' } });
    }
  } catch (error) {
    console.error('❌ Pilots API error:', error);
    return res.status(500).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' } });
  }
};

const getPilots = async (req, res) => {
  const pilots = await Pilot.find({ orgId: ORG_CONFIG.ID }).sort({ isCurrent: -1, createdAt: -1 });
  res.status(200).json(pilots);
};

const createPilot = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { name, isCurrent } = req.body;
  const validation = validatePilotInput({ name });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const newPilot = new Pilot({
    name: name.trim(),
    isCurrent: isCurrent || false,
    orgId: ORG_CONFIG.ID,
    createdBy: req.user.userId
  });

  await newPilot.save();
  console.log(`✅ Pilot created: ${newPilot.name} by ${req.user.email}`);
  res.status(201).json(newPilot);
};

const updatePilot = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  const { name, isCurrent } = req.body;
  const validation = validatePilotInput({ name });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const updatedPilot = await Pilot.findOneAndUpdate(
    { _id: id, orgId: ORG_CONFIG.ID },
    {
      name: name.trim(),
      isCurrent: isCurrent || false
    },
    { new: true }
  );

  if (!updatedPilot) {
    return res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Pilot not found' } });
  }

  console.log(`✅ Pilot updated: ${updatedPilot.name} by ${req.user.email}`);
  res.status(200).json(updatedPilot);
};

const setCurrentPilot = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  const pilot = await Pilot.findOne({ _id: id, orgId: ORG_CONFIG.ID });
  if (!pilot) {
    return res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Pilot not found' } });
  }

  // Unset all other pilots as current
  await Pilot.updateMany(
    { orgId: ORG_CONFIG.ID, isCurrent: true },
    { $set: { isCurrent: false } }
  );

  // Set this pilot as current
  pilot.isCurrent = true;
  await pilot.save();
  
  console.log(`✅ Pilot set as current: ${pilot.name} by ${req.user.email}`);
  res.status(200).json(pilot);
};

const deletePilot = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  await Pilot.deleteOne({ _id: id, orgId: ORG_CONFIG.ID });
  console.log(`✅ Pilot deleted: ${id} by ${req.user.email}`);
  res.status(200).json({ message: 'Pilot deleted successfully', id });
};
