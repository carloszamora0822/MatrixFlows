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
      
      const allBoards = await workflowService.getAllBoards();
      
      // FILTER: Only process ACTIVE boards
      const boards = allBoards.filter(board => board.isActive === true);
      
      if (boards.length === 0) {
        console.log('⚠️  No active boards found');
        if (allBoards.length > 0) {
          console.log(`ℹ️  ${allBoards.length} inactive board(s) skipped`);
        }
        return { success: true, boardsProcessed: 0 };
      }

      console.log(`📋 Found ${boards.length} active board(s) (${allBoards.length - boards.length} inactive)`);
      
      // GROUP BOARDS BY WORKFLOW - workflows run once, post to all boards
      const workflowGroups = {};
      for (const board of boards) {
        if (board.defaultWorkflowId) {
          if (!workflowGroups[board.defaultWorkflowId]) {
            workflowGroups[board.defaultWorkflowId] = [];
          }
          workflowGroups[board.defaultWorkflowId].push(board);
        }
      }

      console.log(`🎯 Found ${Object.keys(workflowGroups).length} unique workflow(s) across ${boards.length} board(s)`);
      
      const results = [];
      
      // Process each workflow once, posting to all its boards
      for (const [workflowId, workflowBoards] of Object.entries(workflowGroups)) {
        try {
          console.log(`\n📺 Processing workflow ${workflowId} → ${workflowBoards.length} board(s)`);
          const result = await this.checkAndRunWorkflowForBoards(workflowBoards);
          results.push(...result);
        } catch (error) {
          console.error(`❌ Error processing workflow ${workflowId}:`, error);
          workflowBoards.forEach(board => {
            results.push({
              boardId: board.boardId,
              success: false,
              error: error.message
            });
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
   * Check if it's time to run workflow for multiple boards and run once for all
   * @param {Array} boards - Array of Vestaboard documents with same workflow
   */
  async checkAndRunWorkflowForBoards(boards) {
    if (!boards || boards.length === 0) return [];
    
    // Use first board to check workflow timing (all boards share same workflow)
    const primaryBoard = boards[0];
    console.log(`\n🎯 Checking workflow for ${boards.length} board(s): ${boards.map(b => b.name).join(', ')}`);

    try {
      // Get active workflow based on schedule (using primary board)
      const workflow = await workflowService.getActiveWorkflow(primaryBoard);
      
      if (!workflow) {
        console.log('⚠️  Workflow not scheduled to run at this time');
        return boards.map(board => ({
          boardId: board.boardId,
          success: true,
          skipped: true,
          reason: 'Workflow not active at this time'
        }));
      }

      // Check interval timing using primary board's state
      let primaryBoardState = await BoardState.findOne({
        orgId: ORG_CONFIG.ID,
        boardId: primaryBoard.boardId
      });

      if (!primaryBoardState) {
        primaryBoardState = new BoardState({
          orgId: ORG_CONFIG.ID,
          boardId: primaryBoard.boardId,
          currentStepIndex: 0
        });
        await primaryBoardState.save();
      }

      const shouldRun = intervalScheduler.shouldUpdateNow(
        workflow,
        primaryBoardState.lastUpdateAt
      );

      if (!shouldRun) {
        console.log('⏳ Not time to run yet (interval not reached)');
        return boards.map(board => ({
          boardId: board.boardId,
          success: true,
          skipped: true,
          reason: 'Interval not reached'
        }));
      }

      console.log(`✅ Interval trigger activated - running workflow for ALL ${boards.length} board(s)!`);

      // IMPORTANT: Update lastUpdateAt NOW (before running workflow) to prevent multiple simultaneous runs
      // This marks the workflow as "running" so the next cron check won't trigger it again
      primaryBoardState.lastUpdateAt = new Date();
      await primaryBoardState.save();

      // Run the workflow ONCE and get the screens
      const screens = await this.runCompleteWorkflowGetScreens(primaryBoard.boardId, workflow);
      
      if (!screens || screens.length === 0) {
        console.log('⚠️  No screens generated from workflow');
        return boards.map(board => ({
          boardId: board.boardId,
          success: false,
          error: 'No screens generated'
        }));
      }

      // Post the SAME screens to ALL boards simultaneously
      const results = await Promise.all(boards.map(async (board) => {
        try {
          console.log(`📤 Posting to board: ${board.name}`);
          
          // Get or create board state
          let boardState = await BoardState.findOne({
            orgId: ORG_CONFIG.ID,
            boardId: board.boardId
          });

          if (!boardState) {
            boardState = new BoardState({
              orgId: ORG_CONFIG.ID,
              boardId: board.boardId,
              currentStepIndex: 0
            });
          }

          // Update lastUpdateAt NOW before posting to prevent race conditions
          boardState.lastUpdateAt = new Date();
          boardState.currentWorkflowId = workflow.workflowId;
          await boardState.save();

          // Post all screens to this board
          for (let i = 0; i < screens.length; i++) {
            const screen = screens[i];
            await vestaboardClient.postMessage(board.vestaboardWriteKey, screen.matrix);
            
            // Wait before next screen (except for last screen)
            if (i < screens.length - 1) {
              const delayMs = screen.displaySeconds * 1000;
              console.log(`⏳ Waiting ${screen.displaySeconds} seconds (${Math.floor(screen.displaySeconds / 60)}m ${screen.displaySeconds % 60}s) before next screen...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }

          // Update board state after completion
          boardState.lastMatrix = screens[screens.length - 1].matrix;
          boardState.lastUpdateSuccess = true;
          boardState.cycleCount = (boardState.cycleCount || 0) + 1;
          await boardState.save();

          return {
            boardId: board.boardId,
            success: true,
            screensDisplayed: screens.length
          };
        } catch (error) {
          console.error(`❌ Error posting to board ${board.name}:`, error);
          return {
            boardId: board.boardId,
            success: false,
            error: error.message
          };
        }
      }));

      return results;

    } catch (error) {
      console.error(`❌ Error in checkAndRunWorkflowForBoards:`, error);
      return boards.map(board => ({
        boardId: board.boardId,
        success: false,
        error: error.message
      }));
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
   * Run complete workflow and return screens (without posting)
   * Used for synchronous multi-board updates
   * @param {string} boardId
   * @param {object} workflow
   */
  async runCompleteWorkflowGetScreens(boardId, workflow) {
    console.log(`\n🎬 Generating screens for workflow: ${workflow.name}`);
    
    const screens = [];
    const enabledSteps = workflow.steps.filter(s => s.isEnabled).sort((a, b) => a.order - b.order);
    
    if (enabledSteps.length === 0) {
      console.log('⚠️  No enabled steps in workflow');
      return [];
    }

    console.log(`📋 Workflow has ${enabledSteps.length} enabled step(s)`);

    for (let i = 0; i < enabledSteps.length; i++) {
      const step = enabledSteps[i];
      console.log(`\n📺 Step ${i + 1}/${enabledSteps.length}: ${step.screenType}`);
      console.log(`⏱️  Display duration: ${step.displaySeconds} seconds (${Math.floor(step.displaySeconds / 60)}m ${step.displaySeconds % 60}s)`);
      
      try {
        const matrix = await screenEngine.render(step.screenType, step.screenConfig);
        
        if (!matrix) {
          console.log(`⚠️  Step ${i + 1} returned null - skipping`);
          continue;
        }

        screens.push({
          matrix,
          displaySeconds: step.displaySeconds || 300,
          screenType: step.screenType
        });
        
        console.log(`✅ Screen ${i + 1} generated successfully`);
      } catch (error) {
        console.error(`❌ Error rendering step ${i + 1}:`, error);
      }
    }

    console.log(`✅ Generated ${screens.length} screen(s) from workflow`);
    return screens;
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
    let stepsDisplayed = 0;
    for (let i = 0; i < enabledSteps.length; i++) {
      const step = enabledSteps[i];
      console.log(`\n📺 Step ${i + 1}/${enabledSteps.length}: ${step.screenType}`);
      console.log(`⏱️  Display time: ${step.displaySeconds} seconds`);

      // Render the screen
      const matrix = await screenEngine.render(step.screenType, step.screenConfig);

      // Skip if no data (null returned)
      if (!matrix) {
        console.log(`⏭️  Skipping step - no data available for ${step.screenType}`);
        continue;
      }

      // Get API key
      const apiKey = board.vestaboardWriteKey || process.env.VESTABOARD_API_KEY;
      if (!apiKey) {
        throw new Error('No Vestaboard API key configured!');
      }

      // Post to Vestaboard
      console.log(`📤 Posting to Vestaboard...`);
      await vestaboardClient.postMessage(apiKey, matrix);
      console.log(`✅ Posted step ${i + 1}`);
      stepsDisplayed++;

      // Wait for displaySeconds before next step (except last step)
      if (i < enabledSteps.length - 1) {
        const waitMs = step.displaySeconds * 1000;
        console.log(`⏳ Waiting ${step.displaySeconds} seconds before next step...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    console.log(`\n🎉 Complete workflow finished! ${stepsDisplayed}/${enabledSteps.length} steps displayed.`);
    
    if (stepsDisplayed === 0) {
      console.warn('⚠️ WARNING: No screens were displayed - all screens had missing data!');
    }
    
    return {
      boardId: board.boardId,
      success: true,
      stepsRun: stepsDisplayed,
      totalSteps: enabledSteps.length,
      skippedSteps: enabledSteps.length - stepsDisplayed,
      message: `Workflow executed: ${stepsDisplayed}/${enabledSteps.length} screens displayed`
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
