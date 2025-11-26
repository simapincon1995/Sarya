const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['offer_letter', 'appointment_letter', 'payslip', 'contract', 'leave_approval', 'leave_rejection', 'experience_certificate', 'relieving_letter', 'other'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'currency', 'boolean'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow system-generated templates
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  usageCount: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['hr', 'payroll', 'legal', 'general'],
    default: 'general'
  },
  tags: [String],
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    content: String,
    version: Number,
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Index for better performance
templateSchema.index({ type: 1, isActive: 1 });
templateSchema.index({ createdBy: 1 });
templateSchema.index({ name: 1 });

// Method to extract variables from content
templateSchema.methods.extractVariables = function() {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables = [];
  let match;
  
  while ((match = variableRegex.exec(this.content)) !== null) {
    const variableName = match[1].trim();
    if (!variables.find(v => v.name === variableName)) {
      variables.push({
        name: variableName,
        description: `Variable: ${variableName}`,
        type: 'text',
        required: true
      });
    }
  }
  
  this.variables = variables;
  return variables;
};

// Method to render template with data
templateSchema.methods.render = function(data) {
  let renderedContent = this.content;
  
  // Replace variables with data
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const value = data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
    renderedContent = renderedContent.replace(regex, value);
  });
  
  // Remove any remaining unreplaced placeholders
  renderedContent = renderedContent.replace(/{{[^}]+}}/g, '');
  
  // Increment usage count (don't await, just fire and forget)
  this.usageCount += 1;
  this.save().catch(err => console.error('Error incrementing usage count:', err));
  
  return renderedContent;
};

// Static method to get templates by type
templateSchema.statics.getByType = function(type, isActive = true) {
  const query = { type };
  if (isActive !== null) {
    query.isActive = isActive;
  }
  return this.find(query).sort({ isDefault: -1, name: 1 });
};

