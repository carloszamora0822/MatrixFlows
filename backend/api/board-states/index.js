const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const BoardState = require('../../models/BoardState');
const { ERROR_CODES, ORG_CONFIG } = require('../../../shared/constants');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => err ? reject(err) : resolve());
    });

    if (req.method !== 'GET') {
      return res.status(405).json({ error: { code: ERROR_CODES.METHOD_NOT_ALLOWED, message: 'Method not allowed' } });
    }

    const boardStates = await BoardState.find({ orgId: ORG_CONFIG.ID });
    console.log(`📊 Returning ${boardStates.length} board states`);
    boardStates.forEach(state => {
      console.log(`   - ${state.boardId}: nextTrigger=${state.nextScheduledTrigger ? state.nextScheduledTrigger.toISOString() : 'null'}, currentScreen=${state.currentScreenType || 'none'}`);
    });
    res.status(200).json(boardStates);
  } catch (error) {
    console.error('❌ Board States API error:', error);
    return res.status(500).json({ error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' } });
  }
};
