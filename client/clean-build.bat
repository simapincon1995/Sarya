@echo off
REM Batch script to clean Electron build directory
echo Cleaning Electron build directory...

REM Kill any running Electron processes
taskkill /F /IM electron.exe 2>nul
if %errorlevel% equ 0 (
    echo Electron processes stopped.
    timeout /t 2 /nobreak >nul
) else (
    echo No running Electron processes found.
)

REM Clean dist-widget directory
if exist "dist-widget" (
    echo Removing dist-widget directory...
    rmdir /s /q "dist-widget" 2>nul
    if exist "dist-widget" (
        echo ERROR: Could not remove dist-widget directory.
        echo Please close Windows Explorer windows accessing this folder.
        echo Or restart your computer and try again.
        pause
        exit /b 1
    ) else (
        echo dist-widget directory removed successfully.
    )
) else (
    echo dist-widget directory doesn't exist. Nothing to clean.
)

echo.
echo Cleanup complete! You can now run: npm run widget-build
pause


