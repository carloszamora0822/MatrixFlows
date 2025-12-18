require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function unlockStuckWorkflows() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const BoardState = mongoose.model('BoardState', new mongoose.Schema({}, { strict: false, collection: 'boardstates' }));
  
  console.log('\n🔓 UNLOCKING STUCK WORKFLOWS\n');
  
  const result = await BoardState.updateMany(
    { workflowRunning: true },
    { $set: { workflowRunning: false } }
  );
  
  console.log(`✅ Unlocked ${result.modifiedCount} stuck workflow(s)`);
  
  await mongoose.connection.close();
}

unlockStuckWorkflows().catch(console.error);
