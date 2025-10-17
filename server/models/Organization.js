const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      required: true
    },
    language: {
      type: String,
      default: 'en',
      required: true
    },
    currency: {
      type: String,
      default: 'INR',
      required: true
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
      required: true
    },
    timeFormat: {
      type: String,
      default: 'HH:mm',
      required: true
    },
    workingDays: {
      type: [String],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '18:00'
      }
    },
    breakDuration: {
      type: Number,
      default: 60 // in minutes
    },
    leaveSettings: {
      casualLeave: {
        type: Number,
        default: 12
      },
      sickLeave: {
        type: Number,
        default: 7
      },
      earnedLeave: {
        type: Number,
        default: 21
      },
      maternityLeave: {
        type: Number,
        default: 90
      },
      paternityLeave: {
        type: Number,
        default: 15
      }
    },
    payrollSettings: {
      payDay: {
        type: Number,
        default: 1 // 1st of every month
      },
      overtimeRate: {
        type: Number,
        default: 1.5
      },
      taxSettings: {
        enabled: {
          type: Boolean,
          default: true
        },
        rate: {
          type: Number,
          default: 0.1 // 10%
        }
      }
    }
  },
  contact: {
    email: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    website: {
      type: String,
      trim: true
    }
  },
  logo: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better performance (code already has unique index)
organizationSchema.index({ isActive: 1 });

// Static method to get organization settings
organizationSchema.statics.getSettings = async function() {
  const org = await this.findOne({ isActive: true });
  return org ? org.settings : {
    timezone: 'Asia/Kolkata',
    language: 'en',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHours: { start: '09:00', end: '18:00' },
    breakDuration: 60,
    leaveSettings: {
      casualLeave: 12,
      sickLeave: 7,
      earnedLeave: 21,
      maternityLeave: 90,
      paternityLeave: 15
    },
    payrollSettings: {
      payDay: 1,
      overtimeRate: 1.5,
      taxSettings: { enabled: true, rate: 0.1 }
    }
  };
};

// Static method to update organization settings
organizationSchema.statics.updateSettings = async function(settings, updatedBy) {
  let org = await this.findOne({ isActive: true });
  
  if (!org) {
    // Create default organization if none exists
    org = new this({
      name: 'Default Organization',
      code: 'DEFAULT',
      description: 'Default organization',
      settings: settings,
      createdBy: updatedBy
    });
  } else {
    org.settings = { ...org.settings, ...settings };
  }
  
  await org.save();
  return org;
};

module.exports = mongoose.model('Organization', organizationSchema);
