const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

const pilotSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
    trim: true,
    maxlength: 100
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'pilots'
});

// Index for efficient queries
pilotSchema.index({ orgId: 1, isCurrent: 1 });

// Only one pilot can be current at a time per organization
pilotSchema.pre('save', async function(next) {
  if (this.isCurrent && this.isModified('isCurrent')) {
    // Set all other pilots to not current
    await this.constructor.updateMany(
      { orgId: this.orgId, id: { $ne: this.id } },
      { isCurrent: false }
    );
  }
  next();
});

module.exports = mongoose.model('Pilot', pilotSchema);
