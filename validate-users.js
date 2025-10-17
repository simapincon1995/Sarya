const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config({ path: './server/config.env' });

async function validateExistingUsers() {
  try {
    console.log('🔍 Validating Existing Users...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shirinq_connect');
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in database\n`);

    for (const user of users) {
      console.log(`👤 Validating user: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   📋 Employee ID: ${user.employeeId}`);
      console.log(`   📋 Role: ${user.role}`);
      
      try {
        // Test if the user can be saved (validation test)
        await user.validate();
        console.log(`   ✅ Validation passed`);
      } catch (validationError) {
        console.log(`   ❌ Validation failed: ${validationError.message}`);
        
        // If it's an employeeId validation error, let's fix it
        if (validationError.message.includes('employeeId')) {
          console.log(`   🔧 Attempting to fix employeeId validation...`);
          // The user model should now accept any string, so this shouldn't happen
        }
      }
      console.log('');
    }

    console.log('🎉 Validation complete!');

  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

validateExistingUsers();