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
  
  // Copy widget.html to build directory
  const buildDir = path.join(__dirname, 'build');
  const publicWidgetPath = path.join(__dirname, 'public', 'widget.html');
  const buildWidgetPath = path.join(buildDir, 'widget.html');
  
  if (fs.existsSync(publicWidgetPath)) {
    fs.copyFileSync(publicWidgetPath, buildWidgetPath);
    console.log('Copied widget.html to build directory');
  }
  
  // Copy preload script to build directory
  const publicPreloadPath = path.join(__dirname, 'public', 'preload-widget.js');
  const buildPreloadPath = path.join(buildDir, 'preload-widget.js');
  
  if (fs.existsSync(publicPreloadPath)) {
    fs.copyFileSync(publicPreloadPath, buildPreloadPath);
    console.log('Copied preload-widget.js to build directory');
  }
  
  console.log('Widget build completed!');
} else {
  // Build web version (default)
  console.log('Building web version...');
  execSync('react-scripts build', { stdio: 'inherit' });
  console.log('Web build completed!');
}
