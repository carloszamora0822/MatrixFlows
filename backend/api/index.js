require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

const { connectDB } = require('../lib/db');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { 
  corsOptions, 
  apiRateLimit, 
  helmetOptions, 
  requestLogger, 
  errorHandler, 
  notFoundHandler 
} = require('../lib/middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for Render and other hosting platforms
app.set('trust proxy', 1);

// Initialize database and create default data
const initializeApp = async () => {
  try {
    console.log('🚀 Starting VBT Vestaboard System Backend...');
    
    // Connect to database
    await connectDB();
    
    // Ensure VBT organization exists
    await Organization.ensureVBTExists();
    
    // Create default admin user
    await User.createDefaultAdmin();
    
    // Clear any stale workflowRunning flags from previous server instance
    const BoardState = require('../models/BoardState');
    const Vestaboard = require('../models/Vestaboard');
    const { ORG_CONFIG } = require('../../shared/constants');
    
    const result = await BoardState.updateMany(
      { workflowRunning: true },
      { $set: { workflowRunning: false } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🔄 Cleared ${result.modifiedCount} stale workflow lock(s)`);
    }
    
    // Clean up orphaned board states (states for deleted boards)
    const allBoards = await Vestaboard.find({ orgId: ORG_CONFIG.ID });
    const activeBoardIds = new Set(allBoards.map(b => b.boardId));
    const allStates = await BoardState.find({ orgId: ORG_CONFIG.ID });
    const orphanedStates = allStates.filter(state => !activeBoardIds.has(state.boardId));
    
    if (orphanedStates.length > 0) {
      const deleteResult = await BoardState.deleteMany({
        orgId: ORG_CONFIG.ID,
        boardId: { $in: orphanedStates.map(s => s.boardId) }
      });
      console.log(`🗑️  Cleaned up ${deleteResult.deletedCount} orphaned board state(s)`);
    }
    
    // Fix board states missing nextScheduledTrigger (migration for old states)
    const statesWithoutTrigger = await BoardState.find({
      orgId: ORG_CONFIG.ID,
      nextScheduledTrigger: { $exists: false }
    });
    
    if (statesWithoutTrigger.length > 0) {
      for (const state of statesWithoutTrigger) {
        // Set next trigger to now + 1 minute so it runs on next cron
        state.nextScheduledTrigger = new Date(Date.now() + 60000);
        await state.save();
      }
      console.log(`🔧 Fixed ${statesWithoutTrigger.length} board state(s) missing nextScheduledTrigger`);
    }
    
    console.log('✅ Application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Security middleware
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));

// Rate limiting
app.use('/api/', apiRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Health check endpoint (no auth required)
app.get('/api/health', require('./health'));

// Authentication routes
app.use('/api/auth/login', require('./auth/login'));
app.use('/api/auth/logout', require('./auth/logout'));

// User routes
app.use('/api/users/me', require('./users/me'));
app.use('/api/users', require('./users/index'));

// Screen routes
app.use('/api/screens/preview', require('./screens/preview'));

// Data management routes
app.use('/api/birthdays', require('./birthdays/index'));
app.use('/api/checkrides', require('./checkrides/index'));
app.use('/api/events', require('./events/index'));
app.use('/api/pilots', require('./pilots/index'));
app.use('/api/recognitions', require('./recognitions/index'));

// Workflow and Board management routes
app.use('/api/boards', require('./boards/index'));
app.use('/api/board-states', require('./board-states/index'));
app.use('/api/workflows/trigger-multi', require('./workflows/trigger-multi')); // ✅ Multi-board trigger (must be before /api/workflows!)
app.use('/api/workflows/trigger', require('./workflows/trigger')); // Must be before /api/workflows!
app.use('/api/workflows', require('./workflows/index'));
app.use('/api/pin-screen', require('./pin-screen/index'));
app.use('/api/custom-screens', require('./custom-screens/index'));

// Cron routes (for scheduled updates)
app.use('/api/cron/update', require('./cron/update'));

// Dashboard routes
app.use('/api/dashboard', require('./dashboard/index'));

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'VBT Vestaboard System API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  initializeApp().then(() => {
    app.listen(PORT, () => {
      console.log(`🌟 Server running on port ${PORT}`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
    });
  });
}

module.exports = app;
