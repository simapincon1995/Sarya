# PowerShell script to clean Electron build directory
# Run this before building: .\clean-build.ps1

Write-Host "Cleaning Electron build directory..." -ForegroundColor Yellow

# Kill any running Electron processes
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcesses) {
    Write-Host "Found running Electron processes. Stopping them..." -ForegroundColor Yellow
    $electronProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "Electron processes stopped." -ForegroundColor Green
} else {
    Write-Host "No running Electron processes found." -ForegroundColor Green
}

# Kill any running app processes (if app is running)
$appProcesses = Get-Process -Name "HRMS Widget" -ErrorAction SilentlyContinue
if ($appProcesses) {
    Write-Host "Found running app instances. Stopping them..." -ForegroundColor Yellow
    $appProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "App processes stopped." -ForegroundColor Green
}

# Clean dist-widget directory
$distWidgetPath = ".\dist-widget"
if (Test-Path $distWidgetPath) {
    Write-Host "Removing dist-widget directory..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $distWidgetPath -Recurse -Force -ErrorAction Stop
        Write-Host "dist-widget directory removed successfully." -ForegroundColor Green
    } catch {
        Write-Host "Error removing dist-widget: $_" -ForegroundColor Red
        Write-Host "Try closing Windows Explorer windows that might be accessing this folder." -ForegroundColor Yellow
        Write-Host "Or restart your computer and try again." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "dist-widget directory doesn't exist. Nothing to clean." -ForegroundColor Green
}

Write-Host "`nCleanup complete! You can now run: npm run widget-build" -ForegroundColor Green


