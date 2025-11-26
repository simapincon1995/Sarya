const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Template = require('../models/Template');
const { authenticateToken, authorize, canAccessPayroll } = require('../middleware/auth');
const { 
  formatCurrency, 
  numberToWords, 
  formatDate, 
  getMonthName 
} = require('../utils/documentUtils');

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
      .populate('employee', 'firstName lastName employeeId department designation bankDetails pan');

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    // Check permissions
    if (user.role === 'employee' && payroll.employee._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get default payslip template
    let template = await Template.findOne({ type: 'payslip', isDefault: true });

    // If no template exists, create default templates
    if (!template) {
      console.log('⚠️  Payslip template not found. Creating default templates...');
      try {
        await Template.createDefaultTemplates();
        template = await Template.findOne({ type: 'payslip', isDefault: true });
        console.log('✅ Default templates created successfully');
      } catch (createError) {
        console.error('❌ Failed to create default templates:', createError);
        return res.status(500).json({ 
          message: 'Payslip template not found and could not be created automatically',
          error: createError.message 
        });
      }
    }

    if (!template) {
      return res.status(404).json({ 
        message: 'No payslip template found. Please contact administrator.',
        hint: 'Run: node init-templates.js'
      });
    }

    // Calculate all amounts
    const totalAllowances = payroll.allowances.reduce((sum, a) => sum + a.amount, 0);
    const totalDeductions = payroll.deductions.reduce((sum, d) => sum + d.amount, 0);
    const grossSalary = payroll.basicSalary + totalAllowances + payroll.overtime.amount;
    const netSalary = grossSalary - totalDeductions;

    // Get individual components
    const hra = payroll.allowances.find(a => a.name === 'HRA')?.amount || 0;
    const medical = payroll.allowances.find(a => a.name === 'Medical')?.amount || 0;
    const transport = payroll.allowances.find(a => a.name === 'Transport')?.amount || 0;
    const otherAllowances = payroll.allowances
      .filter(a => !['HRA', 'Medical', 'Transport'].includes(a.name))
      .reduce((sum, a) => sum + a.amount, 0);

    const pf = payroll.deductions.find(d => d.name === 'PF')?.amount || 0;
    const esi = payroll.deductions.find(d => d.name === 'ESI')?.amount || 0;
    const tax = payroll.deductions.find(d => d.name === 'Tax')?.amount || 0;
    const professionalTax = payroll.deductions.find(d => d.name === 'Professional Tax')?.amount || 0;
    const otherDeductions = payroll.deductions
      .filter(d => !['PF', 'ESI', 'Tax', 'Professional Tax'].includes(d.name))
      .reduce((sum, d) => sum + d.amount, 0);

    // Prepare comprehensive template data
    const templateData = {
      // Company details
      companyName: 'Sarya Connective',
      
      // Employee details
      employeeName: payroll.employee.fullName,
      employeeId: payroll.employee.employeeId,
      department: payroll.employee.department || 'N/A',
      designation: payroll.employee.designation || 'N/A',
      
      // Pay period
      month: getMonthName(payroll.month),
      year: payroll.year.toString(),
      paymentDate: payroll.paidAt ? formatDate(payroll.paidAt, 'DD MMMM YYYY') : 'Pending',
      
      // Salary components - Earnings
      basicSalary: formatCurrency(payroll.basicSalary),
      hra: formatCurrency(hra),
      medical: formatCurrency(medical),
      transport: formatCurrency(transport),
      overtimeAmount: formatCurrency(payroll.overtime.amount),
      otherAllowances: formatCurrency(otherAllowances),
      grossSalary: formatCurrency(grossSalary),
      
      // Deductions
      pf: formatCurrency(pf),
      esi: formatCurrency(esi),
      professionalTax: formatCurrency(professionalTax),
      tax: formatCurrency(tax),
      otherDeductions: formatCurrency(otherDeductions),
      totalDeductions: formatCurrency(totalDeductions),
      
      // Net Pay
      netSalary: formatCurrency(netSalary),
      netSalaryWords: numberToWords(netSalary),
      
      // Attendance
      totalDays: payroll.attendance.totalDays.toString(),
      presentDays: payroll.attendance.presentDays.toString(),
      absentDays: payroll.attendance.absentDays.toString(),
      paidLeaveDays: (payroll.attendance.paidLeaveDays || 0).toString(),
      lateDays: (payroll.attendance.lateDays || 0).toString(),
      workingHours: payroll.attendance.workingHours.toFixed(2),
      
      // Bank details
      accountNumber: payroll.employee.bankDetails?.accountNumber || 'N/A',
      pan: payroll.employee.pan || 'N/A',
      
      // Generation details
      generatedDate: formatDate(new Date(), 'DD MMMM YYYY')
    };

    // Render template
    const renderedContent = template.render(templateData);

    res.json({
      payslip: {
        id: payroll._id,
        content: renderedContent,
        employee: {
          id: payroll.employee._id,
          name: payroll.employee.fullName,
          employeeId: payroll.employee.employeeId
        },
        month: payroll.month,
        year: payroll.year,
        netSalary,
        status: payroll.status
      }
    });
  } catch (error) {
    console.error('Generate payslip error:', error);
    res.status(500).json({ message: 'Failed to generate payslip', error: error.message });
  }
});

