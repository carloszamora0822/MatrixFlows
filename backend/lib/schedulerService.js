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
    try {
      await pinScreenService.cleanupExpiredPinnedWorkflows();
      
      const allBoards = await workflowService.getAllBoards();
      const boards = allBoards.filter(board => board.isActive === true);
      
      if (boards.length === 0) {
        return { success: true, boardsProcessed: 0 };
      }

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🕐 CRON RUN`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      // GROUP BOARDS BY WORKFLOW
      const workflowGroups = {};
      for (const board of boards) {
        if (board.defaultWorkflowId) {
          if (!workflowGroups[board.defaultWorkflowId]) {
            workflowGroups[board.defaultWorkflowId] = [];
          }
          workflowGroups[board.defaultWorkflowId].push(board);
        }
      }
      
      const results = [];
      
      // Process each workflow
      for (const [workflowId, workflowBoards] of Object.entries(workflowGroups)) {
        try {
          const result = await this.checkAndRunWorkflowForBoards(workflowBoards);
          results.push(...result);
        } catch (error) {
          console.error(`❌ Workflow ${workflowId} error:`, error.message);
          workflowBoards.forEach(board => {
            results.push({
              boardId: board.boardId,
              success: false,
              error: error.message
            });
          });
        }
      }

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const successCount = results.filter(r => r.success).length;
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
    
    const primaryBoard = boards[0];

    try {
      const workflow = await workflowService.getActiveWorkflow(primaryBoard);
      
      if (!workflow) {
        return boards.map(board => ({
          boardId: board.boardId,
          success: true,
          skipped: true,
          reason: 'Not scheduled'
        }));
      }
      
      // Get board states to show current screen
      const boardStates = await Promise.all(boards.map(async (board) => {
        const state = await BoardState.findOne({
          orgId: ORG_CONFIG.ID,
          boardId: board.boardId
        });
        return { board, state };
      }));
      
      console.log(`\n📋 Workflow: "${workflow.name}"`);

      // Check interval timing using primary board's state
      let primaryBoardState = await BoardState.findOne({
        orgId: ORG_CONFIG.ID,
        boardId: primaryBoard.boardId
      });

      if (!primaryBoardState) {
        // Calculate initial nextScheduledTrigger for new workflow
        const now = new Date();
        const intervalMinutes = workflow.schedule.updateIntervalMinutes;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Check if we're in the time window NOW
        let shouldTriggerNow = true;
        if (workflow.schedule.type === 'dailyWindow' && workflow.schedule.startTimeLocal && workflow.schedule.endTimeLocal) {
          const [startHour, startMin] = workflow.schedule.startTimeLocal.split(':').map(Number);
          const [endHour, endMin] = workflow.schedule.endTimeLocal.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
            shouldTriggerNow = false;
          }
        }
        
        let initialNextTrigger;
        if (shouldTriggerNow) {
          // In window - trigger on next cron run (within 1 minute)
          initialNextTrigger = new Date(now.getTime() + 60000);
        } else {
          // Outside window - calculate next aligned trigger at start of next window
          const [startHour, startMin] = workflow.schedule.startTimeLocal.split(':').map(Number);
          initialNextTrigger = new Date(now);
          initialNextTrigger.setDate(initialNextTrigger.getDate() + 1);
          initialNextTrigger.setHours(startHour, startMin, 0, 0);
        }
        
        primaryBoardState = new BoardState({
          orgId: ORG_CONFIG.ID,
          boardId: primaryBoard.boardId,
          currentStepIndex: 0,
          nextScheduledTrigger: initialNextTrigger
        });
        await primaryBoardState.save();
      }

      // Check if workflow is already running
      if (primaryBoardState.workflowRunning) {
        const totalScreens = workflow.steps.filter(s => s.isEnabled).length;
        
        // Show each board's status with ACTUAL current screen from database
        boardStates.forEach(({ board, state }) => {
          const screenType = state?.currentScreenType || 'Unknown';
          const screenIndex = (state?.currentScreenIndex || 0) + 1;
          console.log(`   🟡 ${board.name}: Displaying ${screenType} (screen ${screenIndex}/${totalScreens})`);
        });
        
        return boards.map(board => ({
          boardId: board.boardId,
          success: true,
          skipped: true,
          reason: 'Workflow already in progress'
        }));
      }

      // Check if it's time to run based on nextScheduledTrigger
      const now = new Date();
      const shouldRun = primaryBoardState.nextScheduledTrigger ? 
                       now >= primaryBoardState.nextScheduledTrigger :
                       intervalScheduler.shouldUpdateNow(workflow, primaryBoardState.lastUpdateAt);

      if (!shouldRun) {
        // Use stored nextScheduledTrigger if available, otherwise calculate
        const nextTrigger = primaryBoardState.nextScheduledTrigger || 
                           (primaryBoardState.lastUpdateAt ? 
                            new Date(new Date(primaryBoardState.lastUpdateAt).getTime() + workflow.schedule.updateIntervalMinutes * 60000) : 
                            new Date());
        
        // Show each board's status with ACTUAL current screen from database
        boardStates.forEach(({ board, state }) => {
          const screenType = state?.currentScreenType || 'Unknown';
          const boardNextTrigger = state?.nextScheduledTrigger || nextTrigger;
          console.log(`   ⏳ ${board.name}: Displaying ${screenType} | Next trigger ${boardNextTrigger.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
        });
        
        return boards.map(board => ({
          boardId: board.boardId,
          success: true,
          skipped: true,
          reason: 'Interval not reached'
        }));
      }

      // CRITICAL: Ensure minimum 15 seconds since last post to avoid rate limiting
      const timeSinceLastUpdate = (new Date() - new Date(primaryBoardState.lastUpdateAt)) / 1000;
      if (timeSinceLastUpdate < 15) {
        boardStates.forEach(({ board }) => {
          console.log(`   ⚠️  ${board.name}: Rate limit protection (${Math.floor(timeSinceLastUpdate)}s since last post)`);
        });
        return boards.map(board => ({
          boardId: board.boardId,
          success: true,
          skipped: true,
          reason: 'Rate limit protection'
        }));
      }

      // Show boards starting
      boardStates.forEach(({ board }) => {
        console.log(`   ▶️  ${board.name}: Starting workflow`);
      });

      // Mark workflow as running IMMEDIATELY (but don't update lastUpdateAt yet)
      primaryBoardState.workflowRunning = true;
      await primaryBoardState.save();

      // Get enabled steps
      const enabledSteps = workflow.steps.filter(s => s.isEnabled).sort((a, b) => a.order - b.order);
      
      if (enabledSteps.length === 0) {
        console.log(`❌ ${boardNames}: No enabled steps in "${workflow.name}"`);
        primaryBoardState.workflowRunning = false;
        await primaryBoardState.save();
        return boards.map(board => ({ boardId: board.boardId, success: false, error: 'No enabled steps' }));
      }

      // Generate all screens first
      const screens = [];
      const renderResults = [];
      for (let i = 0; i < enabledSteps.length; i++) {
        const step = enabledSteps[i];
        const matrix = await screenEngine.render(step.screenType, step.screenConfig);
        if (matrix) {
          screens.push({
            matrix,
            displaySeconds: step.displaySeconds,
            screenType: step.screenType
          });
          renderResults.push(`${step.screenType}`);
        }
      }
      console.log(`   🎨 Rendered ${renderResults.length} screens: ${renderResults.join(', ')}`);

      // Post screens to all boards - one screen at a time, all boards simultaneously
      const results = [];
      
      for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        
        // Update current screen index for progress tracking
        primaryBoardState.currentScreenIndex = i;
        primaryBoardState.currentScreenType = screen.screenType;
        await primaryBoardState.save();
        
        // Post THIS screen to ALL boards simultaneously
        const screenResults = await Promise.all(boards.map(async (board) => {
          try {
            await vestaboardClient.postMessage(board.vestaboardWriteKey, screen.matrix);
            
            // Update each board's state with current screen
            const boardState = await BoardState.findOne({
              orgId: ORG_CONFIG.ID,
              boardId: board.boardId
            });
            if (boardState) {
              boardState.currentScreenType = screen.screenType;
              boardState.currentScreenIndex = i;
              boardState.lastScreenPostedAt = new Date();
              await boardState.save();
            }
            
            return { boardId: board.boardId, boardName: board.name, success: true };
          } catch (error) {
            const errorType = error.message.includes('429') ? 'Rate Limited' : 
                            error.message.includes('timeout') ? 'Timeout' : 
                            error.message.includes('304') ? 'Not Modified' : 'Error';
            return { boardId: board.boardId, boardName: board.name, success: false, error: errorType };
          }
        }));
        
        // Show each board's posting result
        screenResults.forEach((result) => {
          if (result.success) {
            console.log(`   📤 ${result.boardName}: Posted ${screen.screenType} (${i + 1}/${screens.length}) ✅`);
          } else {
            console.log(`   ❌ ${result.boardName}: Failed ${screen.screenType} (${i + 1}/${screens.length}) - ${result.error}`);
          }
        });
        
        results.push(...screenResults);
        
        // Update lastUpdateAt after posting to track actual post time
        primaryBoardState.lastUpdateAt = new Date();
        await primaryBoardState.save();
        
        // Wait before next screen (except last)
        if (i < screens.length - 1) {
          const delaySeconds = Math.max(screen.displaySeconds, 16);
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      }
      
      // Calculate next trigger time aligned to interval boundaries
      const currentTime = new Date();
      const intervalMinutes = workflow.schedule.updateIntervalMinutes;
      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      
      // Round UP to next interval boundary (add 1 to ensure we go to NEXT boundary, not current)
      let nextTriggerMinutes = Math.ceil((currentMinutes + 1) / intervalMinutes) * intervalMinutes;
      let nextTrigger = new Date(currentTime);
      nextTrigger.setHours(Math.floor(nextTriggerMinutes / 60));
      nextTrigger.setMinutes(nextTriggerMinutes % 60);
      nextTrigger.setSeconds(0);
      nextTrigger.setMilliseconds(0);
      
      // If we've passed midnight, add a day
      if (nextTriggerMinutes >= 1440) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
        nextTrigger.setHours(0);
        nextTrigger.setMinutes(0);
      }
      
      // Check if next trigger is within time window (for dailyWindow schedules)
      if (workflow.schedule.type === 'dailyWindow' && workflow.schedule.startTimeLocal && workflow.schedule.endTimeLocal) {
        // Convert to minutes for numeric comparison
        const triggerMinutes = nextTrigger.getHours() * 60 + nextTrigger.getMinutes();
        const [startHour, startMin] = workflow.schedule.startTimeLocal.split(':').map(Number);
        const [endHour, endMin] = workflow.schedule.endTimeLocal.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        // If next trigger is outside the window, move to next day's start time
        if (triggerMinutes < startMinutes || triggerMinutes > endMinutes) {
          nextTrigger.setDate(nextTrigger.getDate() + 1);
          nextTrigger.setHours(startHour);
          nextTrigger.setMinutes(startMin);
          nextTrigger.setSeconds(0);
          nextTrigger.setMilliseconds(0);
        }
      }

      // Update all board states after workflow completes
      await Promise.all(boards.map(async (board) => {
        try {
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

          boardState.lastMatrix = screens[screens.length - 1].matrix;
          boardState.lastUpdateAt = new Date();
          boardState.lastUpdateSuccess = true;
          boardState.currentWorkflowId = workflow.workflowId;
          boardState.cycleCount = (boardState.cycleCount || 0) + 1;
          boardState.nextScheduledTrigger = nextTrigger;  // Save to ALL boards
          await boardState.save();
        } catch (error) {
          console.error(`Failed to update state for ${board.name}:`, error.message);
        }
      }));
      
      // Mark workflow as complete
      primaryBoardState.workflowRunning = false;
      primaryBoardState.currentScreenIndex = 0;
      await primaryBoardState.save();
      
      const totalSuccess = results.filter(r => r.success).length;
      const totalAttempts = results.length;
      console.log(`   ✅ Workflow complete (${totalSuccess}/${totalAttempts} posts successful)`);

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
