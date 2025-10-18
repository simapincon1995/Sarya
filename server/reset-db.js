const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: './config.env' });

const User = require('./models/User');
const Template = require('./models/Template');
const Holiday = require('./models/Holiday');
const DashboardWidget = require('./models/DashboardWidget');
const Attendance = require('./models/Attendance');
const Leave = require('./models/Leave');
const Payroll = require('./models/Payroll');
const Organization = require('./models/Organization');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shirinq_connect');

// Reset database and create only admin user
const resetDatabase = async () => {
  try {
    console.log('🧹 Starting database reset...');

    // Clear ALL existing data from all collections
    await User.deleteMany({});
    await Template.deleteMany({});
    await Holiday.deleteMany({});
    await DashboardWidget.deleteMany({});
    await Attendance.deleteMany({});
    await Leave.deleteMany({});
    await Payroll.deleteMany({});
    await Organization.deleteMany({});
    console.log('🗑️ Cleared all existing data from database');

    // Create ONLY one admin user
    const adminUser = new User({
      employeeId: uuidv4(),
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@shirinq.com',
      password: 'admin123',
      role: 'admin',
      department: 'IT',
      designation: 'System Administrator',
      phone: '+91-9876543210',
      salary: 100000,
      joiningDate: new Date('2020-01-01'),
      isActive: true
    });
    await adminUser.save();
    console.log('👤 Created single admin user');

    console.log('✅ Database reset completed successfully!\n');

    console.log('📋 Admin Credentials:');
    console.log('Email: admin@shirinq.com');
    console.log('Password: admin123');
    console.log('\n🎯 You can now create additional users through the UI');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run database reset
resetDatabase();