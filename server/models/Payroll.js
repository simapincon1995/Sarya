const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  basicSalary: {
    type: Number,
    required: true
  },
  allowances: [{
    name: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    isTaxable: {
      type: Boolean,
      default: true
    }
  }],
  deductions: [{
    name: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['tax', 'insurance', 'loan', 'other'],
      default: 'other'
    }
  }],
  overtime: {
    hours: {
      type: Number,
      default: 0
    },
    rate: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  attendance: {
    totalDays: {
      type: Number,
      required: true
    },
    presentDays: {
      type: Number,
      required: true
    },
    absentDays: {
      type: Number,
      required: true
    },
    lateDays: {
      type: Number,
      default: 0
    },
    paidLeaveDays: {
      type: Number,
      default: 0
    },
    workingHours: {
      type: Number,
      default: 0
    }
  },
  calculations: {
    grossSalary: {
      type: Number,
      required: true
    },
    totalAllowances: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      default: 0
    },
    netSalary: {
      type: Number,
      required: true
    },
    taxAmount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'generated', 'approved', 'paid'],
    default: 'draft'
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  paidAt: Date,
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque'],
    default: 'bank_transfer'
  },
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifscCode: String
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  notes: String,
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    type: {
      type: String,
      enum: ['payslip', 'bank_statement', 'other']
    }
  }]
}, {
  timestamps: true
});

// Index for better performance
payrollSchema.index({ employee: 1, month: 1, year: 1 });
payrollSchema.index({ status: 1 });
payrollSchema.index({ year: 1, month: 1 });

// Calculate payroll before saving
payrollSchema.pre('save', function(next) {
  // Calculate total allowances
  this.calculations.totalAllowances = this.allowances.reduce((sum, allowance) => {
    return sum + allowance.amount;
  }, 0);
  
  // Calculate total deductions
  this.calculations.totalDeductions = this.deductions.reduce((sum, deduction) => {
    return sum + deduction.amount;
  }, 0);
  
  // Calculate gross salary
  this.calculations.grossSalary = this.basicSalary + this.calculations.totalAllowances + this.overtime.amount;
  
  // Calculate net salary
  this.calculations.netSalary = this.calculations.grossSalary - this.calculations.totalDeductions;
  
  next();
});

// Static method to generate payroll for all employees
payrollSchema.statics.generateMonthlyPayroll = async function(month, year, generatedBy) {
  const Employee = mongoose.model('User');
  const Attendance = mongoose.model('Attendance');
  const Leave = mongoose.model('Leave');
  const { 
    calculatePF, 
    calculateESI, 
    calculateHRA, 
    getMedicalAllowance, 
    getTransportAllowance,
    calculateMonthlyTax,
    calculateOvertime
  } = require('../utils/documentUtils');
  
  const employees = await Employee.find({ isActive: true, role: { $in: ['employee', 'manager', 'hr_admin'] } });
  const payrolls = [];
  
  for (const employee of employees) {
    // Check if payroll already exists
    const existingPayroll = await this.findOne({
      employee: employee._id,
      month,
      year
    });
    
    if (existingPayroll) {
      continue;
    }
    
    // Get attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const attendance = await Attendance.find({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Get approved leaves for the month
    const approvedLeaves = await Leave.find({
      employee: employee._id,
      status: 'approved',
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    });
    
    // Calculate paid leave days for this month
    let paidLeaveDays = 0;
    approvedLeaves.forEach(leave => {
      const leaveStart = leave.startDate < startDate ? startDate : leave.startDate;
      const leaveEnd = leave.endDate > endDate ? endDate : leave.endDate;
      const daysDiff = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
      paidLeaveDays += leave.isHalfDay ? 0.5 : daysDiff;
    });
    
    const totalDays = endDate.getDate();
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = totalDays - presentDays - paidLeaveDays;
    const lateDays = attendance.filter(a => a.isLate).length;
    const workingHours = attendance.reduce((sum, a) => sum + (a.totalWorkingHours || 0), 0);
    
    // Calculate salary based on attendance
    const dailySalary = employee.salary / totalDays;
    const basicSalary = dailySalary * (presentDays + paidLeaveDays);
    
    // Calculate allowances
    const hra = calculateHRA(basicSalary);
    const medical = getMedicalAllowance();
    const transport = getTransportAllowance();
    
    // Calculate overtime
    const standardHours = (presentDays + paidLeaveDays) * 8;
    const overtimeHours = Math.max(0, workingHours - standardHours);
    const overtimeRate = dailySalary / 8 * 1.5;
    const overtimeAmount = calculateOvertime(overtimeHours, basicSalary, totalDays, 8);
    
    // Calculate deductions
    const pf = calculatePF(basicSalary);
    const grossSalary = basicSalary + hra + medical + transport + overtimeAmount;
    const esi = calculateESI(grossSalary);
    const tax = calculateMonthlyTax(grossSalary);
    
    const payroll = new this({
      employee: employee._id,
      month,
      year,
      basicSalary: Math.round(basicSalary),
      allowances: [
        { name: 'HRA', amount: hra, isTaxable: true },
        { name: 'Medical', amount: medical, isTaxable: false },
        { name: 'Transport', amount: transport, isTaxable: false }
      ],
      deductions: [
        { name: 'PF', amount: pf, type: 'insurance' },
        { name: 'ESI', amount: esi, type: 'insurance' },
        { name: 'Tax', amount: tax, type: 'tax' }
      ],
      overtime: {
        hours: overtimeHours,
        rate: overtimeRate,
        amount: overtimeAmount
      },
      attendance: {
        totalDays,
        presentDays,
        absentDays: Math.max(0, absentDays),
        lateDays,
        paidLeaveDays,
        workingHours
      },
      generatedBy,
      status: 'generated'
    });
    
    await payroll.save();
    payrolls.push(payroll);
  }
  
  return payrolls;
};

module.exports = mongoose.model('Payroll', payrollSchema);
