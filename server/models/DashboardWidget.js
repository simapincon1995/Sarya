const mongoose = require('mongoose');

const dashboardWidgetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['chart', 'table', 'metric', 'announcement', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  position: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    },
    width: {
      type: Number,
      default: 4
    },
    height: {
      type: Number,
      default: 3
    }
  },
  config: {
    chartType: {
      type: String,
      enum: ['bar', 'line', 'pie', 'doughnut', 'area']
    },
    dataSource: {
      type: String,
      enum: ['attendance', 'leaves', 'payroll', 'employees', 'custom']
    },
    refreshInterval: {
      type: Number,
      default: 30000 // 30 seconds
    },
    filters: {
      department: [String],
      dateRange: {
        start: Date,
        end: Date
      }
    }
  },
  data: {
    columns: [{
      name: String,
      type: {
        type: String,
        enum: ['string', 'number', 'date', 'boolean']
      },
      label: String
    }],
    rows: [mongoose.Schema.Types.Mixed]
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  permissions: {
    canView: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    canEdit: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}, {
  timestamps: true
});

// Index for better performance
dashboardWidgetSchema.index({ type: 1, isVisible: 1 });
dashboardWidgetSchema.index({ createdBy: 1 });
dashboardWidgetSchema.index({ isPublic: 1 });

// Method to update widget data
dashboardWidgetSchema.methods.updateData = function(newData) {
  this.data = newData;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to check if user can view widget
dashboardWidgetSchema.methods.canUserView = function(userId) {
  if (this.isPublic) return true;
  if (this.createdBy.toString() === userId.toString()) return true;
  return this.permissions.canView.some(id => id.toString() === userId.toString());
};

// Method to check if user can edit widget
dashboardWidgetSchema.methods.canUserEdit = function(userId) {
  if (this.createdBy.toString() === userId.toString()) return true;
  return this.permissions.canEdit.some(id => id.toString() === userId.toString());
};

// Static method to get widgets for dashboard
dashboardWidgetSchema.statics.getDashboardWidgets = async function(userId, isPublic = true) {
  const query = {
    isVisible: true
  };
  
  if (isPublic) {
    query.isPublic = true;
  } else {
    query.$or = [
      { isPublic: true },
      { createdBy: userId },
      { 'permissions.canView': userId }
    ];
  }
  
  return await this.find(query).sort({ position: 1 });
};

// Static method to create default widgets
dashboardWidgetSchema.statics.createDefaultWidgets = async function(createdBy) {
  const defaultWidgets = [
    {
      name: 'attendance-overview',
      type: 'metric',
      title: 'Today\'s Attendance',
      description: 'Overview of today\'s employee attendance',
      position: { x: 0, y: 0, width: 3, height: 2 },
      config: {
        dataSource: 'attendance',
        refreshInterval: 30000
      },
      isPublic: true,
      createdBy
    },
    {
      name: 'department-attendance',
      type: 'chart',
      title: 'Department Attendance',
      description: 'Attendance by department',
      position: { x: 3, y: 0, width: 4, height: 3 },
      config: {
        chartType: 'bar',
        dataSource: 'attendance',
        refreshInterval: 60000
      },
      isPublic: true,
      createdBy
    },
    {
      name: 'leave-requests',
      type: 'table',
      title: 'Pending Leave Requests',
      description: 'Leave requests awaiting approval',
      position: { x: 7, y: 0, width: 5, height: 4 },
      config: {
        dataSource: 'leaves',
        refreshInterval: 30000
      },
      isPublic: true,
      createdBy
    },
    {
      name: 'employee-status',
      type: 'chart',
      title: 'Employee Status',
      description: 'Current employee status distribution',
      position: { x: 0, y: 2, width: 6, height: 3 },
      config: {
        chartType: 'doughnut',
        dataSource: 'attendance',
        refreshInterval: 30000
      },
      isPublic: true,
      createdBy
    }
  ];
  
  for (const widgetData of defaultWidgets) {
    const existingWidget = await this.findOne({
      name: widgetData.name
    });
    
    if (!existingWidget) {
      const widget = new this(widgetData);
      await widget.save();
    }
  }
};

module.exports = mongoose.model('DashboardWidget', dashboardWidgetSchema);
