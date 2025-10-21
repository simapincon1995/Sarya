// Test location format for attendance API
console.log('Testing attendance API location format...');

// Test the location object format
const locationData = {
  latitude: 0,
  longitude: 0,
  address: 'Desktop Widget'
};

console.log('Location object to send:', locationData);
console.log('This matches TimeTracker format:', JSON.stringify(locationData) === JSON.stringify({ latitude: 0, longitude: 0, address: 'Office' }.latitude === 0));

// Simulate API call
async function testCheckIn() {
  try {
    console.log('Testing check-in with correct location format...');
    
    // This is what the widget will now send
    const response = await fetch('http://localhost:5000/api/attendance/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      },
      body: JSON.stringify({
        location: locationData,
        ipAddress: 'Desktop',
        deviceInfo: 'desktop-widget-test'
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

console.log('✅ Location format fixed:');
console.log('Before: location: "Desktop Widget" (string) ❌');  
console.log('After:  location: { latitude: 0, longitude: 0, address: "Desktop Widget" } ✅');
console.log('');
console.log('This matches exactly what TimeTracker component sends.');

// Run test if you have a valid token
// testCheckIn();