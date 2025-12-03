const BoardState = require('../models/BoardState');
const workflowService = require('./workflowService');
const screenEngine = require('./screenEngine');
const vestaboardClient = require('./clients/vestaboardClient');
const pinScreenService = require('./pinScreenService');
const intervalScheduler = require('./intervalScheduler');
const { ORG_CONFIG } = require('../../shared/constants');

class SchedulerService {
  /**
   * Process all active boards and update them
   * Called by the cron job
   */
  async processAllBoards() {
    console.log('🔄 Scheduler: Processing all boards...');
    
    try {
      // 🧹 CLEANUP: Remove expired pinned screens FIRST
      // This unblocks workflows once pin time period ends
      await pinScreenService.cleanupExpiredPinnedWorkflows();
      
      const boards = await workflowService.getAllBoards();
      
      if (boards.length === 0) {
        console.log('⚠️  No active boards found');
        return { success: true, boardsProcessed: 0 };
      }

      console.log(`📋 Found ${boards.length} active board(s)`);
      
      const results = [];
      for (const board of boards) {
        try {
          // Check if it's time to run the workflow based on interval
          const result = await this.checkAndRunWorkflow(board);
          results.push(result);
        } catch (error) {
          console.error(`❌ Error processing board ${board.boardId}:`, error);
          results.push({
            boardId: board.boardId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Scheduler complete: ${successCount}/${boards.length} boards updated successfully`);

      return {
        success: true,
        boardsProcessed: boards.length,
        successCount,
        results
      };

    } catch (error) {
      console.error('❌ Scheduler error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if it's time to run workflow and run complete workflow if so
   * @param {object} board - Vestaboard document
   */
  async checkAndRunWorkflow(board) {
    console.log(`\n🎯 Checking board: ${board.name} (${board.boardId})`);

    try {
      // Get or create board state
      let boardState = await BoardState.findOne({
        orgId: ORG_CONFIG.ID,
        boardId: board.boardId
      });

      if (!boardState) {
        console.log('📝 Creating new board state');
        boardState = new BoardState({
          orgId: ORG_CONFIG.ID,
          boardId: board.boardId,
          currentStepIndex: 0
        });
        await boardState.save();
      }

      // Check if board has a workflow assigned
      if (!board.defaultWorkflowId) {
        console.log('⚠️  No workflow assigned to this board');
        return { boardId: board.boardId, success: true, skipped: true, reason: 'No workflow assigned' };
      }
      
      // Get active workflow based on schedule
      const workflow = await workflowService.getActiveWorkflow(board);
      
      if (!workflow) {
        console.log('⚠️  Workflow not scheduled to run at this time');
        return { boardId: board.boardId, success: true, skipped: true, reason: 'Outside schedule window' };
      }

      // ⏰ INTERVAL SCHEDULING: Check if it's time to run the workflow
      const intervalMinutes = workflow.schedule?.updateIntervalMinutes || 30;
      console.log(`⏱️  Workflow interval: ${intervalMinutes} minutes`);
      
      // Check if it's time to update based on aligned clock times
      const shouldUpdate = intervalScheduler.shouldUpdateNow(
        workflow,
        boardState.lastUpdateAt,
        new Date()
      );
      
      if (!shouldUpdate) {
        const currentTime = new Date();
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        const nextTrigger = intervalScheduler.getNextAlignedTime(currentMinutes, intervalMinutes);
        console.log(`⏸️  Not time to run yet. Next trigger at ${intervalScheduler.formatTime(nextTrigger)}`);
        return { 
          boardId: board.boardId, 
          success: true, 
          skipped: true,
          reason: `Waiting for next ${intervalMinutes}-minute interval`,
          nextTrigger: intervalScheduler.formatTime(nextTrigger)
        };
      }
      
      console.log(`✅ Interval trigger activated - running COMPLETE workflow now!`);

      // Run the complete workflow (all steps in sequence)
      const result = await this.runCompleteWorkflow(board.boardId);

      // Update board state
      boardState.lastUpdateAt = new Date();
      boardState.lastUpdateSuccess = true;
      boardState.lastError = null;
      boardState.cycleCount += 1;
      await boardState.save();

      console.log(`✅ Workflow complete for ${board.name} (cycle ${boardState.cycleCount})`);

      return result;

    } catch (error) {
      console.error(`❌ Error checking/running workflow:`, error);
      throw error;
    }
  }

  /**
   * Process a single board
   * @param {object} board - Vestaboard document
   * @param {boolean} forceUpdate - Skip interval check (for manual triggers)
   */
  async processBoard(board, forceUpdate = false) {
    console.log(`\n🎯 Processing board: ${board.name} (${board.boardId})`);
    if (forceUpdate) console.log('🚀 FORCE UPDATE - Bypassing interval check');

    try {
      // Get or create board state
      let boardState = await BoardState.findOne({
        orgId: ORG_CONFIG.ID,
        boardId: board.boardId
      });

      if (!boardState) {
        console.log('📝 Creating new board state');
        boardState = new BoardState({
          orgId: ORG_CONFIG.ID,
          boardId: board.boardId,
          currentStepIndex: 0
        });
      }

      // Check if board has a workflow assigned
      if (!board.defaultWorkflowId) {
        console.log('⚠️  No workflow assigned to this board');
        throw new Error('No workflow assigned to this board. Please assign a workflow in the Boards tab.');
      }
      
      // Get active workflow based on schedule
      const workflow = await workflowService.getActiveWorkflow(board);
      
      if (!workflow) {
        console.log('⚠️  Workflow not scheduled to run at this time');
        throw new Error('Workflow is not scheduled to run at this time. Check your workflow schedule settings.');
      }

      // ⏰ INTERVAL SCHEDULING: Check interval ONLY if not forced
      if (!forceUpdate) {
        const intervalMinutes = workflow.schedule?.updateIntervalMinutes || 30;
        console.log(`⏱️  Workflow uses ${intervalMinutes}-minute interval scheduling`);
        
        // Check if it's time to update based on aligned clock times
        const shouldUpdate = intervalScheduler.shouldUpdateNow(
          workflow,
          boardState.lastUpdateAt,
          new Date()
        );
        
        if (!shouldUpdate) {
          const currentTime = new Date();
          const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
          const nextTrigger = intervalScheduler.getNextAlignedTime(currentMinutes, intervalMinutes);
          console.log(`⏸️  Not time to update yet. Next trigger at ${intervalScheduler.formatTime(nextTrigger)}`);
          return { 
            boardId: board.boardId, 
            success: true, 
            skipped: true,
            reason: `Waiting for next ${intervalMinutes}-minute interval trigger`,
            nextTrigger: intervalScheduler.formatTime(nextTrigger)
          };
        }
        
        console.log(`✅ Interval trigger activated - updating board now!`);
      }

      // Get current step to display
      const currentStep = workflowService.getNextStep(workflow, boardState.currentStepIndex);
      
      if (!currentStep) {
        console.log('⚠️  No enabled steps in workflow');
        return { boardId: board.boardId, success: true, skipped: true };
      }

      console.log(`📺 Rendering step ${currentStep.index + 1}/${workflow.steps.length}: ${currentStep.step.screenType}`);

      // Render the screen
      const matrix = await screenEngine.render(currentStep.step.screenType, currentStep.step.screenConfig);

      // Get API key - use board's key if available, otherwise use environment variable
      const apiKey = board.vestaboardWriteKey || process.env.VESTABOARD_API_KEY;
      
      if (!apiKey) {
        throw new Error('No Vestaboard API key configured! Add one to the board or set VESTABOARD_API_KEY in environment.');
      }

      // Post to Vestaboard
      console.log(`📤 Posting to Vestaboard ${board.name}...`);
      console.log(`📤 Using API key: ${apiKey.substring(0, 10)}...`);
      console.log(`📤 Matrix size: ${matrix.length}x${matrix[0]?.length}`);
      const vestaboardResult = await vestaboardClient.postMessage(apiKey, matrix);
      console.log(`✅ Vestaboard API responded:`, vestaboardResult);

      // Calculate next step index (advance AFTER displaying current step)
      const enabledSteps = workflow.steps.filter(s => s.isEnabled).sort((a, b) => a.order - b.order);
      const nextStepIndex = (boardState.currentStepIndex + 1) % enabledSteps.length;

      // Update board state with NEXT step index for next update
      boardState.currentWorkflowId = workflow.workflowId;
      boardState.currentStepIndex = nextStepIndex;
      boardState.lastMatrix = matrix;
      boardState.lastUpdateAt = new Date();
      boardState.lastUpdateSuccess = true;
      boardState.lastError = null;
      boardState.cycleCount += 1;

      await boardState.save();

      console.log(`✅ Board ${board.name} updated successfully (cycle ${boardState.cycleCount})`);

      return {
        boardId: board.boardId,
        success: true,
        screenType: currentStep.step.screenType,
        stepIndex: currentStep.index,
        cycleCount: boardState.cycleCount,
        vestaboardResponse: vestaboardResult
      };

    } catch (error) {
      console.error(`❌ Board processing error:`, error);

      // Update board state with error
      try {
        const boardState = await BoardState.findOne({
          orgId: ORG_CONFIG.ID,
          boardId: board.boardId
        });

        if (boardState) {
          boardState.lastUpdateSuccess = false;
          boardState.lastError = error.message;
          boardState.lastUpdateAt = new Date();
          await boardState.save();
        }
      } catch (stateError) {
        console.error('Failed to update board state with error:', stateError);
      }

      throw error;
    }
  }

  /**
   * Run through entire workflow - all steps in sequence
   * Each step displays for its configured displaySeconds
   * @param {string} boardId
   */
  async runCompleteWorkflow(boardId) {
    console.log(`\n� Starting complete workflow run for board: ${boardId}`);
    
    const Vestaboard = require('../models/Vestaboard');
    const board = await Vestaboard.findOne({
      orgId: ORG_CONFIG.ID,
      boardId,
      isActive: true
    });

    if (!board) {
      throw new Error(`Board ${boardId} not found or inactive`);
    }

    // Get workflow
    const workflow = await workflowService.getActiveWorkflow(board);
    if (!workflow) {
      throw new Error('No active workflow for this board');
    }

    // Get all enabled steps in order
    const enabledSteps = workflow.steps
      .filter(s => s.isEnabled)
      .sort((a, b) => a.order - b.order);

    if (enabledSteps.length === 0) {
      throw new Error('No enabled steps in workflow');
    }

    console.log(`📋 Running through ${enabledSteps.length} steps...`);

    // Run through each step
    for (let i = 0; i < enabledSteps.length; i++) {
      const step = enabledSteps[i];
      console.log(`\n📺 Step ${i + 1}/${enabledSteps.length}: ${step.screenType}`);
      console.log(`⏱️  Display time: ${step.displaySeconds} seconds`);

      // Render the screen
      const matrix = await screenEngine.render(step.screenType, step.screenConfig);

      // Get API key
      const apiKey = board.vestaboardWriteKey || process.env.VESTABOARD_API_KEY;
      if (!apiKey) {
        throw new Error('No Vestaboard API key configured!');
      }

      // Post to Vestaboard
      console.log(`📤 Posting to Vestaboard...`);
      await vestaboardClient.postMessage(apiKey, matrix);
      console.log(`✅ Posted step ${i + 1}`);

      // Wait for displaySeconds before next step (except last step)
      if (i < enabledSteps.length - 1) {
        const waitMs = step.displaySeconds * 1000;
        console.log(`⏳ Waiting ${step.displaySeconds} seconds before next step...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    console.log(`\n🎉 Complete workflow finished! All ${enabledSteps.length} steps displayed.`);
    
    return {
      boardId: board.boardId,
      success: true,
      stepsRun: enabledSteps.length,
      message: 'Complete workflow executed'
    };
  }

  /**
   * Manually trigger an update for a specific board
   * Runs the complete workflow (all steps in sequence)
   * @param {string} boardId
   */
  async triggerBoardUpdate(boardId) {
    console.log(`🎯 Manual trigger for board: ${boardId}`);
    console.log(`🚀 Running COMPLETE workflow - all steps in sequence!`);
    
    return await this.runCompleteWorkflow(boardId);
  }
}

module.exports = new SchedulerService();
