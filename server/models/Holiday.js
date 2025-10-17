const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['national', 'regional', 'company', 'religious', 'observance'],
    default: 'national'
  },
  description: {
    type: String,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['yearly', 'monthly', 'weekly'],
    required: function() {
      return this.isRecurring;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicableDepartments: [{
    type: String
  }],
  applicableLocations: [{
    type: String
  }],
  isPaid: {
    type: Boolean,
    default: true
  },
  workingHours: {
    type: Number,
    default: 0 // 0 means full day holiday
  }
}, {
  timestamps: true
});

// Index for better performance
holidaySchema.index({ date: 1 });
holidaySchema.index({ type: 1 });
holidaySchema.index({ isActive: 1 });

// Virtual for formatted date
holidaySchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Static method to get holidays for a date range
holidaySchema.statics.getHolidaysInRange = async function(startDate, endDate, departments = [], locations = []) {
  const query = {
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  };
  
  // Filter by departments if specified
  if (departments.length > 0) {
    query.$or = [
      { applicableDepartments: { $in: departments } },
      { applicableDepartments: { $size: 0 } } // Global holidays
    ];
  }
  
  // Filter by locations if specified
  if (locations.length > 0) {
    query.$or = [
      { applicableLocations: { $in: locations } },
      { applicableLocations: { $size: 0 } } // Global holidays
    ];
  }
  
  return await this.find(query).sort({ date: 1 });
};

// Static method to check if a date is a holiday
holidaySchema.statics.isHoliday = async function(date, department = null, location = null) {
  const query = {
    date: {
      $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    },
    isActive: true
  };
  
  if (department) {
    query.$or = [
      { applicableDepartments: { $in: [department] } },
      { applicableDepartments: { $size: 0 } }
    ];
  }
  
  if (location) {
    query.$or = [
      { applicableLocations: { $in: [location] } },
      { applicableLocations: { $size: 0 } }
    ];
  }
  
  const holiday = await this.findOne(query);
  return holiday;
};

// Static method to get upcoming holidays
holidaySchema.statics.getUpcomingHolidays = async function(limit = 10) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return await this.find({
    date: { $gte: today },
    isActive: true
  })
  .sort({ date: 1 })
  .limit(limit);
};

module.exports = mongoose.model('Holiday', holidaySchema);
