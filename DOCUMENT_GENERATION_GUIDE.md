# HRMS Document Generation System - Complete Guide

## Overview
This HRMS application now has a **complete template-based document generation system** for automating HR document workflows including offer letters, appointment letters, payslips, experience certificates, and leave approval/rejection letters.

---

## 🎯 Key Features

### ✅ Implemented Features:
1. **Template Management System** - Centralized template creation and management
2. **Offer Letter Generation** - Generate customized offer letters for candidates
3. **Appointment Letter Generation** - Formal appointment letters for new employees
4. **Payslip Generation** - Comprehensive monthly payslips with detailed breakdown
5. **Bulk Payslip Generation** - Generate and download payslips for all employees
6. **Experience Certificate** - Automatically generated for exiting employees
7. **Relieving Letter** - Formal relieving letters
8. **Leave Approval/Rejection Letters** - Auto-generated on leave status change
9. **Document Preview & Download** - View and download documents in HTML format
10. **Print Functionality** - Direct print option for all documents

---

## 📋 Complete Document Flow

### **1. Recruitment to Onboarding Flow**

```
Candidate Selection 
    ↓
Generate Offer Letter (HR Admin)
    ↓
Candidate Accepts
    ↓
Create Employee Record
    ↓
Generate Appointment Letter
    ↓
Employee Onboarding Complete
```

#### **How to Generate Offer Letter:**
1. Navigate to **Employees** page
2. Click **"Add Employee"** or use dedicated offer generation
3. Use API: `POST /api/employees/generate-offer`
4. Required fields:
   - Candidate Name
   - Designation
   - Department
   - Joining Date
   - Salary (CTC)
   - Location

**Backend Endpoint:**
```javascript
POST /api/employees/generate-offer
Body: {
  candidateName: "John Doe",
  designation: "Senior Developer",
  department: "Engineering",
  joiningDate: "2025-12-01",
  salary: 1200000,
  location: "Bangalore",
  reportingManager: "Jane Smith",
  probationPeriod: 3
}
```

#### **How to Generate Appointment Letter:**
1. Navigate to **Employees** page
2. Find the employee and click **Document Icon** (📄)
3. Select **"Appointment Letter"**
4. Preview → Download or Print

**Backend Endpoint:**
```javascript
POST /api/employees/:employeeId/generate-appointment
```

---

### **2. Monthly Payroll Flow**

```
Month End (Day 1-30: Attendance & Leaves tracked)
    ↓
Day 30: HR Generates Monthly Payroll
    ↓
System Calculates:
  - Basic Salary (based on attendance)
  - Allowances (HRA, Medical, Transport)
  - Deductions (PF, ESI, Tax)
  - Overtime Pay
  - Paid Leave Days
    ↓
Day 1: HR Reviews & Approves Payroll
    ↓
Day 3: Finance Marks as Paid
    ↓
Generate Payslips for All Employees
    ↓
Employees Download Their Payslips
```

#### **Generate Monthly Payroll:**
1. Navigate to **Payroll** page
2. Click **"Generate Payroll"**
3. Select Month and Year
4. Click Generate

**Backend Endpoint:**
```javascript
POST /api/payroll/generate
Body: {
  month: 11,
  year: 2025
}
```

**What Happens Behind the Scenes:**
- System fetches all active employees
- Gets attendance records for the month
- Calculates approved leave days
- Computes:
  - Daily rate = Monthly Salary / Total Days
  - Basic Salary = Daily Rate × (Present Days + Paid Leave Days)
  - HRA = 40% of Basic Salary
  - Medical Allowance = ₹1,250 (fixed)
  - Transport Allowance = ₹1,600 (fixed)
  - PF = 12% of Basic Salary
  - ESI = 0.75% of Gross (if applicable)
  - Tax = Based on annual income slabs
  - Overtime = Extra hours × 1.5× hourly rate
  - Net Salary = Gross - Deductions

