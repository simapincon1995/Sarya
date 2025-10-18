const mongoose = require('mongoose');
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

// Verify database state
const verifyDatabase = async () => {
  try {
    console.log('🔍 Verifying database state...\n');

    // Check all collections
    const userCount = await User.countDocuments();
    const templateCount = await Template.countDocuments();
    const holidayCount = await Holiday.countDocuments();
    const widgetCount = await DashboardWidget.countDocuments();
    const attendanceCount = await Attendance.countDocuments();
    const leaveCount = await Leave.countDocuments();
    const payrollCount = await Payroll.countDocuments();
    const orgCount = await Organization.countDocuments();

    console.log('📊 Collection Counts:');
    console.log(`Users: ${userCount}`);
    console.log(`Templates: ${templateCount}`);
    console.log(`Holidays: ${holidayCount}`);
    console.log(`Dashboard Widgets: ${widgetCount}`);
    console.log(`Attendance Records: ${attendanceCount}`);
    console.log(`Leave Records: ${leaveCount}`);
    console.log(`Payroll Records: ${payrollCount}`);
    console.log(`Organizations: ${orgCount}`);

    if (userCount === 1) {
      // Show the admin user details
      const adminUser = await User.findOne();
      console.log('\n👤 Admin User Details:');
      console.log(`Name: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`Email: ${adminUser.email}`);
      console.log(`Role: ${adminUser.role}`);
      console.log(`Employee ID: ${adminUser.employeeId}`);
      console.log(`Department: ${adminUser.department}`);
      console.log(`Designation: ${adminUser.designation}`);
      console.log(`Active: ${adminUser.isActive}`);
    }

    console.log('\n✅ Database verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run verification
verifyDatabase();