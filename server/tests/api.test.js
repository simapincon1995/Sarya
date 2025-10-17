const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

// Test database
const TEST_DB_URI = 'mongodb://localhost:27017/shirinq_connect_test';

describe('API Endpoints', () => {
  let authToken;
  let testUser;
  let testEmployee;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(TEST_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Clean up test database
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({});
    await Attendance.deleteMany({});
    await Leave.deleteMany({});

    // Create test admin user
    testUser = new User({
      employeeId: 'TEST001',
      firstName: 'Test',
      lastName: 'Admin',
      email: 'test@shirinq.com',
      password: 'test123',
      role: 'admin',
      department: 'IT',
      designation: 'Test Admin',
      salary: 50000,
      isActive: true
    });
    await testUser.save();

    // Create test employee
    testEmployee = new User({
      employeeId: 'EMP001',
      firstName: 'Test',
      lastName: 'Employee',
      email: 'employee@shirinq.com',
      password: 'test123',
      role: 'employee',
      department: 'Engineering',
      designation: 'Software Developer',
      salary: 40000,
      isActive: true
    });
    await testEmployee.save();
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/login - should login successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@shirinq.com',
          password: 'test123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@shirinq.com');
      
      authToken = response.body.token;
    });

    test('POST /api/auth/login - should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@shirinq.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('GET /api/auth/profile - should get user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@shirinq.com');
    });

    test('GET /api/auth/profile - should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('Employee Endpoints', () => {
    test('GET /api/employees - should get all employees', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.employees).toBeDefined();
      expect(response.body.employees.length).toBeGreaterThan(0);
    });

    test('POST /api/employees - should create new employee', async () => {
      const newEmployee = {
        employeeId: 'EMP002',
        firstName: 'New',
        lastName: 'Employee',
        email: 'new@shirinq.com',
        password: 'test123',
        role: 'employee',
        department: 'Marketing',
        designation: 'Marketing Executive',
        salary: 35000
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEmployee);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Employee created successfully');
      expect(response.body.employee.employeeId).toBe('EMP002');
    });

    test('GET /api/employees/:id - should get employee by ID', async () => {
      const response = await request(app)
        .get(`/api/employees/${testEmployee._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee.employeeId).toBe('EMP001');
    });

    test('PUT /api/employees/:id - should update employee', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Employee',
        department: 'Updated Department'
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployee._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Employee updated successfully');
      expect(response.body.employee.firstName).toBe('Updated');
    });

    test('DELETE /api/employees/:id - should deactivate employee', async () => {
      const response = await request(app)
        .delete(`/api/employees/${testEmployee._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Employee deactivated successfully');
    });
  });

  describe('Attendance Endpoints', () => {
    test('POST /api/attendance/checkin - should check in employee', async () => {
      // Login as employee
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee@shirinq.com',
          password: 'test123'
        });

      const employeeToken = loginResponse.body.token;

      const response = await request(app)
        .post('/api/attendance/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          location: { latitude: 0, longitude: 0, address: 'Test Location' },
          ipAddress: '127.0.0.1',
          deviceInfo: 'Test Device'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Checked in successfully');
      expect(response.body.attendance.checkIn).toBeDefined();
    });

    test('GET /api/attendance/today - should get today\'s attendance', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee@shirinq.com',
          password: 'test123'
        });

      const employeeToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/attendance/today')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBeDefined();
    });

    test('GET /api/attendance/dashboard/overview - should get dashboard overview', async () => {
      const response = await request(app)
        .get('/api/attendance/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.overview).toBeDefined();
      expect(response.body.overview.totalEmployees).toBeDefined();
    });
  });

  describe('Leave Endpoints', () => {
    test('POST /api/leaves - should apply for leave', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee@shirinq.com',
          password: 'test123'
        });

      const employeeToken = loginResponse.body.token;

      const leaveData = {
        leaveType: 'casual',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        reason: 'Personal work',
        isHalfDay: false
      };

      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Leave application submitted successfully');
      expect(response.body.leave.leaveType).toBe('casual');
    });

    test('GET /api/leaves - should get leave applications', async () => {
      const response = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.leaves).toBeDefined();
    });

    test('GET /api/leaves/balance/:employeeId - should get leave balance', async () => {
      const response = await request(app)
        .get(`/api/leaves/balance/${testEmployee._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.balance).toBeDefined();
      expect(response.body.balance.casual).toBeDefined();
    });
  });

  describe('Payroll Endpoints', () => {
    test('POST /api/payroll/generate - should generate monthly payroll', async () => {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const response = await request(app)
        .post('/api/payroll/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ month, year });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Payroll generated successfully');
      expect(response.body.count).toBeDefined();
    });

    test('GET /api/payroll - should get payroll records', async () => {
      const response = await request(app)
        .get('/api/payroll')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.payrolls).toBeDefined();
    });
  });

  describe('Template Endpoints', () => {
    test('GET /api/templates - should get all templates', async () => {
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.templates).toBeDefined();
    });

    test('POST /api/templates - should create new template', async () => {
      const templateData = {
        name: 'Test Template',
        type: 'offer_letter',
        description: 'Test template description',
        content: 'Hello {{name}}, welcome to {{company}}!',
        category: 'hr'
      };

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Template created successfully');
      expect(response.body.template.name).toBe('Test Template');
    });
  });

  describe('Holiday Endpoints', () => {
    test('GET /api/holidays - should get all holidays', async () => {
      const response = await request(app)
        .get('/api/holidays')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.holidays).toBeDefined();
    });

    test('POST /api/holidays - should create new holiday', async () => {
      const holidayData = {
        name: 'Test Holiday',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        type: 'company',
        description: 'Test holiday description',
        isPaid: true
      };

      const response = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${authToken}`)
        .send(holidayData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Holiday created successfully');
      expect(response.body.holiday.name).toBe('Test Holiday');
    });
  });

  describe('Dashboard Endpoints', () => {
    test('GET /api/dashboard/widgets - should get dashboard widgets', async () => {
      const response = await request(app)
        .get('/api/dashboard/widgets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.widgets).toBeDefined();
    });

    test('GET /api/dashboard/overview - should get dashboard overview', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.overview).toBeDefined();
      expect(response.body.overview.attendance).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('GET /api/nonexistent - should return 404', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Route not found');
    });

    test('POST /api/employees - should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({
          employeeId: 'TEST002',
          firstName: 'Test',
          lastName: 'User',
          email: 'test2@shirinq.com',
          password: 'test123'
        });

      expect(response.status).toBe(401);
    });

    test('POST /api/employees - should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          firstName: 'Test'
        });

      expect(response.status).toBe(500);
    });
  });
});
