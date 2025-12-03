#!/usr/bin/env node

/**
 * Standalone Scheduler Service
 * Runs workflows on their configured intervals
 * 
 * Usage: node backend/scheduler.js
 */

require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');

const POLL_INTERVAL_MS = 60 * 1000; // Check every 60 seconds
const API_URL = process.env.API_URL || 'http://localhost:3001';

console.log('🚀 MatrixFlow Scheduler Service Starting...');
console.log(`⏱️  Poll interval: ${POLL_INTERVAL_MS / 1000} seconds`);
console.log('');

let isRunning = false;

async function runScheduler() {
  if (isRunning) {
    console.log('⏸️  Previous run still in progress, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Scheduler Run - ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));
    
    // Call the cron API endpoint
    const response = await axios.post(`${API_URL}/api/cron/update`, {}, {
      timeout: 30000 // 30 second timeout
    });
    
    const result = response.data;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Run complete in ${duration}s`);
    console.log(`   Boards processed: ${result.boardsProcessed || 0}`);
    console.log(`   Success: ${result.success ? 'Yes' : 'No'}`);
    if (result.expiredScreensDeleted > 0) {
      console.log(`   Expired screens deleted: ${result.expiredScreensDeleted}`);
    }
    
  } catch (error) {
    console.error('❌ Scheduler error:', error.response?.data || error.message);
  } finally {
    isRunning = false;
  }
}

// Initial run
console.log('🎬 Running initial check...');
runScheduler();

// Set up interval
const intervalId = setInterval(runScheduler, POLL_INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down scheduler...');
  clearInterval(intervalId);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down scheduler...');
  clearInterval(intervalId);
  process.exit(0);
});

console.log('✅ Scheduler service running');
console.log('   Press Ctrl+C to stop\n');