#### **Generate Bulk Payslips:**
1. Navigate to **Payroll** page
2. Click **"Bulk Payslips"** button
3. Select Month and Year
4. Click **"Generate Payslips"**
5. View list of all generated payslips
6. Options:
   - **View** individual payslips
   - **Download** individual payslips
   - **Print** individual payslips
   - **Download All** payslips at once

**Backend Endpoint:**
```javascript
POST /api/payroll/payslips/bulk-generate
Body: {
  month: 11,
  year: 2025
}

Response: {
  message: "Generated 45 payslips successfully",
  count: 45,
  payslips: [
    {
      payrollId: "xxx",
      employee: { id: "yyy", name: "John Doe", employeeId: "EMP001" },
      content: "<html>...</html>",
      netSalary: 85000
    },
    // ... more payslips
  ]
}
```

#### **Individual Payslip Generation:**
```javascript
GET /api/payroll/:payrollId/payslip
```

**Payslip Contents:**
- Company details
- Employee information (ID, Name, Department, Designation)
- Pay period (Month, Year)
- **Earnings:**
  - Basic Salary
  - HRA
  - Medical Allowance
  - Transport Allowance
  - Overtime Pay
  - Gross Salary
- **Deductions:**
  - Provident Fund (PF)
  - ESI
  - Professional Tax
  - Income Tax (TDS)
  - Total Deductions
- **Net Salary** (in numbers and words)
- **Attendance Summary:**
  - Total Days
  - Present Days
  - Absent Days
  - Paid Leave Days
  - Late Days
  - Working Hours

---

### **3. Leave Management Flow**

```
Employee Applies for Leave
    ↓
Manager/HR Reviews
    ↓
Approve or Reject
    ↓
Automatic Letter Generation:
  - Approval Letter (if approved)
  - Rejection Letter (if rejected)
    ↓
Employee Receives Notification & Letter
```

#### **Backend Auto-Generation:**
When leave status changes to 'approved' or 'rejected', the system automatically:

**Backend Implementation (in `leaves.js`):**
```javascript
// After approval/rejection
const templateType = status === 'approved' ? 'leave_approval' : 'leave_rejection';
const template = await Template.findOne({ type: templateType, isDefault: true });

const templateData = {
  employeeName: leave.employee.fullName,
  leaveType: leave.leaveType,
  startDate: formatDate(leave.startDate),
  endDate: formatDate(leave.endDate),
  totalDays: leave.totalDays,
  reason: leave.reason,
  approverName: user.fullName,
  approverRemarks: leave.approverRemarks || 'N/A',
  // For approval
  approvalDate: formatDate(new Date()),
  // For rejection
  rejectionReason: leave.rejectionReason || 'Not specified',
  rejectionDate: formatDate(new Date())
};

const letterContent = template.render(templateData);
// Return letter in response
```

---

### **4. Employee Exit Flow**

```
Employee Resigns
    ↓
Notice Period Completion
    ↓
Last Working Day
    ↓
Generate Exit Documents:
  - Experience Certificate
  - Relieving Letter
    ↓
Final Settlement
```

#### **Generate Experience Certificate:**
1. Navigate to **Employees** page
2. Find the employee and click **Document Icon** (📄)
3. Select **"Experience Certificate"**
4. System calculates total experience
5. Preview → Download or Print

**Backend Endpoint:**
```javascript
POST /api/employees/:employeeId/generate-experience
Body: {
  lastWorkingDate: "2025-11-30"
}
```

#### **Generate Relieving Letter:**
1. Navigate to **Employees** page
2. Find the employee and click **Document Icon** (📄)
3. Select **"Relieving Letter"**
4. Preview → Download or Print

**Backend Endpoint:**
```javascript
POST /api/employees/:employeeId/generate-relieving
Body: {
  lastWorkingDate: "2025-11-30"
}
```

---

## 🛠️ Technical Implementation

### **Template System Architecture:**

#### **Template Model:**
```javascript
{
  name: "Standard Payslip",
  type: "payslip", // offer_letter, appointment_letter, payslip, etc.
  content: "<html>...</html>", // HTML with {{variable}} placeholders
  isDefault: true, // One default template per type
  category: "payroll", // hr, payroll, legal, general
  usageCount: 0 // Tracks how many times used
}
```

