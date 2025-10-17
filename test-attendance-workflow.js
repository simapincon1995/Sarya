const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let testEmployeeId = '';

// Test data - using existing seeded users
const testEmployee = {
  email: 'employee@shirinq.com',
  password: 'employee123'
};

const testManager = {
  email: 'manager@shirinq.com',
  password: 'manager123'
};

// Helper functions
const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};

// Test functions
const testUserRegistration = async () => {
  console.log('\n🧪 Testing User Registration...');
  console.log('ℹ️ Using existing seeded users - skipping registration');
  console.log('📝 Employee: employee@shirinq.com');
  console.log('📝 Manager: manager@shirinq.com');
};

const testUserLogin = async () => {
  console.log('\n🧪 Testing User Login...');
  
  const loginResult = await makeRequest('POST', '/auth/login', {
    email: testEmployee.email,
    password: testEmployee.password
  });
  
  if (loginResult.success) {
    authToken = loginResult.data.token;
    console.log('✅ Login successful');
    console.log('📝 Auth token received');
  } else {
    console.log('❌ Login failed:', loginResult.error);
  }
};

const testGetTodayAttendance = async () => {
  console.log('\n🧪 Testing Get Today\'s Attendance (Initial State)...');
  
  const result = await makeRequest('GET', '/attendance/today', null, authToken);
  
  if (result.success) {
    console.log('✅ Get today attendance successful');
    console.log('📊 Status:', result.data.status);
    console.log('📊 Attendance data:', result.data.attendance);
    
    if (result.data.status === 'not-checked-in') {
      console.log('✅ Correct initial status: not-checked-in');
    } else {
      console.log('❌ Unexpected initial status:', result.data.status);
    }
  } else {
    console.log('❌ Get today attendance failed:', result.error);
  }
};

