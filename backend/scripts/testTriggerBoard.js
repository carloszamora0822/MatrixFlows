#!/usr/bin/env node

/**
 * Test Script - Manually Trigger a Board
 * 
 * This script manually triggers a workflow for a specific board
 * to test if the system is working correctly.
 * 
 * Usage: node backend/scripts/testTriggerBoard.js <boardId>
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const { connectDB } = require('../lib/db');
const schedulerService = require('../lib/schedulerService');

async function testTrigger(boardId) {
  if (!boardId) {
    console.log('❌ Please provide a board ID');
    console.log('Usage: node backend/scripts/testTriggerBoard.js <boardId>');
    process.exit(1);
  }
  
  console.log(`🎯 Testing manual trigger for board: ${boardId}\n`);
  
  try {
    await connectDB();
    
    console.log('🔄 Triggering workflow...\n');
    const result = await schedulerService.triggerBoardUpdate(boardId);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULT:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(80));
    
    if (result.success) {
      console.log('\n✅ Trigger successful!');
      console.log(`   Steps run: ${result.stepsRun}/${result.totalSteps}`);
      if (result.skippedSteps > 0) {
        console.log(`   ⚠️  Skipped steps: ${result.skippedSteps} (no data available)`);
      }
    } else {
      console.log('\n❌ Trigger failed!');
      console.log(`   Error: ${result.message || 'Unknown error'}`);
    }
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const boardId = process.argv[2];
testTrigger(boardId);
