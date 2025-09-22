@echo off
:: Batch file for quick Windows setup of Copilot MCP Toolset
:: This provides a simple interface for the PowerShell setup script

setlocal enabledelayedexpansion

echo ============================================
echo Copilot MCP Toolset Windows Setup
echo ============================================
echo.

:: Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell check successful'" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is not available or not in PATH
    echo Please ensure PowerShell is installed and accessible.
    pause
    exit /b 1
)

:: Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "WORKSPACE_ROOT=%cd%"

:: Check if we're running from the right location
if not exist "%SCRIPT_DIR%..\package.json" (
    echo WARNING: This script should be run from the Copilot MCP Toolset directory
    echo Current directory: %WORKSPACE_ROOT%
    echo Script directory: %SCRIPT_DIR%
    echo.
    set /p CONTINUE="Continue anyway? (y/N): "
    if /i "!CONTINUE!" neq "y" exit /b 1
)

echo Workspace: %WORKSPACE_ROOT%
echo Script Directory: %SCRIPT_DIR%
echo.

:: Ask user for setup options
echo Setup Options:
echo.
set /p CREATE_SHORTCUTS="Create desktop shortcuts? (y/N): "
set /p SETUP_PROFILE="Setup PowerShell profile with MCP aliases? (Y/n): "

:: Convert responses to PowerShell parameters
set "PS_PARAMS=-WorkspaceRoot '%WORKSPACE_ROOT%'"

if /i "!CREATE_SHORTCUTS!"=="y" (
    set "PS_PARAMS=!PS_PARAMS! -CreateShortcuts"
    echo - Will create desktop shortcuts
)

if /i "!SETUP_PROFILE!"=="n" (
    echo - Will skip PowerShell profile setup
) else (
    echo - Will setup PowerShell profile
)

echo.
echo Starting PowerShell setup script...
echo ====================================
echo.

:: Run the PowerShell script with elevated privileges if needed
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%setup-windows.ps1' %PS_PARAMS%"

set "PS_EXIT_CODE=!errorlevel!"

echo.
echo ====================================
echo Setup script completed with exit code: !PS_EXIT_CODE!
echo.

if !PS_EXIT_CODE! equ 0 (
    echo SUCCESS: Windows setup completed successfully!
    echo.
    echo Next steps:
    echo 1. Restart your command prompt/PowerShell to load new environment variables
    echo 2. Run: npm install
    echo 3. Run: npm run build
    echo 4. Open in VS Code: code .
    echo 5. Start MCP server using VS Code tasks or: npm start
) else (
    echo ERROR: Setup encountered errors. Check the output above for details.
    echo.
    echo Common solutions:
    echo - Ensure Node.js is installed and in PATH
    echo - Run as Administrator if permission errors occur
    echo - Check that PowerShell execution policy allows script execution
)

echo.
echo For detailed documentation, visit:
echo https://github.com/copilot-mcp/toolset#readme
echo.

:: Keep window open so user can read the results
pause
exit /b !PS_EXIT_CODE!