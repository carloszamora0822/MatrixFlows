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
      case 'PUT':
        return await updateWorkflow(req, res);
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

  const { name, steps, schedule, isDefault } = req.body;
  
  console.log('📝 Workflow creation request:', { name, stepsCount: steps?.length });
  
  if (!name || !steps || steps.length === 0) {
    console.error('❌ Validation failed:', { name: !!name, steps: !!steps, stepsLength: steps?.length });
    return res.status(400).json({ 
      error: { 
        code: ERROR_CODES.VALIDATION_ERROR, 
        message: 'Name and steps required',
        details: { name: !!name, hasSteps: !!steps, stepsLength: steps?.length }
      } 
    });
  }

  // Validate workflow timing: total duration vs frequency
  const totalDurationSeconds = steps.reduce((sum, step) => sum + (step.displaySeconds || 0), 0);
  const totalDurationMinutes = Math.ceil(totalDurationSeconds / 60);
  const frequencyMinutes = schedule?.updateIntervalMinutes || 30;
  
  // Add 1-minute buffer to prevent edge cases (frequency must be > duration, not =)
  const minimumSafeFrequency = totalDurationMinutes + 1;
  
  if (frequencyMinutes <= totalDurationMinutes) {
    console.warn(`⚠️  Frequency too low! Auto-adjusting from ${frequencyMinutes}min to ${minimumSafeFrequency}min`);
    
    // AUTO-ADJUST to safe value
    schedule.updateIntervalMinutes = minimumSafeFrequency;
    
    console.log(`✅ Frequency auto-adjusted to ${minimumSafeFrequency} minutes (workflow duration: ${totalDurationMinutes}min + 1min buffer)`);
  }

  const newWorkflow = new Workflow({
    name: name.trim(),
    steps,
    schedule: schedule || { type: 'always' },
    isDefault: isDefault || false,
    isActive: true,
    orgId: ORG_CONFIG.ID,
    createdBy: req.user.userId
  });

  await newWorkflow.save();
  console.log(`✅ Workflow created: ${newWorkflow.name} by ${req.user.email}`);
  res.status(201).json(newWorkflow);
};

const updateWorkflow = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  const { name, steps, schedule, isDefault, isActive } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Workflow ID required' } });
  }
  
  // Build update data - only include fields that are provided
  const updateData = {};
  
  if (name !== undefined) {
    updateData.name = name.trim();
  }
  
  if (steps !== undefined) {
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Steps must be a non-empty array' } });
    }
    updateData.steps = steps;
  }
  
  if (schedule !== undefined) {
    updateData.schedule = schedule;
  }
  
  if (isDefault !== undefined) {
    updateData.isDefault = isDefault;
  }
  
  // Only update isActive if it's explicitly provided
  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }

  // Validate and auto-adjust frequency if needed
  if (updateData.steps && updateData.schedule) {
    const totalDurationSeconds = updateData.steps.reduce((sum, step) => sum + (step.displaySeconds || 0), 0);
    const totalDurationMinutes = Math.ceil(totalDurationSeconds / 60);
    const frequencyMinutes = updateData.schedule.updateIntervalMinutes || 30;
    
    const minimumSafeFrequency = totalDurationMinutes + 1;
    
    if (frequencyMinutes <= totalDurationMinutes) {
      console.warn(`⚠️  Frequency too low! Auto-adjusting from ${frequencyMinutes}min to ${minimumSafeFrequency}min`);
      updateData.schedule.updateIntervalMinutes = minimumSafeFrequency;
      console.log(`✅ Frequency auto-adjusted to ${minimumSafeFrequency} minutes`);
    }
  }

  const updated = await Workflow.findOneAndUpdate(
    { workflowId: id, orgId: ORG_CONFIG.ID },
    updateData,
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Workflow not found' } });
  }

  console.log(`✅ Workflow updated: ${updated.name} by ${req.user.email}`);
  res.status(200).json(updated);
};

const deleteWorkflow = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Workflow ID required' } });
  }

  // Delete the workflow
  await Workflow.deleteOne({ workflowId: id, orgId: ORG_CONFIG.ID });
  
  // Clean up board states that reference this workflow
  const BoardState = require('../../models/BoardState');
  const cleanupResult = await BoardState.updateMany(
    { currentWorkflowId: id, orgId: ORG_CONFIG.ID },
    { $unset: { currentWorkflowId: '', nextScheduledTrigger: '' } }
  );
  
  console.log(`✅ Workflow deleted: ${id} by ${req.user.email}`);
  if (cleanupResult.modifiedCount > 0) {
    console.log(`✅ Cleaned up ${cleanupResult.modifiedCount} board state(s)`);
  }
  
  res.status(200).json({ message: 'Workflow deleted', id });
};
