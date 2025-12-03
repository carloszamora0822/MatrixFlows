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
