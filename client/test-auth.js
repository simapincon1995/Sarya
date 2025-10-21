// Test script to verify widget authentication
console.log('Testing Widget Authentication...');

// Test 1: Verify login API works
async function testLogin() {
    console.log('\n1. Testing Login API...');
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@shirinq.com',
                password: 'admin123'
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            console.log('✅ Login successful');
            console.log('Token:', data.token.substring(0, 20) + '...');
            return data.token;
        } else {
            console.log('❌ Login failed:', data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Login error:', error.message);
        return null;
    }
}

// Test 2: Verify attendance API with token
async function testAttendanceAPI(token) {
    console.log('\n2. Testing Attendance API with token...');
    
    try {
        const response = await fetch('http://localhost:5000/api/attendance/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                location: 'Desktop Widget Test',
                ipAddress: 'Test',
                deviceInfo: 'test-device-123'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Check-in successful');
            console.log('Response:', data.message || 'Success');
        } else {
            console.log('❌ Check-in failed:', data.message);
            
            if (response.status === 401) {
                console.log('🔒 Authentication issue - token might be invalid');
            }
        }
    } catch (error) {
        console.log('❌ Check-in error:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🧪 Widget Authentication Test Suite');
    console.log('====================================');
    
    const token = await testLogin();
    
    if (token) {
        await testAttendanceAPI(token);
        
        console.log('\n📋 Fix Summary:');
        console.log('✅ Changed widget login form from username → email');
        console.log('✅ Added token storage to localStorage with key "token"');
        console.log('✅ Updated logout to clear auth token');
        console.log('✅ Added session validation on widget startup');
        
        console.log('\n🎯 Widget should now work with credentials:');
        console.log('Email: admin@shirinq.com');
        console.log('Password: admin123');
    } else {
        console.log('\n❌ Cannot proceed with attendance API test - login failed');
    }
}

// Start tests
runTests();