#### **Template Rendering:**
```javascript
template.render(data) // Replaces {{variable}} with actual data
```

### **Utility Functions (`documentUtils.js`):**

```javascript
// Currency Formatting
formatCurrency(50000) // "₹50,000.00"

// Number to Words
numberToWords(50000) // "Fifty Thousand Rupees Only"

// Tax Calculation (Indian Slabs)
calculateTax(annualIncome) // Returns tax amount

// Date Formatting
formatDate(new Date(), 'DD MMMM YYYY') // "25 November 2025"

// Experience Calculation
calculateExperience(joiningDate, exitDate) // "2 years and 5 months"

// Salary Components
calculatePF(basicSalary) // 12% of basic
calculateESI(grossSalary) // 0.75% if gross <= ₹21,000
calculateHRA(basicSalary) // 40% of basic
```

---

## 🚀 Setup Instructions

### **1. Initialize Default Templates:**

Run this command **once** to create all default templates:

```bash
cd server
node init-templates.js
```

This creates 7 default templates:
1. Offer Letter
2. Appointment Letter
3. Monthly Payslip
4. Leave Approval Letter
5. Leave Rejection Letter
6. Experience Certificate
7. Relieving Letter

### **2. Verify Templates:**

Check MongoDB:
```javascript
db.templates.find({}).pretty()
```

You should see 7 documents with `isDefault: true`.

---

## 📊 API Endpoints Summary

### **Employee Documents:**
```
POST /api/employees/generate-offer              // Generate offer letter
POST /api/employees/:id/generate-appointment    // Generate appointment letter
POST /api/employees/:id/generate-experience     // Generate experience certificate
POST /api/employees/:id/generate-relieving      // Generate relieving letter
```

### **Payroll Documents:**
```
POST /api/payroll/generate                      // Generate monthly payroll
GET  /api/payroll/:id/payslip                   // Get individual payslip
POST /api/payroll/payslips/bulk-generate        // Generate bulk payslips
PUT  /api/payroll/:id/approve                   // Approve payroll
PUT  /api/payroll/:id/pay                       // Mark as paid
```

### **Leave Documents:**
```
PUT /api/leaves/:id/approve                     // Approve/reject (auto-generates letter)
```

### **Templates:**
```
GET    /api/templates                           // Get all templates
POST   /api/templates                           // Create template
PUT    /api/templates/:id                       // Update template
DELETE /api/templates/:id                       // Delete template
```

---

## 🎨 Frontend Components

### **Employees Page:**
- **Document Generation Button** (📄 icon)
  - Appointment Letter
  - Experience Certificate
  - Relieving Letter
- **Document Preview Dialog**
  - View HTML content
  - Download as HTML
  - Print directly

### **Payroll Page:**
- **Bulk Payslips Button**
  - Select month/year
  - Generate all payslips
  - View list of generated payslips
  - Download individual or all payslips
  - Print payslips
- **Individual Payslip Actions**
  - View, Download, Print for each payroll record

### **Templates Page:**
- **Create/Edit Templates** with p-editor (rich text editor)
- **Preview Templates**
- **Set Default Templates**
- **Track Usage Count**

---

## 📝 Customization Guide

### **Modify Template Content:**
1. Navigate to **Templates** page
2. Find the template you want to modify
3. Click **Edit**
4. Use the rich text editor to modify HTML content
5. Use `{{variableName}}` for dynamic data
6. Save changes

### **Create New Template:**
1. Navigate to **Templates** page
2. Click **"Create Template"**
3. Fill in:
   - Template Name
   - Type (select from dropdown)
   - Description
   - Content (HTML with placeholders)
4. Mark as **Default** if needed
5. Save

### **Available Variables by Document Type:**

#### **Offer Letter:**
- `{{companyName}}`, `{{companyAddress}}`, `{{offerDate}}`
- `{{candidateName}}`, `{{designation}}`, `{{department}}`
- `{{reportingManager}}`, `{{joiningDate}}`, `{{location}}`
- `{{ctc}}`, `{{probationPeriod}}`, `{{acceptanceDeadline}}`
- `{{hrName}}`

