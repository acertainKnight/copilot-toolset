# PowerShell Script for Windows-specific setup of Copilot MCP Toolset
# This script creates all necessary directories and sets up environment variables

param(
    [string]$WorkspaceRoot = $PWD,
    [switch]$CreateShortcuts = $false,
    [switch]$SetupScheduledTask = $false
)

Write-Host "=== Copilot MCP Toolset Windows Setup ===" -ForegroundColor Cyan
Write-Host "Workspace: $WorkspaceRoot" -ForegroundColor Green
Write-Host ""

# Define paths using Windows environment variables
$AppDataPath = $env:APPDATA
$LocalAppDataPath = $env:LOCALAPPDATA
$UserProfile = $env:USERPROFILE

# Global storage paths
$GlobalPaths = @(
    "$AppDataPath\CopilotMCP",
    "$AppDataPath\CopilotMCP\modes",
    "$AppDataPath\CopilotMCP\user",
    "$AppDataPath\CopilotMCP\logs",
    "$AppDataPath\CopilotMCP\backups",
    "$LocalAppDataPath\CopilotMCP\cache",
    "$LocalAppDataPath\CopilotMCP\temp"
)

# Workspace-specific paths
$WorkspacePaths = @(
    "$WorkspaceRoot\.copilot",
    "$WorkspaceRoot\.copilot\memory",
    "$WorkspaceRoot\.copilot\modes",
    "$WorkspaceRoot\.copilot\temp",
    "$WorkspaceRoot\.copilot\logs"
)

function New-DirectoryIfNotExists {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        try {
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
            Write-Host "✓ Created: $Path" -ForegroundColor Green
        }
        catch {
            Write-Host "✗ Failed to create: $Path - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "- Exists: $Path" -ForegroundColor Yellow
    }
}

