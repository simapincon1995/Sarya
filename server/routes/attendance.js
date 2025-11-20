const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const Organization = require('../models/Organization');
const HiddenAbsentRecord = require('../models/HiddenAbsentRecord');
const { authenticateToken, authorize, canAccessEmployee } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { cleanupOldAttendanceRecords, getRetentionDays } = require('../utils/attendanceCleanup');

const router = express.Router();

const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});

// Check in
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { location, ipAddress, deviceInfo } = req.body;

    if (!location || !ipAddress || !deviceInfo) {
      return res.status(400).json({ 
        message: 'Missing required fields: location, ipAddress, and deviceInfo are required' 
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance && existingAttendance.checkIn && existingAttendance.checkIn.time) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    try {
      const isHoliday = await Holiday.isHoliday(today, req.user.department);
      if (isHoliday) {
        return res.status(400).json({ message: 'Cannot check in on a holiday' });
      }
    } catch (holidayError) {
      console.warn('Holiday check failed, proceeding with check-in:', holidayError.message);
    }

    let attendance;
    if (existingAttendance) {
      attendance = existingAttendance;
    } else {
      attendance = new Attendance({
        employee: userId,
        date: today
      });
    }

    attendance.checkIn = {
      time: new Date(),
      location,
      ipAddress,
      deviceInfo
    };

    try {
      // Get organization work start time
      const orgSettings = await Organization.getSettings();
      const workStartTime = orgSettings.workingHours.start;
      
      if (workStartTime) {
        const [hours, minutes] = workStartTime.split(':');
        const workStartDateTime = new Date();
        workStartDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (attendance.checkIn.time > workStartDateTime) {
          attendance.isLate = true;
          attendance.lateMinutes = Math.floor((attendance.checkIn.time - workStartDateTime) / (1000 * 60));
          attendance.status = 'late';
        } else {
          attendance.status = 'present';
        }
      }
    } catch (workTimeError) {
      console.warn('Work time calculation failed:', workTimeError.message);
      // Fallback to present status if work time calculation fails
      attendance.status = 'present';
    }

    await attendance.save();

    try {
      if (req.io) {
        req.io.to('dashboard').emit('attendance-update', {
          type: 'checkin',
          employee: {
            id: req.user._id,
            name: req.user.fullName,
            employeeId: req.user.employeeId
          },
          time: attendance.checkIn.time
        });
      }
    } catch (ioError) {
      console.warn('Real-time update failed:', ioError.message);
    }

    res.json({
      message: 'Checked in successfully',
      attendance: {
        id: attendance._id,
        checkIn: attendance.checkIn,
        isLate: attendance.isLate,
        lateMinutes: attendance.lateMinutes
      }
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({ message: 'Check in failed', error: error.message });
  }
});

// Check out
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { location, ipAddress, deviceInfo } = req.body;

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance || !attendance.checkIn || !attendance.checkIn.time) {
      return res.status(400).json({ message: 'No check in found for today' });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    attendance.checkOut = {
      time: new Date(),
      location,
      ipAddress,
      deviceInfo
    };

    // Calculate overtime
    const user = await User.findById(userId);
    if (user.shift && user.shift.endTime) {
      const [hours, minutes] = user.shift.endTime.split(':');
      const shiftEndTime = new Date();
      shiftEndTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (attendance.checkOut.time > shiftEndTime) {
        attendance.overtime = Math.floor((attendance.checkOut.time - shiftEndTime) / (1000 * 60));
      }
    }

    await attendance.save();

    // Emit real-time update
    try {
      if (req.io) {
        req.io.to('dashboard').emit('attendance-update', {
          type: 'checkout',
          employee: {
            id: req.user._id,
            name: req.user.fullName,
            employeeId: req.user.employeeId
          },
          time: attendance.checkOut.time
        });
      }
    } catch (ioError) {
      console.warn('Real-time update failed:', ioError.message);
    }

    res.json({
      message: 'Checked out successfully',
      attendance: {
        id: attendance._id,
        checkOut: attendance.checkOut,
        totalWorkingHours: attendance.totalWorkingHours,
        overtime: attendance.overtime
      }
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({ message: 'Check out failed', error: error.message });
  }
});

