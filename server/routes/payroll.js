const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Template = require('../models/Template');
const { authenticateToken, authorize, canAccessPayroll } = require('../middleware/auth');

const router = express.Router();

// Create individual payroll record
router.post('/', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const {
      employee,
      year,
      month,
      basicSalary,
      allowances,
      deductions,
      overtime,
      bonus
    } = req.body;

    // Check if payroll already exists for this employee/month/year
    const existingPayroll = await Payroll.findOne({ employee, month, year });
    if (existingPayroll) {
      return res.status(400).json({ message: 'Payroll already exists for this employee and period' });
    }

    const payroll = new Payroll({
      employee,
      year,
      month,
      basicSalary,
      allowances: allowances || {},
      deductions: deductions || {},
      overtime: overtime || {},
      bonus: bonus || 0,
      generatedBy: req.user._id,
      status: 'draft'
    });

    await payroll.save();
    await payroll.populate('employee', 'firstName lastName employeeId department');

    res.status(201).json({
      message: 'Payroll created successfully',
      payroll
    });
  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({ message: 'Failed to create payroll', error: error.message });
  }
});

// Generate monthly payroll
router.post('/generate', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { month, year } = req.body;
    const generatedBy = req.user._id;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ message: 'Invalid month' });
    }

    // Check if payroll already exists for this month/year
    const existingPayroll = await Payroll.findOne({ month, year });
    if (existingPayroll) {
      return res.status(400).json({ message: 'Payroll already generated for this month' });
    }

    const payrolls = await Payroll.generateMonthlyPayroll(month, year, generatedBy);

    res.json({
      message: 'Payroll generated successfully',
      count: payrolls.length,
      month,
      year
    });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({ message: 'Failed to generate payroll', error: error.message });
  }
});

// Get payroll records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, month, year, status, page = 1, limit = 10 } = req.query;
    const user = req.user;

    let query = {};

    // Check permissions
    if (employeeId) {
      if (user.role === 'employee' && user._id.toString() !== employeeId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      query.employee = employeeId;
    } else if (user.role === 'employee') {
      query.employee = user._id;
    }

    // Apply filters
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (status) query.status = status;

    const payrolls = await Payroll.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('generatedBy', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName employeeId')
      .sort({ year: -1, month: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payroll.countDocuments(query);

    res.json({
      payrolls,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ message: 'Failed to fetch payroll', error: error.message });
  }
});

// Get payroll by ID
router.get('/:payrollId', authenticateToken, async (req, res) => {
  try {
    const { payrollId } = req.params;
    const user = req.user;

    const payroll = await Payroll.findById(payrollId)
      .populate('employee', 'firstName lastName employeeId department email')
      .populate('generatedBy', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName employeeId')
      .populate('template');

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    // Check permissions
    if (user.role === 'employee' && payroll.employee._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ payroll });
  } catch (error) {
    console.error('Get payroll by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch payroll', error: error.message });
  }
});

// Update payroll
router.put('/:payrollId', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { payrollId } = req.params;
    const {
      allowances,
      deductions,
      overtime,
      notes
    } = req.body;

    const payroll = await Payroll.findById(payrollId);

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ message: 'Cannot modify paid payroll' });
    }

    // Update fields
    if (allowances) payroll.allowances = allowances;
    if (deductions) payroll.deductions = deductions;
    if (overtime) payroll.overtime = overtime;
    if (notes) payroll.notes = notes;

    await payroll.save();

    res.json({
      message: 'Payroll updated successfully',
      payroll: {
        id: payroll._id,
        allowances: payroll.allowances,
        deductions: payroll.deductions,
        overtime: payroll.overtime,
        calculations: payroll.calculations
      }
    });
  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({ message: 'Failed to update payroll', error: error.message });
  }
});

// Approve payroll
router.put('/:payrollId/approve', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { payrollId } = req.params;
    const user = req.user;

    const payroll = await Payroll.findById(payrollId);

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    if (payroll.status !== 'generated') {
      return res.status(400).json({ message: 'Only generated payroll can be approved' });
    }

    payroll.status = 'approved';
    payroll.approvedBy = user._id;
    payroll.approvedAt = new Date();

    await payroll.save();

    res.json({
      message: 'Payroll approved successfully',
      payroll: {
        id: payroll._id,
        status: payroll.status,
        approvedBy: user.fullName,
        approvedAt: payroll.approvedAt
      }
    });
  } catch (error) {
    console.error('Approve payroll error:', error);
    res.status(500).json({ message: 'Failed to approve payroll', error: error.message });
  }
});

