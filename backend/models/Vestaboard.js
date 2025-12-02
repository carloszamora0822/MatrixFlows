const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

const vestaboardSchema = new mongoose.Schema({
  boardId: {
    type: String,
    required: true,
    unique: true,
    default: () => `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: ORG_CONFIG.ID,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  locationLabel: {
    type: String,
    trim: true
  },
  vestaboardWriteKey: {
    type: String,
    required: true
  },
  defaultWorkflowId: {
    type: String,
    ref: 'Workflow'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdateAt: {
    type: Date
  },
  lastUpdateStatus: {
    type: String,
    enum: ['success', 'error', 'pending']
  }
}, {
  timestamps: true,
  collection: 'vestaboards'
});

// Index for efficient queries
vestaboardSchema.index({ orgId: 1, isActive: 1 });

module.exports = mongoose.model('Vestaboard', vestaboardSchema);
