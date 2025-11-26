const express = require('express');
const Leave = require('../models/Leave');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const Template = require('../models/Template');
const { authenticateToken, authorize, canAccessEmployee } = require('../middleware/auth');
const { formatDate } = require('../utils/documentUtils');

const router = express.Router();

// Apply for leave
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      isHalfDay,
      halfDayType,
      halfDayPeriod, // Support both field names for compatibility
      emergencyContact,
      workHandover
    } = req.body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Missing required fields: leaveType, startDate, endDate, reason' });
    }

    const employeeId = req.user._id;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({ message: 'Cannot apply for leave in the past' });
    }

    // Check for leave conflicts
    const conflicts = await Leave.checkLeaveConflicts(employeeId, start, end);
    if (conflicts.length > 0) {
      return res.status(400).json({ 
        message: 'Leave conflicts with existing approved/pending leaves',
        conflicts: conflicts.map(c => ({
          id: c._id,
          startDate: c.startDate,
          endDate: c.endDate,
          status: c.status
        }))
      });
    }

    // Check if dates fall on holidays
    const holidays = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const holiday = await Holiday.isHoliday(d, req.user.department);
      if (holiday) {
        holidays.push(holiday);
      }
    }

    // Handle half day type compatibility
    const finalHalfDayType = halfDayType || halfDayPeriod;
    
    // Calculate total days as a fallback
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    const calculatedTotalDays = isHalfDay ? 0.5 : daysDiff;
    
    console.log('Leave application data:', {
      startDate: start,
      endDate: end,
      isHalfDay,
      calculatedTotalDays,
      timeDiff,
      daysDiff
    });
    
    const leave = new Leave({
      employee: employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      isHalfDay,
      halfDayType: finalHalfDayType,
      totalDays: calculatedTotalDays, // Explicitly set totalDays
      emergencyContact,
      workHandover
    });

    await leave.save();

    // Emit real-time update
    try {
      if (req.io) {
        req.io.to('dashboard').emit('leave-update', {
          type: 'new-application',
          leave: {
            id: leave._id,
            employee: req.user.fullName,
            leaveType,
            startDate,
            endDate,
            status: 'pending'
          }
        });
      }
    } catch (ioError) {
      console.warn('Real-time update failed:', ioError.message);
    }

    res.status(201).json({
      message: 'Leave application submitted successfully',
      leave: {
        id: leave._id,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        status: leave.status,
        appliedDate: leave.appliedDate
      },
      holidays: holidays.length > 0 ? holidays : undefined
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ message: 'Failed to apply for leave', error: error.message });
  }
});