// Start break
router.post('/break/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { breakType = 'other', reason } = req.body;

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance || !attendance.checkIn || !attendance.checkIn.time) {
      return res.status(400).json({ message: 'Must check in before taking a break' });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({ message: 'Cannot take break after checkout' });
    }

    // Check if there's an active break
    const activeBreak = attendance.breaks.find(breakItem => breakItem.isActive && !breakItem.endTime);
    if (activeBreak) {
      return res.status(400).json({ message: 'Already on a break' });
    }

    const newBreak = {
      breakType,
      startTime: new Date(),
      reason,
      isActive: true
    };

    attendance.breaks.push(newBreak);
    await attendance.save();

    // Emit real-time update
    try {
      if (req.io) {
        req.io.to('dashboard').emit('attendance-update', {
          type: 'break-start',
          employee: {
            id: req.user._id,
            name: req.user.fullName,
            employeeId: req.user.employeeId
          },
          breakType,
          time: newBreak.startTime
        });
      }
    } catch (ioError) {
      console.warn('Real-time update failed:', ioError.message);
    }

    res.json({
      message: 'Break started successfully',
      break: newBreak
    });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ message: 'Failed to start break', error: error.message });
  }
});

// End break
router.post('/break/end', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      return res.status(400).json({ message: 'No attendance record found' });
    }

    // Find active break
    const activeBreak = attendance.breaks.find(breakItem => breakItem.isActive && !breakItem.endTime);
    if (!activeBreak) {
      return res.status(400).json({ message: 'No active break found' });
    }

    activeBreak.endTime = new Date();
    activeBreak.duration = Math.floor((activeBreak.endTime - activeBreak.startTime) / (1000 * 60));
    activeBreak.isActive = false;

    await attendance.save();

    // Emit real-time update
    try {
      if (req.io) {
        req.io.to('dashboard').emit('attendance-update', {
          type: 'break-end',
          employee: {
            id: req.user._id,
            name: req.user.fullName,
            employeeId: req.user.employeeId
          },
          time: activeBreak.endTime
        });
      }
    } catch (ioError) {
      console.warn('Real-time update failed:', ioError.message);
    }

    res.json({
      message: 'Break ended successfully',
      break: activeBreak
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ message: 'Failed to end break', error: error.message });
  }
});

// Get attendance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const user = req.user;

    let query = {};

    // Check permissions
    if (employeeId) {
      if (user.role === 'employee' && user._id.toString() !== employeeId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (user.role === 'manager') {
        const employee = await User.findById(employeeId);
        if (!employee || !user.teamMembers.includes(employeeId)) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      query.employee = employeeId;
    } else if (user.role === 'employee') {
      query.employee = user._id;
    }

    // Date range filter
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      attendance,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
  }
});

// Get today's attendance status
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      return res.json({
        status: 'not-checked-in',
        message: 'Not checked in today',
        attendance: null,
        totalBreakTime: 0,
        totalWorkingHours: 0,
        totalLoginMinutes: 0
      });
    }

    const activeBreak = attendance.breaks.find(breakItem => breakItem.isActive && !breakItem.endTime);

    let status = 'not-checked-in';
    if (attendance.checkIn && attendance.checkIn.time) {
      if (attendance.checkOut && attendance.checkOut.time) {
        status = 'checked-out';
      } else if (activeBreak) {
        status = 'on-break';
      } else {
        status = 'checked-in';
      }
    }

    // Compute dynamic totals for widgets
    const now = new Date();
    const checkInTime = attendance.checkIn?.time ? new Date(attendance.checkIn.time) : null;
    const checkOutTime = attendance.checkOut?.time ? new Date(attendance.checkOut.time) : null;

    // Total login minutes = now - checkIn (or checkout - checkIn if checked out)
    let totalLoginMinutes = 0;
    if (checkInTime) {
      const endTime = checkOutTime || now;
      totalLoginMinutes = Math.max(0, Math.floor((endTime - checkInTime) / (1000 * 60)));
    }

    // Total break minutes = sum of completed breaks + ongoing break till now
    let totalBreakMinutes = 0;
    attendance.breaks.forEach(b => {
      const start = b.startTime ? new Date(b.startTime) : null;
      const end = b.endTime ? new Date(b.endTime) : null;
      if (start) {
        totalBreakMinutes += Math.max(0, Math.floor(((end || now) - start) / (1000 * 60)));
      }
    });

    const totalWorkingHours = Math.max(0, totalLoginMinutes - totalBreakMinutes);

    res.json({
      status,
      attendance: {
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        breaks: attendance.breaks,
        isLate: attendance.isLate,
        lateMinutes: attendance.lateMinutes,
        activeBreak
      },
      totalLoginMinutes,
      totalBreakTime: totalBreakMinutes,
      totalWorkingHours
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ message: 'Failed to fetch today\'s attendance', error: error.message });
  }
});

