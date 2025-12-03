const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const Recognition = require('../../models/Recognition');
const { validateRecognitionInput, createValidationError } = require('../../lib/validation');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    switch (req.method) {
      case 'GET':
        return await getRecognitions(req, res);
      case 'POST':
        return await createRecognition(req, res);
      case 'PUT':
        return await updateRecognition(req, res);
      case 'PATCH':
        return await setCurrentRecognition(req, res);
      case 'DELETE':
        return await deleteRecognition(req, res);
      default:
        return res.status(405).json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' } });
    }
  } catch (error) {
    console.error('❌ Recognitions API error:', error);
    return res.status(500).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' } });
  }
};

const getRecognitions = async (req, res) => {
  const recognitions = await Recognition.find({ orgId: ORG_CONFIG.ID }).sort({ isCurrent: -1, createdAt: -1 });
  res.status(200).json(recognitions);
};

const createRecognition = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { firstName, lastName, isCurrent } = req.body;
  const validation = validateRecognitionInput({ firstName, lastName });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const newRecognition = new Recognition({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    borderColor1: req.body.borderColor1 || 'yellow',
    borderColor2: req.body.borderColor2 || 'orange',
    isCurrent: isCurrent || false,
    orgId: ORG_CONFIG.ID,
    createdBy: req.user.userId
  });

  await newRecognition.save();
  console.log(`✅ Recognition created: ${newRecognition.firstName} ${newRecognition.lastName} by ${req.user.email}`);
  res.status(201).json(newRecognition);
};

const updateRecognition = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  const { firstName, lastName, isCurrent } = req.body;
  const validation = validateRecognitionInput({ firstName, lastName });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const updatedRecognition = await Recognition.findOneAndUpdate(
    { _id: id, orgId: ORG_CONFIG.ID },
    {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      borderColor1: req.body.borderColor1 || 'yellow',
      borderColor2: req.body.borderColor2 || 'orange',
      isCurrent: isCurrent || false
    },
    { new: true }
  );

  if (!updatedRecognition) {
    return res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Recognition not found' } });
  }

  console.log(`✅ Recognition updated: ${updatedRecognition.firstName} ${updatedRecognition.lastName} by ${req.user.email}`);
  res.status(200).json(updatedRecognition);
};

const setCurrentRecognition = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  const recognition = await Recognition.findOne({ _id: id, orgId: ORG_CONFIG.ID });
  if (!recognition) {
    return res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Recognition not found' } });
  }

  // Unset all other recognitions as current
  await Recognition.updateMany(
    { orgId: ORG_CONFIG.ID, isCurrent: true },
    { $set: { isCurrent: false } }
  );

  // Set this recognition as current
  recognition.isCurrent = true;
  await recognition.save();
  
  console.log(`✅ Recognition set as current: ${recognition.firstName} ${recognition.lastName} by ${req.user.email}`);
  res.status(200).json(recognition);
};

const deleteRecognition = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  await Recognition.deleteOne({ _id: id, orgId: ORG_CONFIG.ID });
  console.log(`✅ Recognition deleted: ${id} by ${req.user.email}`);
  res.status(200).json({ message: 'Recognition deleted successfully', id });
};