// Get leave applications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, status, leaveType, startDate, endDate, page = 1, limit = 10, tab } = req.query;
    const user = req.user;

    // For managers, HR admins, and admins, support tab-based filtering
    const isManagerOrAdmin = ['manager', 'hr_admin', 'admin'].includes(user.role);
    const showOwnLeaves = tab === 'own' || (!tab && !isManagerOrAdmin);
    const showReporteeLeaves = tab === 'reportees' && isManagerOrAdmin;

    let query = {};
    let ownLeaves = [];
    let reporteeLeaves = [];

    // Check permissions and set query
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
    } else if (isManagerOrAdmin) {
      // For managers/admins, fetch both own and reportee leaves separately
      // Always fetch own leaves if showing own tab or no tab specified
      if (showOwnLeaves || !tab) {
        const ownQuery = { employee: user._id };
        if (status) ownQuery.status = status;
        if (leaveType) ownQuery.leaveType = leaveType;
        if (startDate && endDate) {
          ownQuery.$or = [
            { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
            { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
            { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
          ];
        }
        // Remove pagination limit if limit is very large (10000)
        const ownQueryExec = Leave.find(ownQuery)
          .populate('employee', 'firstName lastName employeeId department')
          .populate('approvedBy', 'firstName lastName employeeId')
          .sort({ appliedDate: -1 });
        
        if (limit && limit < 10000) {
          ownQueryExec.limit(limit * 1).skip((page - 1) * limit);
        }
        
        ownLeaves = await ownQueryExec;
      }

      // Always fetch reportee leaves if showing reportee tab or no tab specified
      let reporteeQuery = {};
      if (showReporteeLeaves || !tab) {
        if (user.role === 'manager') {
          reporteeQuery.employee = { $in: user.teamMembers || [] };
        } else {
          // HR Admin and Admin can see all employees' leaves
          reporteeQuery.employee = { $ne: user._id }; // Exclude own leaves
        }
        
        if (status) reporteeQuery.status = status;
        if (leaveType) reporteeQuery.leaveType = leaveType;
        if (startDate && endDate) {
          reporteeQuery.$or = [
            { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
            { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
            { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
          ];
        }
        
        // Remove pagination limit if limit is very large (10000)
        const reporteeQueryExec = Leave.find(reporteeQuery)
          .populate('employee', 'firstName lastName employeeId department')
          .populate('approvedBy', 'firstName lastName employeeId')
          .sort({ appliedDate: -1 });
        
        if (limit && limit < 10000) {
          reporteeQueryExec.limit(limit * 1).skip((page - 1) * limit);
        }
        
        reporteeLeaves = await reporteeQueryExec;
      }

      // Return both sets if no tab specified, or the requested tab
      const leaves = showOwnLeaves ? ownLeaves : (showReporteeLeaves ? reporteeLeaves : [...ownLeaves, ...reporteeLeaves]);
      
      // Calculate totals
      const ownQueryForCount = { employee: user._id };
      if (status) ownQueryForCount.status = status;
      if (leaveType) ownQueryForCount.leaveType = leaveType;
      const totalOwn = await Leave.countDocuments(ownQueryForCount);
      
      const reporteeQueryForCount = {};
      if (user.role === 'manager') {
        reporteeQueryForCount.employee = { $in: user.teamMembers || [] };
      } else {
        reporteeQueryForCount.employee = { $ne: user._id };
      }
      if (status) reporteeQueryForCount.status = status;
      if (leaveType) reporteeQueryForCount.leaveType = leaveType;
      const totalReportees = await Leave.countDocuments(reporteeQueryForCount);
      
      const total = showOwnLeaves ? totalOwn : (showReporteeLeaves ? totalReportees : totalOwn + totalReportees);

      return res.json({
        leaves,
        ownLeaves: showOwnLeaves || !tab ? ownLeaves : [],
        reporteeLeaves: showReporteeLeaves || !tab ? reporteeLeaves : [],
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
        hasTabs: true
      });
    } else {
      // Regular employee - just their own leaves
      query.employee = user._id;
    }

    // Apply filters for regular query
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (startDate && endDate) {
      query.$or = [
        {
          startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        },
        {
          endDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        },
        {
          startDate: { $lte: new Date(startDate) },
          endDate: { $gte: new Date(endDate) }
        }
      ];
    }

    // Remove pagination limit if limit is very large (10000)
    const leavesQuery = Leave.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ appliedDate: -1 });
    
    if (limit && limit < 10000) {
      leavesQuery.limit(limit * 1).skip((page - 1) * limit);
    }
    
    const leaves = await leavesQuery;

    const total = await Leave.countDocuments(query);

    res.json({
      leaves,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasTabs: false
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ message: 'Failed to fetch leaves', error: error.message });
  }
});

// Get leave by ID
router.get('/:leaveId', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const user = req.user;

    const leave = await Leave.findById(leaveId)
      .populate('employee', 'firstName lastName employeeId department email phone')
      .populate('approvedBy', 'firstName lastName employeeId')
      .populate('comments.user', 'firstName lastName employeeId');

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    // Check permissions
    if (user.role === 'employee' && leave.employee._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.role === 'manager' && !user.teamMembers.includes(leave.employee._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ leave });
  } catch (error) {
    console.error('Get leave error:', error);
    res.status(500).json({ message: 'Failed to fetch leave', error: error.message });
  }
});

// Approve/Reject leave
router.put('/:leaveId/approve', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, rejectionReason } = req.body;
    const user = req.user;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected' });
    }

    const leave = await Leave.findById(leaveId).populate('employee');

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    // Check permissions
    if (user.role === 'manager') {
      if (!user.teamMembers.includes(leave.employee._id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Leave has already been processed' });
    }

    leave.status = status;
    leave.approvedBy = user._id;
    leave.approvedDate = new Date();

    if (status === 'rejected' && rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }

    await leave.save();

    // Generate approval/rejection letter
    let letterContent = null;
    try {
      const templateType = status === 'approved' ? 'leave_approval' : 'leave_rejection';
      const template = await Template.findOne({ type: templateType, isDefault: true });

      if (template) {
        const templateData = {
          employeeName: leave.employee.fullName,
          leaveType: leave.leaveType,
          startDate: formatDate(leave.startDate, 'DD MMMM YYYY'),
          endDate: formatDate(leave.endDate, 'DD MMMM YYYY'),
          totalDays: leave.totalDays.toString(),
          reason: leave.reason,
          approverName: user.fullName,
          approverRemarks: leave.approverRemarks || 'N/A'
        };

        if (status === 'approved') {
          templateData.approvalDate = formatDate(new Date(), 'DD MMMM YYYY');
        } else {
          templateData.rejectionReason = leave.rejectionReason || 'Not specified';
          templateData.rejectionDate = formatDate(new Date(), 'DD MMMM YYYY');
        }

        letterContent = template.render(templateData);
      }
    } catch (templateError) {
      console.error('Error generating leave letter:', templateError);
      // Don't fail the request if letter generation fails
    }

    // Emit real-time update
    try {
      if (req.io) {
        req.io.to('dashboard').emit('leave-update', {
          type: 'status-change',
          leave: {
            id: leave._id,
            employee: leave.employee.fullName,
            status: leave.status,
            approvedBy: user.fullName
          }
        });
      }
    } catch (ioError) {
      console.warn('Real-time update failed:', ioError.message);
    }

    res.json({
      message: `Leave ${status} successfully`,
      leave: {
        id: leave._id,
        status: leave.status,
        approvedBy: user.fullName,
        approvedDate: leave.approvedDate,
        rejectionReason: leave.rejectionReason
      },
      letter: letterContent ? {
        type: status === 'approved' ? 'leave_approval' : 'leave_rejection',
        content: letterContent
      } : null
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ message: 'Failed to process leave', error: error.message });
  }
});