// Get attendance summary
router.get('/summary/:employeeId', authenticateToken, canAccessEmployee, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const summary = await Attendance.getAttendanceSummary(employeeId, start, end);

    res.json({ summary });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance summary', error: error.message });
  }
});

// Get public dashboard attendance data (no auth required)
router.get('/dashboard/public', dashboardLimiter, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's attendance
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      employee: { $ne: null } // Filter out records with null employee references
    }).populate('employee', 'firstName lastName employeeId department');

    // Get total employees (including all roles: employee, manager, hr_admin, admin)
    const totalEmployees = await User.countDocuments({ 
      isActive: true, 
      role: { $in: ['employee', 'manager', 'hr_admin', 'admin'] }
    });

    // Calculate statistics
    const checkedIn = todayAttendance.filter(a => a.checkIn && !a.checkOut).length;
    const checkedOut = todayAttendance.filter(a => a.checkOut).length;
    const presentToday = checkedIn + checkedOut; // Total present today
    
    const onBreakEmployees = todayAttendance.filter(a => {
      if (!a.employee) return false; // Skip if employee is null
      const activeBreak = a.breaks.find(breakItem => breakItem.isActive && !breakItem.endTime);
      return !!activeBreak;
    }).map(a => {
      const activeBreak = a.breaks.find(b => b.isActive && !b.endTime) || {};
      
      // Calculate total break duration for the day
      let totalBreakDurationMs = 0;
      
      // Sum all completed breaks
      a.breaks.forEach(breakItem => {
        if (breakItem.endTime) {
          // Completed break - use duration if available, otherwise calculate
          if (breakItem.duration) {
            totalBreakDurationMs += breakItem.duration * 60000; // Convert minutes to ms
          } else {
            const start = new Date(breakItem.startTime);
            const end = new Date(breakItem.endTime);
            totalBreakDurationMs += (end - start);
          }
        }
      });
      
      // Add current active break duration (if any)
      if (activeBreak.startTime) {
        const activeBreakStart = new Date(activeBreak.startTime);
        const now = new Date();
        totalBreakDurationMs += (now - activeBreakStart);
      }
      
      return {
        id: a.employee._id,
        name: `${a.employee.firstName} ${a.employee.lastName}`.trim(),
        employeeId: a.employee.employeeId,
        department: a.employee.department,
        breakType: activeBreak.breakType,
        startTime: activeBreak.startTime,
        allBreaks: a.breaks, // Include all breaks for reference
        totalBreakDurationMs: Math.floor(totalBreakDurationMs / 1000 / 60) // Total in minutes
      };
    });
    const onBreak = onBreakEmployees.length;
    const late = todayAttendance.filter(a => a.isLate).length;

    // Calculate absent (non-negative)
    const absent = Math.max(0, totalEmployees - presentToday);

    // Department-wise attendance
    const departmentStats = {};
    todayAttendance.forEach(attendance => {
      // Check if employee exists and has department
      if (!attendance.employee || !attendance.employee.department) {
        console.warn('Attendance record found with missing employee or department:', attendance._id);
        return; // Skip this record
      }
      const dept = attendance.employee.department;
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, present: 0, late: 0 };
      }
      departmentStats[dept].total++;
      if (attendance.checkIn) {
        departmentStats[dept].present++;
        if (attendance.isLate) {
          departmentStats[dept].late++;
        }
      }
    });

    res.json({
      overview: {
        totalEmployees,
        presentToday,
        checkedIn,
        checkedOut,
        onBreak,
        late,
        absent
      },
      departmentStats,
      recentActivity: todayAttendance
        .filter(a => a.checkIn)
        .sort((a, b) => new Date(b.checkIn.time) - new Date(a.checkIn.time))
        .slice(0, 10)
        .map(a => ({
          employee: a.employee,
          checkIn: a.checkIn.time,
          isLate: a.isLate
        })),
      onBreakEmployees
    });
  } catch (error) {
    console.error('Get public dashboard overview error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard overview', error: error.message });
  }
});

