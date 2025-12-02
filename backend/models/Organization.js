const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

const organizationSchema = new mongoose.Schema({
  orgId: {
    type: String,
    required: true,
    unique: true,
    default: ORG_CONFIG.ID,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    default: ORG_CONFIG.NAME,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'organizations'
});

// Ensure VBT organization exists
organizationSchema.statics.ensureVBTExists = async function() {
  try {
    let vbtOrg = await this.findOne({ orgId: ORG_CONFIG.ID });
    
    if (!vbtOrg) {
      vbtOrg = new this({
        orgId: ORG_CONFIG.ID,
        name: ORG_CONFIG.NAME,
        isActive: true
      });
      await vbtOrg.save();
      console.log('✅ VBT organization created');
    }
    
    return vbtOrg;
  } catch (error) {
    console.error('❌ Error ensuring VBT organization exists:', error);
    throw error;
  }
};

module.exports = mongoose.model('Organization', organizationSchema);
