const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the build type from command line arguments
const buildType = process.argv[2] || 'web';

console.log(`Building ${buildType} version...`);

if (buildType === 'widget') {
  // Build widget version
  console.log('Building widget version...');
  
  // Set environment variable for widget build
  process.env.REACT_APP_ENTRY_POINT = 'widget';
  
  // Run the build
  execSync('react-scripts build', { stdio: 'inherit' });
  
  // Rename index.html to widget.html
  const buildDir = path.join(__dirname, 'build');
  const indexPath = path.join(buildDir, 'index.html');
  const widgetPath = path.join(buildDir, 'widget.html');
  
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, widgetPath);
    console.log('Created widget.html');
  }
  
  console.log('Widget build completed!');
} else {
  // Build web version (default)
  console.log('Building web version...');
  execSync('react-scripts build', { stdio: 'inherit' });
  console.log('Web build completed!');
}
