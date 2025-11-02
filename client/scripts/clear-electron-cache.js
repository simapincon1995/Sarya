const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache');

if (fs.existsSync(cacheDir)) {
  try {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ Cleared electron-builder cache');
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
    console.log('💡 Try running as Administrator or enable Windows Developer Mode');
  }
} else {
  console.log('ℹ️  Cache directory does not exist');
}