// Get dashboard attendance data
router.get('/dashboard/overview', authenticateToken, dashboardLimiter, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's attendance
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      employee: { $ne: null } // Filter out records with null employee references
    }).populate('employee', 'firstName lastName employeeId department');

    // Get total employees (including all roles: employee, manager, hr_admin, admin)
    const totalEmployees = await User.countDocuments({ 
      isActive: true, 
      role: { $in: ['employee', 'manager', 'hr_admin', 'admin'] }
    });

    // Calculate statistics
    const checkedIn = todayAttendance.filter(a => a.checkIn && !a.checkOut).length;
    const checkedOut = todayAttendance.filter(a => a.checkOut).length;
    const presentToday = checkedIn + checkedOut; // Total present today
    
    const onBreakEmployees = todayAttendance.filter(a => {
      if (!a.employee) return false; // Skip if employee is null
      const activeBreak = a.breaks.find(breakItem => breakItem.isActive && !breakItem.endTime);
      return !!activeBreak;
    }).map(a => {
      const activeBreak = a.breaks.find(b => b.isActive && !b.endTime) || {};
      
      // Calculate total break duration for the day
      let totalBreakDurationMs = 0;
      
      // Sum all completed breaks
      a.breaks.forEach(breakItem => {
        if (breakItem.endTime) {
          // Completed break - use duration if available, otherwise calculate
          if (breakItem.duration) {
            totalBreakDurationMs += breakItem.duration * 60000; // Convert minutes to ms
          } else {
            const start = new Date(breakItem.startTime);
            const end = new Date(breakItem.endTime);
            totalBreakDurationMs += (end - start);
          }
        }
      });
      
      // Add current active break duration (if any)
      if (activeBreak.startTime) {
        const activeBreakStart = new Date(activeBreak.startTime);
        const now = new Date();
        totalBreakDurationMs += (now - activeBreakStart);
      }
      
      return {
        id: a.employee._id,
        name: `${a.employee.firstName} ${a.employee.lastName}`.trim(),
        employeeId: a.employee.employeeId,
        department: a.employee.department,
        breakType: activeBreak.breakType,
        startTime: activeBreak.startTime,
        allBreaks: a.breaks, // Include all breaks for reference
        totalBreakDurationMs: Math.floor(totalBreakDurationMs / 1000 / 60) // Total in minutes
      };
    });
    const onBreak = onBreakEmployees.length;
    const late = todayAttendance.filter(a => a.isLate).length;

    // Calculate absent (non-negative)
    const absent = Math.max(0, totalEmployees - presentToday);

    // Department-wise attendance
    const departmentStats = {};
    todayAttendance.forEach(attendance => {
      // Check if employee exists and has department
      if (!attendance.employee || !attendance.employee.department) {
        console.warn('Attendance record found with missing employee or department:', attendance._id);
        return; // Skip this record
      }
      const dept = attendance.employee.department;
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, present: 0, late: 0 };
      }
      departmentStats[dept].total++;
      if (attendance.checkIn) {
        departmentStats[dept].present++;
        if (attendance.isLate) {
          departmentStats[dept].late++;
        }
      }
    });

    res.json({
      overview: {
        totalEmployees,
        presentToday,
        checkedIn,
        checkedOut,
        onBreak,
        late,
        absent
      },
      departmentStats,
      recentActivity: todayAttendance
        .filter(a => a.checkIn)
        .sort((a, b) => new Date(b.checkIn.time) - new Date(a.checkIn.time))
        .slice(0, 10)
        .map(a => ({
          employee: a.employee,
          checkIn: a.checkIn.time,
          isLate: a.isLate
        })),
      onBreakEmployees
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard overview', error: error.message });
  }
});

