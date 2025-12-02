const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const Event = require('../../models/Event');
const { validateEventInput, createValidationError } = require('../../lib/validation');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    switch (req.method) {
      case 'GET':
        return await getEvents(req, res);
      case 'POST':
        return await createEvent(req, res);
      case 'DELETE':
        return await deleteEvent(req, res);
      default:
        return res.status(405).json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' } });
    }
  } catch (error) {
    console.error('❌ Events API error:', error);
    return res.status(500).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' } });
  }
};

const getEvents = async (req, res) => {
  const events = await Event.find({ orgId: ORG_CONFIG.ID }).sort({ date: 1, time: 1 });
  res.status(200).json(events);
};

const createEvent = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { date, time, description } = req.body;
  const validation = validateEventInput({ date, time, description });
  if (!validation.isValid) {
    return res.status(400).json(createValidationError(validation.errors));
  }

  const newEvent = new Event({
    date: date.trim(),
    time: time.trim(),
    description: description.trim(),
    orgId: ORG_CONFIG.ID,
    createdBy: req.user.userId
  });

  await newEvent.save();
  console.log(`✅ Event created: ${newEvent.description} by ${req.user.email}`);
  res.status(201).json(newEvent);
};

const deleteEvent = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID is required' } });
  }

  await Event.deleteOne({ id, orgId: ORG_CONFIG.ID });
  console.log(`✅ Event deleted: ${id} by ${req.user.email}`);
  res.status(200).json({ message: 'Event deleted successfully', id });
};