// Mark payroll as paid
router.put('/:payrollId/pay', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { paymentMethod, bankDetails } = req.body;
    const user = req.user;

    const payroll = await Payroll.findById(payrollId);

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    if (payroll.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved payroll can be marked as paid' });
    }

    payroll.status = 'paid';
    payroll.paidAt = new Date();
    if (paymentMethod) payroll.paymentMethod = paymentMethod;
    if (bankDetails) payroll.bankDetails = bankDetails;

    await payroll.save();

    res.json({
      message: 'Payroll marked as paid successfully',
      payroll: {
        id: payroll._id,
        status: payroll.status,
        paidAt: payroll.paidAt,
        paymentMethod: payroll.paymentMethod
      }
    });
  } catch (error) {
    console.error('Mark payroll as paid error:', error);
    res.status(500).json({ message: 'Failed to mark payroll as paid', error: error.message });
  }
});

// Generate payslip PDF
router.get('/:payrollId/payslip', authenticateToken, async (req, res) => {
  try {
    const { payrollId } = req.params;
    const user = req.user;

    const payroll = await Payroll.findById(payrollId)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('template');

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    // Check permissions
    if (user.role === 'employee' && payroll.employee._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get default payslip template if no template assigned
    let template = payroll.template;
    if (!template) {
      template = await Template.findOne({ type: 'payslip', isDefault: true });
    }

    if (!template) {
      return res.status(404).json({ message: 'No payslip template found' });
    }

    // Prepare template data
    const templateData = {
      month: payroll.month,
      year: payroll.year,
      employeeName: payroll.employee.fullName,
      employeeId: payroll.employee.employeeId,
      department: payroll.employee.department,
      designation: payroll.employee.designation,
      basicSalary: payroll.basicSalary,
      totalAllowances: payroll.calculations.totalAllowances,
      totalDeductions: payroll.calculations.totalDeductions,
      overtimeAmount: payroll.overtime.amount,
      grossSalary: payroll.calculations.grossSalary,
      netSalary: payroll.calculations.netSalary,
      totalDays: payroll.attendance.totalDays,
      presentDays: payroll.attendance.presentDays,
      absentDays: payroll.attendance.absentDays,
      generatedDate: new Date().toLocaleDateString()
    };

    // Render template
    const renderedContent = template.render(templateData);

    res.json({
      payslip: {
        id: payroll._id,
        content: renderedContent,
        employee: payroll.employee,
        month: payroll.month,
        year: payroll.year,
        netSalary: payroll.calculations.netSalary
      }
    });
  } catch (error) {
    console.error('Generate payslip error:', error);
    res.status(500).json({ message: 'Failed to generate payslip', error: error.message });
  }
});

// Get payroll summary
router.get('/summary/:year/:month', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { year, month } = req.params;

    const payrolls = await Payroll.find({ year: parseInt(year), month: parseInt(month) })
      .populate('employee', 'firstName lastName employeeId department');

    const summary = {
      totalEmployees: payrolls.length,
      totalGrossSalary: payrolls.reduce((sum, p) => sum + p.calculations.grossSalary, 0),
      totalNetSalary: payrolls.reduce((sum, p) => sum + p.calculations.netSalary, 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + p.calculations.totalDeductions, 0),
      totalOvertime: payrolls.reduce((sum, p) => sum + p.overtime.amount, 0),
      statusBreakdown: {
        draft: payrolls.filter(p => p.status === 'draft').length,
        generated: payrolls.filter(p => p.status === 'generated').length,
        approved: payrolls.filter(p => p.status === 'approved').length,
        paid: payrolls.filter(p => p.status === 'paid').length
      },
      departmentBreakdown: {}
    };

    // Calculate department-wise breakdown
    payrolls.forEach(payroll => {
      const dept = payroll.employee.department;
      if (!summary.departmentBreakdown[dept]) {
        summary.departmentBreakdown[dept] = {
          count: 0,
          totalSalary: 0
        };
      }
      summary.departmentBreakdown[dept].count++;
      summary.departmentBreakdown[dept].totalSalary += payroll.calculations.netSalary;
    });

    res.json({ summary });
  } catch (error) {
    console.error('Get payroll summary error:', error);
    res.status(500).json({ message: 'Failed to fetch payroll summary', error: error.message });
  }
});

// Update payroll record
router.put('/:payrollId', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { payrollId } = req.params;
    const updateData = req.body;

    const payroll = await Payroll.findById(payrollId);

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ message: 'Cannot update paid payroll' });
    }

    // Update allowed fields
    const allowedUpdates = ['basicSalary', 'allowances', 'deductions', 'overtime', 'bonus'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        payroll[field] = updateData[field];
      }
    });

    await payroll.save();
    await payroll.populate('employee', 'firstName lastName employeeId department');

    res.json({
      message: 'Payroll updated successfully',
      payroll
    });
  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({ message: 'Failed to update payroll', error: error.message });
  }
});

// Delete payroll record
router.delete('/:payrollId', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { payrollId } = req.params;

    const payroll = await Payroll.findById(payrollId);

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ message: 'Cannot delete paid payroll' });
    }

    await Payroll.findByIdAndDelete(payrollId);

    res.json({ message: 'Payroll deleted successfully' });
  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({ message: 'Failed to delete payroll', error: error.message });
  }
});

module.exports = router;
