const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

const recognitionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: ORG_CONFIG.ID,
    uppercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  month: {
    type: String,
    match: /^(0[1-9]|1[0-2])\/\d{4}$/
  },
  borderColor1: {
    type: String,
    default: 'yellow'
  },
  borderColor2: {
    type: String,
    default: 'orange'
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'recognitions'
});

// Index for efficient queries
recognitionSchema.index({ orgId: 1, isCurrent: 1 });

// Only one recognition can be current at a time per organization
recognitionSchema.pre('save', async function(next) {
  if (this.isCurrent && this.isModified('isCurrent')) {
    // Set all other recognitions to not current
    await this.constructor.updateMany(
      { orgId: this.orgId, id: { $ne: this.id } },
      { isCurrent: false }
    );
  }
  next();
});

module.exports = mongoose.model('Recognition', recognitionSchema);
