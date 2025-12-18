/**
 * Cleanup Orphan Workflows Script
 * 
 * Finds and optionally deletes:
 * 1. Workflows with no boards assigned
 * 2. Workflows that are inactive
 * 3. Board states with no corresponding board
 * 4. Board states with no corresponding workflow
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Workflow = require('../models/Workflow');
const Vestaboard = require('../models/Vestaboard');
const BoardState = require('../models/BoardState');
const { ORG_CONFIG } = require('../../shared/constants');

async function findOrphans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');
    console.log('='.repeat(80));
    console.log('🔍 ORPHAN DETECTION REPORT');
    console.log('='.repeat(80));

    // Get all data
    const allWorkflows = await Workflow.find({ orgId: ORG_CONFIG.ID });
    const allBoards = await Vestaboard.find({ orgId: ORG_CONFIG.ID });
    const allStates = await BoardState.find({ orgId: ORG_CONFIG.ID });

    console.log(`\n📊 Current State:`);
    console.log(`   Workflows: ${allWorkflows.length}`);
    console.log(`   Boards: ${allBoards.length}`);
    console.log(`   Board States: ${allStates.length}`);

    // ============================================================================
    // ORPHAN TYPE 1: Workflows with NO boards assigned
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ORPHAN TYPE 1: Workflows with NO boards assigned');
    console.log('='.repeat(80));

    const orphanWorkflows = [];
    
    for (const workflow of allWorkflows) {
      // Skip pinned workflows (they don't use defaultWorkflowId)
      if (workflow.name.startsWith('Pinned -')) {
        continue;
      }

      const assignedBoards = allBoards.filter(b => b.defaultWorkflowId === workflow.workflowId);
      
      if (assignedBoards.length === 0) {
        orphanWorkflows.push(workflow);
        console.log(`\n❌ ORPHAN WORKFLOW: "${workflow.name}"`);
        console.log(`   ID: ${workflow.workflowId}`);
        console.log(`   Created: ${workflow.createdAt}`);
        console.log(`   Active: ${workflow.isActive}`);
        console.log(`   Boards assigned: 0`);
      }
    }

    // ============================================================================
    // ORPHAN TYPE 2: Inactive workflows
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ORPHAN TYPE 2: Inactive workflows');
    console.log('='.repeat(80));

    const inactiveWorkflows = allWorkflows.filter(w => w.isActive === false);
    
    if (inactiveWorkflows.length === 0) {
      console.log('\n✅ No inactive workflows found');
    } else {
      for (const workflow of inactiveWorkflows) {
        console.log(`\n⏸️  INACTIVE: "${workflow.name}"`);
        console.log(`   ID: ${workflow.workflowId}`);
        console.log(`   Created: ${workflow.createdAt}`);
        
        const assignedBoards = allBoards.filter(b => b.defaultWorkflowId === workflow.workflowId);
        console.log(`   Boards assigned: ${assignedBoards.length}`);
      }
    }

    // ============================================================================
    // ORPHAN TYPE 3: Board states with no corresponding board
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ORPHAN TYPE 3: Board states with no corresponding board');
    console.log('='.repeat(80));

    const orphanStates = [];
    const boardIds = new Set(allBoards.map(b => b.boardId));

    for (const state of allStates) {
      if (!boardIds.has(state.boardId)) {
        orphanStates.push(state);
        console.log(`\n❌ ORPHAN STATE: ${state.boardId}`);
        console.log(`   State ID: ${state.stateId}`);
        console.log(`   Current Workflow: ${state.currentWorkflowId || 'NONE'}`);
        console.log(`   Last Update: ${state.lastUpdateAt || 'NEVER'}`);
      }
    }

    // ============================================================================
    // ORPHAN TYPE 4: Board states referencing deleted workflows
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ORPHAN TYPE 4: Board states referencing deleted workflows');
    console.log('='.repeat(80));

    const workflowIds = new Set(allWorkflows.map(w => w.workflowId));
    const statesWithBadWorkflow = [];

    for (const state of allStates) {
      if (state.currentWorkflowId && !workflowIds.has(state.currentWorkflowId)) {
        statesWithBadWorkflow.push(state);
        console.log(`\n❌ STATE WITH DELETED WORKFLOW: ${state.boardId}`);
        console.log(`   References: ${state.currentWorkflowId}`);
        console.log(`   Last Update: ${state.lastUpdateAt}`);
      }
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 ORPHAN SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n❌ Workflows with no boards: ${orphanWorkflows.length}`);
    console.log(`⏸️  Inactive workflows: ${inactiveWorkflows.length}`);
    console.log(`❌ Board states with no board: ${orphanStates.length}`);
    console.log(`❌ States referencing deleted workflows: ${statesWithBadWorkflow.length}`);

    const totalOrphans = orphanWorkflows.length + orphanStates.length + statesWithBadWorkflow.length;
    console.log(`\n🗑️  TOTAL ORPHANS TO CLEAN: ${totalOrphans}`);

    return {
      orphanWorkflows,
      inactiveWorkflows,
      orphanStates,
      statesWithBadWorkflow
    };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

async function cleanupOrphans(orphans) {
  console.log('\n' + '='.repeat(80));
  console.log('🗑️  CLEANUP OPERATION');
  console.log('='.repeat(80));

  let deletedCount = 0;

  // Delete orphan workflows (no boards assigned)
  if (orphans.orphanWorkflows.length > 0) {
    console.log(`\n🗑️  Deleting ${orphans.orphanWorkflows.length} orphan workflow(s)...`);
    for (const workflow of orphans.orphanWorkflows) {
      await Workflow.deleteOne({ workflowId: workflow.workflowId });
      console.log(`   ✅ Deleted: "${workflow.name}"`);
      deletedCount++;
    }
  }

  // Delete orphan board states
  if (orphans.orphanStates.length > 0) {
    console.log(`\n🗑️  Deleting ${orphans.orphanStates.length} orphan board state(s)...`);
    for (const state of orphans.orphanStates) {
      await BoardState.deleteOne({ stateId: state.stateId });
      console.log(`   ✅ Deleted state for: ${state.boardId}`);
      deletedCount++;
    }
  }

  // Clean up states referencing deleted workflows
  if (orphans.statesWithBadWorkflow.length > 0) {
    console.log(`\n🗑️  Cleaning ${orphans.statesWithBadWorkflow.length} state(s) with bad workflow refs...`);
    for (const state of orphans.statesWithBadWorkflow) {
      state.currentWorkflowId = undefined;
      state.nextScheduledTrigger = undefined;
      state.workflowRunning = false;
      await state.save();
      console.log(`   ✅ Cleaned state for: ${state.boardId}`);
      deletedCount++;
    }
  }

  console.log(`\n✅ CLEANUP COMPLETE: ${deletedCount} items cleaned`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const shouldDelete = args.includes('--delete') || args.includes('-d');

  const orphans = await findOrphans();

  if (shouldDelete) {
    console.log('\n⚠️  DELETE MODE ENABLED');
    await cleanupOrphans(orphans);
  } else {
    console.log('\n' + '='.repeat(80));
    console.log('ℹ️  DRY RUN MODE (no changes made)');
    console.log('='.repeat(80));
    console.log('\nTo actually delete orphans, run:');
    console.log('   node backend/scripts/cleanup-orphan-workflows.js --delete');
  }

  await mongoose.connection.close();
  console.log('\n✅ Done!\n');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { findOrphans, cleanupOrphans };