// Static method to create default templates
templateSchema.statics.createDefaultTemplates = async function(createdBy) {
  const defaultTemplates = [
    {
      name: 'Standard Offer Letter',
      type: 'offer_letter',
      description: 'Standard offer letter template for new hires',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; color: #2c3e50; }
    .date { text-align: right; margin: 20px 0; }
    .content { margin: 20px 0; }
    .terms { margin: 20px 0; }
    .terms ul { list-style-type: none; padding: 0; }
    .terms li { padding: 5px 0; }
    .footer { margin-top: 40px; }
    .signature { margin-top: 60px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{companyName}}</h1>
    <p>{{companyAddress}}</p>
  </div>
  
  <div class="date">
    <strong>Date:</strong> {{offerDate}}
  </div>
  
  <div class="content">
    <p>Dear {{candidateName}},</p>
    
    <p>We are delighted to extend this offer of employment to you for the position of <strong>{{designation}}</strong> 
    in our {{department}} department. We were impressed with your qualifications and believe you will make a 
    valuable addition to our team.</p>
    
    <div class="terms">
      <h3>Terms and Conditions of Employment:</h3>
      <ul>
        <li><strong>Position:</strong> {{designation}}</li>
        <li><strong>Department:</strong> {{department}}</li>
        <li><strong>Reporting Manager:</strong> {{reportingManager}}</li>
        <li><strong>Start Date:</strong> {{joiningDate}}</li>
        <li><strong>Work Location:</strong> {{location}}</li>
        <li><strong>Annual CTC:</strong> {{ctc}}</li>
        <li><strong>Probation Period:</strong> {{probationPeriod}} months</li>
      </ul>
    </div>
    
    <p>This offer is contingent upon successful completion of background verification and submission of required documents.</p>
    
    <p>Please confirm your acceptance of this offer by signing and returning a copy of this letter by <strong>{{acceptanceDeadline}}</strong>.</p>
    
    <p>We look forward to welcoming you to our team!</p>
  </div>
  
  <div class="footer">
    <p>Best regards,</p>
    <div class="signature">
      <p><strong>{{hrName}}</strong><br>
      HR Manager<br>
      {{companyName}}</p>
    </div>
  </div>
</body>
</html>`,
      isDefault: true,
      createdBy,
      category: 'hr'
    },
    {
      name: 'Appointment Letter',
      type: 'appointment_letter',
      description: 'Formal appointment letter after offer acceptance',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; color: #2c3e50; }
    .content { margin: 20px 0; }
    .details { margin: 20px 0; background: #f5f5f5; padding: 15px; border-left: 4px solid #3498db; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{companyName}}</h1>
    <p>APPOINTMENT LETTER</p>
  </div>
  
  <p><strong>Date:</strong> {{appointmentDate}}</p>
  <p><strong>Employee ID:</strong> {{employeeId}}</p>
  
  <div class="content">
    <p>Dear {{employeeName}},</p>
    
    <p>Further to your acceptance of our offer, we are pleased to formally appoint you to the position of 
    <strong>{{designation}}</strong> in our {{department}} department, effective {{joiningDate}}.</p>
    
    <div class="details">
      <h3>Employment Details:</h3>
      <p><strong>Designation:</strong> {{designation}}</p>
      <p><strong>Department:</strong> {{department}}</p>
      <p><strong>Reporting To:</strong> {{reportingManager}}</p>
      <p><strong>Work Location:</strong> {{workLocation}}</p>
      <p><strong>Monthly Salary:</strong> {{monthlySalary}}</p>
      <p><strong>Probation Period:</strong> {{probationPeriod}} months (ending {{probationEndDate}})</p>
    </div>
    
    <p>Your employment is subject to company policies and procedures as outlined in the Employee Handbook.</p>
    
    <p>We wish you a successful and rewarding career with {{companyName}}.</p>
    
    <p>Congratulations and welcome aboard!</p>
  </div>
  
  <div class="signature" style="margin-top: 60px;">
    <p><strong>{{hrName}}</strong><br>
    HR Manager</p>
  </div>
</body>
</html>`,
      isDefault: true,
      createdBy,
      category: 'hr'
    },
    {
      name: 'Monthly Payslip',
      type: 'payslip',
      description: 'Comprehensive monthly payslip template',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; background: #2c3e50; color: white; padding: 15px; margin-bottom: 20px; }
    .header h2 { margin: 0; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .info-box { padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; }
    .info-box p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    table th { background: #34495e; color: white; padding: 10px; text-align: left; }
    table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .earnings { background: #e8f5e9; }
    .deductions { background: #ffebee; }
    .total-row { font-weight: bold; background: #e3f2fd; }
    .net-pay { background: #4caf50; color: white; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px; }
    .net-pay h3 { margin: 0; font-size: 24px; }
    .attendance { background: #fff3e0; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>{{companyName}}</h2>
    <p>Payslip for {{month}} {{year}}</p>
  </div>
  
  <div class="info-section">
    <div class="info-box">
      <p><strong>Employee Name:</strong> {{employeeName}}</p>
      <p><strong>Employee ID:</strong> {{employeeId}}</p>
      <p><strong>Department:</strong> {{department}}</p>
      <p><strong>Designation:</strong> {{designation}}</p>
    </div>
    <div class="info-box">
      <p><strong>Pay Period:</strong> {{month}} {{year}}</p>
      <p><strong>Payment Date:</strong> {{paymentDate}}</p>
      <p><strong>Bank Account:</strong> {{accountNumber}}</p>
      <p><strong>PAN:</strong> {{pan}}</p>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th colspan="2" class="earnings">Earnings</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Basic Salary</td>
        <td style="text-align: right;">{{basicSalary}}</td>
      </tr>
      <tr>
        <td>House Rent Allowance (HRA)</td>
        <td style="text-align: right;">{{hra}}</td>
      </tr>
      <tr>
        <td>Medical Allowance</td>
        <td style="text-align: right;">{{medical}}</td>
      </tr>
      <tr>
        <td>Transport Allowance</td>
        <td style="text-align: right;">{{transport}}</td>
      </tr>
      <tr>
        <td>Overtime Pay</td>
        <td style="text-align: right;">{{overtimeAmount}}</td>
      </tr>
      <tr>
        <td>Other Allowances</td>
        <td style="text-align: right;">{{otherAllowances}}</td>
      </tr>
      <tr class="total-row">
        <td>Gross Salary</td>
        <td style="text-align: right;">{{grossSalary}}</td>
      </tr>
    </tbody>
  </table>
  
  <table>
    <thead>
      <tr>
        <th colspan="2" class="deductions">Deductions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Provident Fund (PF)</td>
        <td style="text-align: right;">{{pf}}</td>
      </tr>
      <tr>
        <td>Employee State Insurance (ESI)</td>
        <td style="text-align: right;">{{esi}}</td>
      </tr>
      <tr>
        <td>Professional Tax</td>
        <td style="text-align: right;">{{professionalTax}}</td>
      </tr>
      <tr>
        <td>Income Tax (TDS)</td>
        <td style="text-align: right;">{{tax}}</td>
      </tr>
      <tr>
        <td>Other Deductions</td>
        <td style="text-align: right;">{{otherDeductions}}</td>
      </tr>
      <tr class="total-row">
        <td>Total Deductions</td>
        <td style="text-align: right;">{{totalDeductions}}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="net-pay">
    <h3>Net Salary: {{netSalary}}</h3>
    <p>In Words: {{netSalaryWords}}</p>
  </div>
  
  <div class="attendance">
    <h3 style="margin-top: 0;">Attendance Summary</h3>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
      <p><strong>Total Days:</strong> {{totalDays}}</p>
      <p><strong>Present Days:</strong> {{presentDays}}</p>
      <p><strong>Absent Days:</strong> {{absentDays}}</p>
      <p><strong>Paid Leaves:</strong> {{paidLeaveDays}}</p>
      <p><strong>Late Days:</strong> {{lateDays}}</p>
      <p><strong>Working Hours:</strong> {{workingHours}}</p>
    </div>
  </div>
  
  <p style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 12px;">
    This is a computer-generated document and does not require a signature.<br>
    Generated on {{generatedDate}}
  </p>
</body>
</html>`,
      isDefault: true,
      createdBy,
      category: 'payroll'
    },
    {
      name: 'Leave Approval Letter',
      type: 'leave_approval',
      description: 'Leave approval notification',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #4caf50; color: white; padding: 15px; text-align: center; margin-bottom: 20px; }
    .content { background: #f8f9fa; padding: 20px; border-left: 4px solid #4caf50; }
    .details { margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Leave Approval</h2>
  </div>
  
  <div class="content">
    <p>Dear {{employeeName}},</p>
    
    <p>Your leave request has been <strong style="color: #4caf50;">APPROVED</strong>.</p>
    
    <div class="details">
      <p><strong>Leave Type:</strong> {{leaveType}}</p>
      <p><strong>From:</strong> {{startDate}}</p>
      <p><strong>To:</strong> {{endDate}}</p>
      <p><strong>Total Days:</strong> {{totalDays}}</p>
      <p><strong>Reason:</strong> {{reason}}</p>
    </div>
    
    <p><strong>Remarks:</strong> {{approverRemarks}}</p>
    
    <p>Please ensure all your work is properly handed over before proceeding on leave.</p>
    
    <p>Approved by: <strong>{{approverName}}</strong><br>
    Date: {{approvalDate}}</p>
  </div>
</body>
</html>`,
      isDefault: true,
      createdBy,
      category: 'hr'
    },
    {
      name: 'Leave Rejection Letter',
      type: 'leave_rejection',
      description: 'Leave rejection notification',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #f44336; color: white; padding: 15px; text-align: center; margin-bottom: 20px; }
    .content { background: #f8f9fa; padding: 20px; border-left: 4px solid #f44336; }
    .details { margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Leave Request Declined</h2>
  </div>
  
  <div class="content">
    <p>Dear {{employeeName}},</p>
    
    <p>We regret to inform you that your leave request has been <strong style="color: #f44336;">DECLINED</strong>.</p>
    
    <div class="details">
      <p><strong>Leave Type:</strong> {{leaveType}}</p>
      <p><strong>From:</strong> {{startDate}}</p>
      <p><strong>To:</strong> {{endDate}}</p>
      <p><strong>Total Days:</strong> {{totalDays}}</p>
    </div>
    
    <p><strong>Reason for Rejection:</strong> {{rejectionReason}}</p>
    
    <p>If you have any concerns or would like to discuss this further, please contact your manager or HR department.</p>
    
    <p>Declined by: <strong>{{approverName}}</strong><br>
    Date: {{rejectionDate}}</p>
  </div>
</body>
</html>`,
      isDefault: true,
      createdBy,
      category: 'hr'
    },
    {
      name: 'Experience Certificate',
      type: 'experience_certificate',
      description: 'Experience certificate for exiting employees',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.8; color: #000; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px double #000; padding-bottom: 20px; }
    .header h1 { margin: 0; font-size: 28px; }
    .title { text-align: center; margin: 30px 0; font-size: 20px; font-weight: bold; text-decoration: underline; }
    .content { text-align: justify; margin: 30px 0; }
    .signature { margin-top: 80px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{companyName}}</h1>
    <p>{{companyAddress}}</p>
  </div>
  
  <div class="title">
    EXPERIENCE CERTIFICATE
  </div>
  
  <p><strong>Date:</strong> {{issueDate}}</p>
  <p><strong>Certificate No:</strong> {{certificateNumber}}</p>
  
  <div class="content">
    <p>This is to certify that <strong>{{employeeName}}</strong> (Employee ID: {{employeeId}}) 
    was employed with {{companyName}} from <strong>{{joiningDate}}</strong> to <strong>{{lastWorkingDate}}</strong>.</p>
    
    <p>During their tenure with us, {{employeeName}} worked as <strong>{{designation}}</strong> 
    in the {{department}} department. They have completed a total experience of <strong>{{totalExperience}}</strong> with our organization.</p>
    
    <p>Throughout their employment, {{employeeName}} demonstrated professionalism, dedication, and strong work ethics. 
    Their contributions to the team and projects were valuable and appreciated.</p>
    
    <p>We wish them all the best in their future endeavors.</p>
  </div>
  
  <div class="signature">
    <p><strong>{{hrName}}</strong><br>
    HR Manager<br>
    {{companyName}}</p>
    
    <p style="margin-top: 50px;"><strong>Authorized Signatory</strong></p>
  </div>
  
  <p style="text-align: center; margin-top: 50px; font-size: 11px; color: #666;">
    This is a computer-generated certificate and is valid without signature.
  </p>
</body>
</html>`,
      isDefault: true,
      createdBy,
      category: 'hr'
    },
    {
      name: 'Relieving Letter',
      type: 'relieving_letter',
      description: 'Formal relieving letter for exiting employees',
      content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; }
    .title { text-align: center; margin: 30px 0; font-size: 18px; font-weight: bold; }
    .content { margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{companyName}}</h1>
    <p>{{companyAddress}}</p>
  </div>
  
  <div class="title">
    RELIEVING LETTER
  </div>
  
  <p><strong>Date:</strong> {{relievingDate}}</p>
  
  <div class="content">
    <p>To Whom It May Concern,</p>
    
    <p>This is to certify that <strong>{{employeeName}}</strong> (Employee ID: {{employeeId}}) 
    was employed with {{companyName}} as <strong>{{designation}}</strong> from <strong>{{joiningDate}}</strong> 
    to <strong>{{lastWorkingDate}}</strong>.</p>
    
    <p>{{employeeName}} has resigned from their position and their resignation has been accepted by the management. 
    They have been relieved from all duties and responsibilities with effect from <strong>{{lastWorkingDate}}</strong>.</p>
    
    <p>During their tenure with us, {{employeeName}} has completed all formalities including the handover of company assets, 
    pending work, and documentation. All dues and settlements have been cleared.</p>
    
    <p>We appreciate their contributions during their time with us and wish them success in their future career.</p>
  </div>
  
  <div class="signature" style="margin-top: 80px;">
    <p><strong>{{hrName}}</strong><br>
    HR Manager<br>
    {{companyName}}</p>
  </div>
</body>
</html>`,
      isDefault: true,
      createdBy,
      category: 'hr'
    }
  ];
  
  for (const templateData of defaultTemplates) {
    const existingTemplate = await this.findOne({
      type: templateData.type,
      isDefault: true
    });
    
    if (!existingTemplate) {
      const template = new this(templateData);
      await template.save();
      console.log(`Created default template: ${templateData.name}`);
    }
  }
  
  return true;
};

module.exports = mongoose.model('Template', templateSchema);
