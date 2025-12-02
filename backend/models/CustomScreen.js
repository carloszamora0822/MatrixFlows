const mongoose = require('mongoose');

const customScreenSchema = new mongoose.Schema({
  screenId: {
    type: String,
    required: true,
    unique: true,
    default: () => `screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: 'VBT'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  borderColor1: {
    type: String,
    required: true,
    default: 'red'
  },
  borderColor2: {
    type: String,
    required: true,
    default: 'orange'
  },
  matrix: {
    type: [[Number]],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for cleanup queries
customScreenSchema.index({ expiresAt: 1, orgId: 1 });

module.exports = mongoose.model('CustomScreen', customScreenSchema);