function Set-WindowsEnvironmentVariables {
    Write-Host "Setting up Windows environment variables..." -ForegroundColor Cyan

    # Set user environment variables for consistent paths
    try {
        [Environment]::SetEnvironmentVariable("COPILOT_MCP_GLOBAL", "$AppDataPath\CopilotMCP", "User")
        [Environment]::SetEnvironmentVariable("COPILOT_MCP_CACHE", "$LocalAppDataPath\CopilotMCP\cache", "User")
        Write-Host "✓ Environment variables set" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to set environment variables: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function New-WindowsShortcuts {
    if (-not $CreateShortcuts) { return }

    Write-Host "Creating desktop shortcuts..." -ForegroundColor Cyan

    $WScriptShell = New-Object -ComObject WScript.Shell

    # Shortcut to open workspace in VS Code
    $Shortcut = $WScriptShell.CreateShortcut("$env:USERPROFILE\Desktop\Copilot MCP Workspace.lnk")
    $Shortcut.TargetPath = "code"
    $Shortcut.Arguments = "`"$WorkspaceRoot`""
    $Shortcut.Description = "Open Copilot MCP Workspace in VS Code"
    $Shortcut.IconLocation = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"

    try {
        $Shortcut.Save()
        Write-Host "✓ VS Code workspace shortcut created" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to create VS Code shortcut: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Shortcut to MCP storage folder
    $StorageShortcut = $WScriptShell.CreateShortcut("$env:USERPROFILE\Desktop\MCP Storage.lnk")
    $StorageShortcut.TargetPath = "$AppDataPath\CopilotMCP"
    $StorageShortcut.Description = "Open MCP Storage Folder"

    try {
        $StorageShortcut.Save()
        Write-Host "✓ Storage folder shortcut created" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to create storage shortcut: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Set-WindowsFileAssociations {
    Write-Host "Setting up file associations..." -ForegroundColor Cyan

    # Associate .mcp files with VS Code if available
    if (Get-Command "code" -ErrorAction SilentlyContinue) {
        try {
            # This would require admin privileges, so we'll just inform the user
            Write-Host "ℹ To associate .mcp files with VS Code, run as administrator:" -ForegroundColor Blue
            Write-Host "  assoc .mcp=VSCode" -ForegroundColor Gray
            Write-Host "  ftype VSCode=`"$($env:LOCALAPPDATA)\Programs\Microsoft VS Code\Code.exe`" `"%1`"" -ForegroundColor Gray
        }
        catch {
            Write-Host "✗ Could not set file associations: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function New-PowerShellProfile {
    Write-Host "Setting up PowerShell profile enhancements..." -ForegroundColor Cyan

    $ProfilePath = $PROFILE
    $MCPAliases = @"

# Copilot MCP Toolset aliases and functions
function Start-MCPServer {
    Set-Location "$WorkspaceRoot"
    npm run start
}

function Debug-MCPServer {
    Set-Location "$WorkspaceRoot"
    npm run dev
}

function Test-MCPServer {
    Set-Location "$WorkspaceRoot"
    npm run test
}

function Open-MCPStorage {
    Invoke-Item "$AppDataPath\CopilotMCP"
}

function Open-MCPWorkspace {
    code "$WorkspaceRoot"
}

Set-Alias -Name mcp-start -Value Start-MCPServer
Set-Alias -Name mcp-debug -Value Debug-MCPServer
Set-Alias -Name mcp-test -Value Test-MCPServer
Set-Alias -Name mcp-storage -Value Open-MCPStorage
Set-Alias -Name mcp-workspace -Value Open-MCPWorkspace

Write-Host "Copilot MCP aliases loaded. Type 'mcp-' and tab to see options." -ForegroundColor Green
"@

    if (Test-Path $ProfilePath) {
        $ExistingProfile = Get-Content $ProfilePath -Raw
        if ($ExistingProfile -notlike "*Copilot MCP Toolset aliases*") {
            Add-Content $ProfilePath $MCPAliases
            Write-Host "✓ Added MCP aliases to PowerShell profile" -ForegroundColor Green
        }
        else {
            Write-Host "- MCP aliases already in PowerShell profile" -ForegroundColor Yellow
        }
    }
    else {
        # Create new profile
        New-Item -ItemType File -Path $ProfilePath -Force | Out-Null
        Set-Content $ProfilePath $MCPAliases
        Write-Host "✓ Created PowerShell profile with MCP aliases" -ForegroundColor Green
    }
}

function Test-Prerequisites {
    Write-Host "Checking prerequisites..." -ForegroundColor Cyan

    # Check for Node.js
    if (Get-Command "node" -ErrorAction SilentlyContinue) {
        $NodeVersion = node --version
        Write-Host "✓ Node.js: $NodeVersion" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
        return $false
    }

    # Check for npm
    if (Get-Command "npm" -ErrorAction SilentlyContinue) {
        $NpmVersion = npm --version
        Write-Host "✓ npm: $NpmVersion" -ForegroundColor Green
    }
    else {
        Write-Host "✗ npm not found" -ForegroundColor Red
        return $false
    }

    # Check for VS Code
    if (Get-Command "code" -ErrorAction SilentlyContinue) {
        Write-Host "✓ VS Code available" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ VS Code not found in PATH. Install from https://code.visualstudio.com/" -ForegroundColor Yellow
    }

    # Check for Git
    if (Get-Command "git" -ErrorAction SilentlyContinue) {
        Write-Host "✓ Git available" -ForegroundColor Green
    }
    else {
        Write-Host "⚠ Git not found. Some features may not work properly." -ForegroundColor Yellow
    }

    return $true
}

function Show-CompletionSummary {
    Write-Host ""
    Write-Host "=== Windows Setup Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Storage Locations:" -ForegroundColor White
    Write-Host "  Global Config: $AppDataPath\CopilotMCP" -ForegroundColor Gray
    Write-Host "  Cache:         $LocalAppDataPath\CopilotMCP\cache" -ForegroundColor Gray
    Write-Host "  Workspace:     $WorkspaceRoot\.copilot" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Environment Variables:" -ForegroundColor White
    Write-Host "  COPILOT_MCP_GLOBAL: $env:COPILOT_MCP_GLOBAL" -ForegroundColor Gray
    Write-Host "  COPILOT_MCP_CACHE:  $env:COPILOT_MCP_CACHE" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor White
    Write-Host "  1. Restart PowerShell to load new aliases" -ForegroundColor Gray
    Write-Host "  2. Run 'npm install' in the workspace directory" -ForegroundColor Gray
    Write-Host "  3. Run 'npm run build' to build the MCP server" -ForegroundColor Gray
    Write-Host "  4. Open workspace in VS Code: code '$WorkspaceRoot'" -ForegroundColor Gray
    Write-Host "  5. Use Ctrl+Shift+P → 'Tasks: Run Task' → 'Start MCP Server'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "PowerShell Aliases:" -ForegroundColor White
    Write-Host "  mcp-start     - Start the MCP server" -ForegroundColor Gray
    Write-Host "  mcp-debug     - Start in debug mode" -ForegroundColor Gray
    Write-Host "  mcp-test      - Run MCP tests" -ForegroundColor Gray
    Write-Host "  mcp-storage   - Open storage folder" -ForegroundColor Gray
    Write-Host "  mcp-workspace - Open in VS Code" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Documentation: https://github.com/copilot-mcp/toolset#readme" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
}

# Main execution
try {
    # Check prerequisites first
    if (-not (Test-Prerequisites)) {
        Write-Host "Prerequisites not met. Please install required software and try again." -ForegroundColor Red
        exit 1
    }

    Write-Host "Creating directories..." -ForegroundColor Cyan

    # Create global directories
    foreach ($Path in $GlobalPaths) {
        New-DirectoryIfNotExists $Path
    }

    Write-Host ""

    # Create workspace directories
    foreach ($Path in $WorkspacePaths) {
        New-DirectoryIfNotExists $Path
    }

    Write-Host ""

    # Set environment variables
    Set-WindowsEnvironmentVariables

    Write-Host ""

    # Create shortcuts if requested
    if ($CreateShortcuts) {
        New-WindowsShortcuts
        Write-Host ""
    }

    # Set up file associations
    Set-WindowsFileAssociations
    Write-Host ""

    # Set up PowerShell profile
    New-PowerShellProfile
    Write-Host ""

    # Show completion summary
    Show-CompletionSummary

    Write-Host "Windows setup completed successfully!" -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}

# Usage examples at the end of the script
<#
.SYNOPSIS
    Sets up Copilot MCP Toolset for Windows

.DESCRIPTION
    This script creates necessary directories, sets environment variables,
    and configures Windows-specific settings for the Copilot MCP Toolset.

.PARAMETER WorkspaceRoot
    The root directory of your project workspace. Defaults to current directory.

.PARAMETER CreateShortcuts
    Create desktop shortcuts for quick access to workspace and storage.

.PARAMETER SetupScheduledTask
    Create a scheduled task to automatically start MCP server (future feature).

.EXAMPLE
    .\setup-windows.ps1
    Basic setup with default options

.EXAMPLE
    .\setup-windows.ps1 -WorkspaceRoot "C:\Projects\MyProject" -CreateShortcuts
    Setup for specific workspace with desktop shortcuts

.EXAMPLE
    .\setup-windows.ps1 -CreateShortcuts -SetupScheduledTask
    Full setup with all optional features
#>