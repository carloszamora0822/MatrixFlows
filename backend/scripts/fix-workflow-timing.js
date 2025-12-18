require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function fixWorkflowTiming() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Workflow = mongoose.model('Workflow', new mongoose.Schema({}, { strict: false, collection: 'workflows' }));
  
  console.log('\n⏱️  FIXING WORKFLOW TIMING\n');
  
  const workflows = await Workflow.find({ orgId: 'VBT' });
  
  for (const workflow of workflows) {
    console.log(`\n📋 Workflow: "${workflow.name}"`);
    
    let changed = false;
    for (const step of workflow.steps) {
      if (step.displaySeconds > 300) { // More than 5 minutes
        console.log(`   ⚠️  Step ${step.screenType}: ${step.displaySeconds}s (${Math.round(step.displaySeconds/60)}min) → Changing to 20s`);
        step.displaySeconds = 20; // Reasonable default
        changed = true;
      }
    }
    
    if (changed) {
      await workflow.save();
      console.log(`   ✅ Workflow timing fixed`);
    } else {
      console.log(`   ✅ Timing already reasonable`);
    }
  }
  
  await mongoose.connection.close();
  console.log('\n✅ Done!\n');
}

fixWorkflowTiming().catch(console.error);
