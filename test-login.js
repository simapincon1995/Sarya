const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config({ path: './server/config.env' });

async function testLogin() {
  try {
    console.log('🔐 Testing Login Functionality...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shirinq_connect');
    console.log('✅ Connected to MongoDB\n');

    // Test credentials from seed
    const testCredentials = [
      { email: 'admin@shirinq.com', password: 'admin123', role: 'admin' },
      { email: 'hr@shirinq.com', password: 'hr12345', role: 'hr_admin' },
      { email: 'manager@shirinq.com', password: 'manager123', role: 'manager' },
      { email: 'employee@shirinq.com', password: 'employee123', role: 'employee' }
    ];

    for (const cred of testCredentials) {
      console.log(`🔍 Testing login for ${cred.email} (${cred.role}):`);
      
      try {
        // Find user by email
        const user = await User.findOne({ email: cred.email });
        
        if (!user) {
          console.log(`   ❌ User not found`);
          continue;
        }

        console.log(`   ✅ User found: ${user.firstName} ${user.lastName}`);
        console.log(`   📋 Employee ID: ${user.employeeId}`);
        console.log(`   📋 Employee ID format: ${user.employeeId.length === 36 ? 'UUID' : 'Legacy'}`);
        
        // Test password comparison
        const isPasswordValid = await user.comparePassword(cred.password);
        
        if (isPasswordValid) {
          console.log(`   ✅ Password validation successful`);
        } else {
          console.log(`   ❌ Password validation failed`);
        }

        console.log(`   📊 User data:`, {
          id: user._id,
          employeeId: user.employeeId,
          role: user.role,
          department: user.department,
          isActive: user.isActive
        });

      } catch (error) {
        console.log(`   ❌ Login test failed: ${error.message}`);
      }
      
      console.log(''); // Empty line for spacing
    }

    // Check total users created
    const totalUsers = await User.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);

    // Check UUID format distribution
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const users = await User.find({}, 'employeeId').lean();
    const uuidUsers = users.filter(u => uuidPattern.test(u.employeeId));
    const legacyUsers = users.filter(u => !uuidPattern.test(u.employeeId));

    console.log(`📊 UUID format employees: ${uuidUsers.length}`);
    console.log(`📊 Legacy format employees: ${legacyUsers.length}`);

    if (legacyUsers.length > 0) {
      console.log('📋 Legacy format employee IDs:');
      legacyUsers.forEach(u => console.log(`   - ${u.employeeId}`));
    }

    console.log('\n🎉 Login test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

testLogin();