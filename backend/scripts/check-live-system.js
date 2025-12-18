require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function checkLiveSystem() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Workflow = mongoose.model('Workflow', new mongoose.Schema({}, { strict: false, collection: 'workflows' }));
  const Vestaboard = mongoose.model('Vestaboard', new mongoose.Schema({}, { strict: false, collection: 'vestaboards' }));
  const BoardState = mongoose.model('BoardState', new mongoose.Schema({}, { strict: false, collection: 'boardstates' }));
  
  console.log('\n🔍 LIVE SYSTEM ANALYSIS\n');
  
  // Get all workflows
  const workflows = await Workflow.find({ orgId: 'VBT' }).lean();
  console.log(`📋 WORKFLOWS (${workflows.length}):`);
  for (const wf of workflows) {
    console.log(`\n   "${wf.name}" (${wf.workflowId})`);
    console.log(`   Active: ${wf.isActive}`);
    console.log(`   Steps: ${wf.steps?.length || 0}`);
    if (wf.steps && wf.steps.length > 0) {
      console.log(`   Step Order:`);
      wf.steps.sort((a, b) => a.order - b.order).forEach((step, i) => {
        console.log(`      ${i+1}. ${step.screenType} (${step.displaySeconds}s) - Enabled: ${step.isEnabled}`);
      });
    }
  }
  
  // Get all boards
  const boards = await Vestaboard.find({ orgId: 'VBT' }).lean();
  console.log(`\n\n📺 BOARDS (${boards.length}):`);
  for (const board of boards) {
    console.log(`\n   "${board.name}" (${board.boardId})`);
    console.log(`   Active: ${board.isActive}`);
    console.log(`   Workflow: ${board.defaultWorkflowId || 'NONE'}`);
    
    const workflow = workflows.find(w => w.workflowId === board.defaultWorkflowId);
    if (workflow) {
      console.log(`   → Assigned to: "${workflow.name}"`);
    }
  }
  
  // Get all board states
  const states = await BoardState.find({ orgId: 'VBT' }).lean();
  console.log(`\n\n🔄 BOARD STATES (${states.length}):`);
  for (const state of states) {
    const board = boards.find(b => b.boardId === state.boardId);
    console.log(`\n   Board: ${board?.name || state.boardId}`);
    console.log(`   Current Workflow: ${state.currentWorkflowId || 'NONE'}`);
    console.log(`   Current Screen: ${state.currentScreenType || 'NONE'} (index: ${state.currentScreenIndex}/${state.currentStepIndex})`);
    console.log(`   Workflow Running: ${state.workflowRunning}`);
    console.log(`   Next Trigger: ${state.nextScheduledTrigger}`);
    console.log(`   Last Update: ${state.lastUpdateAt}`);
  }
  
  await mongoose.connection.close();
}

checkLiveSystem().catch(console.error);
