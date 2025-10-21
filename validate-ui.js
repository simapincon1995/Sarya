#!/usr/bin/env node

/**
 * UI Validation Script for Sarya Connective
 * This script validates all UI components and user flows
 */

const puppeteer = require('puppeteer');
const colors = require('colors');

class UIValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
    this.baseUrl = 'http://localhost:3000';
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

  async init() {
    this.log('Initializing browser...', 'info');
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async login(email, password) {
    await this.page.goto(`${this.baseUrl}/login`);
    await this.page.waitForSelector('input[name="email"]');
    
    await this.page.type('input[name="email"]', email);
    await this.page.type('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  async testLoginPage() {
    await this.test('Login Page Loads', async () => {
      await this.page.goto(`${this.baseUrl}/login`);
      await this.page.waitForSelector('form');
      
      const title = await this.page.title();
      if (!title.includes('Login')) {
        throw new Error('Login page title not found');
      }
    });

    await this.test('Login Form Elements', async () => {
      const emailInput = await this.page.$('input[name="email"]');
      const passwordInput = await this.page.$('input[name="password"]');
      const submitButton = await this.page.$('button[type="submit"]');
      
      if (!emailInput || !passwordInput || !submitButton) {
        throw new Error('Login form elements not found');
      }
    });

    await this.test('Invalid Login', async () => {
      await this.page.goto(`${this.baseUrl}/login`);
      await this.page.type('input[name="email"]', 'invalid@test.com');
      await this.page.type('input[name="password"]', 'wrongpassword');
      await this.page.click('button[type="submit"]');
      
      // Wait for error message
      await this.page.waitForTimeout(2000);
      const errorMessage = await this.page.$('.p-message-error');
      if (!errorMessage) {
        throw new Error('Error message not displayed for invalid login');
      }
    });
  }

  async testAdminUserFlow() {
    await this.test('Admin Login', async () => {
      await this.login('admin@sarya.com', 'admin123');
      
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/dashboard')) {
        throw new Error('Admin not redirected to dashboard after login');
      }
    });

    await this.test('Admin Dashboard', async () => {
      await this.page.waitForSelector('[data-testid="dashboard"]');
      
      const dashboardElements = await this.page.$$('[data-testid="dashboard"] > *');
      if (dashboardElements.length === 0) {
        throw new Error('Dashboard elements not found');
      }
    });

    await this.test('Admin Navigation Menu', async () => {
      const menuItems = await this.page.$$('.p-menuitem');
      if (menuItems.length < 5) {
        throw new Error('Admin navigation menu items not found');
      }
    });

    await this.test('Admin Employee Management', async () => {
      await this.page.click('a[href="/employees"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const employeeTable = await this.page.$('.p-datatable');
      if (!employeeTable) {
        throw new Error('Employee management table not found');
      }
    });

    await this.test('Admin Settings Access', async () => {
      await this.page.click('a[href="/settings"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const settingsPage = await this.page.$('[data-testid="settings"]');
      if (!settingsPage) {
        throw new Error('Settings page not accessible to admin');
      }
    });
  }

  async testHRUserFlow() {
    await this.test('HR Admin Login', async () => {
      await this.login('hr@sarya.com', 'hr123');
      
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/dashboard')) {
        throw new Error('HR Admin not redirected to dashboard after login');
      }
    });

    await this.test('HR Payroll Access', async () => {
      await this.page.click('a[href="/payroll"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const payrollPage = await this.page.$('[data-testid="payroll"]');
      if (!payrollPage) {
        throw new Error('Payroll page not accessible to HR Admin');
      }
    });

    await this.test('HR Template Management', async () => {
      await this.page.click('a[href="/templates"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const templatePage = await this.page.$('[data-testid="templates"]');
      if (!templatePage) {
        throw new Error('Template management not accessible to HR Admin');
      }
    });
  }

  async testManagerUserFlow() {
    await this.test('Manager Login', async () => {
      await this.login('manager@sarya.com', 'manager123');
      
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/dashboard')) {
        throw new Error('Manager not redirected to dashboard after login');
      }
    });

    await this.test('Manager Leave Approvals', async () => {
      await this.page.click('a[href="/leaves"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const leavePage = await this.page.$('[data-testid="leaves"]');
      if (!leavePage) {
        throw new Error('Leave management not accessible to Manager');
      }
    });
  }

  async testEmployeeUserFlow() {
    await this.test('Employee Login', async () => {
      await this.login('employee@sarya.com', 'employee123');
      
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/dashboard')) {
        throw new Error('Employee not redirected to dashboard after login');
      }
    });

    await this.test('Employee Attendance Check-in', async () => {
      await this.page.click('a[href="/attendance"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const checkInButton = await this.page.$('[data-testid="checkin-button"]');
      if (!checkInButton) {
        throw new Error('Check-in button not found for employee');
      }
    });

    await this.test('Employee Leave Application', async () => {
      await this.page.click('a[href="/leaves"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const applyLeaveButton = await this.page.$('[data-testid="apply-leave-button"]');
      if (!applyLeaveButton) {
        throw new Error('Apply leave button not found for employee');
      }
    });
  }

  async testThemeSwitching() {
    await this.test('Theme Switcher', async () => {
      await this.login('admin@sarya.com', 'admin123');
      await this.page.click('a[href="/settings"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const themeDropdown = await this.page.$('select[name="theme"]');
      if (!themeDropdown) {
        throw new Error('Theme dropdown not found');
      }
    });

    await this.test('Light Theme Application', async () => {
      await this.page.select('select[name="theme"]', 'light');
      await this.page.waitForTimeout(1000);
      
      const bodyClass = await this.page.$eval('body', el => el.className);
      if (!bodyClass.includes('light')) {
        throw new Error('Light theme not applied');
      }
    });

    await this.test('Dark Theme Application', async () => {
      await this.page.select('select[name="theme"]', 'dark');
      await this.page.waitForTimeout(1000);
      
      const bodyClass = await this.page.$eval('body', el => el.className);
      if (!bodyClass.includes('dark')) {
        throw new Error('Dark theme not applied');
      }
    });
  }

  async testLocalization() {
    await this.test('Language Switcher', async () => {
      await this.page.click('a[href="/settings"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const languageDropdown = await this.page.$('select[name="language"]');
      if (!languageDropdown) {
        throw new Error('Language dropdown not found');
      }
    });

    await this.test('English Language', async () => {
      await this.page.select('select[name="language"]', 'en');
      await this.page.waitForTimeout(1000);
      
      const dashboardText = await this.page.$eval('[data-testid="dashboard-title"]', el => el.textContent);
      if (!dashboardText.includes('Dashboard')) {
        throw new Error('English language not applied');
      }
    });
  }

  async testResponsiveDesign() {
    await this.test('Desktop View', async () => {
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.goto(`${this.baseUrl}/dashboard`);
      
      const sidebar = await this.page.$('.p-sidebar');
      if (!sidebar) {
        throw new Error('Desktop sidebar not found');
      }
    });

    await this.test('Tablet View', async () => {
      await this.page.setViewport({ width: 768, height: 1024 });
      await this.page.goto(`${this.baseUrl}/dashboard`);
      
      // Check if mobile menu is available
      const mobileMenuButton = await this.page.$('.p-menubar-button');
      if (!mobileMenuButton) {
        throw new Error('Mobile menu button not found for tablet view');
      }
    });

    await this.test('Mobile View', async () => {
      await this.page.setViewport({ width: 375, height: 667 });
      await this.page.goto(`${this.baseUrl}/dashboard`);
      
      const mobileMenuButton = await this.page.$('.p-menubar-button');
      if (!mobileMenuButton) {
        throw new Error('Mobile menu button not found for mobile view');
      }
    });
  }

  async testErrorHandling() {
    await this.test('404 Page', async () => {
      await this.page.goto(`${this.baseUrl}/nonexistent-page`);
      
      const errorMessage = await this.page.$('[data-testid="error-404"]');
      if (!errorMessage) {
        throw new Error('404 error page not found');
      }
    });

    await this.test('Network Error Handling', async () => {
      // Simulate network error by going offline
      await this.page.setOfflineMode(true);
      await this.page.goto(`${this.baseUrl}/dashboard`);
      
      // Check for error message
      await this.page.waitForTimeout(2000);
      const errorMessage = await this.page.$('.p-message-error');
      if (!errorMessage) {
        throw new Error('Network error not handled properly');
      }
      
      // Go back online
      await this.page.setOfflineMode(false);
    });
  }

  async runAllTests() {
    this.log('🚀 Starting UI Validation for Sarya Connective', 'info');
    this.log('=' * 60, 'info');

    try {
      await this.init();
      
      await this.testLoginPage();
      await this.testAdminUserFlow();
      await this.testHRUserFlow();
      await this.testManagerUserFlow();
      await this.testEmployeeUserFlow();
      await this.testThemeSwitching();
      await this.testLocalization();
      await this.testResponsiveDesign();
      await this.testErrorHandling();

    } catch (error) {
      this.log(`Critical error: ${error.message}`, 'error');
    } finally {
      await this.cleanup();
    }

    this.printResults();
  }

  printResults() {
    this.log('=' * 60, 'info');
    this.log('📊 UI VALIDATION RESULTS', 'info');
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
      this.log('🎉 ALL UI TESTS PASSED! The application UI is working perfectly!', 'success');
    } else {
      this.log(`⚠️  ${this.testResults.failed} tests failed. Please review the errors above.`, 'warning');
    }
  }
}

// Run the tests
if (require.main === module) {
  const validator = new UIValidator();
  validator.runAllTests().catch(console.error);
}

module.exports = UIValidator;
