const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distWidgetPath = path.join(__dirname, '..', 'dist-widget');

console.log('🧹 Cleaning Electron build directory...');

// Try to kill Electron processes (Windows)
try {
  if (process.platform === 'win32') {
    try {
      execSync('taskkill /F /IM electron.exe 2>nul', { stdio: 'ignore' });
      console.log('✅ Stopped running Electron processes');
    } catch (e) {
      // Process not running, that's fine
    }
  } else if (process.platform === 'darwin' || process.platform === 'linux') {
    try {
      execSync('pkill -f electron || true', { stdio: 'ignore' });
      console.log('✅ Stopped running Electron processes');
    } catch (e) {
      // Process not running, that's fine
    }
  }
} catch (error) {
  // Ignore errors
}

// Wait a bit for processes to fully terminate
setTimeout(() => {
  // Remove dist-widget directory
  if (fs.existsSync(distWidgetPath)) {
    try {
      fs.rmSync(distWidgetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
      console.log('✅ Cleaned dist-widget directory');
    } catch (error) {
      console.error('❌ Error cleaning dist-widget:', error.message);
      console.log('\n💡 Solutions:');
      console.log('   1. Close any Windows Explorer windows in the dist-widget folder');
      console.log('   2. Close any running Electron apps');
      console.log('   3. Restart your computer and try again');
      console.log('   4. Manually delete the dist-widget folder and try again');
      process.exit(1);
    }
  } else {
    console.log('✅ dist-widget directory doesn\'t exist (already clean)');
  }
}, 1000);


