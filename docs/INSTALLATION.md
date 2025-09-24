# Installation Guide

Quick installation guide for the Copilot MCP Toolset. Get up and running in 5 minutes.

## Quick Install (Recommended)

### Step 1: Prerequisites Check
```bash
node --version    # Need v18.0.0 or higher
npm --version     # Comes with Node.js
git --version     # Any recent version
```

**Missing prerequisites?** See [Prerequisites Details](#prerequisites-details) below.

### Step 2: Install & Setup
```bash
# Clone and build
git clone <repository-url>
cd copilot-mcp-toolset
npm install
npm run build

# Global installation (auto-configures VS Code)
./scripts/install-global.sh

# Verify installation
copilot-mcp-server --version
copilot-mcp-server --help
```

### Step 3: Test Integration
1. **Restart VS Code** completely
2. **Open any project folder**
3. **Open GitHub Copilot Chat**
4. **Test command**: `@copilot /help` (should show MCP tools)
5. **Initialize project**: `@copilot Initialize this project`

✅ **Success**: Creates `COPILOT.md`, `.github/copilot-instructions.md`, and initializes project in unified memory database.

## Platform-Specific Instructions

### 🐧 Linux & 🍎 macOS
```bash
chmod +x scripts/install-global.sh
./scripts/install-global.sh
```

### 🪟 Windows
**PowerShell**: `.\scripts\install-global.ps1`
**Git Bash**: Same as Linux/macOS

## Verification & Testing

### Quick Tests
```bash
# Test 1: Server installation
copilot-mcp-server --version
copilot-mcp-server --help

# Test 2: MCP protocol compliance
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Expected: JSON response listing all 8 MCP tools
```

### VS Code Integration Test
1. **Restart VS Code** after installation
2. **Open any project folder**
3. **GitHub Copilot Chat**: `@copilot /help`
4. **Verify**: MCP tools should be listed
5. **Test initialization**: `@copilot Initialize this project`

**Expected result**: Creates context files and memory system.

**Not working?** Check [Troubleshooting](#troubleshooting) below.

## Configuration Details

### Automatic VS Code Setup
Installation script creates configuration automatically:
- **Linux**: `~/.config/Code/User/mcp.json`
- **macOS**: `~/Library/Application Support/Code/User/mcp.json`
- **Windows**: `%APPDATA%\Code\User\mcp.json`

### Manual Configuration (If Needed)
See complete configuration examples in [VS Code Integration Guide](../examples/integration/vscode-setup.md).

**Basic configuration**:
```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/mcp/common/mcp.schema.json",
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"]
    }
  }
}
```

## Troubleshooting

### Quick Fixes

**Server not found?**
```bash
echo $PATH | grep npm  # Check PATH includes npm
npm root -g            # Find global install location
```

**VS Code not recognizing server?**
1. Restart VS Code completely
2. Check config file exists at correct platform path
3. Check VS Code Developer Tools console for errors

**Permission errors?**
```bash
# Linux/macOS
chmod +x scripts/install-global.sh

# Windows (PowerShell as Admin)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Debug Mode
```bash
COPILOT_DEBUG=true copilot-mcp-server --workspace=/test/path
```

**Need more help?** See complete [Troubleshooting Guide](TROUBLESHOOTING.md)

## Prerequisites Details

### Required Software
- **Node.js 18+**: [nodejs.org](https://nodejs.org) or use `nvm install 18`
- **VS Code**: With GitHub Copilot extension installed
- **Git**: For cloning repository

### Version Check
```bash
node --version  # Should be v18.0.0+
npm --version   # Included with Node.js
git --version   # Any recent version
```

## Advanced Configuration

### Storage Locations
**Global storage**: `~/.copilot-mcp/` (config, modes, backups)
**Unified memory**: `~/.copilot-mcp/memory/unified.db` (all project and global memories)
**VS Code config**: Platform-specific `mcp.json`

### Custom Installation
```bash
npm config set prefix /custom/path
./scripts/install-global.sh
export PATH="/custom/path/bin:$PATH"
```

### Multiple VS Code Variants
- **VS Code**: `Code/User/mcp.json`
- **VS Code Insiders**: `Code - Insiders/User/mcp.json`
- **Cursor**: `Cursor/User/mcp.json`

## Uninstallation
```bash
npm uninstall -g copilot-mcp-server
rm -rf ~/.copilot-mcp/
rm ~/.config/Code/User/mcp.json  # Platform-specific
```

## Next Steps

✅ **Ready to use**: Try `@copilot Initialize this project`
📖 **Learn more**: [USER_GUIDE.md](USER_GUIDE.md) - Complete feature guide
🧠 **Memory system**: [MEMORY_SYSTEM.md](MEMORY_SYSTEM.md) - Understanding memory
🤖 **Chat modes**: [CHAT_MODES.md](CHAT_MODES.md) - Specialized assistants
🛠️ **Issues?**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Complete troubleshooting