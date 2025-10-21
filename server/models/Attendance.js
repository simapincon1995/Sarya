const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkIn: {
    time: {
      type: Date,
      required: true
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    ipAddress: String,
    deviceInfo: String
  },
  checkOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    ipAddress: String,
    deviceInfo: String
  },
  breaks: [{
    breakType: {
      type: String,
      enum: ['lunch', 'tea', 'personal', 'other'],
      default: 'other'
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: Date,
    duration: Number,
    reason: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  totalWorkingHours: {
    type: Number,
    default: 0
  },
  totalBreakTime: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'late', 'on-leave'],
    default: 'present'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  overtime: {
    type: Number,
    default: 0
  },
  notes: String,
  activityNotes: [{
    type: {
      type: String,
      enum: ['Work', 'Break', 'Meeting', 'Training', 'Project', 'Other'],
      default: 'Work'
    },
    description: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: Date,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  isApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

attendanceSchema.index({ employee: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const checkInTime = new Date(this.checkIn.time);
    const checkOutTime = new Date(this.checkOut.time);
    const totalMinutes = (checkOutTime - checkInTime) / (1000 * 60);
    
    const breakTime = this.breaks.reduce((total, breakItem) => {
      if (breakItem.endTime) {
        const breakStart = new Date(breakItem.startTime);
        const breakEnd = new Date(breakItem.endTime);
        return total + (breakEnd - breakStart) / (1000 * 60);
      }
      return total;
    }, 0);
    
    this.totalWorkingHours = Math.max(0, totalMinutes - breakTime);
    this.totalBreakTime = breakTime;
  }
  next();
});

attendanceSchema.statics.getAttendanceSummary = async function(employeeId, startDate, endDate) {
  const attendance = await this.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate }
  }).populate('employee', 'firstName lastName employeeId');
  
  const summary = {
    totalDays: attendance.length,
    presentDays: attendance.filter(a => a.status === 'present').length,
    absentDays: attendance.filter(a => a.status === 'absent').length,
    lateDays: attendance.filter(a => a.isLate).length,
    totalWorkingHours: attendance.reduce((sum, a) => sum + a.totalWorkingHours, 0),
    averageWorkingHours: 0
  };
  
  if (summary.presentDays > 0) {
    summary.averageWorkingHours = summary.totalWorkingHours / summary.presentDays;
  }
  
  return summary;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
