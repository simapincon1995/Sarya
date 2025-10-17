const express = require('express');
const DashboardWidget = require('../models/DashboardWidget');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { authenticateToken, canAccessDashboard, authorize } = require('../middleware/auth');

const router = express.Router();

// Get dashboard widgets
router.get('/widgets', authenticateToken, canAccessDashboard, async (req, res) => {
  try {
    const { isPublic = true } = req.query;
    const userId = req.user._id;

    const widgets = await DashboardWidget.getDashboardWidgets(userId, isPublic === 'true');

    res.json({ widgets });
  } catch (error) {
    console.error('Get dashboard widgets error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard widgets', error: error.message });
  }
});

// Create custom widget
router.post('/widgets', authenticateToken, canAccessDashboard, async (req, res) => {
  try {
    const {
      name,
      type,
      title,
      description,
      position,
      config,
      data,
      isPublic = false
    } = req.body;

    const createdBy = req.user._id;

    const widget = new DashboardWidget({
      name,
      type,
      title,
      description,
      position,
      config,
      data,
      isPublic,
      createdBy
    });

    await widget.save();

    // Emit real-time update
    req.io.to('dashboard').emit('widget-update', {
      type: 'new-widget',
      widget: {
        id: widget._id,
        name: widget.name,
        title: widget.title,
        type: widget.type
      }
    });

    res.status(201).json({
      message: 'Widget created successfully',
      widget: {
        id: widget._id,
        name: widget.name,
        title: widget.title,
        type: widget.type,
        position: widget.position
      }
    });
  } catch (error) {
    console.error('Create widget error:', error);
    res.status(500).json({ message: 'Failed to create widget', error: error.message });
  }
});

// Update widget
router.put('/widgets/:widgetId', authenticateToken, canAccessDashboard, async (req, res) => {
  try {
    const { widgetId } = req.params;
    const {
      title,
      description,
      position,
      config,
      data,
      isVisible,
      isPublic
    } = req.body;

    const widget = await DashboardWidget.findById(widgetId);

    if (!widget) {
      return res.status(404).json({ message: 'Widget not found' });
    }

    // Check permissions
    if (!widget.canUserEdit(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    if (title) widget.title = title;
    if (description) widget.description = description;
    if (position) widget.position = position;
    if (config) widget.config = config;
    if (data) widget.data = data;
    if (isVisible !== undefined) widget.isVisible = isVisible;
    if (isPublic !== undefined) widget.isPublic = isPublic;

    widget.lastUpdated = new Date();

    await widget.save();

    // Emit real-time update
    req.io.to('dashboard').emit('widget-update', {
      type: 'update-widget',
      widget: {
        id: widget._id,
        title: widget.title,
        position: widget.position,
        isVisible: widget.isVisible
      }
    });

    res.json({
      message: 'Widget updated successfully',
      widget: {
        id: widget._id,
        title: widget.title,
        position: widget.position,
        isVisible: widget.isVisible
      }
    });
  } catch (error) {
    console.error('Update widget error:', error);
    res.status(500).json({ message: 'Failed to update widget', error: error.message });
  }
});

// Delete widget
router.delete('/widgets/:widgetId', authenticateToken, canAccessDashboard, async (req, res) => {
  try {
    const { widgetId } = req.params;

    const widget = await DashboardWidget.findById(widgetId);

    if (!widget) {
      return res.status(404).json({ message: 'Widget not found' });
    }

    // Check permissions
    if (!widget.canUserEdit(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await DashboardWidget.findByIdAndDelete(widgetId);

    // Emit real-time update
    req.io.to('dashboard').emit('widget-update', {
      type: 'delete-widget',
      widgetId: widget._id
    });

    res.json({ message: 'Widget deleted successfully' });
  } catch (error) {
    console.error('Delete widget error:', error);
    res.status(500).json({ message: 'Failed to delete widget', error: error.message });
  }
});

// Update widget data
router.put('/widgets/:widgetId/data', authenticateToken, canAccessDashboard, async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { data } = req.body;

    const widget = await DashboardWidget.findById(widgetId);

    if (!widget) {
      return res.status(404).json({ message: 'Widget not found' });
    }

    // Check permissions
    if (!widget.canUserEdit(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await widget.updateData(data);

    // Emit real-time update
    req.io.to('dashboard').emit('widget-update', {
      type: 'data-update',
      widgetId: widget._id,
      data: widget.data
    });

    res.json({
      message: 'Widget data updated successfully',
      data: widget.data
    });
  } catch (error) {
    console.error('Update widget data error:', error);
    res.status(500).json({ message: 'Failed to update widget data', error: error.message });
  }
});

// Get dashboard overview data
router.get('/overview', authenticateToken, canAccessDashboard, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's attendance overview
    const attendanceOverview = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $group: {
          _id: null,
          totalCheckedIn: { $sum: 1 },
          totalLate: { $sum: { $cond: ['$isLate', 1, 0] } },
          totalOnBreak: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: '$breaks',
                          cond: { $and: ['$$this.isActive', { $not: '$$this.endTime' }] }
                        }
                      }
                    },
                    0
                  ]
                },
                1,
                0
              ]
            }
          },
          totalCheckedOut: {
            $sum: { $cond: ['$checkOut', 1, 0] }
          }
        }
      }
    ]);

    // Get total employees
    const totalEmployees = await User.countDocuments({ isActive: true, role: 'employee' });

    // Get pending leave requests
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

    // Get department-wise attendance
    const departmentAttendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $group: {
          _id: '$employee.department',
          present: { $sum: 1 },
          late: { $sum: { $cond: ['$isLate', 1, 0] } }
        }
      }
    ]);

    // Get recent activities
    const recentActivities = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true }
    })
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ 'checkIn.time': -1 })
      .limit(10);

    const overview = {
      attendance: {
        totalEmployees,
        checkedIn: attendanceOverview[0]?.totalCheckedIn || 0,
        checkedOut: attendanceOverview[0]?.totalCheckedOut || 0,
        onBreak: attendanceOverview[0]?.totalOnBreak || 0,
        late: attendanceOverview[0]?.totalLate || 0,
        absent: totalEmployees - (attendanceOverview[0]?.totalCheckedIn || 0)
      },
      pendingLeaves,
      departmentAttendance,
      recentActivities: recentActivities.map(activity => ({
        employee: activity.employee,
        checkIn: activity.checkIn.time,
        isLate: activity.isLate
      }))
    };

    res.json({ overview });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard overview', error: error.message });
  }
});

