require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const BoardState = require('../models/BoardState');
const Vestaboard = require('../models/Vestaboard');
const { ORG_CONFIG } = require('../../shared/constants');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all board states
    const boardStates = await BoardState.find({ orgId: ORG_CONFIG.ID });
    console.log(`📊 Found ${boardStates.length} board states\n`);
    
    // Get all active boards
    const boards = await Vestaboard.find({ orgId: ORG_CONFIG.ID });
    const activeBoardIds = new Set(boards.map(b => b.boardId));
    console.log(`📋 Found ${boards.length} active boards\n`);
    
    // Find orphaned board states
    const orphaned = [];
    for (const state of boardStates) {
      if (!activeBoardIds.has(state.boardId)) {
        orphaned.push(state);
        console.log(`🗑️  Orphaned state found: ${state.boardId}`);
        console.log(`   - Last update: ${state.lastUpdateAt ? state.lastUpdateAt.toISOString() : 'Never'}`);
        console.log(`   - Current screen: ${state.currentScreenType || 'None'}`);
      }
    }
    
    if (orphaned.length === 0) {
      console.log('\n✅ No orphaned board states found!');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${orphaned.length} orphaned board states`);
    console.log('Deleting in 3 seconds... (Ctrl+C to cancel)');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete orphaned states
    const result = await BoardState.deleteMany({
      orgId: ORG_CONFIG.ID,
      boardId: { $in: orphaned.map(s => s.boardId) }
    });
    
    console.log(`\n✅ Deleted ${result.deletedCount} orphaned board states`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
