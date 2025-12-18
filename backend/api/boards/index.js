const { connectDB } = require('../../lib/db');
const { requireAuth, requireEditor } = require('../../lib/auth');
const Vestaboard = require('../../models/Vestaboard');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    switch (req.method) {
      case 'GET':
        return await getBoards(req, res);
      case 'POST':
        return await createBoard(req, res);
      case 'PUT':
        return await updateBoard(req, res);
      case 'DELETE':
        return await deleteBoard(req, res);
      default:
        return res.status(405).json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' } });
    }
  } catch (error) {
    console.error('❌ Boards API error:', error);
    return res.status(500).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' } });
  }
};

const getBoards = async (req, res) => {
  const boards = await Vestaboard.find({ orgId: ORG_CONFIG.ID }).sort({ createdAt: -1 });
  res.status(200).json(boards);
};

const createBoard = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { name, locationLabel, vestaboardWriteKey, defaultWorkflowId } = req.body;
  
  if (!name || !vestaboardWriteKey) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Name and API key required' } });
  }

  const newBoard = new Vestaboard({
    name: name.trim(),
    locationLabel: locationLabel?.trim(),
    vestaboardWriteKey: vestaboardWriteKey.trim(),
    defaultWorkflowId: defaultWorkflowId || undefined,
    orgId: ORG_CONFIG.ID
  });

  await newBoard.save();
  console.log(`✅ Board created: ${newBoard.name} by ${req.user.email}`);
  res.status(201).json(newBoard);
};

const updateBoard = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  const { name, locationLabel, vestaboardWriteKey, defaultWorkflowId, isActive } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Board ID required' } });
  }
  
  // Build update object - only include provided fields
  const updateData = {};
  
  // Check if this is a partial update (workflow assignment or isActive toggle)
  const isPartialUpdate = Object.keys(req.body).length === 1 && (isActive !== undefined || defaultWorkflowId !== undefined);
  
  if (isPartialUpdate) {
    // Partial update - just update the specific field
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (defaultWorkflowId !== undefined) {
      updateData.defaultWorkflowId = defaultWorkflowId || null;
    }
  } else {
    // Full update - require name and API key
    if (!name || !vestaboardWriteKey) {
      return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Name and API key required' } });
    }
    
    updateData.name = name.trim();
    updateData.locationLabel = locationLabel?.trim();
    updateData.vestaboardWriteKey = vestaboardWriteKey.trim();
    updateData.defaultWorkflowId = defaultWorkflowId !== undefined ? (defaultWorkflowId || null) : undefined;
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
  }

  // Get the old board to check if workflow changed
  const oldBoard = await Vestaboard.findOne({ boardId: id, orgId: ORG_CONFIG.ID });
  
  const updated = await Vestaboard.findOneAndUpdate(
    { boardId: id, orgId: ORG_CONFIG.ID },
    updateData,
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Board not found' } });
  }

  // If workflow changed, reset the board state and force immediate trigger
  if (oldBoard && oldBoard.defaultWorkflowId !== updated.defaultWorkflowId) {
    const BoardState = require('../../models/BoardState');
    const Workflow = require('../../models/Workflow');
    const workflowService = require('../../lib/workflowService');
    const moment = require('moment-timezone');
    
    // Delete old state
    await BoardState.findOneAndDelete({
      boardId: id,
      orgId: ORG_CONFIG.ID
    });
    
    // Handle board REMOVAL from workflow
    if (oldBoard.defaultWorkflowId && !updated.defaultWorkflowId) {
      const oldWorkflowId = oldBoard.defaultWorkflowId;
      const remainingBoards = await Vestaboard.find({
        orgId: ORG_CONFIG.ID,
        defaultWorkflowId: oldWorkflowId,
        isActive: true,
        boardId: { $ne: id }
      });
      
      if (remainingBoards.length > 0) {
        console.log(`🔄 ${remainingBoards.length} board(s) still use workflow ${oldWorkflowId} - they remain synced`);
      }
      console.log(`🔄 Board state deleted for ${updated.name} - workflow unassigned`);
    }
    
    // Create new state with immediate trigger if workflow assigned
    if (updated.defaultWorkflowId) {
      // ✅ CRITICAL: Check for active pinned workflows before syncing
      const pinnedWorkflow = await Workflow.findOne({
        orgId: ORG_CONFIG.ID,
        isActive: true,
        name: { $regex: /^Pinned -/ },
        'schedule.type': 'specificDateRange'
      });
      
      const isPinnedActive = pinnedWorkflow && 
        workflowService.isWorkflowActiveNow(pinnedWorkflow, new Date());
      
      if (isPinnedActive) {
        // ⚠️ Pinned workflow is active - only update THIS board, don't sync others
        console.log(`⚠️ Pinned workflow "${pinnedWorkflow.name}" is active - skipping multi-board sync`);
        
        const newState = new BoardState({
          orgId: ORG_CONFIG.ID,
          boardId: updated.boardId,
          currentStepIndex: 0,
          nextScheduledTrigger: moment().tz('America/Chicago').toDate()
        });
        await newState.save();
        console.log(`🔄 Board state created for ${updated.name} - will trigger after pin expires`);
      } else {
        // ✅ Safe to sync all boards sharing this workflow
        const allBoardsWithWorkflow = await Vestaboard.find({
          orgId: ORG_CONFIG.ID,
          defaultWorkflowId: updated.defaultWorkflowId,
          isActive: true
        });
        
        const immediateNextTrigger = moment().tz('America/Chicago').toDate();
        
        console.log(`🔄 Synchronizing ${allBoardsWithWorkflow.length} board(s) for workflow ${updated.defaultWorkflowId}`);
        
        // ✅ SAFE: Use find-or-create pattern to avoid MongoDB duplicate key errors
        for (const board of allBoardsWithWorkflow) {
          let boardState = await BoardState.findOne({
            orgId: ORG_CONFIG.ID,
            boardId: board.boardId
          });
          
          if (!boardState) {
            // Create new state - stateId will auto-generate
            boardState = new BoardState({
              orgId: ORG_CONFIG.ID,
              boardId: board.boardId,
              currentStepIndex: 0,
              nextScheduledTrigger: immediateNextTrigger,
              workflowRunning: false
            });
            console.log(`   ✅ Created state for ${board.name}`);
          } else {
            // Update existing state
            boardState.nextScheduledTrigger = immediateNextTrigger;
            boardState.currentStepIndex = 0;
            boardState.workflowRunning = false;
            console.log(`   🔄 Synchronized ${board.name}`);
          }
          
          await boardState.save();
        }
        
        console.log(`✅ All ${allBoardsWithWorkflow.length} board(s) synchronized - will trigger on next cron (within 60s)`);
      }
    }
  }

  console.log(`✅ Board updated: ${updated.name} by ${req.user.email}`);
  res.status(200).json(updated);
};

const deleteBoard = async (req, res) => {
  await new Promise((resolve, reject) => {
    requireEditor(req, res, (err) => err ? reject(err) : resolve());
  });

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Board ID required' } });
  }

  // Delete the board
  await Vestaboard.deleteOne({ boardId: id, orgId: ORG_CONFIG.ID });
  
  // Clean up associated board state
  const BoardState = require('../../models/BoardState');
  const stateDeleted = await BoardState.findOneAndDelete({
    boardId: id,
    orgId: ORG_CONFIG.ID
  });
  
  console.log(`✅ Board deleted: ${id} by ${req.user.email}`);
  if (stateDeleted) {
    console.log(`✅ Board state cleaned up for ${id}`);
  }
  
  res.status(200).json({ message: 'Board deleted', id });
};