// Cancel leave
router.put('/:leaveId/cancel', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const user = req.user;

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    // Check permissions
    if (user.role === 'employee' && leave.employee.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending leaves can be cancelled' });
    }

    leave.status = 'cancelled';
    await leave.save();

    res.json({
      message: 'Leave cancelled successfully',
      leave: {
        id: leave._id,
        status: leave.status
      }
    });
  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({ message: 'Failed to cancel leave', error: error.message });
  }
});

// Add comment to leave
router.post('/:leaveId/comments', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { comment } = req.body;
    const user = req.user;

    const leave = await Leave.findById(leaveId).populate('employee');

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    // Check permissions
    if (user.role === 'employee' && leave.employee._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.role === 'manager' && !user.teamMembers.includes(leave.employee._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    leave.comments.push({
      user: user._id,
      comment
    });

    await leave.save();

    res.json({
      message: 'Comment added successfully',
      comment: {
        user: {
          id: user._id,
          name: user.fullName,
          employeeId: user.employeeId
        },
        comment,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
});

// Get leave balance
router.get('/balance/:employeeId', authenticateToken, canAccessEmployee, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;

    const balance = await Leave.getLeaveBalance(employeeId, year);

    res.json({ balance });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Failed to fetch leave balance', error: error.message });
  }
});

// Update leave application
router.put('/:leaveId', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const user = req.user;
    const updateData = req.body;

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    // Check permissions
    // Admin and HR Admin can update any leave
    // Employee can only update their own pending leaves
    if (['admin', 'hr_admin'].includes(user.role)) {
      // HR Admin and Admin can update any leave
    } else if (leave.employee.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Can only update pending leave applications' });
    }

    // Validate dates if being updated
    if (updateData.startDate && updateData.endDate) {
      const start = new Date(updateData.startDate);
      const end = new Date(updateData.endDate);

      if (start >= end) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        return res.status(400).json({ message: 'Cannot apply for leave in the past' });
      }

      // Check for leave conflicts (excluding current leave)
      const conflicts = await Leave.find({
        employee: leave.employee,
        _id: { $ne: leaveId },
        status: { $in: ['pending', 'approved'] },
        $or: [
          { startDate: { $lte: end }, endDate: { $gte: start } }
        ]
      });

      if (conflicts.length > 0) {
        return res.status(400).json({ 
          message: 'Leave conflicts with existing approved/pending leaves',
          conflicts: conflicts.map(c => ({
            id: c._id,
            startDate: c.startDate,
            endDate: c.endDate,
            status: c.status
          }))
        });
      }
    }

    // Update allowed fields
    const allowedUpdates = ['leaveType', 'startDate', 'endDate', 'reason', 'isHalfDay', 'halfDayType', 'halfDayPeriod'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'halfDayPeriod') {
          leave.halfDayType = updateData[field];
        } else {
          leave[field] = updateData[field];
        }
      }
    });

    // Recalculate totalDays if dates or halfDay status changed
    if (updateData.startDate || updateData.endDate || updateData.isHalfDay !== undefined) {
      const start = updateData.startDate ? new Date(updateData.startDate) : leave.startDate;
      const end = updateData.endDate ? new Date(updateData.endDate) : leave.endDate;
      const isHalfDay = updateData.isHalfDay !== undefined ? updateData.isHalfDay : leave.isHalfDay;
      
      const timeDiff = end.getTime() - start.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      leave.totalDays = isHalfDay ? 0.5 : daysDiff;
    }

    await leave.save();

    res.json({
      message: 'Leave application updated successfully',
      leave: {
        id: leave._id,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        status: leave.status,
        appliedDate: leave.appliedDate
      }
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ message: 'Failed to update leave', error: error.message });
  }
});

// Delete leave application (only for pending leaves)
router.delete('/:leaveId', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const user = req.user;

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    // Check permissions
    if (user.role === 'employee' && leave.employee.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.role === 'manager' && !user.teamMembers.includes(leave.employee)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.role !== 'admin' && user.role !== 'hr_admin' && leave.status !== 'pending') {
      return res.status(400).json({ message: 'Can only delete pending leave applications' });
    }

    await Leave.findByIdAndDelete(leaveId);

    res.json({ message: 'Leave application deleted successfully' });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ message: 'Failed to delete leave', error: error.message });
  }
});

// Get pending approvals
router.get('/pending/approvals', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const user = req.user;
    let query = { status: 'pending' };

    // Manager can only see their team's pending leaves
    if (user.role === 'manager') {
      query.employee = { $in: user.teamMembers };
    }

    const pendingLeaves = await Leave.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ appliedDate: 1 });

    res.json({ pendingLeaves });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Failed to fetch pending approvals', error: error.message });
  }
});

module.exports = router;
