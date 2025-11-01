import React, { createContext, useContext, useState, useEffect } from 'react';
import { organizationService } from '../services/organizationService';

const LocalizationContext = createContext();

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

// Translation files
const translations = {
  en: {
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      reset: 'Reset',
      refresh: 'Refresh',
      export: 'Export',
      import: 'Import',
      download: 'Download',
      upload: 'Upload',
      print: 'Print',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      date: 'Date',
      time: 'Time',
      status: 'Status',
      action: 'Action',
      actions: 'Actions',
      total: 'Total',
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      draft: 'Draft',
      published: 'Published'
    },
    
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      employees: 'Employees',
      attendance: 'Attendance',
      leaves: 'Leaves',
      payroll: 'Payroll',
      templates: 'Templates',
      holidays: 'Holidays',
      profile: 'Profile',
      settings: 'Settings',
      liveDashboard: 'Live Dashboard'
    },
    
    // Authentication
    auth: {
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      rememberMe: 'Remember Me',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      welcomeBack: 'Welcome back',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      invalidCredentials: 'Invalid credentials',
      accountDeactivated: 'Account is deactivated',
      passwordChanged: 'Password changed successfully',
      profileUpdated: 'Profile updated successfully'
    },
    
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcomeBack: 'Welcome back',
      todayOverview: 'Today\'s Overview',
      totalEmployees: 'Total Employees',
      presentToday: 'Present Today',
      onBreak: 'On Break',
      absent: 'Absent',
      late: 'Late',
      attendanceRate: 'Attendance Rate',
      recentActivity: 'Recent Activity',
      departmentAttendance: 'Department Attendance',
      employeeStatus: 'Employee Status',
      pendingLeaves: 'Pending Leaves'
    },
    
    // Employees
    employees: {
      title: 'Employees',
      addEmployee: 'Add Employee',
      employeeId: 'Employee ID',
      firstName: 'First Name',
      lastName: 'Last Name',
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      department: 'Department',
      designation: 'Designation',
      role: 'Role',
      manager: 'Manager',
      joiningDate: 'Joining Date',
      salary: 'Salary',
      status: 'Status',
      profilePicture: 'Profile Picture',
      personalInfo: 'Personal Information',
      workInfo: 'Work Information',
      address: 'Address',
      dateOfBirth: 'Date of Birth',
      emergencyContact: 'Emergency Contact',
      teamMembers: 'Team Members',
      noEmployees: 'No employees found',
      employeeCreated: 'Employee created successfully',
      employeeUpdated: 'Employee updated successfully',
      employeeDeleted: 'Employee deleted successfully'
    },
    
    // Attendance
    attendance: {
      title: 'Attendance',
      checkIn: 'Check In',
      checkOut: 'Check Out',
      startBreak: 'Start Break',
      endBreak: 'End Break',
      breakType: 'Break Type',
      breakReason: 'Break Reason',
      checkInTime: 'Check-in Time',
      checkOutTime: 'Check-out Time',
      workingHours: 'Working Hours',
      breakTime: 'Break Time',
      overtime: 'Overtime',
      lateMinutes: 'Late Minutes',
      todayStatus: 'Today\'s Status',
      attendanceHistory: 'Attendance History',
      attendanceSummary: 'Attendance Summary',
      alreadyCheckedIn: 'Already checked in today',
      alreadyCheckedOut: 'Already checked out today',
      noCheckIn: 'No check in found for today',
      onBreak: 'On Break',
      checkedIn: 'Checked In',
      checkedOut: 'Checked Out',
      notCheckedIn: 'Not Checked In',
      breakHistory: 'Break History',
      activeBreak: 'Active Break',
      totalBreakTime: 'Total Break Time'
    },
    
    // Leaves
    leaves: {
      title: 'Leave Management',
      applyLeave: 'Apply Leave',
      leaveType: 'Leave Type',
      startDate: 'Start Date',
      endDate: 'End Date',
      totalDays: 'Total Days',
      reason: 'Reason',
      appliedDate: 'Applied Date',
      approvedBy: 'Approved By',
      approvedDate: 'Approved Date',
      rejectionReason: 'Rejection Reason',
      leaveBalance: 'Leave Balance',
      pendingApprovals: 'Pending Approvals',
      casual: 'Casual Leave',
      sick: 'Sick Leave',
      earned: 'Earned Leave',
      maternity: 'Maternity Leave',
      paternity: 'Paternity Leave',
      emergency: 'Emergency Leave',
      unpaid: 'Unpaid Leave',
      halfDay: 'Half Day',
      firstHalf: 'First Half',
      secondHalf: 'Second Half',
      workHandover: 'Work Handover',
      emergencyContact: 'Emergency Contact',
      attachments: 'Attachments',
      comments: 'Comments',
      addComment: 'Add Comment',
      approve: 'Approve',
      reject: 'Reject',
      cancel: 'Cancel',
      noLeaves: 'No leave applications found',
      leaveApplied: 'Leave application submitted successfully',
      leaveApproved: 'Leave approved successfully',
      leaveRejected: 'Leave rejected successfully',
      leaveCancelled: 'Leave cancelled successfully'
    },
    
    // Payroll
    payroll: {
      title: 'Payroll Management',
      generatePayroll: 'Generate Payroll',
      month: 'Month',
      year: 'Year',
      basicSalary: 'Basic Salary',
      allowances: 'Allowances',
      deductions: 'Deductions',
      grossSalary: 'Gross Salary',
      netSalary: 'Net Salary',
      overtime: 'Overtime',
      taxAmount: 'Tax Amount',
      payslip: 'Payslip',
      downloadPayslip: 'Download Payslip',
      approvePayroll: 'Approve Payroll',
      markAsPaid: 'Mark as Paid',
      paymentMethod: 'Payment Method',
      bankTransfer: 'Bank Transfer',
      cash: 'Cash',
      cheque: 'Cheque',
      bankDetails: 'Bank Details',
      accountNumber: 'Account Number',
      bankName: 'Bank Name',
      ifscCode: 'IFSC Code',
      noPayroll: 'No payroll records found',
      payrollGenerated: 'Payroll generated successfully',
      payrollApproved: 'Payroll approved successfully',
      payrollPaid: 'Payroll marked as paid successfully'
    },
    
    // Templates
    templates: {
      title: 'Template Management',
      createTemplate: 'Create Template',
      templateName: 'Template Name',
      templateType: 'Template Type',
      description: 'Description',
      content: 'Content',
      variables: 'Variables',
      usageCount: 'Usage Count',
      isDefault: 'Default',
      offerLetter: 'Offer Letter',
      payslip: 'Payslip',
      appointmentLetter: 'Appointment Letter',
      contract: 'Contract',
      other: 'Other',
      viewTemplate: 'View Template',
      duplicate: 'Duplicate',
      render: 'Render',
      noTemplates: 'No templates found',
      templateCreated: 'Template created successfully',
      templateUpdated: 'Template updated successfully',
      templateDeleted: 'Template deleted successfully'
    },
    
    // Holidays
    holidays: {
      title: 'Holiday Calendar',
      addHoliday: 'Add Holiday',
      holidayName: 'Holiday Name',
      holidayDate: 'Holiday Date',
      holidayType: 'Holiday Type',
      isPaid: 'Paid Holiday',
      national: 'National',
      regional: 'Regional',
      company: 'Company',
      religious: 'Religious',
      observance: 'Observance',
      upcomingHolidays: 'Upcoming Holidays',
      holidayCalendar: 'Holiday Calendar',
      noHolidays: 'No holidays found',
      holidayCreated: 'Holiday created successfully',
      holidayUpdated: 'Holiday updated successfully',
      holidayDeleted: 'Holiday deleted successfully'
    },
    
    // Profile
    profile: {
      title: 'Profile',
      personalInformation: 'Personal Information',
      workInformation: 'Work Information',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmNewPassword: 'Confirm New Password',
      updateProfile: 'Update Profile',
      profileUpdated: 'Profile updated successfully',
      passwordChanged: 'Password changed successfully'
    },
    
    // Settings
    settings: {
      title: 'Settings',
      themeSettings: 'Theme Settings',
      selectTheme: 'Select Theme',
      languageSettings: 'Language Settings',
      selectLanguage: 'Select Language',
      timezoneSettings: 'Timezone Settings',
      selectTimezone: 'Select Timezone',
      organizationSettings: 'Organization Settings',
      applicationInfo: 'Application Information',
      version: 'Version',
      buildDate: 'Build Date',
      userRole: 'User Role',
      lastLogin: 'Last Login'
    },
    
    // Live Dashboard
    liveDashboard: {
      title: 'Live Dashboard',
      realTimeMonitoring: 'Real-time Employee Activity Monitoring',
      enterFullscreen: 'Enter Fullscreen',
      exitFullscreen: 'Exit Fullscreen',
      lastUpdated: 'Last updated',
      autoRefresh: 'Auto-refresh: Every 30 seconds'
    },
    
    // Roles
    roles: {
      admin: 'Administrator',
      hr_admin: 'HR Administrator',
      manager: 'Manager',
      employee: 'Employee'
    },
    
    // Status
    status: {
      online: 'Online',
      offline: 'Offline',
      away: 'Away',
      busy: 'Busy'
    }
  },
  
  hi: {
    // Hindi translations (basic structure)
    common: {
      save: 'सेव करें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      view: 'देखें',
      add: 'जोड़ें',
      search: 'खोजें',
      loading: 'लोड हो रहा है...',
      error: 'त्रुटि',
      success: 'सफलता',
      yes: 'हाँ',
      no: 'नहीं'
    },
    nav: {
      dashboard: 'डैशबोर्ड',
      employees: 'कर्मचारी',
      attendance: 'उपस्थिति',
      leaves: 'छुट्टियां',
      payroll: 'वेतन',
      profile: 'प्रोफ़ाइल',
      settings: 'सेटिंग्स'
    },
    auth: {
      login: 'लॉगिन',
      email: 'ईमेल पता',
      password: 'पासवर्ड',
      signIn: 'साइन इन करें'
    }
  }
};

