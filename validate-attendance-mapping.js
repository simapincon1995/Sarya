const mongoose = require('mongoose');
const User = require('./server/models/User');
const Attendance = require('./server/models/Attendance');
require('dotenv').config({ path: './server/config.env' });

async function validateAttendanceUserMapping() {
  try {
    console.log('🔍 Starting Attendance-User Mapping Validation...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shirinq_connect');
    console.log('✅ Connected to MongoDB\n');

    // 1. Check Attendance Schema Structure
    console.log('📋 1. Checking Attendance Schema Structure:');
    const attendanceFields = Attendance.schema.paths;
    
    if (attendanceFields.employee) {
      console.log(`   ✅ Employee field exists: ${attendanceFields.employee.instance}`);
      console.log(`   ✅ Employee field type: ${attendanceFields.employee.options.type}`);
      console.log(`   ✅ Employee reference: ${attendanceFields.employee.options.ref}`);
      console.log(`   ✅ Employee required: ${attendanceFields.employee.options.required}\n`);
    } else {
      console.log('   ❌ Employee field not found in schema!\n');
      return;
    }

    // 2. Check existing attendance records
    console.log('📊 2. Checking Existing Attendance Records:');
    const totalAttendance = await Attendance.countDocuments();
    console.log(`   📈 Total attendance records: ${totalAttendance}`);

    if (totalAttendance > 0) {
      // Check for null employee references
      const nullEmployeeCount = await Attendance.countDocuments({ employee: null });
      console.log(`   🚨 Records with null employee: ${nullEmployeeCount}`);

      // Check for invalid employee references
      const attendanceWithInvalidUsers = await Attendance.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'employee',
            foreignField: '_id',
            as: 'userCheck'
          }
        },
        {
          $match: {
            userCheck: { $size: 0 },
            employee: { $ne: null }
          }
        },
        {
          $count: 'invalidReferences'
        }
      ]);
      
      const invalidCount = attendanceWithInvalidUsers[0]?.invalidReferences || 0;
      console.log(`   🚨 Records with invalid employee references: ${invalidCount}`);

      // Sample attendance record with population
      console.log('\n   📝 Sample Attendance Record (with population):');
      const sampleAttendance = await Attendance.findOne()
        .populate('employee', 'firstName lastName employeeId department')
        .lean();
      
      if (sampleAttendance) {
        console.log(`   Employee ID: ${sampleAttendance.employee?._id || 'N/A'}`);
        console.log(`   Employee Name: ${sampleAttendance.employee?.firstName || 'N/A'} ${sampleAttendance.employee?.lastName || 'N/A'}`);
        console.log(`   Employee Code: ${sampleAttendance.employee?.employeeId || 'N/A'}`);
        console.log(`   Department: ${sampleAttendance.employee?.department || 'N/A'}`);
        console.log(`   Date: ${sampleAttendance.date}`);
      }
    }

    // 3. Check User-Attendance relationship
    console.log('\n🔗 3. Checking User-Attendance Relationship:');
    const totalUsers = await User.countDocuments({ role: 'employee' });
    console.log(`   👥 Total employee users: ${totalUsers}`);

    if (totalUsers > 0) {
      // Check how many users have attendance records
      const usersWithAttendance = await User.aggregate([
        { $match: { role: 'employee' } },
        {
          $lookup: {
            from: 'attendances',
            localField: '_id',
            foreignField: 'employee',
            as: 'attendanceRecords'
          }
        },
        {
          $match: {
            'attendanceRecords.0': { $exists: true }
          }
        },
        {
          $count: 'usersWithAttendance'
        }
      ]);

      const usersWithAttendanceCount = usersWithAttendance[0]?.usersWithAttendance || 0;
      console.log(`   📊 Users with attendance records: ${usersWithAttendanceCount}`);
      console.log(`   📊 Users without attendance records: ${totalUsers - usersWithAttendanceCount}`);
    }

    // 4. Verify Index Performance
    console.log('\n⚡ 4. Checking Attendance Indexes:');
    const indexes = await Attendance.collection.getIndexes();
    console.log('   📋 Available indexes:');
    Object.keys(indexes).forEach(indexName => {
      console.log(`     - ${indexName}: ${JSON.stringify(indexes[indexName])}`);
    });

    // 5. Test Query Performance
    console.log('\n🚀 5. Testing Query Performance:');
    const startTime = Date.now();
    
    const testQuery = await Attendance.find({ 
      employee: { $ne: null },
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
    .populate('employee', 'firstName lastName employeeId department')
    .limit(10);
    
    const queryTime = Date.now() - startTime;
    console.log(`   ⏱️  Query executed in: ${queryTime}ms`);
    console.log(`   📊 Records returned: ${testQuery.length}`);

    // 6. Data Integrity Check
    console.log('\n🔒 6. Data Integrity Summary:');
    const integrityCheck = {
      totalAttendance,
      nullEmployeeReferences: await Attendance.countDocuments({ employee: null }),
      validEmployeeReferences: await Attendance.countDocuments({ 
        employee: { $ne: null, $exists: true } 
      }),
      totalEmployees: totalUsers
    };

    console.log('   📊 Integrity Metrics:');
    console.log(`     - Total attendance records: ${integrityCheck.totalAttendance}`);
    console.log(`     - Valid employee references: ${integrityCheck.validEmployeeReferences}`);
    console.log(`     - Null employee references: ${integrityCheck.nullEmployeeReferences}`);
    console.log(`     - Total employees: ${integrityCheck.totalEmployees}`);

    const integrityScore = integrityCheck.totalAttendance > 0 
      ? ((integrityCheck.validEmployeeReferences / integrityCheck.totalAttendance) * 100).toFixed(2)
      : 100;
    
    console.log(`     - Data integrity score: ${integrityScore}%`);

    if (integrityScore >= 95) {
      console.log('   ✅ Excellent data integrity!');
    } else if (integrityScore >= 80) {
      console.log('   ⚠️  Good data integrity, minor issues detected');
    } else {
      console.log('   ❌ Poor data integrity, significant issues detected');
    }

    console.log('\n🎉 Validation Complete!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the validation
validateAttendanceUserMapping();