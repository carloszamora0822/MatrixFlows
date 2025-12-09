#!/usr/bin/env node

/**
 * Reset Stuck Workflows
 * Finds and resets any workflows stuck in "running" state
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const { connectDB } = require('../lib/db');
const BoardState = require('../models/BoardState');
const { ORG_CONFIG } = require('../../shared/constants');

async function reset() {
  try {
    await connectDB();
    
    const stuckStates = await BoardState.find({
      orgId: ORG_CONFIG.ID,
      workflowRunning: true
    });
    
    console.log(`Found ${stuckStates.length} stuck workflow(s)`);
    
    for (const state of stuckStates) {
      state.workflowRunning = false;
      await state.save();
      console.log(`✅ Reset: ${state.boardId}`);
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

reset();
