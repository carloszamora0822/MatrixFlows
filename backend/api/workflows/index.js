const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const Workflow = require('../../models/Workflow');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    switch (req.method) {
      case 'GET':
        return await getWorkflows(req, res);
      case 'POST':
        return await createWorkflow(req, res);
      case 'DELETE':
        return await deleteWorkflow(req, res);
      default:
        return res.status(405).json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' } });
    }
  } catch (error) {
    console.error('❌ Workflows API error:', error);
    return res.status(500).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' } });
  }
};

const getWorkflows = async (req, res) => {
  const workflows = await Workflow.find({ orgId: ORG_CONFIG.ID }).sort({ createdAt: -1 });
  res.status(200).json(workflows);
};

const createWorkflow = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { boardId, name, steps, schedule, isDefault } = req.body;
  
  if (!boardId || !name || !steps || steps.length === 0) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Board ID, name, and steps required' } });
  }

  const newWorkflow = new Workflow({
    boardId,
    name: name.trim(),
    steps,
    schedule: schedule || { type: 'always' },
    isDefault: isDefault || false,
    orgId: ORG_CONFIG.ID,
    createdBy: req.user.userId
  });

  await newWorkflow.save();
  console.log(`✅ Workflow created: ${newWorkflow.name} by ${req.user.email}`);
  res.status(201).json(newWorkflow);
};

const deleteWorkflow = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Workflow ID required' } });
  }

  await Workflow.deleteOne({ workflowId: id, orgId: ORG_CONFIG.ID });
  console.log(`✅ Workflow deleted: ${id} by ${req.user.email}`);
  res.status(200).json({ message: 'Workflow deleted', id });
};