// Bulk generate payslips for a month
router.post('/payslips/bulk-generate', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    // Get all payrolls for the specified month and year
    const payrolls = await Payroll.find({ month, year, status: { $in: ['approved', 'paid'] } })
      .populate('employee', 'firstName lastName employeeId department designation');

    if (payrolls.length === 0) {
      return res.status(404).json({ message: 'No payrolls found for the specified period' });
    }

    // Get payslip template
    let template = await Template.findOne({ type: 'payslip', isDefault: true });

    // If no template exists, create default templates
    if (!template) {
      console.log('⚠️  Payslip template not found. Creating default templates...');
      try {
        await Template.createDefaultTemplates();
        template = await Template.findOne({ type: 'payslip', isDefault: true });
        console.log('✅ Default templates created successfully');
      } catch (createError) {
        console.error('❌ Failed to create default templates:', createError);
        return res.status(500).json({ 
          message: 'Payslip template not found and could not be created automatically',
          error: createError.message 
        });
      }
    }

    if (!template) {
      return res.status(404).json({ 
        message: 'No payslip template found. Please contact administrator.',
        hint: 'Run: node init-templates.js'
      });
    }

    const payslips = [];

    for (const payroll of payrolls) {
      const totalAllowances = payroll.allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = payroll.deductions.reduce((sum, d) => sum + d.amount, 0);
      const grossSalary = payroll.basicSalary + totalAllowances + payroll.overtime.amount;
      const netSalary = grossSalary - totalDeductions;

      const hra = payroll.allowances.find(a => a.name === 'HRA')?.amount || 0;
      const medical = payroll.allowances.find(a => a.name === 'Medical')?.amount || 0;
      const transport = payroll.allowances.find(a => a.name === 'Transport')?.amount || 0;
      const otherAllowances = payroll.allowances
        .filter(a => !['HRA', 'Medical', 'Transport'].includes(a.name))
        .reduce((sum, a) => sum + a.amount, 0);

      const pf = payroll.deductions.find(d => d.name === 'PF')?.amount || 0;
      const esi = payroll.deductions.find(d => d.name === 'ESI')?.amount || 0;
      const tax = payroll.deductions.find(d => d.name === 'Tax')?.amount || 0;
      const professionalTax = payroll.deductions.find(d => d.name === 'Professional Tax')?.amount || 0;
      const otherDeductions = payroll.deductions
        .filter(d => !['PF', 'ESI', 'Tax', 'Professional Tax'].includes(d.name))
        .reduce((sum, d) => sum + d.amount, 0);

      const templateData = {
        companyName: 'Sarya Connective',
        employeeName: payroll.employee.fullName,
        employeeId: payroll.employee.employeeId,
        department: payroll.employee.department || 'N/A',
        designation: payroll.employee.designation || 'N/A',
        month: getMonthName(payroll.month),
        year: payroll.year.toString(),
        paymentDate: payroll.paidAt ? formatDate(payroll.paidAt, 'DD MMMM YYYY') : 'Pending',
        basicSalary: formatCurrency(payroll.basicSalary),
        hra: formatCurrency(hra),
        medical: formatCurrency(medical),
        transport: formatCurrency(transport),
        overtimeAmount: formatCurrency(payroll.overtime.amount),
        otherAllowances: formatCurrency(otherAllowances),
        grossSalary: formatCurrency(grossSalary),
        pf: formatCurrency(pf),
        esi: formatCurrency(esi),
        professionalTax: formatCurrency(professionalTax),
        tax: formatCurrency(tax),
        otherDeductions: formatCurrency(otherDeductions),
        totalDeductions: formatCurrency(totalDeductions),
        netSalary: formatCurrency(netSalary),
        netSalaryWords: numberToWords(netSalary),
        totalDays: payroll.attendance.totalDays.toString(),
        presentDays: payroll.attendance.presentDays.toString(),
        absentDays: payroll.attendance.absentDays.toString(),
        paidLeaveDays: (payroll.attendance.paidLeaveDays || 0).toString(),
        lateDays: (payroll.attendance.lateDays || 0).toString(),
        workingHours: payroll.attendance.workingHours.toFixed(2),
        accountNumber: 'N/A',
        pan: 'N/A',
        generatedDate: formatDate(new Date(), 'DD MMMM YYYY')
      };

      const renderedContent = template.render(templateData);

      payslips.push({
        payrollId: payroll._id,
        employee: {
          id: payroll.employee._id,
          name: payroll.employee.fullName,
          employeeId: payroll.employee.employeeId
        },
        content: renderedContent,
        netSalary
      });
    }

    res.json({
      message: `Generated ${payslips.length} payslips successfully`,
      month,
      year,
      count: payslips.length,
      payslips
    });
  } catch (error) {
    console.error('Bulk generate payslips error:', error);
    res.status(500).json({ message: 'Failed to generate payslips', error: error.message });
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
