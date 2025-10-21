const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const { authenticateToken, authorize, canAccessEmployee } = require('../middleware/auth');

const router = express.Router();

// Check in
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { location, ipAddress, deviceInfo } = req.body;

    console.log('Check-in attempt:', { userId, location, ipAddress, deviceInfo });
    console.log('User info:', { id: req.user._id, email: req.user.email, department: req.user.department });

    // Validate required fields
    if (!location || !ipAddress || !deviceInfo) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields: location, ipAddress, and deviceInfo are required' 
      });
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    console.log('Existing attendance check:', {
      found: !!existingAttendance,
      hasCheckIn: existingAttendance?.checkIn ? true : false,
      attendanceId: existingAttendance?._id
    });

    if (existingAttendance && existingAttendance.checkIn && existingAttendance.checkIn.time) {
      console.log('Already checked in today - returning 400');
      return res.status(400).json({ message: 'Already checked in today' });
    }

    // Check if it's a holiday - make it optional in case holiday check fails
    try {
      const isHoliday = await Holiday.isHoliday(today, req.user.department);
      console.log('Holiday check result:', isHoliday);
      if (isHoliday) {
        console.log('Holiday detected, blocking check-in');
        return res.status(400).json({ message: 'Cannot check in on a holiday' });
      }
    } catch (holidayError) {
      console.warn('Holiday check failed, proceeding with check-in:', holidayError.message);
    }

    let attendance;
    if (existingAttendance) {
      console.log('Updating existing attendance record');
      // Update existing record
      attendance = existingAttendance;
    } else {
      console.log('Creating new attendance record');
      // Create new record
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

    // Check if late - make this optional to avoid blocking check-in
    try {
      const user = await User.findById(userId);
      if (user && user.shift && user.shift.startTime) {
        const [hours, minutes] = user.shift.startTime.split(':');
        const shiftStartTime = new Date();
        shiftStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (attendance.checkIn.time > shiftStartTime) {
          attendance.isLate = true;
          attendance.lateMinutes = Math.floor((attendance.checkIn.time - shiftStartTime) / (1000 * 60));
        }
      }
    } catch (shiftError) {
      console.warn('Shift time calculation failed:', shiftError.message);
    }

    await attendance.save();

    console.log('Attendance saved successfully:', attendance);

    // Emit real-time update (optional, don't fail if io is not available)
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
    req.io.to('dashboard').emit('attendance-update', {
      type: 'checkout',
      employee: {
        id: req.user._id,
        name: req.user.fullName,
        employeeId: req.user.employeeId
      },
      time: attendance.checkOut.time
    });

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
    req.io.to('dashboard').emit('attendance-update', {
      type: 'break-end',
      employee: {
        id: req.user._id,
        name: req.user.fullName,
        employeeId: req.user.employeeId
      },
      time: activeBreak.endTime
    });

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
    debugger;
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
router.get('/dashboard/public', async (req, res) => {
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
    }).map(a => ({
      id: a.employee._id,
      name: `${a.employee.firstName} ${a.employee.lastName}`.trim(),
      employeeId: a.employee.employeeId,
      department: a.employee.department,
      breakType: (a.breaks.find(b => b.isActive && !b.endTime) || {}).breakType,
      startTime: (a.breaks.find(b => b.isActive && !b.endTime) || {}).startTime
    }));
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
router.get('/dashboard/overview', authenticateToken, async (req, res) => {
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
    }).map(a => ({
      id: a.employee._id,
      name: `${a.employee.firstName} ${a.employee.lastName}`.trim(),
      employeeId: a.employee.employeeId,
      department: a.employee.department,
      breakType: (a.breaks.find(b => b.isActive && !b.endTime) || {}).breakType,
      startTime: (a.breaks.find(b => b.isActive && !b.endTime) || {}).startTime
    }));
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
    const { employeeId, startDate, endDate, page = 1, limit = 30 } = req.query;
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
    } else if (user.role === 'manager') {
      query.employee = { $in: user.teamMembers };
    }

    // Apply date filters
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendances = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      attendances,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance history', error: error.message });
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
    const allowedUpdates = ['checkIn', 'checkOut', 'breaks', 'isLate', 'isEarlyLeave'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        attendance[field] = updateData[field];
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

module.exports = router;
