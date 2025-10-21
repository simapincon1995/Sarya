const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'emergency', 'unpaid'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  rejectionReason: String,
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayType: {
    type: String,
    enum: ['first-half', 'second-half', 'morning', 'afternoon'],
    required: function() {
      return this.isHalfDay;
    }
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  workHandover: {
    type: String,
    trim: true
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better performance
leaveSchema.index({ employee: 1, startDate: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ leaveType: 1 });

// Virtual for leave duration
leaveSchema.virtual('duration').get(function() {
  if (this.isHalfDay) {
    return 0.5;
  }
  return this.totalDays;
});

// Validate dates before saving
leaveSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Map frontend halfDayPeriod to backend halfDayType
  if (this.isHalfDay && this.halfDayType) {
    if (this.halfDayType === 'morning') {
      this.halfDayType = 'first-half';
    } else if (this.halfDayType === 'afternoon') {
      this.halfDayType = 'second-half';
    }
  }
  
  // Calculate total days - ensure this runs even if totalDays is already set
  const timeDiff = this.endDate.getTime() - this.startDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  
  if (this.isHalfDay) {
    this.totalDays = 0.5;
  } else {
    this.totalDays = daysDiff;
  }
  
  // Ensure totalDays is always set
  if (!this.totalDays || this.totalDays <= 0) {
    this.totalDays = this.isHalfDay ? 0.5 : 1;
  }
  
  next();
});

// Static method to get leave balance
leaveSchema.statics.getLeaveBalance = async function(employeeId, year = new Date().getFullYear()) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  
  const leaves = await this.find({
    employee: employeeId,
    startDate: { $gte: startOfYear, $lte: endOfYear },
    status: 'approved'
  });
  
  const balance = {
    casual: 12, // Default casual leave balance
    sick: 7,    // Default sick leave balance
    earned: 21, // Default earned leave balance
    maternity: 90,
    paternity: 15,
    emergency: 3,
    unpaid: 0
  };
  
  leaves.forEach(leave => {
    if (balance[leave.leaveType] !== undefined) {
      balance[leave.leaveType] -= leave.totalDays;
    }
  });
  
  return balance;
};

// Static method to check leave conflicts
leaveSchema.statics.checkLeaveConflicts = async function(employeeId, startDate, endDate, excludeLeaveId = null) {
  const query = {
    employee: employeeId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  };
  
  if (excludeLeaveId) {
    query._id = { $ne: excludeLeaveId };
  }
  
  return await this.find(query);
};

module.exports = mongoose.model('Leave', leaveSchema);
