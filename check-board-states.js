require('dotenv').config();
const mongoose = require('mongoose');
const BoardState = require('./backend/models/BoardState');

async function checkStates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const states = await BoardState.find({}).sort({ boardId: 1 });
    
    console.log(`Found ${states.length} board states:\n`);
    
    states.forEach(state => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Board ID: ${state.boardId}`);
      console.log(`Workflow Running: ${state.workflowRunning}`);
      console.log(`Current Screen Type: ${state.currentScreenType || 'None'}`);
      console.log(`Current Screen Index: ${state.currentScreenIndex}`);
      console.log(`Last Update: ${state.lastUpdateAt ? state.lastUpdateAt.toISOString() : 'Never'}`);
      console.log(`Next Scheduled Trigger: ${state.nextScheduledTrigger ? state.nextScheduledTrigger.toISOString() : 'Not set'}`);
      console.log(`Cycle Count: ${state.cycleCount || 0}`);
      console.log(`Last Update Success: ${state.lastUpdateSuccess}`);
      console.log();
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStates();