// Get attendance history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit } = req.query;
    const user = req.user;

    // Determine which employees to include based on permissions
    let employeeQuery = { isActive: true, role: { $in: ['employee', 'manager', 'hr_admin', 'admin'] } };
    let employeeIds = [];

    // Check permissions and build employee query
    if (employeeId) {
      if (user.role === 'employee' && user._id.toString() !== employeeId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (user.role === 'manager') {
        const employee = await User.findById(employeeId);
        if (!employee || !user.teamMembers.includes(employeeId)) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      employeeIds = [employeeId];
    } else if (user.role === 'employee') {
      employeeIds = [user._id];
    } else if (user.role === 'manager') {
      employeeIds = user.teamMembers || [];
    } else {
      // Admin or HR Admin - get all employees
      const allEmployees = await User.find(employeeQuery).select('_id');
      employeeIds = allEmployees.map(emp => emp._id);
    }

    if (employeeIds.length === 0) {
      return res.json({
        attendances: [],
        totalPages: 0,
        currentPage: page,
        total: 0
      });
    }

    // Build date range
    let dateStart, dateEnd;
    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);
    } else {
      // Default to retention days if no date range provided (matches retention policy)
      const retentionDays = getRetentionDays();
      dateEnd = new Date();
      dateEnd.setHours(23, 59, 59, 999);
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - retentionDays);
      dateStart.setHours(0, 0, 0, 0);
    }

    // Get all attendance records for the date range and employees
    const attendanceQuery = {
      employee: { $in: employeeIds },
      date: { $gte: dateStart, $lte: dateEnd }
    };

    const existingAttendances = await Attendance.find(attendanceQuery)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1, employee: 1 });

    // Get all employees with their details
    const employees = await User.find({ _id: { $in: employeeIds } })
      .select('firstName lastName employeeId department');

    // Get hidden absent records for the date range and employees
    const hiddenAbsentRecords = await HiddenAbsentRecord.find({
      employee: { $in: employeeIds },
      date: { $gte: dateStart, $lte: dateEnd }
    });

    // Create a map of hidden absent records by employee and date
    const hiddenMap = new Map();
    hiddenAbsentRecords.forEach(hidden => {
      const dateKey = hidden.date.toISOString().split('T')[0];
      const key = `${hidden.employee}_${dateKey}`;
      hiddenMap.set(key, true);
    });

    // Create a map of existing attendances by employee and date
    const attendanceMap = new Map();
    existingAttendances.forEach(att => {
      const dateKey = att.date.toISOString().split('T')[0];
      const key = `${att.employee._id}_${dateKey}`;
      attendanceMap.set(key, att);
    });

    // Generate all date-employee combinations
    const allRecords = [];
    const currentDate = new Date(dateStart);
    
    while (currentDate <= dateEnd) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dateForRecord = new Date(currentDate); // Create a new date object for each record
      dateForRecord.setHours(0, 0, 0, 0); // Normalize to start of day
      
      for (const employee of employees) {
        const key = `${employee._id}_${dateKey}`;
        const existingAttendance = attendanceMap.get(key);
        const isHidden = hiddenMap.get(key);
        
        if (existingAttendance) {
          // Use existing attendance record
          allRecords.push(existingAttendance);
        } else if (!isHidden) {
          // Create absent record placeholder only if not hidden
          const absentRecord = {
            _id: null, // No database ID for absent records
            employee: {
              _id: employee._id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              employeeId: employee.employeeId,
              department: employee.department
            },
            date: dateForRecord,
            checkIn: null,
            checkOut: null,
            breaks: [],
            totalWorkingHours: 0,
            totalBreakTime: 0,
            status: 'absent',
            isLate: false,
            lateMinutes: 0,
            overtime: 0,
            notes: null,
            isAbsent: true // Flag to identify absent records
          };
          allRecords.push(absentRecord);
        }
        // If isHidden is true, skip adding this absent record
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by date (descending) and then by employee name
    allRecords.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      const nameA = `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`.toLowerCase();
      const nameB = `${b.employee?.firstName || ''} ${b.employee?.lastName || ''}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Apply pagination only if limit is specified
    const total = allRecords.length;
    let paginatedRecords = allRecords;
    let totalPages = 1;
    
    if (limit && parseInt(limit) > 0) {
      const limitNum = parseInt(limit);
      paginatedRecords = allRecords.slice((page - 1) * limitNum, page * limitNum);
      totalPages = Math.ceil(total / limitNum);
    }

    res.json({
      attendances: paginatedRecords,
      totalPages: totalPages,
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance history', error: error.message });
  }
});

// Create attendance record manually (for absent employees)
router.post('/create', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status } = req.body;
    const user = req.user;

    if (!employeeId || !date) {
      return res.status(400).json({ message: 'Employee ID and date are required' });
    }

    // Check permissions for managers
    if (user.role === 'manager') {
      const employee = await User.findById(employeeId);
      if (!employee || !user.teamMembers.includes(employeeId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Check if record already exists
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const tomorrow = new Date(dateObj);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: dateObj, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance record already exists for this date' });
    }

    // Create new attendance record
    const attendance = new Attendance({
      employee: employeeId,
      date: dateObj,
      checkIn: checkIn ? {
        time: new Date(checkIn.time),
        location: checkIn.location,
        ipAddress: checkIn.ipAddress,
        deviceInfo: checkIn.deviceInfo
      } : undefined,
      checkOut: checkOut ? {
        time: new Date(checkOut.time),
        location: checkOut.location,
        ipAddress: checkOut.ipAddress,
        deviceInfo: checkOut.deviceInfo
      } : undefined,
      status: status || 'present'
    });

    await attendance.save();
    await attendance.populate('employee', 'firstName lastName employeeId department');

    res.json({
      message: 'Attendance record created successfully',
      attendance
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ message: 'Failed to create attendance', error: error.message });
  }
});

// Update attendance record
router.put('/:attendanceId', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const updateData = req.body;
    const user = req.user;

    const attendance = await Attendance.findById(attendanceId).populate('employee');

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Check permissions for managers
    if (user.role === 'manager' && attendance.employee && !user.teamMembers.includes(attendance.employee._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update allowed fields
    const allowedUpdates = ['checkIn', 'checkOut', 'breaks', 'isLate', 'isEarlyLeave', 'status'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'checkIn' || field === 'checkOut') {
          // Handle nested objects
          if (updateData[field] && updateData[field].time) {
            attendance[field] = {
              ...attendance[field],
              time: new Date(updateData[field].time),
              location: updateData[field].location || attendance[field]?.location,
              ipAddress: updateData[field].ipAddress || attendance[field]?.ipAddress,
              deviceInfo: updateData[field].deviceInfo || attendance[field]?.deviceInfo
            };
          } else if (updateData[field] === null) {
            attendance[field] = undefined;
          }
        } else {
          attendance[field] = updateData[field];
        }
      }
    });

    await attendance.save();

    res.json({
      message: 'Attendance updated successfully',
      attendance
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ message: 'Failed to update attendance', error: error.message });
  }
});

// Delete attendance record
router.delete('/:attendanceId', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { attendanceId } = req.params;

    const attendance = await Attendance.findById(attendanceId);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    await Attendance.findByIdAndDelete(attendanceId);

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ message: 'Failed to delete attendance record', error: error.message });
  }
});

// Add activity note
router.post('/activity-note', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, description, startTime, endTime } = req.body;

    // Get today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found for today' });
    }

    // Add activity note to the attendance record
    if (!attendance.activityNotes) {
      attendance.activityNotes = [];
    }

    const activityNote = {
      type,
      description,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : null,
      timestamp: new Date()
    };

    attendance.activityNotes.push(activityNote);
    await attendance.save();

    res.json({
      message: 'Activity note added successfully',
      activityNote: activityNote
    });
  } catch (error) {
    console.error('Add activity note error:', error);
    res.status(500).json({ message: 'Failed to add activity note', error: error.message });
  }
});

// Update activity note
router.put('/activity-note/:noteId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { noteId } = req.params;
    const { type, description, startTime, endTime } = req.body;

    // Get today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance || !attendance.activityNotes) {
      return res.status(404).json({ message: 'Activity note not found' });
    }

    const noteIndex = attendance.activityNotes.findIndex(note => note._id.toString() === noteId);
    if (noteIndex === -1) {
      return res.status(404).json({ message: 'Activity note not found' });
    }

    // Update the activity note
    attendance.activityNotes[noteIndex] = {
      ...attendance.activityNotes[noteIndex],
      type,
      description,
      startTime: startTime ? new Date(startTime) : attendance.activityNotes[noteIndex].startTime,
      endTime: endTime ? new Date(endTime) : attendance.activityNotes[noteIndex].endTime,
      updatedAt: new Date()
    };

    await attendance.save();

    res.json({
      message: 'Activity note updated successfully',
      activityNote: attendance.activityNotes[noteIndex]
    });
  } catch (error) {
    console.error('Update activity note error:', error);
    res.status(500).json({ message: 'Failed to update activity note', error: error.message });
  }
});

// Manual cleanup of old attendance records (Admin/HR Admin only)
router.post('/cleanup', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const result = await cleanupOldAttendanceRecords();
    
    if (result.success) {
      res.json({
        message: 'Cleanup completed successfully',
        deletedCount: result.deletedCount,
        cutoffDate: result.cutoffDate,
        retentionDays: result.retentionDays
      });
    } else {
      res.status(500).json({
        message: 'Cleanup failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Manual cleanup error:', error);
    res.status(500).json({ message: 'Failed to run cleanup', error: error.message });
  }
});

// Hide/Delete absent employee record (Admin/HR Admin only)
router.post('/hide-absent', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { employeeId, date, reason } = req.body;
    const userId = req.user._id;

    if (!employeeId || !date) {
      return res.status(400).json({ message: 'Employee ID and date are required' });
    }

    // Verify employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Normalize date to start of day
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Check if there's an actual attendance record (shouldn't hide if record exists)
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (attendance) {
      return res.status(400).json({ message: 'Cannot hide absent record - attendance record exists for this date' });
    }

    // Create or update hidden absent record
    const hiddenRecord = await HiddenAbsentRecord.findOneAndUpdate(
      {
        employee: employeeId,
        date: dateObj
      },
      {
        employee: employeeId,
        date: dateObj,
        hiddenBy: userId,
        hiddenAt: new Date(),
        reason: reason || null
      },
      {
        upsert: true,
        new: true
      }
    ).populate('employee', 'firstName lastName employeeId');

    res.json({
      message: 'Absent record hidden successfully',
      hiddenRecord: {
        id: hiddenRecord._id,
        employee: hiddenRecord.employee,
        date: hiddenRecord.date,
        hiddenAt: hiddenRecord.hiddenAt
      }
    });
  } catch (error) {
    console.error('Hide absent record error:', error);
    res.status(500).json({ message: 'Failed to hide absent record', error: error.message });
  }
});

// Unhide absent employee record (Admin/HR Admin only)
router.delete('/hide-absent/:employeeId/:date', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { employeeId, date } = req.params;

    // Normalize date to start of day
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const hiddenRecord = await HiddenAbsentRecord.findOneAndDelete({
      employee: employeeId,
      date: dateObj
    });

    if (!hiddenRecord) {
      return res.status(404).json({ message: 'Hidden absent record not found' });
    }

    res.json({
      message: 'Absent record unhidden successfully'
    });
  } catch (error) {
    console.error('Unhide absent record error:', error);
    res.status(500).json({ message: 'Failed to unhide absent record', error: error.message });
  }
});

module.exports = router;
