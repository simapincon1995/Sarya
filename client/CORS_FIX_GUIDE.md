# CORS Error Fix & Troubleshooting Guide

## Issue: CORS Error on Widget Login

The widget is running successfully on `localhost:3001`, but login requests are failing with CORS errors because the backend server only allows requests from `localhost:3000`.

## ✅ Solution Applied

### 1. Updated Server CORS Configuration

**File: `server/config.env`**
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**File: `server/index.js`**
- Modified to parse multiple CORS origins from environment variable
- Now accepts requests from both ports 3000 and 3001

### 2. Fixed PowerShell Execution Policy Issues

**Created multiple startup scripts:**
- `start-widget-cmd.bat` - Uses cmd instead of PowerShell
- `start-widget.bat` - Standard batch file
- `start-widget.ps1` - PowerShell script (if execution policy allows)

## 🔧 How to Fix CORS Error

### Step 1: Restart the Backend Server
```bash
# Stop the current server (Ctrl+C)
# Then restart it
cd server
npm run dev
```

### Step 2: Test the Widget
```bash
cd client
npm run widget
```

### Step 3: Verify Login Works
- Open `http://localhost:3001`
- Try logging in with: `employee@shirinq.com` / `employee123`
- Should now work without CORS errors

## 🚀 Alternative Startup Methods

If you encounter PowerShell issues, try these alternatives:

### Method 1: Direct Batch File
```bash
cd client
start-widget-cmd.bat
```

### Method 2: Manual Environment Variables
```bash
cd client
set REACT_APP_ENTRY_POINT=widget
set PORT=3001
npm start
```

### Method 3: PowerShell with Bypass
```bash
cd client
npm run widget-ps
```

## 📋 Verification Checklist

- [ ] Backend server is running on port 5000
- [ ] Widget is running on port 3001
- [ ] Full HRMS is running on port 3000
- [ ] CORS_ORIGIN includes both ports
- [ ] Login works without CORS errors
- [ ] Both applications can run simultaneously

## 🐛 Common Issues & Solutions

### Issue: "npm.ps1 cannot be loaded"
**Solution:** Use `start-widget-cmd.bat` or run `npm run widget-ps`

### Issue: "CORS error" persists
**Solution:** 
1. Restart the backend server
2. Check `server/config.env` has both ports
3. Verify server logs show CORS origins

### Issue: Port already in use
**Solution:**
```bash
# Find process using port 3001
netstat -ano | findstr :3001
# Kill the process
taskkill /PID <PID> /F
```

## 📞 Next Steps

After fixing CORS:
1. Test login functionality
2. Test attendance features
3. Verify offline/online sync
4. Test Electron widget build
