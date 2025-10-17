#!/usr/bin/env node

/**
 * Comprehensive Feature Testing Script for ShirinQ Connect
 * This script tests all major features and user personas
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USERS = {
  admin: { email: 'admin@shirinq.com', password: 'admin123' },
  hr: { email: 'hr@shirinq.com', password: 'hr123' },
  manager: { email: 'manager@shirinq.com', password: 'manager123' },
  employee: { email: 'employee@shirinq.com', password: 'employee123' }
};

class FeatureTester {
  constructor() {
    this.tokens = {};
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;
    
    switch (type) {
      case 'success':
        console.log(`${prefix} ✅ ${message}`.green);
        break;
      case 'error':
        console.log(`${prefix} ❌ ${message}`.red);
        break;
      case 'warning':
        console.log(`${prefix} ⚠️  ${message}`.yellow);
        break;
      case 'info':
        console.log(`${prefix} ℹ️  ${message}`.blue);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  async makeRequest(method, endpoint, data = null, token = null) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  async test(testName, testFunction) {
    this.testResults.total++;
    this.log(`Testing: ${testName}`, 'info');
    
    try {
      await testFunction();
      this.testResults.passed++;
      this.log(`✅ ${testName} - PASSED`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
    }
  }

  async authenticateUsers() {
    this.log('Authenticating test users...', 'info');
    
    for (const [role, credentials] of Object.entries(TEST_USERS)) {
      const result = await this.makeRequest('POST', '/auth/login', credentials);
      
      if (result.success) {
        this.tokens[role] = result.data.token;
        this.log(`Authenticated ${role} user`, 'success');
      } else {
        throw new Error(`Failed to authenticate ${role} user: ${result.error.message}`);
      }
    }
  }

  async testAuthentication() {
    await this.test('Admin Login', async () => {
      const result = await this.makeRequest('POST', '/auth/login', TEST_USERS.admin);
      if (!result.success) throw new Error('Admin login failed');
      if (!result.data.token) throw new Error('No token received');
    });

    await this.test('Invalid Login', async () => {
      const result = await this.makeRequest('POST', '/auth/login', {
        email: 'invalid@test.com',
        password: 'wrongpassword'
      });
      if (result.success) throw new Error('Invalid login should fail');
      if (result.status !== 401) throw new Error('Should return 401 status');
    });

    await this.test('Get User Profile', async () => {
      const result = await this.makeRequest('GET', '/auth/profile', null, this.tokens.admin);
      if (!result.success) throw new Error('Failed to get profile');
      if (result.data.user.role !== 'admin') throw new Error('Wrong user role');
    });
  }

  async testEmployeeManagement() {
    await this.test('Get All Employees', async () => {
      const result = await this.makeRequest('GET', '/employees', null, this.tokens.admin);
      if (!result.success) throw new Error('Failed to get employees');
      if (!Array.isArray(result.data.employees)) throw new Error('Employees should be an array');
    });

    await this.test('Create New Employee', async () => {
      const newEmployee = {
        employeeId: 'TEST001',
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@shirinq.com',
        password: 'test123',
        role: 'employee',
        department: 'Testing',
        designation: 'Test Engineer',
        salary: 45000
      };

      const result = await this.makeRequest('POST', '/employees', newEmployee, this.tokens.admin);
      if (!result.success) throw new Error('Failed to create employee');
      if (result.data.employee.employeeId !== 'TEST001') throw new Error('Wrong employee ID');
    });

    await this.test('Employee Access Control', async () => {
      const result = await this.makeRequest('GET', '/employees', null, this.tokens.employee);
      if (result.success) throw new Error('Employee should not access all employees');
    });
  }

  async testAttendanceManagement() {
    await this.test('Employee Check-in', async () => {
      const checkInData = {
        location: { latitude: 0, longitude: 0, address: 'Test Location' },
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test Device'
      };

      const result = await this.makeRequest('POST', '/attendance/checkin', checkInData, this.tokens.employee);
      if (!result.success) throw new Error('Failed to check in');
      if (!result.data.attendance.checkIn) throw new Error('No check-in data received');
    });

    await this.test('Get Today Attendance', async () => {
      const result = await this.makeRequest('GET', '/attendance/today', null, this.tokens.employee);
      if (!result.success) throw new Error('Failed to get today attendance');
      if (!result.data.status) throw new Error('No status received');
    });

    await this.test('Start Break', async () => {
      const breakData = {
        breakType: 'lunch',
        reason: 'Lunch break'
      };

      const result = await this.makeRequest('POST', '/attendance/break/start', breakData, this.tokens.employee);
      if (!result.success) throw new Error('Failed to start break');
    });

    await this.test('End Break', async () => {
      const result = await this.makeRequest('POST', '/attendance/break/end', null, this.tokens.employee);
      if (!result.success) throw new Error('Failed to end break');
    });

    await this.test('Check-out', async () => {
      const checkOutData = {
        location: { latitude: 0, longitude: 0, address: 'Test Location' },
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test Device'
      };

      const result = await this.makeRequest('POST', '/attendance/checkout', checkOutData, this.tokens.employee);
      if (!result.success) throw new Error('Failed to check out');
    });

    await this.test('Dashboard Overview', async () => {
      const result = await this.makeRequest('GET', '/attendance/dashboard/overview', null, this.tokens.admin);
      if (!result.success) throw new Error('Failed to get dashboard overview');
      if (!result.data.overview) throw new Error('No overview data received');
    });
  }

  async testLeaveManagement() {
    await this.test('Apply for Leave', async () => {
      const leaveData = {
        leaveType: 'casual',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Personal work',
        isHalfDay: false
      };

      const result = await this.makeRequest('POST', '/leaves', leaveData, this.tokens.employee);
      if (!result.success) throw new Error('Failed to apply for leave');
      if (result.data.leave.leaveType !== 'casual') throw new Error('Wrong leave type');
    });

    await this.test('Get Leave Applications', async () => {
      const result = await this.makeRequest('GET', '/leaves', null, this.tokens.manager);
      if (!result.success) throw new Error('Failed to get leave applications');
      if (!Array.isArray(result.data.leaves)) throw new Error('Leaves should be an array');
    });

    await this.test('Get Leave Balance', async () => {
      const result = await this.makeRequest('GET', '/leaves/balance/EMP001', null, this.tokens.employee);
      if (!result.success) throw new Error('Failed to get leave balance');
      if (!result.data.balance) throw new Error('No balance data received');
    });
  }

  async testPayrollManagement() {
    await this.test('Generate Monthly Payroll', async () => {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const result = await this.makeRequest('POST', '/payroll/generate', { month, year }, this.tokens.hr);
      if (!result.success) throw new Error('Failed to generate payroll');
      if (!result.data.count) throw new Error('No payroll count received');
    });

    await this.test('Get Payroll Records', async () => {
      const result = await this.makeRequest('GET', '/payroll', null, this.tokens.hr);
      if (!result.success) throw new Error('Failed to get payroll records');
      if (!Array.isArray(result.data.payrolls)) throw new Error('Payrolls should be an array');
    });

    await this.test('Employee Payroll Access', async () => {
      const result = await this.makeRequest('GET', '/payroll', null, this.tokens.employee);
      if (!result.success) throw new Error('Employee should access their own payroll');
    });
  }

  async testTemplateManagement() {
    await this.test('Get Templates', async () => {
      const result = await this.makeRequest('GET', '/templates', null, this.tokens.hr);
      if (!result.success) throw new Error('Failed to get templates');
      if (!Array.isArray(result.data.templates)) throw new Error('Templates should be an array');
    });

    await this.test('Create Template', async () => {
      const templateData = {
        name: 'Test Template',
        type: 'offer_letter',
        description: 'Test template description',
        content: 'Hello {{name}}, welcome to {{company}}!',
        category: 'hr'
      };

      const result = await this.makeRequest('POST', '/templates', templateData, this.tokens.hr);
      if (!result.success) throw new Error('Failed to create template');
      if (result.data.template.name !== 'Test Template') throw new Error('Wrong template name');
    });

    await this.test('Template Access Control', async () => {
      const result = await this.makeRequest('GET', '/templates', null, this.tokens.employee);
      if (result.success) throw new Error('Employee should not access templates');
    });
  }

  async testHolidayManagement() {
    await this.test('Get Holidays', async () => {
      const result = await this.makeRequest('GET', '/holidays', null, this.tokens.admin);
      if (!result.success) throw new Error('Failed to get holidays');
      if (!Array.isArray(result.data.holidays)) throw new Error('Holidays should be an array');
    });

    await this.test('Create Holiday', async () => {
      const holidayData = {
        name: 'Test Holiday',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'company',
        description: 'Test holiday description',
        isPaid: true
      };

      const result = await this.makeRequest('POST', '/holidays', holidayData, this.tokens.hr);
      if (!result.success) throw new Error('Failed to create holiday');
      if (result.data.holiday.name !== 'Test Holiday') throw new Error('Wrong holiday name');
    });
  }

  async testDashboardFeatures() {
    await this.test('Get Dashboard Widgets', async () => {
      const result = await this.makeRequest('GET', '/dashboard/widgets', null, this.tokens.admin);
      if (!result.success) throw new Error('Failed to get dashboard widgets');
      if (!Array.isArray(result.data.widgets)) throw new Error('Widgets should be an array');
    });

    await this.test('Get Dashboard Overview', async () => {
      const result = await this.makeRequest('GET', '/dashboard/overview', null, this.tokens.admin);
      if (!result.success) throw new Error('Failed to get dashboard overview');
      if (!result.data.overview) throw new Error('No overview data received');
    });
  }

  async testRoleBasedAccess() {
    await this.test('Admin Full Access', async () => {
      const endpoints = ['/employees', '/payroll', '/templates', '/holidays'];
      
      for (const endpoint of endpoints) {
        const result = await this.makeRequest('GET', endpoint, null, this.tokens.admin);
        if (!result.success) throw new Error(`Admin should access ${endpoint}`);
      }
    });

    await this.test('HR Admin Access', async () => {
      const allowedEndpoints = ['/employees', '/payroll', '/templates', '/holidays'];
      const restrictedEndpoints = ['/dashboard/widgets'];
      
      for (const endpoint of allowedEndpoints) {
        const result = await this.makeRequest('GET', endpoint, null, this.tokens.hr);
        if (!result.success) throw new Error(`HR should access ${endpoint}`);
      }
    });

    await this.test('Manager Access', async () => {
      const result = await this.makeRequest('GET', '/leaves', null, this.tokens.manager);
      if (!result.success) throw new Error('Manager should access leaves');
    });

    await this.test('Employee Restricted Access', async () => {
      const restrictedEndpoints = ['/employees', '/payroll', '/templates'];
      
      for (const endpoint of restrictedEndpoints) {
        const result = await this.makeRequest('GET', endpoint, null, this.tokens.employee);
        if (result.success) throw new Error(`Employee should not access ${endpoint}`);
      }
    });
  }

  async testErrorHandling() {
    await this.test('404 Error Handling', async () => {
      const result = await this.makeRequest('GET', '/nonexistent', null, this.tokens.admin);
      if (result.success) throw new Error('Should return 404 for nonexistent endpoint');
      if (result.status !== 404) throw new Error('Should return 404 status');
    });

    await this.test('Unauthorized Access', async () => {
      const result = await this.makeRequest('GET', '/employees');
      if (result.success) throw new Error('Should require authentication');
      if (result.status !== 401) throw new Error('Should return 401 status');
    });

    await this.test('Invalid Data Validation', async () => {
      const invalidEmployee = {
        firstName: 'Test'
        // Missing required fields
      };

      const result = await this.makeRequest('POST', '/employees', invalidEmployee, this.tokens.admin);
      if (result.success) throw new Error('Should reject invalid data');
    });
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Feature Testing for ShirinQ Connect', 'info');
    this.log('=' * 60, 'info');

    try {
      await this.authenticateUsers();
      
      await this.testAuthentication();
      await this.testEmployeeManagement();
      await this.testAttendanceManagement();
      await this.testLeaveManagement();
      await this.testPayrollManagement();
      await this.testTemplateManagement();
      await this.testHolidayManagement();
      await this.testDashboardFeatures();
      await this.testRoleBasedAccess();
      await this.testErrorHandling();

    } catch (error) {
      this.log(`Critical error: ${error.message}`, 'error');
    }

    this.printResults();
  }

  printResults() {
    this.log('=' * 60, 'info');
    this.log('📊 TEST RESULTS SUMMARY', 'info');
    this.log('=' * 60, 'info');
    
    this.log(`Total Tests: ${this.testResults.total}`, 'info');
    this.log(`Passed: ${this.testResults.passed}`.green, 'success');
    this.log(`Failed: ${this.testResults.failed}`.red, 'error');
    
    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(2);
    
    if (successRate >= 90) {
      this.log(`Success Rate: ${successRate}% - EXCELLENT! 🎉`, 'success');
    } else if (successRate >= 80) {
      this.log(`Success Rate: ${successRate}% - GOOD! 👍`, 'warning');
    } else {
      this.log(`Success Rate: ${successRate}% - NEEDS IMPROVEMENT! ⚠️`, 'error');
    }

    this.log('=' * 60, 'info');
    
    if (this.testResults.failed === 0) {
      this.log('🎉 ALL TESTS PASSED! The application is working perfectly!', 'success');
    } else {
      this.log(`⚠️  ${this.testResults.failed} tests failed. Please review the errors above.`, 'warning');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new FeatureTester();
  tester.runAllTests().catch(console.error);
}

module.exports = FeatureTester;
