const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const BoardState = require('../../models/BoardState');
const Workflow = require('../../models/Workflow');
const Vestaboard = require('../../models/Vestaboard');
const workflowService = require('../../lib/workflowService');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    if (req.method !== 'GET') {
      return res.status(405).json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' } });
    }

    const boardStates = await BoardState.find({ orgId: ORG_CONFIG.ID });

    // FIX #3: Compute isActiveNow on backend using Central Time
    // This prevents frontend from using browser timezone which could be wrong

    // Step 1: Get all boards to know their assigned workflows
    const boards = await Vestaboard.find({ orgId: ORG_CONFIG.ID, isActive: true });
    const boardWorkflowMap = new Map(boards.map(b => [b.boardId, b.defaultWorkflowId]));

    // Step 2: Collect unique workflow IDs (from both board assignments and current states)
    const workflowIds = new Set();
    boardStates.forEach(state => {
      if (state.currentWorkflowId) workflowIds.add(state.currentWorkflowId);
    });
    boards.forEach(board => {
      if (board.defaultWorkflowId) workflowIds.add(board.defaultWorkflowId);
    });

    // Step 3: Fetch all workflows in ONE query (avoid N+1)
    const workflows = await Workflow.find({
      orgId: ORG_CONFIG.ID,
      workflowId: { $in: Array.from(workflowIds) }
    });
    const workflowById = new Map(workflows.map(w => [w.workflowId, w]));

    // Step 4: Check for active pinned workflow (blocks all regular workflows)
    const now = new Date();
    const activePinnedWorkflow = workflows.find(w =>
      w.name?.startsWith('Pinned -') &&
      w.schedule?.type === 'specificDateRange' &&
      w.isActive !== false &&
      workflowService.isWorkflowActiveNow(w, now)
    );

    // Step 5: Enrich each board state with isActiveNow computed in Central Time
    const enrichedStates = boardStates.map(state => {
      const stateObj = state.toObject();
      const boardId = stateObj.boardId;

      // Get the workflow assigned to this board
      const assignedWorkflowId = boardWorkflowMap.get(boardId);
      const workflow = assignedWorkflowId ? workflowById.get(assignedWorkflowId) : null;

      // Determine if workflow is active now (computed in Central Time via workflowService)
      let isActiveNow = false;
      let activeWorkflowId = null;
      let activeWorkflowName = null;
      let activeReason = null;

      if (activePinnedWorkflow) {
        // Pinned workflow overrides everything
        isActiveNow = true;
        activeWorkflowId = activePinnedWorkflow.workflowId;
        activeWorkflowName = activePinnedWorkflow.name;
        activeReason = 'pinned';
      } else if (workflow) {
        // Check if the assigned workflow is active right now
        if (workflow.isActive === false) {
          isActiveNow = false;
          activeReason = 'workflow_disabled';
        } else if (workflowService.isWorkflowActiveNow(workflow, now)) {
          isActiveNow = true;
          activeWorkflowId = workflow.workflowId;
          activeWorkflowName = workflow.name;
          activeReason = 'schedule_match';
        } else {
          isActiveNow = false;
          activeReason = 'outside_schedule';
        }
      } else {
        isActiveNow = false;
        activeReason = 'no_workflow_assigned';
      }

      return {
        ...stateObj,
        isActiveNow,
        activeWorkflowId,
        activeWorkflowName,
        activeReason
      };
    });

    res.status(200).json(enrichedStates);
  } catch (error) {
    console.error('❌ Board States API error:', error);
    return res.status(500).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' } });
  }
};