// Get chart data for widgets
router.get('/charts/:type', authenticateToken, canAccessDashboard, async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, department } = req.query;

    let chartData = {};

    switch (type) {
      case 'attendance-trend':
        chartData = await getAttendanceTrendData(startDate, endDate, department);
        break;
      case 'department-attendance':
        chartData = await getDepartmentAttendanceData(startDate, endDate);
        break;
      case 'leave-distribution':
        chartData = await getLeaveDistributionData(startDate, endDate);
        break;
      case 'employee-status':
        chartData = await getEmployeeStatusData();
        break;
      default:
        return res.status(400).json({ message: 'Invalid chart type' });
    }

    res.json({ chartData });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ message: 'Failed to fetch chart data', error: error.message });
  }
});

// Helper functions for chart data
async function getAttendanceTrendData(startDate, endDate, department) {
  const matchStage = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (department) {
    matchStage['employee.department'] = department;
  }

  return await Attendance.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    {
      $unwind: '$employee'
    },
    {
      $match: matchStage
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
        },
        present: { $sum: 1 },
        late: { $sum: { $cond: ['$isLate', 1, 0] } }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
}

async function getDepartmentAttendanceData(startDate, endDate) {
  return await Attendance.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    {
      $unwind: '$employee'
    },
    {
      $match: {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$employee.department',
        present: { $sum: 1 },
        late: { $sum: { $cond: ['$isLate', 1, 0] } }
      }
    }
  ]);
}

async function getLeaveDistributionData(startDate, endDate) {
  return await Leave.aggregate([
    {
      $match: {
        startDate: { $gte: new Date(startDate) },
        endDate: { $lte: new Date(endDate) },
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$leaveType',
        count: { $sum: 1 },
        totalDays: { $sum: '$totalDays' }
      }
    }
  ]);
}

async function getEmployeeStatusData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const statusData = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: today, $lt: tomorrow }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    {
      $unwind: '$employee'
    },
    {
      $group: {
        _id: {
          $cond: [
            { $gt: [{ $size: { $filter: { input: '$breaks', cond: { $and: ['$$this.isActive', { $not: '$$this.endTime' }] } } } }, 0] },
            'on-break',
            {
              $cond: ['$checkOut', 'checked-out', 'checked-in']
            }
          ]
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const totalEmployees = await User.countDocuments({ isActive: true, role: 'employee' });
  const checkedInCount = statusData.reduce((sum, item) => sum + item.count, 0);
  const absentCount = totalEmployees - checkedInCount;

  if (absentCount > 0) {
    statusData.push({ _id: 'absent', count: absentCount });
  }

  return statusData;
}

// Create default widgets
router.post('/create-defaults', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    await DashboardWidget.createDefaultWidgets(req.user._id);

    res.json({ message: 'Default widgets created successfully' });
  } catch (error) {
    console.error('Create default widgets error:', error);
    res.status(500).json({ message: 'Failed to create default widgets', error: error.message });
  }
});

module.exports = router;