const testCheckIn = async () => {
  console.log('\n🧪 Testing Check In...');
  
  const checkInData = {
    location: { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' },
    ipAddress: '192.168.1.100',
    deviceInfo: 'Test Browser'
  };
  
  const result = await makeRequest('POST', '/attendance/checkin', checkInData, authToken);
  
  if (result.success) {
    console.log('✅ Check-in successful');
    console.log('📊 Check-in time:', result.data.attendance.checkIn.time);
    console.log('📊 Is late:', result.data.attendance.isLate);
  } else {
    console.log('❌ Check-in failed:', result.error);
  }
};

const testGetAttendanceAfterCheckIn = async () => {
  console.log('\n🧪 Testing Get Today\'s Attendance (After Check-in)...');
  
  const result = await makeRequest('GET', '/attendance/today', null, authToken);
  
  if (result.success) {
    console.log('✅ Get today attendance successful');
    console.log('📊 Status:', result.data.status);
    console.log('📊 Check-in time:', result.data.attendance.checkIn?.time);
    console.log('📊 Total login minutes:', result.data.totalLoginMinutes);
    
    if (result.data.status === 'checked-in') {
      console.log('✅ Correct status after check-in: checked-in');
    } else {
      console.log('❌ Unexpected status after check-in:', result.data.status);
    }
  } else {
    console.log('❌ Get today attendance failed:', result.error);
  }
};

const testStartBreak = async () => {
  console.log('\n🧪 Testing Start Break...');
  
  const breakData = {
    breakType: 'lunch',
    reason: 'Lunch break'
  };
  
  const result = await makeRequest('POST', '/attendance/break/start', breakData, authToken);
  
  if (result.success) {
    console.log('✅ Start break successful');
    console.log('📊 Break type:', result.data.break.breakType);
    console.log('📊 Break start time:', result.data.break.startTime);
  } else {
    console.log('❌ Start break failed:', result.error);
  }
};

const testGetAttendanceOnBreak = async () => {
  console.log('\n🧪 Testing Get Today\'s Attendance (On Break)...');
  
  const result = await makeRequest('GET', '/attendance/today', null, authToken);
  
  if (result.success) {
    console.log('✅ Get today attendance successful');
    console.log('📊 Status:', result.data.status);
    console.log('📊 Active break:', result.data.attendance.activeBreak);
    
    if (result.data.status === 'on-break') {
      console.log('✅ Correct status on break: on-break');
    } else {
      console.log('❌ Unexpected status on break:', result.data.status);
    }
  } else {
    console.log('❌ Get today attendance failed:', result.error);
  }
};

const testEndBreak = async () => {
  console.log('\n🧪 Testing End Break...');
  
  const result = await makeRequest('POST', '/attendance/break/end', null, authToken);
  
  if (result.success) {
    console.log('✅ End break successful');
    console.log('📊 Break end time:', result.data.break.endTime);
    console.log('📊 Break duration:', result.data.break.duration, 'minutes');
  } else {
    console.log('❌ End break failed:', result.error);
  }
};

const testGetAttendanceAfterBreak = async () => {
  console.log('\n🧪 Testing Get Today\'s Attendance (After Break)...');
  
  const result = await makeRequest('GET', '/attendance/today', null, authToken);
  
  if (result.success) {
    console.log('✅ Get today attendance successful');
    console.log('📊 Status:', result.data.status);
    console.log('📊 Total break time:', result.data.totalBreakTime, 'minutes');
    console.log('📊 Total working hours:', result.data.totalWorkingHours, 'minutes');
    
    if (result.data.status === 'checked-in') {
      console.log('✅ Correct status after break: checked-in');
    } else {
      console.log('❌ Unexpected status after break:', result.data.status);
    }
  } else {
    console.log('❌ Get today attendance failed:', result.error);
  }
};

const testCheckOut = async () => {
  console.log('\n🧪 Testing Check Out...');
  
  const checkOutData = {
    location: { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' },
    ipAddress: '192.168.1.100',
    deviceInfo: 'Test Browser'
  };
  
  const result = await makeRequest('POST', '/attendance/checkout', checkOutData, authToken);
  
  if (result.success) {
    console.log('✅ Check-out successful');
    console.log('📊 Check-out time:', result.data.attendance.checkOut.time);
    console.log('📊 Total working hours:', result.data.attendance.totalWorkingHours, 'minutes');
    console.log('📊 Overtime:', result.data.attendance.overtime, 'minutes');
  } else {
    console.log('❌ Check-out failed:', result.error);
  }
};

const testGetAttendanceAfterCheckOut = async () => {
  console.log('\n🧪 Testing Get Today\'s Attendance (After Check-out)...');
  
  const result = await makeRequest('GET', '/attendance/today', null, authToken);
  
  if (result.success) {
    console.log('✅ Get today attendance successful');
    console.log('📊 Status:', result.data.status);
    console.log('📊 Check-out time:', result.data.attendance.checkOut?.time);
    console.log('📊 Final total working hours:', result.data.totalWorkingHours, 'minutes');
    console.log('📊 Final total break time:', result.data.totalBreakTime, 'minutes');
    
    if (result.data.status === 'checked-out') {
      console.log('✅ Correct status after check-out: checked-out');
    } else {
      console.log('❌ Unexpected status after check-out:', result.data.status);
    }
  } else {
    console.log('❌ Get today attendance failed:', result.error);
  }
};

const testDuplicateCheckIn = async () => {
  console.log('\n🧪 Testing Duplicate Check In (Should Fail)...');
  
  const checkInData = {
    location: { latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' },
    ipAddress: '192.168.1.100',
    deviceInfo: 'Test Browser'
  };
  
  const result = await makeRequest('POST', '/attendance/checkin', checkInData, authToken);
  
  if (!result.success && result.status === 400) {
    console.log('✅ Duplicate check-in correctly rejected');
    console.log('📊 Error message:', result.error.message);
  } else {
    console.log('❌ Duplicate check-in should have been rejected');
  }
};

const testBreakWithoutCheckIn = async () => {
  console.log('\n🧪 Testing Break Without Check In (Should Fail)...');
  
  // Use a different existing employee for this test
  const loginResult = await makeRequest('POST', '/auth/login', {
    email: 'jane.smith@shirinq.com',
    password: 'employee123'
  });
  
  if (!loginResult.success) {
    console.log('❌ Failed to login employee for test');
    return;
  }
  
  const newAuthToken = loginResult.data.token;
  
  const breakData = {
    breakType: 'lunch',
    reason: 'Lunch break'
  };
  
  const result = await makeRequest('POST', '/attendance/break/start', breakData, newAuthToken);
  
  if (!result.success && result.status === 400) {
    console.log('✅ Break without check-in correctly rejected');
    console.log('📊 Error message:', result.error.message);
  } else {
    console.log('❌ Break without check-in should have been rejected');
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Attendance Workflow Tests...');
  console.log('=' * 50);
  
  try {
    await testUserRegistration();
    await testUserLogin();
    await testGetTodayAttendance();
    await testCheckIn();
    await testGetAttendanceAfterCheckIn();
    await testStartBreak();
    await testGetAttendanceOnBreak();
    await testEndBreak();
    await testGetAttendanceAfterBreak();
    await testCheckOut();
    await testGetAttendanceAfterCheckOut();
    await testDuplicateCheckIn();
    await testBreakWithoutCheckIn();
    
    console.log('\n🎉 All tests completed!');
    console.log('=' * 50);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testUserRegistration,
  testUserLogin,
  testGetTodayAttendance,
  testCheckIn,
  testGetAttendanceAfterCheckIn,
  testStartBreak,
  testGetAttendanceOnBreak,
  testEndBreak,
  testGetAttendanceAfterBreak,
  testCheckOut,
  testGetAttendanceAfterCheckOut,
  testDuplicateCheckIn,
  testBreakWithoutCheckIn
};
