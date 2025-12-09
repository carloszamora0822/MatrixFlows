#!/usr/bin/env node

/**
 * Diagnostic Script - Check Board and Workflow State
 * 
 * This script checks:
 * 1. All boards and their workflow assignments
 * 2. Board states and next trigger times
 * 3. Workflow schedules and active status
 * 4. What SHOULD happen on next cron run
 * 
 * Usage: node backend/scripts/diagnosticBoardState.js [boardId]
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const { connectDB } = require('../lib/db');
const BoardState = require('../models/BoardState');
const Vestaboard = require('../models/Vestaboard');
const Workflow = require('../models/Workflow');
const workflowService = require('../lib/workflowService');
const { ORG_CONFIG } = require('../../shared/constants');
const moment = require('moment-timezone');

const TIMEZONE = 'America/Chicago';

async function diagnose(targetBoardId = null) {
  console.log('🔍 Starting Board State Diagnostic...\n');
  
  try {
    await connectDB();
    
    // Get all boards
    const allBoards = await Vestaboard.find({ orgId: ORG_CONFIG.ID });
    const boards = targetBoardId 
      ? allBoards.filter(b => b.boardId === targetBoardId)
      : allBoards;
    
    if (boards.length === 0) {
      console.log('❌ No boards found!');
      if (targetBoardId) {
        console.log(`   Searched for: ${targetBoardId}`);
      }
      process.exit(1);
    }
    
    console.log(`📊 Found ${boards.length} board(s)\n`);
    console.log('='.repeat(80));
    
    for (const board of boards) {
      console.log(`\n📺 BOARD: ${board.name}`);
      console.log(`   ID: ${board.boardId}`);
      console.log(`   Active: ${board.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`   Workflow ID: ${board.defaultWorkflowId || '❌ NONE'}`);
      
      // Get board state
      const boardState = await BoardState.findOne({
        orgId: ORG_CONFIG.ID,
        boardId: board.boardId
      });
      
      if (boardState) {
        console.log(`\n   📋 Board State:`);
        console.log(`      Last Update: ${boardState.lastUpdateAt ? moment(boardState.lastUpdateAt).tz(TIMEZONE).format('MM/DD/YYYY h:mm:ss A') : 'Never'}`);
        console.log(`      Next Trigger: ${boardState.nextScheduledTrigger ? moment(boardState.nextScheduledTrigger).tz(TIMEZONE).format('MM/DD/YYYY h:mm:ss A') : 'Not set'}`);
        console.log(`      Workflow Running: ${boardState.workflowRunning ? '🟡 YES' : '🟢 NO'}`);
        console.log(`      Current Screen: ${boardState.currentScreenType || 'None'}`);
        console.log(`      Cycle Count: ${boardState.cycleCount || 0}`);
        
        // Check if trigger time has passed
        if (boardState.nextScheduledTrigger) {
          const now = moment().tz(TIMEZONE);
          const trigger = moment(boardState.nextScheduledTrigger).tz(TIMEZONE);
          const isPast = now.isAfter(trigger);
          const diff = Math.abs(now.diff(trigger, 'minutes'));
          
          if (isPast) {
            console.log(`      ⚠️  TRIGGER TIME PASSED ${diff} minutes ago!`);
          } else {
            console.log(`      ⏰ Triggers in ${diff} minutes`);
          }
        }
      } else {
        console.log(`\n   ⚠️  NO BOARD STATE - Will be created on next cron run`);
      }
      
      // Get workflow details
      if (board.defaultWorkflowId) {
        const workflow = await Workflow.findOne({
          workflowId: board.defaultWorkflowId,
          orgId: ORG_CONFIG.ID
        });
        
        if (workflow) {
          console.log(`\n   🔄 Workflow: "${workflow.name}"`);
          console.log(`      Active: ${workflow.isActive ? '✅ YES' : '❌ NO'}`);
          console.log(`      Schedule Type: ${workflow.schedule.type}`);
          console.log(`      Interval: ${workflow.schedule.updateIntervalMinutes} minutes`);
          
          if (workflow.schedule.type === 'dailyWindow') {
            console.log(`      Window: ${workflow.schedule.startTimeLocal} - ${workflow.schedule.endTimeLocal}`);
            if (workflow.schedule.daysOfWeek && workflow.schedule.daysOfWeek.length > 0) {
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const dayNames = workflow.schedule.daysOfWeek.map(d => days[d]).join(', ');
              console.log(`      Days: ${dayNames}`);
            }
          }
          
          const enabledSteps = workflow.steps.filter(s => s.isEnabled);
          console.log(`      Steps: ${enabledSteps.length} enabled (${workflow.steps.length} total)`);
          enabledSteps.forEach((step, i) => {
            console.log(`         ${i + 1}. ${step.screenType} (${step.displaySeconds}s)`);
          });
          
          // Check if workflow is active NOW
          const now = new Date();
          const isActiveNow = workflowService.isWorkflowActiveNow(workflow, now);
          console.log(`\n      🎯 Active RIGHT NOW: ${isActiveNow ? '✅ YES' : '❌ NO'}`);
          
          if (!isActiveNow && workflow.schedule.type === 'dailyWindow') {
            const nowCentral = moment().tz(TIMEZONE);
            const currentTime = nowCentral.format('HH:mm');
            const currentDay = nowCentral.day();
            
            console.log(`         Current Time: ${nowCentral.format('h:mm A')} (${currentTime})`);
            console.log(`         Current Day: ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDay]}`);
            
            if (workflow.schedule.daysOfWeek && !workflow.schedule.daysOfWeek.includes(currentDay)) {
              console.log(`         ❌ Not a scheduled day`);
            }
            if (currentTime < workflow.schedule.startTimeLocal || currentTime > workflow.schedule.endTimeLocal) {
              console.log(`         ❌ Outside time window`);
            }
          }
        } else {
          console.log(`\n   ❌ WORKFLOW NOT FOUND: ${board.defaultWorkflowId}`);
          console.log(`      This board references a deleted workflow!`);
        }
      }
      
      console.log('\n' + '-'.repeat(80));
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY');
    console.log('='.repeat(80));
    
    const activeBoards = boards.filter(b => b.isActive);
    const boardsWithWorkflows = boards.filter(b => b.defaultWorkflowId);
    const boardsWithStates = await BoardState.countDocuments({
      orgId: ORG_CONFIG.ID,
      boardId: { $in: boards.map(b => b.boardId) }
    });
    
    console.log(`Total Boards: ${boards.length}`);
    console.log(`Active Boards: ${activeBoards.length}`);
    console.log(`Boards with Workflows: ${boardsWithWorkflows.length}`);
    console.log(`Boards with States: ${boardsWithStates}`);
    
    // Check what will happen on next cron
    console.log(`\n🔮 NEXT CRON RUN PREDICTION:`);
    const now = moment().tz(TIMEZONE);
    console.log(`   Current Time: ${now.format('MM/DD/YYYY h:mm:ss A')} CT`);
    
    for (const board of activeBoards) {
      if (!board.defaultWorkflowId) {
        console.log(`   ⏭️  ${board.name}: SKIP (no workflow)`);
        continue;
      }
      
      const workflow = await Workflow.findOne({
        workflowId: board.defaultWorkflowId,
        orgId: ORG_CONFIG.ID
      });
      
      if (!workflow) {
        console.log(`   ❌ ${board.name}: ERROR (workflow not found)`);
        continue;
      }
      
      if (!workflow.isActive) {
        console.log(`   ⏭️  ${board.name}: SKIP (workflow inactive)`);
        continue;
      }
      
      const isActiveNow = workflowService.isWorkflowActiveNow(workflow, new Date());
      if (!isActiveNow) {
        console.log(`   ⏭️  ${board.name}: SKIP (outside schedule window)`);
        continue;
      }
      
      const boardState = await BoardState.findOne({
        orgId: ORG_CONFIG.ID,
        boardId: board.boardId
      });
      
      if (!boardState) {
        console.log(`   ✅ ${board.name}: WILL CREATE STATE & TRIGGER`);
        continue;
      }
      
      if (boardState.workflowRunning) {
        console.log(`   🟡 ${board.name}: SKIP (workflow already running)`);
        continue;
      }
      
      if (boardState.nextScheduledTrigger) {
        const trigger = moment(boardState.nextScheduledTrigger);
        if (now.isSameOrAfter(trigger)) {
          console.log(`   ✅ ${board.name}: WILL TRIGGER (time reached)`);
        } else {
          const minutesUntil = trigger.diff(now, 'minutes');
          console.log(`   ⏰ ${board.name}: WAIT (triggers in ${minutesUntil} min)`);
        }
      } else {
        console.log(`   ✅ ${board.name}: WILL TRIGGER (no next trigger set)`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

// Get board ID from command line args
const targetBoardId = process.argv[2];
diagnose(targetBoardId);