export const LocalizationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/New_York'); // Default to EST/ET
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('hh:mm A');
  const [isLoading, setIsLoading] = useState(true);

  // Load organization settings (including timezone) on mount
  useEffect(() => {
    const loadOrganizationSettings = async () => {
      try {
        const settings = await organizationService.getSettings();
        if (settings) {
          setTimezone(settings.timezone || 'America/New_York');
          setDateFormat(settings.dateFormat || 'MM/DD/YYYY');
          setTimeFormat(settings.timeFormat || 'hh:mm A');
          
          // Also save to localStorage for quick access
          localStorage.setItem('timezone', settings.timezone || 'America/New_York');
          localStorage.setItem('dateFormat', settings.dateFormat || 'MM/DD/YYYY');
          localStorage.setItem('timeFormat', settings.timeFormat || 'hh:mm A');
        }
      } catch (error) {
        console.error('Failed to load organization settings:', error);
        // Fallback to localStorage or defaults
        const savedTimezone = localStorage.getItem('timezone') || 'America/New_York';
        const savedDateFormat = localStorage.getItem('dateFormat') || 'MM/DD/YYYY';
        const savedTimeFormat = localStorage.getItem('timeFormat') || 'hh:mm A';
        
        setTimezone(savedTimezone);
        setDateFormat(savedDateFormat);
        setTimeFormat(savedTimeFormat);
      } finally {
        setIsLoading(false);
      }
    };

    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);

    loadOrganizationSettings();
  }, []);

  const changeLanguage = (language) => {
    setCurrentLanguage(language);
    localStorage.setItem('language', language);
  };

  const changeTimezone = (newTimezone) => {
    setTimezone(newTimezone);
    localStorage.setItem('timezone', newTimezone);
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations[currentLanguage];
    
    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        // Fallback to English if translation not found
        translation = translations.en;
        for (const fallbackKey of keys) {
          if (translation && translation[fallbackKey]) {
            translation = translation[fallbackKey];
          } else {
            return key; // Return key if no translation found
          }
        }
        break;
      }
    }
    
    // Replace parameters in translation
    if (typeof translation === 'string') {
      return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
        return params[param] || match;
      });
    }
    
    return translation || key;
  };

  const formatDate = (date, formatOverride = null) => {
    if (!date) return '';
    
    const d = new Date(date);
    const formatToUse = formatOverride || dateFormat;
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    if (formatToUse === 'DD/MM/YYYY') {
      return d.toLocaleDateString('en-GB', options);
    } else if (formatToUse === 'MM/DD/YYYY') {
      return d.toLocaleDateString('en-US', options);
    } else if (formatToUse === 'YYYY-MM-DD') {
      return d.toISOString().split('T')[0];
    }
    
    return d.toLocaleDateString('en-GB', options);
  };

  const formatTime = (date, formatOverride = null) => {
    if (!date) return '';
    
    const d = new Date(date);
    const formatToUse = formatOverride || timeFormat;
    const options = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    };
    
    if (formatToUse === 'HH:mm') {
      return d.toLocaleTimeString('en-GB', options);
    } else if (formatToUse === 'hh:mm A') {
      return d.toLocaleTimeString('en-US', { ...options, hour12: true });
    }
    
    return d.toLocaleTimeString('en-GB', options);
  };

  // Refresh organization settings when they might be updated
  const refreshSettings = async () => {
    try {
      const settings = await organizationService.getSettings();
      if (settings) {
        setTimezone(settings.timezone || 'America/New_York');
        setDateFormat(settings.dateFormat || 'MM/DD/YYYY');
        setTimeFormat(settings.timeFormat || 'hh:mm A');
        
        localStorage.setItem('timezone', settings.timezone || 'America/New_York');
        localStorage.setItem('dateFormat', settings.dateFormat || 'MM/DD/YYYY');
        localStorage.setItem('timeFormat', settings.timeFormat || 'hh:mm A');
      }
    } catch (error) {
      console.error('Failed to refresh organization settings:', error);
    }
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      timeZone: timezone
    }).format(amount);
  };

  const getAvailableLanguages = () => {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
    ];
  };

  const getAvailableTimezones = () => {
    return [
      { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
      { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
      { value: 'America/New_York', label: 'Eastern Time (ET)' },
      { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
      { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
    ];
  };

  const value = {
    currentLanguage,
    timezone,
    dateFormat,
    timeFormat,
    isLoading,
    changeLanguage,
    changeTimezone,
    refreshSettings,
    t,
    formatDate,
    formatTime,
    formatCurrency,
    getAvailableLanguages,
    getAvailableTimezones
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};
