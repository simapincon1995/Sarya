const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: './config.env' });

const User = require('./models/User');
const Template = require('./models/Template');
const Holiday = require('./models/Holiday');
const DashboardWidget = require('./models/DashboardWidget');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shirinq_connect');

// Seed function
const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Template.deleteMany({});
    await Holiday.deleteMany({});
    await DashboardWidget.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Passwords will be hashed by the User model pre-save hook

    // Create default admin user
    const adminUser = new User({
      employeeId: uuidv4(), // Generate UUID for admin
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
    console.log('👤 Created admin user');

    // Create HR Admin user
    const hrUser = new User({
      employeeId: uuidv4(), // Generate UUID for HR
      firstName: 'HR',
      lastName: 'Manager',
      email: 'hr@shirinq.com',
      password: 'hr12345',
      role: 'hr_admin',
      department: 'Human Resources',
      designation: 'HR Manager',
      phone: '+91-9876543211',
      salary: 80000,
      joiningDate: new Date('2020-02-01'),
      isActive: true
    });
    await hrUser.save();
    console.log('👤 Created HR admin user');

    // Create Manager user
    const managerUser = new User({
      employeeId: uuidv4(), // Generate UUID for manager
      firstName: 'Team',
      lastName: 'Manager',
      email: 'manager@shirinq.com',
      password: 'manager123',
      role: 'manager',
      department: 'Engineering',
      designation: 'Engineering Manager',
      phone: '+91-9876543212',
      salary: 70000,
      joiningDate: new Date('2020-03-01'),
      isActive: true
    });
    await managerUser.save();
    console.log('👤 Created manager user');

    // Create Employee users
    const employeesData = [
      {
        employeeId: uuidv4(), // Generate UUID for employee
        firstName: 'John',
        lastName: 'Doe',
        email: 'employee@shirinq.com',
        password: 'employee123',
        role: 'employee',
        department: 'Engineering',
        designation: 'Software Developer',
        manager: managerUser._id,
        phone: '+91-9876543213',
        salary: 50000,
        joiningDate: new Date('2021-01-01'),
        isActive: true
      },
      {
        employeeId: uuidv4(), // Generate UUID for employee
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@shirinq.com',
        password: 'employee123',
        role: 'employee',
        department: 'Engineering',
        designation: 'Frontend Developer',
        manager: managerUser._id,
        phone: '+91-9876543214',
        salary: 48000,
        joiningDate: new Date('2021-02-01'),
        isActive: true
      },
      {
        employeeId: uuidv4(), // Generate UUID for employee
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@shirinq.com',
        password: 'employee123',
        role: 'employee',
        department: 'Marketing',
        designation: 'Marketing Executive',
        phone: '+91-9876543215',
        salary: 45000,
        joiningDate: new Date('2021-03-01'),
        isActive: true
      },
      {
        employeeId: uuidv4(), // Generate UUID for employee
        firstName: 'Sarah',
        lastName: 'Wilson',
        email: 'sarah.wilson@shirinq.com',
        password: 'employee123',
        role: 'employee',
        department: 'Sales',
        designation: 'Sales Representative',
        phone: '+91-9876543216',
        salary: 42000,
        joiningDate: new Date('2021-04-01'),
        isActive: true
      }
    ];

    for (const empData of employeesData) {
      const employee = new User(empData);
      await employee.save();
    }
    console.log('👥 Created employee users');

    // Update manager's team members
    const teamMembers = await User.find({ manager: managerUser._id });
    managerUser.teamMembers = teamMembers.map(emp => emp._id);
    await managerUser.save();
    console.log('👥 Updated manager team members');

    // Create default templates
    await Template.createDefaultTemplates(hrUser._id);
    console.log('📄 Created default templates');

    // Create default holidays
    const holidaysData = [
      { name: 'New Year', date: new Date('2024-01-01'), type: 'national', description: 'New Year Day', createdBy: hrUser._id, isPaid: true },
      { name: 'Republic Day', date: new Date('2024-01-26'), type: 'national', description: 'Republic Day of India', createdBy: hrUser._id, isPaid: true },
      { name: 'Holi', date: new Date('2024-03-25'), type: 'religious', description: 'Festival of Colors', createdBy: hrUser._id, isPaid: true },
      { name: 'Independence Day', date: new Date('2024-08-15'), type: 'national', description: 'Independence Day of India', createdBy: hrUser._id, isPaid: true },
      { name: 'Gandhi Jayanti', date: new Date('2024-10-02'), type: 'national', description: 'Birthday of Mahatma Gandhi', createdBy: hrUser._id, isPaid: true },
      { name: 'Diwali', date: new Date('2024-11-01'), type: 'religious', description: 'Festival of Lights', createdBy: hrUser._id, isPaid: true },
      { name: 'Christmas', date: new Date('2024-12-25'), type: 'religious', description: 'Christmas Day', createdBy: hrUser._id, isPaid: true }
    ];

    for (const holidayData of holidaysData) {
      const holiday = new Holiday(holidayData);
      await holiday.save();
    }
    console.log('📅 Created default holidays');

    // Create default dashboard widgets
    await DashboardWidget.createDefaultWidgets(adminUser._id);
    console.log('📊 Created default dashboard widgets');

    console.log('✅ Database seeding completed successfully!\n');

    console.log('📋 Demo Credentials:');
    console.log('Admin: admin@shirinq.com / admin123');
    console.log('HR Admin: hr@shirinq.com / hr12345');
    console.log('Manager: manager@shirinq.com / manager123');
    console.log('Employee: employee@shirinq.com / employee123');
    console.log('Employee: jane.smith@shirinq.com / employee123');
    console.log('Employee: mike.johnson@shirinq.com / employee123');
    console.log('Employee: sarah.wilson@shirinq.com / employee123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run seeding
seedData();
