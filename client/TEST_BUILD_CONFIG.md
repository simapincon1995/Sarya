# Test Script for Build Configuration

This script tests both development modes to ensure they work correctly.

## Testing Commands

### Test Full HRMS (Port 3000)
```bash
cd client
npm run start
# Should open http://localhost:3000 with full HRMS
```

### Test Widget (Port 3001)
```bash
cd client
npm run widget
# Should open http://localhost:3001 with widget only
```

## Expected Results

1. **Full HRMS** (`npm run start`):
   - Runs on port 3000
   - Shows complete HRMS interface
   - Includes all navigation menus
   - Has dashboard, employees, attendance, etc.

2. **Widget Only** (`npm run widget`):
   - Runs on port 3001
   - Shows only attendance widget
   - Minimal interface
   - Only check-in/out functionality

## Troubleshooting

If commands fail:
1. Check if ports 3000 and 3001 are available
2. Verify batch files exist: `start-widget.bat`, `start-widget.ps1`
3. Check environment variables are set correctly
4. Ensure all dependencies are installed: `npm install`
