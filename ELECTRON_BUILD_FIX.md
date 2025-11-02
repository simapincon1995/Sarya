# Fix: Electron Builder "File in Use" Error

## Problem
```
⨯ remove ...\app.asar: The process cannot access the file because it is being used by another process.
```

This happens when:
- Electron app is still running
- Windows Explorer is accessing the `dist-widget` folder
- Antivirus is scanning the folder
- Previous build process didn't complete properly

## Quick Fix

### Option 1: Automatic Clean (Recommended)

I've updated the build script to automatically clean before building:

```bash
cd client
npm run widget-build
```

The script now automatically:
1. Cleans the `dist-widget` directory
2. Builds the widget
3. Packages with Electron Builder

### Option 2: Manual Clean First

If automatic clean doesn't work:

**PowerShell:**
```powershell
cd client
.\clean-build.ps1
npm run widget-build
```

**Command Prompt:**
```cmd
cd client
clean-build.bat
npm run widget-build
```

**Or use the enhanced clean script:**
```bash
cd client
npm run widget-build:clean
```

### Option 3: Manual Steps

1. **Close Electron Apps:**
   - Open Task Manager (Ctrl+Shift+Esc)
   - End any "electron.exe" or "HRMS Widget" processes

2. **Close File Explorer:**
   - Close any Windows Explorer windows showing the `dist-widget` folder
   - Or navigate away from that folder

3. **Manually Delete:**
   ```powershell
   cd client
   Remove-Item -Recurse -Force dist-widget
   ```

4. **Try Building Again:**
   ```bash
   npm run widget-build
   ```

## Solutions Created

### 1. Updated `package.json`
- `clean-build`: Quick clean script
- `widget-build`: Now automatically cleans before building
- `widget-build:clean`: Enhanced clean with process killing

### 2. Created Clean Scripts
- `client/clean-build.ps1` - PowerShell script
- `client/clean-build.bat` - Batch script for CMD
- `client/scripts/clean-electron.js` - Node.js script (cross-platform)

## Detailed Steps

### Step 1: Stop All Electron Processes

**Task Manager Method:**
1. Press `Ctrl+Shift+Esc` to open Task Manager
2. Find "electron.exe" or "HRMS Widget"
3. Right-click → End Task

**Command Line Method:**
```powershell
# PowerShell
taskkill /F /IM electron.exe

# Or find and kill manually
Get-Process | Where-Object {$_.ProcessName -like "*electron*"} | Stop-Process -Force
```

### Step 2: Close File Explorer Windows

Close any Windows Explorer windows that might be showing:
- `client\dist-widget` folder
- Any subfolder inside `dist-widget`

### Step 3: Clean Build Directory

**Using the script (easiest):**
```bash
cd client
npm run clean-build
```

**Or manually:**
```powershell
# PowerShell
cd client
if (Test-Path dist-widget) {
    Remove-Item -Recurse -Force dist-widget
}
```

### Step 4: Build Again

```bash
npm run widget-build
```

## Prevention Tips

1. **Always close Electron apps before building:**
   ```bash
   # Check if running
   tasklist | findstr electron
   
   # Kill if found
   taskkill /F /IM electron.exe
   ```

2. **Use the updated build command:**
   ```bash
   npm run widget-build  # Now includes automatic clean
   ```

3. **If issues persist, restart your computer:**
   - This releases all file locks
   - Then try building again

## Alternative: Build in Clean Directory

If problems continue, you can temporarily change the output directory:

1. Edit `client/electron-builder.json`:
   ```json
   {
     "directories": {
       "output": "dist-widget-temp"
     }
   }
   ```

2. Build:
   ```bash
   npm run widget-build
   ```

3. If successful, you can delete the old `dist-widget` folder later

## Troubleshooting

### Still Getting "File in Use" Error?

1. **Check what's using the file:**
   ```powershell
   # Download Handle.exe from Sysinternals
   # Then run:
   handle.exe dist-widget
   ```

2. **Use Process Explorer:**
   - Download Process Explorer from Microsoft
   - Search for files containing "app.asar"
   - End the process

3. **Reboot:**
   - Sometimes Windows locks files and only a reboot releases them
   - After reboot, try building again

### Antivirus Interference

Some antivirus software locks files during scanning:
1. Temporarily disable real-time protection
2. Add `dist-widget` folder to antivirus exclusions
3. Try building again

### OneDrive Sync Issues

If files are in OneDrive:
1. The sync might be locking files
2. Pause OneDrive sync temporarily
3. Build the app
4. Resume sync after build completes

## Success Indicators

When build succeeds, you should see:
```
✓ Packaging       platform=win32 arch=x64
✓ Building NSIS installer
✓ Building done
```

And you'll find the installer at:
```
client\dist-widget\HRMS Widget Setup x.x.x.exe
```

## Need More Help?

If issues persist:
1. Check Electron Builder logs in the console
2. Try building from a fresh terminal/command prompt
3. Restart your computer
4. Check Windows Event Viewer for file system errors


