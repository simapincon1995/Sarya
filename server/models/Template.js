const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['offer_letter', 'appointment_letter', 'payslip', 'contract', 'other'],
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
    required: true
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
  this.variables.forEach(variable => {
    const placeholder = `{{${variable.name}}}`;
    const value = data[variable.name] || variable.defaultValue || '';
    renderedContent = renderedContent.replace(new RegExp(placeholder, 'g'), value);
  });
  
  // Increment usage count
  this.usageCount += 1;
  this.save();
  
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
      description: 'Standard offer letter template',
      content: `Dear {{candidateName}},

We are pleased to offer you the position of {{designation}} at {{companyName}}.

Position Details:
- Designation: {{designation}}
- Department: {{department}}
- Reporting Manager: {{reportingManager}}
- Joining Date: {{joiningDate}}
- Salary: {{salary}}
- Location: {{location}}

Please confirm your acceptance by {{confirmationDate}}.

Best regards,
{{hrName}}
HR Department`,
      variables: [
        { name: 'candidateName', description: 'Candidate full name', required: true },
        { name: 'designation', description: 'Job designation', required: true },
        { name: 'companyName', description: 'Company name', required: true },
        { name: 'department', description: 'Department name', required: true },
        { name: 'reportingManager', description: 'Reporting manager name', required: true },
        { name: 'joiningDate', description: 'Joining date', required: true },
        { name: 'salary', description: 'Offered salary', required: true },
        { name: 'location', description: 'Work location', required: true },
        { name: 'confirmationDate', description: 'Confirmation deadline', required: true },
        { name: 'hrName', description: 'HR representative name', required: true }
      ],
      isDefault: true,
      createdBy
    },
    {
      name: 'Standard Payslip',
      type: 'payslip',
      description: 'Standard payslip template',
      content: `PAYSLIP - {{month}} {{year}}

Employee Details:
Name: {{employeeName}}
Employee ID: {{employeeId}}
Department: {{department}}
Designation: {{designation}}

Salary Details:
Basic Salary: {{basicSalary}}
Allowances: {{totalAllowances}}
Deductions: {{totalDeductions}}
Overtime: {{overtimeAmount}}
Gross Salary: {{grossSalary}}
Net Salary: {{netSalary}}

Attendance:
Total Days: {{totalDays}}
Present Days: {{presentDays}}
Absent Days: {{absentDays}}

Generated on: {{generatedDate}}`,
      variables: [
        { name: 'month', description: 'Payroll month', required: true },
        { name: 'year', description: 'Payroll year', required: true },
        { name: 'employeeName', description: 'Employee full name', required: true },
        { name: 'employeeId', description: 'Employee ID', required: true },
        { name: 'department', description: 'Department name', required: true },
        { name: 'designation', description: 'Designation', required: true },
        { name: 'basicSalary', description: 'Basic salary amount', required: true },
        { name: 'totalAllowances', description: 'Total allowances', required: true },
        { name: 'totalDeductions', description: 'Total deductions', required: true },
        { name: 'overtimeAmount', description: 'Overtime amount', required: true },
        { name: 'grossSalary', description: 'Gross salary', required: true },
        { name: 'netSalary', description: 'Net salary', required: true },
        { name: 'totalDays', description: 'Total working days', required: true },
        { name: 'presentDays', description: 'Present days', required: true },
        { name: 'absentDays', description: 'Absent days', required: true },
        { name: 'generatedDate', description: 'Generation date', required: true }
      ],
      isDefault: true,
      createdBy
    }
  ];
  
  for (const templateData of defaultTemplates) {
    const existingTemplate = await this.findOne({
      name: templateData.name,
      type: templateData.type
    });
    
    if (!existingTemplate) {
      const template = new this(templateData);
      await template.save();
    }
  }
};

module.exports = mongoose.model('Template', templateSchema);
