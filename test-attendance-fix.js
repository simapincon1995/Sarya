const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test user credentials
const testUser = {
  email: 'employee@shirinq.com',
  password: 'employee123'
};

async function testAttendanceWorkflow() {
  try {
    console.log('🧪 Testing Attendance Workflow Fix...\n');

    // Step 1: Login
    console.log('1. Logging in as test user...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    const headers = { Authorization: `Bearer ${token}` };

    // Step 2: Check initial attendance status (should be not-checked-in)
    console.log('2. Checking initial attendance status...');
    const initialStatus = await axios.get(`${API_BASE}/attendance/today`, { headers });
    console.log('Initial Status:', {
      status: initialStatus.data.status,
      hasCheckIn: !!initialStatus.data.attendance?.checkIn,
      hasCheckOut: !!initialStatus.data.attendance?.checkOut,
      totalWorkingHours: initialStatus.data.totalWorkingHours,
      totalBreakTime: initialStatus.data.totalBreakTime
    });

    if (initialStatus.data.status !== 'not-checked-in') {
      console.log('❌ ERROR: Initial status should be "not-checked-in"');
      return;
    }
    console.log('✅ Initial status is correct (not-checked-in)\n');

    // Step 3: Check in
    console.log('3. Attempting check-in...');
    const checkInResponse = await axios.post(`${API_BASE}/attendance/checkin`, {
      location: { latitude: 0, longitude: 0, address: 'Test Office' },
      ipAddress: '127.0.0.1',
      deviceInfo: 'Test Browser'
    }, { headers });
    console.log('✅ Check-in successful\n');

    // Step 4: Check status after check-in
    console.log('4. Checking status after check-in...');
    const afterCheckIn = await axios.get(`${API_BASE}/attendance/today`, { headers });
    console.log('After Check-in Status:', {
      status: afterCheckIn.data.status,
      hasCheckIn: !!afterCheckIn.data.attendance?.checkIn,
      hasCheckOut: !!afterCheckIn.data.attendance?.checkOut,
      checkInTime: afterCheckIn.data.attendance?.checkIn?.time
    });

    if (afterCheckIn.data.status !== 'checked-in') {
      console.log('❌ ERROR: Status after check-in should be "checked-in"');
      return;
    }
    console.log('✅ Status after check-in is correct (checked-in)\n');

    // Step 5: Start break
    console.log('5. Starting break...');
    const breakResponse = await axios.post(`${API_BASE}/attendance/break/start`, {
      breakType: 'lunch',
      reason: 'Test break'
    }, { headers });
    console.log('✅ Break started successfully\n');

    // Step 6: Check status during break
    console.log('6. Checking status during break...');
    const duringBreak = await axios.get(`${API_BASE}/attendance/today`, { headers });
    console.log('During Break Status:', {
      status: duringBreak.data.status,
      hasActiveBreak: !!duringBreak.data.attendance?.activeBreak
    });

    if (duringBreak.data.status !== 'on-break') {
      console.log('❌ ERROR: Status during break should be "on-break"');
      return;
    }
    console.log('✅ Status during break is correct (on-break)\n');

    // Step 7: End break
    console.log('7. Ending break...');
    await axios.post(`${API_BASE}/attendance/break/end`, {}, { headers });
    console.log('✅ Break ended successfully\n');

    // Step 8: Check status after break
    console.log('8. Checking status after break...');
    const afterBreak = await axios.get(`${API_BASE}/attendance/today`, { headers });
    console.log('After Break Status:', {
      status: afterBreak.data.status,
      hasActiveBreak: !!afterBreak.data.attendance?.activeBreak
    });

    if (afterBreak.data.status !== 'checked-in') {
      console.log('❌ ERROR: Status after break should be "checked-in"');
      return;
    }
    console.log('✅ Status after break is correct (checked-in)\n');

    // Step 9: Check out
    console.log('9. Checking out...');
    const checkOutResponse = await axios.post(`${API_BASE}/attendance/checkout`, {
      location: { latitude: 0, longitude: 0, address: 'Test Office' },
      ipAddress: '127.0.0.1',
      deviceInfo: 'Test Browser'
    }, { headers });
    console.log('✅ Check-out successful\n');

    // Step 10: Check final status
    console.log('10. Checking final status...');
    const finalStatus = await axios.get(`${API_BASE}/attendance/today`, { headers });
    console.log('Final Status:', {
      status: finalStatus.data.status,
      hasCheckIn: !!finalStatus.data.attendance?.checkIn,
      hasCheckOut: !!finalStatus.data.attendance?.checkOut,
      totalWorkingHours: finalStatus.data.totalWorkingHours,
      totalBreakTime: finalStatus.data.totalBreakTime
    });

    if (finalStatus.data.status !== 'checked-out') {
      console.log('❌ ERROR: Final status should be "checked-out"');
      return;
    }
    console.log('✅ Final status is correct (checked-out)\n');

    console.log('🎉 All tests passed! The attendance workflow is working correctly.');
    console.log('\n📋 Summary:');
    console.log('- New users start with "not-checked-in" status');
    console.log('- Check-in changes status to "checked-in"');
    console.log('- Break changes status to "on-break"');
    console.log('- End break returns status to "checked-in"');
    console.log('- Check-out changes status to "checked-out"');
    console.log('- All buttons should be properly enabled/disabled based on status');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 Make sure the server is running and the test user exists in the database');
    }
  }
}

// Run the test
testAttendanceWorkflow();