#### **Payslip:**
- `{{companyName}}`, `{{month}}`, `{{year}}`
- `{{employeeName}}`, `{{employeeId}}`, `{{department}}`, `{{designation}}`
- `{{basicSalary}}`, `{{hra}}`, `{{medical}}`, `{{transport}}`
- `{{pf}}`, `{{esi}}`, `{{tax}}`, `{{grossSalary}}`, `{{netSalary}}`
- `{{totalDays}}`, `{{presentDays}}`, `{{absentDays}}`, `{{paidLeaveDays}}`

#### **Leave Approval:**
- `{{employeeName}}`, `{{leaveType}}`, `{{startDate}}`, `{{endDate}}`
- `{{totalDays}}`, `{{reason}}`, `{{approverName}}`, `{{approvalDate}}`

---

## 🔒 Security & Permissions

### **Role-Based Access:**
- **Admin** - Full access to all documents
- **HR Admin** - Can generate all HR documents except for admin users
- **Manager** - Can approve leaves and view team payrolls
- **Employee** - Can view own payslip and leave letters

### **Permission Checks:**
```javascript
hasPermission('manage_employees') // For HR documents
hasPermission('manage_payroll')   // For payroll operations
```

---

## 📈 Future Enhancements (Recommendations)

1. **PDF Generation** - Convert HTML to PDF using `puppeteer` or `pdfkit`
2. **Email Integration** - Auto-send documents via email
3. **E-Signature** - Digital signature integration
4. **Document Storage** - Store generated documents in database
5. **Audit Trail** - Track who generated which document and when
6. **Multi-Language Support** - Templates in multiple languages
7. **Bank Integration** - Direct salary transfer
8. **Tax Forms** - Generate Form 16, Form 16A
9. **Batch Processing** - Schedule automated payroll generation
10. **Document Versioning** - Track changes to templates

---

## 🐛 Troubleshooting

### **Templates Not Showing:**
```bash
# Run initialization script
cd server
node init-templates.js
```

### **Variables Not Replacing:**
- Ensure template uses correct syntax: `{{variableName}}`
- Check if variable name matches exactly (case-sensitive)
- Verify data is being passed to `template.render(data)`

### **Payslip Calculation Issues:**
- Verify attendance records exist for the month
- Check leave approvals are in place
- Ensure employee salary is set correctly

### **Document Generation Fails:**
- Check template exists: `db.templates.findOne({ type: 'payslip', isDefault: true })`
- Verify all required data fields are provided
- Check server console for error messages

---

## 📞 Support

For issues or questions:
1. Check server logs: `server/logs/`
2. Review MongoDB collections: `templates`, `payrolls`, `leaves`
3. Test API endpoints using Postman
4. Verify user permissions in `User` model

---

## ✅ Implementation Checklist

- [x] Template model with render method
- [x] Document utility functions
- [x] Offer letter generation
- [x] Appointment letter generation
- [x] Monthly payroll generation with leave tracking
- [x] Comprehensive payslip generation
- [x] Bulk payslip generation
- [x] Leave approval/rejection letters
- [x] Experience certificate generation
- [x] Relieving letter generation
- [x] Frontend UI for document generation
- [x] Frontend UI for bulk payslips
- [x] Document preview and download
- [x] Print functionality
- [x] Template management interface
- [x] Default templates initialization script

---

## 🎉 Conclusion

Your HRMS now has a **complete, production-ready document generation system** that automates all major HR workflows. The template-based approach ensures:

✅ **Consistency** - All documents follow standard format  
✅ **Flexibility** - Easy to customize templates  
✅ **Scalability** - Can generate documents for 1000s of employees  
✅ **Maintainability** - Centralized template management  
✅ **Automation** - Reduces manual HR work significantly  

**Next Steps:**
1. Run `node init-templates.js` to initialize templates
2. Test document generation for each type
3. Customize templates as per your organization's needs
4. Train HR team on using the system

Happy Document Generation! 🚀
