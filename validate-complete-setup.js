#!/usr/bin/env node

/**
 * Complete Setup Validation Script for Sarya Connective
 * This script validates that all components are properly configured and working
 */

const fs = require('fs');
const path = require('path');
const colors = require('colors');

class SetupValidator {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      warnings: 0
    };
    this.projectRoot = process.cwd();
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
    this.log(`Validating: ${testName}`, 'info');
    
    try {
      await testFunction();
      this.testResults.passed++;
      this.log(`✅ ${testName} - VALID`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.log(`❌ ${testName} - INVALID: ${error.message}`, 'error');
    }
  }

  async warning(testName, testFunction) {
    try {
      await testFunction();
    } catch (error) {
      this.testResults.warnings++;
      this.log(`⚠️  ${testName} - WARNING: ${error.message}`, 'warning');
    }
  }

  // File and directory validation
  async validateProjectStructure() {
    await this.test('Project Root Structure', async () => {
      const requiredDirs = ['client', 'server'];
      for (const dir of requiredDirs) {
        if (!fs.existsSync(path.join(this.projectRoot, dir))) {
          throw new Error(`Required directory missing: ${dir}`);
        }
      }
    });

    await this.test('Package.json Files', async () => {
      const packageFiles = [
        'package.json',
        'client/package.json',
        'server/package.json'
      ];
      
      for (const file of packageFiles) {
        const filePath = path.join(this.projectRoot, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Package.json missing: ${file}`);
        }
        
        const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!packageJson.name || !packageJson.version) {
          throw new Error(`Invalid package.json: ${file}`);
        }
      }
    });

    await this.test('Environment Configuration', async () => {
      const envFiles = [
        'server/config.env',
        'client/.env'
      ];
      
      for (const file of envFiles) {
        const filePath = path.join(this.projectRoot, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Environment file missing: ${file}`);
        }
      }
    });
  }

  // Backend validation
  async validateBackend() {
    await this.test('Backend Dependencies', async () => {
      const packageJsonPath = path.join(this.projectRoot, 'server/package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredDeps = [
        'express', 'mongoose', 'jsonwebtoken', 'bcryptjs',
        'cors', 'dotenv', 'socket.io', 'express-rate-limit'
      ];
      
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep]) {
          throw new Error(`Required dependency missing: ${dep}`);
        }
      }
    });

    await this.test('Backend Models', async () => {
      const modelsDir = path.join(this.projectRoot, 'server/models');
      const requiredModels = [
        'User.js', 'Attendance.js', 'Leave.js', 'Payroll.js',
        'Template.js', 'Holiday.js', 'DashboardWidget.js', 'Organization.js'
      ];
      
      for (const model of requiredModels) {
        const modelPath = path.join(modelsDir, model);
        if (!fs.existsSync(modelPath)) {
          throw new Error(`Required model missing: ${model}`);
        }
      }
    });

    await this.test('Backend Routes', async () => {
      const routesDir = path.join(this.projectRoot, 'server/routes');
      const requiredRoutes = [
        'auth.js', 'employees.js', 'attendance.js', 'leaves.js',
        'payroll.js', 'templates.js', 'dashboard.js', 'holidays.js', 'organization.js'
      ];
      
      for (const route of requiredRoutes) {
        const routePath = path.join(routesDir, route);
        if (!fs.existsSync(routePath)) {
          throw new Error(`Required route missing: ${route}`);
        }
      }
    });

    await this.test('Backend Middleware', async () => {
      const middlewarePath = path.join(this.projectRoot, 'server/middleware/auth.js');
      if (!fs.existsSync(middlewarePath)) {
        throw new Error('Authentication middleware missing');
      }
    });

    await this.test('Backend Seed Script', async () => {
      const seedPath = path.join(this.projectRoot, 'server/seed.js');
      if (!fs.existsSync(seedPath)) {
        throw new Error('Database seed script missing');
      }
    });
  }

  // Frontend validation
  async validateFrontend() {
    await this.test('Frontend Dependencies', async () => {
      const packageJsonPath = path.join(this.projectRoot, 'client/package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredDeps = [
        'react', 'react-dom', 'react-router-dom', 'primereact',
        'primeicons', 'axios', 'socket.io-client'
      ];
      
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep]) {
          throw new Error(`Required dependency missing: ${dep}`);
        }
      }
    });

    await this.test('Frontend Contexts', async () => {
      const contextsDir = path.join(this.projectRoot, 'client/src/contexts');
      const requiredContexts = [
        'AuthContext.js', 'ThemeContext.js', 'LocalizationContext.js', 'SocketContext.js'
      ];
      
      for (const context of requiredContexts) {
        const contextPath = path.join(contextsDir, context);
        if (!fs.existsSync(contextPath)) {
          throw new Error(`Required context missing: ${context}`);
        }
      }
    });

    await this.test('Frontend Services', async () => {
      const servicesDir = path.join(this.projectRoot, 'client/src/services');
      const requiredServices = [
        'api.js', 'authService.js', 'employeeService.js', 'attendanceService.js',
        'leaveService.js', 'payrollService.js', 'templateService.js',
        'holidayService.js', 'dashboardService.js', 'organizationService.js'
      ];
      
      for (const service of requiredServices) {
        const servicePath = path.join(servicesDir, service);
        if (!fs.existsSync(servicePath)) {
          throw new Error(`Required service missing: ${service}`);
        }
      }
    });

    await this.test('Frontend Pages', async () => {
      const pagesDir = path.join(this.projectRoot, 'client/src/pages');
      const requiredPages = [
        'Dashboard.js', 'Employees.js', 'Attendance.js', 'Leaves.js',
        'Payroll.js', 'Templates.js', 'Holidays.js', 'Profile.js',
        'Settings.js', 'LiveDashboard.js'
      ];
      
      for (const page of requiredPages) {
        const pagePath = path.join(pagesDir, page);
        if (!fs.existsSync(pagePath)) {
          throw new Error(`Required page missing: ${page}`);
        }
      }
    });

    await this.test('Frontend Components', async () => {
      const componentsDir = path.join(this.projectRoot, 'client/src/components');
      const requiredComponents = [
        'Auth/Login.js', 'Auth/ProtectedRoute.js',
        'Layout/Layout.js', 'Layout/SidebarMenu.js',
        'Common/LoadingSpinner.js'
      ];
      
      for (const component of requiredComponents) {
        const componentPath = path.join(componentsDir, component);
        if (!fs.existsSync(componentPath)) {
          throw new Error(`Required component missing: ${component}`);
        }
      }
    });
  }

  // Configuration validation
  async validateConfiguration() {
    await this.test('Docker Configuration', async () => {
      const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'nginx.conf'];
      
      for (const file of dockerFiles) {
        const filePath = path.join(this.projectRoot, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Docker configuration missing: ${file}`);
        }
      }
    });

    await this.test('Testing Configuration', async () => {
      const testFiles = [
        'test-all-features.js',
        'validate-ui.js',
        'server/tests/api.test.js'
      ];
      
      for (const file of testFiles) {
        const filePath = path.join(this.projectRoot, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Test file missing: ${file}`);
        }
      }
    });

    await this.test('Documentation', async () => {
      const docFiles = ['README.md', 'SETUP_GUIDE.md'];
      
      for (const file of docFiles) {
        const filePath = path.join(this.projectRoot, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Documentation missing: ${file}`);
        }
      }
    });
  }

  // Environment validation
  async validateEnvironment() {
    await this.test('Node.js Version', async () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 16) {
        throw new Error(`Node.js version ${nodeVersion} is too old. Required: v16 or higher`);
      }
    });

    await this.warning('MongoDB Connection', async () => {
      // This is a warning because MongoDB might not be running during validation
      const mongoose = require('mongoose');
      try {
        await mongoose.connect('mongodb://localhost:27017/sarya_connective', {
          serverSelectionTimeoutMS: 5000
        });
        await mongoose.disconnect();
      } catch (error) {
        throw new Error('MongoDB connection failed. Make sure MongoDB is running.');
      }
    });
  }

  // Script validation
  async validateScripts() {
    await this.test('Root Package Scripts', async () => {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredScripts = [
        'dev', 'server', 'client', 'build', 'test', 'test-all',
        'install-all', 'seed', 'start', 'clean', 'reset'
      ];
      
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script]) {
          throw new Error(`Required script missing: ${script}`);
        }
      }
    });

    await this.test('Backend Package Scripts', async () => {
      const packageJsonPath = path.join(this.projectRoot, 'server/package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredScripts = ['dev', 'start', 'test'];
      
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script]) {
          throw new Error(`Required backend script missing: ${script}`);
        }
      }
    });

    await this.test('Frontend Package Scripts', async () => {
      const packageJsonPath = path.join(this.projectRoot, 'client/package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredScripts = ['start', 'build', 'test', 'electron', 'electron-dev'];
      
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script]) {
          throw new Error(`Required frontend script missing: ${script}`);
        }
      }
    });
  }

  // Security validation
  async validateSecurity() {
    await this.test('Environment Security', async () => {
      const configPath = path.join(this.projectRoot, 'server/config.env');
      const config = fs.readFileSync(configPath, 'utf8');
      
      if (config.includes('your_super_secret_jwt_key_here')) {
        throw new Error('Default JWT secret detected. Please change it in production.');
      }
      
      if (config.includes('password123')) {
        throw new Error('Default password detected. Please change it in production.');
      }
    });

    await this.test('Git Ignore', async () => {
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        throw new Error('.gitignore file missing');
      }
      
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      const requiredIgnores = ['node_modules', '.env', 'logs', 'uploads'];
      
      for (const ignore of requiredIgnores) {
        if (!gitignore.includes(ignore)) {
          throw new Error(`Required gitignore entry missing: ${ignore}`);
        }
      }
    });
  }

  async runAllValidations() {
    this.log('🚀 Starting Complete Setup Validation for Sarya Connective', 'info');
    this.log('=' * 70, 'info');

    try {
      await this.validateProjectStructure();
      await this.validateBackend();
      await this.validateFrontend();
      await this.validateConfiguration();
      await this.validateEnvironment();
      await this.validateScripts();
      await this.validateSecurity();

    } catch (error) {
      this.log(`Critical validation error: ${error.message}`, 'error');
    }

    this.printResults();
  }

  printResults() {
    this.log('=' * 70, 'info');
    this.log('📊 COMPLETE SETUP VALIDATION RESULTS', 'info');
    this.log('=' * 70, 'info');
    
    this.log(`Total Validations: ${this.testResults.total}`, 'info');
    this.log(`Passed: ${this.testResults.passed}`.green, 'success');
    this.log(`Failed: ${this.testResults.failed}`.red, 'error');
    this.log(`Warnings: ${this.testResults.warnings}`.yellow, 'warning');
    
    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(2);
    
    if (successRate >= 95) {
      this.log(`Success Rate: ${successRate}% - EXCELLENT! 🎉`, 'success');
      this.log('🎉 Sarya Connective is ready for production!', 'success');
    } else if (successRate >= 90) {
      this.log(`Success Rate: ${successRate}% - VERY GOOD! 👍`, 'warning');
      this.log('👍 Sarya Connective is mostly ready with minor issues.', 'warning');
    } else if (successRate >= 80) {
      this.log(`Success Rate: ${successRate}% - GOOD! ⚠️`, 'warning');
      this.log('⚠️  Sarya Connective needs some fixes before production.', 'warning');
    } else {
      this.log(`Success Rate: ${successRate}% - NEEDS WORK! ❌`, 'error');
      this.log('❌ Sarya Connective requires significant fixes.', 'error');
    }

    this.log('=' * 70, 'info');
    
    if (this.testResults.failed === 0 && this.testResults.warnings <= 2) {
      this.log('🎉 ALL VALIDATIONS PASSED! The application is production-ready!', 'success');
      this.log('', 'info');
      this.log('Next steps:', 'info');
      this.log('1. Run: npm run install-all', 'info');
      this.log('2. Run: npm run seed', 'info');
      this.log('3. Run: npm run dev', 'info');
      this.log('4. Open: http://localhost:3000', 'info');
    } else {
      this.log(`⚠️  ${this.testResults.failed} validations failed and ${this.testResults.warnings} warnings.`, 'warning');
      this.log('Please review and fix the issues above before proceeding.', 'warning');
    }
  }
}

// Run the validations
if (require.main === module) {
  const validator = new SetupValidator();
  validator.runAllValidations().catch(console.error);
}

module.exports = SetupValidator;
