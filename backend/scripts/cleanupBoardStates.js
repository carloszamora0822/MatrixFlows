#!/usr/bin/env node

/**
 * Cleanup Utility for Board States
 * 
 * This script cleans up orphaned and invalid board states:
 * 1. Removes board states for deleted boards
 * 2. Removes board states for deleted workflows
 * 3. Ensures all boards with workflows have states
 * 4. Reports on any inconsistencies
 * 
 * Usage: node backend/scripts/cleanupBoardStates.js
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const { connectDB } = require('../lib/db');
const BoardState = require('../models/BoardState');
const Vestaboard = require('../models/Vestaboard');
const Workflow = require('../models/Workflow');
const { ORG_CONFIG } = require('../../shared/constants');

async function cleanup() {
  console.log('🧹 Starting Board State Cleanup...\n');
  
  try {
    await connectDB();
    
    // Get all data
    const allBoards = await Vestaboard.find({ orgId: ORG_CONFIG.ID });
    const allWorkflows = await Workflow.find({ orgId: ORG_CONFIG.ID });
    const allBoardStates = await BoardState.find({ orgId: ORG_CONFIG.ID });
    
    console.log(`📊 Current State:`);
    console.log(`   Boards: ${allBoards.length}`);
    console.log(`   Workflows: ${allWorkflows.length}`);
    console.log(`   Board States: ${allBoardStates.length}\n`);
    
    const validBoardIds = new Set(allBoards.map(b => b.boardId));
    const validWorkflowIds = new Set(allWorkflows.map(w => w.workflowId));
    
    let orphanedStates = 0;
    let invalidWorkflowRefs = 0;
    let missingStates = 0;
    
    // 1. Remove board states for deleted boards
    console.log('🔍 Checking for orphaned board states...');
    for (const state of allBoardStates) {
      if (!validBoardIds.has(state.boardId)) {
        console.log(`   ❌ Orphaned state for deleted board: ${state.boardId}`);
        await BoardState.findByIdAndDelete(state._id);
        orphanedStates++;
      }
    }
    
    // 2. Clean up invalid workflow references
    console.log('\n🔍 Checking for invalid workflow references...');
    for (const state of allBoardStates) {
      if (state.currentWorkflowId && !validWorkflowIds.has(state.currentWorkflowId)) {
        console.log(`   ❌ Invalid workflow reference in state: ${state.boardId} -> ${state.currentWorkflowId}`);
        await BoardState.findByIdAndUpdate(state._id, {
          $unset: { currentWorkflowId: '', nextScheduledTrigger: '' }
        });
        invalidWorkflowRefs++;
      }
    }
    
    // 3. Check for boards with workflows but no states
    console.log('\n🔍 Checking for missing board states...');
    for (const board of allBoards) {
      if (board.defaultWorkflowId && board.isActive) {
        const hasState = allBoardStates.some(s => s.boardId === board.boardId);
        if (!hasState) {
          console.log(`   ⚠️  Board "${board.name}" has workflow but no state`);
          console.log(`      (Will be created on next cron run)`);
          missingStates++;
        }
      }
    }
    
    // 4. Report on inactive boards with states
    console.log('\n🔍 Checking for inactive boards with states...');
    let inactiveWithStates = 0;
    for (const board of allBoards) {
      if (!board.isActive) {
        const hasState = allBoardStates.some(s => s.boardId === board.boardId);
        if (hasState) {
          console.log(`   ℹ️  Inactive board "${board.name}" has state (OK - will be ignored by scheduler)`);
          inactiveWithStates++;
        }
      }
    }
    
    // 5. Report on boards without workflows
    console.log('\n🔍 Checking for boards without workflows...');
    let boardsWithoutWorkflows = 0;
    for (const board of allBoards) {
      if (!board.defaultWorkflowId && board.isActive) {
        console.log(`   ℹ️  Active board "${board.name}" has no workflow assigned`);
        boardsWithoutWorkflows++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Orphaned states removed: ${orphanedStates}`);
    console.log(`✅ Invalid workflow refs cleaned: ${invalidWorkflowRefs}`);
    console.log(`⚠️  Missing states (will auto-create): ${missingStates}`);
    console.log(`ℹ️  Inactive boards with states: ${inactiveWithStates}`);
    console.log(`ℹ️  Active boards without workflows: ${boardsWithoutWorkflows}`);
    console.log('='.repeat(60));
    
    if (orphanedStates === 0 && invalidWorkflowRefs === 0) {
      console.log('\n✨ All board states are clean! No issues found.');
    } else {
      console.log(`\n✨ Cleanup complete! Fixed ${orphanedStates + invalidWorkflowRefs} issue(s).`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();
