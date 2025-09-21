@echo off
REM Copilot MCP Toolset - Standalone Server Installation Script (Windows)
REM This script installs the MCP server globally for use with GitHub Copilot

echo 🚀 Installing Copilot MCP Server...

REM Check Node.js version
for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

REM Build the project
echo 🔨 Building project...
npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to build project
    exit /b 1
)

REM Install globally
echo 🌍 Installing server globally...
npm install -g .
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install globally
    exit /b 1
)

REM Verify installation
where copilot-mcp-server >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo ✅ Server installed successfully!
    echo.
    echo 🎯 Next steps:
    echo 1. Configure VS Code with the MCP server
    echo 2. Add to your .vscode/mcp.json:
    echo.
    echo {
    echo   "mcpServers": {
    echo     "copilot-toolset": {
    echo       "type": "stdio",
    echo       "command": "copilot-mcp-server"
    echo     }
    echo   }
    echo }
    echo.
    echo 3. Restart VS Code and GitHub Copilot will have access to MCP tools
) else (
    echo ❌ Installation failed
    exit /b 1
)

pause