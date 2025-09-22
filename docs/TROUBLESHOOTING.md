# Troubleshooting Guide

Progressive troubleshooting guide - start with quick fixes, escalate to detailed diagnostics as needed.

## 🚨 Quick Fixes (Try These First)

### Most Common Issues (90% of problems)

**1. VS Code not recognizing tools?**
- ✅ **Restart VS Code completely** (most common fix)
- ✅ Check GitHub Copilot extension is active
- ✅ Test: `@copilot /help` should show MCP tools

**2. Server not found after installation?**
```bash
which copilot-mcp-server  # Should return a path
copilot-mcp-server --help # Should show server info
```

**3. Installation fails?**
- ✅ **Node.js 18+**: `node --version` (upgrade if needed)
- ✅ **Permissions**: Try `sudo ./scripts/install-global.sh` (Linux/macOS)
- ✅ **Windows**: Run PowerShell as Administrator

**4. Memory not working?**
```
@copilot Show memory stats  # Should show storage info
@copilot Remember: test     # Should confirm storage
```

**Still having issues?** Continue to detailed troubleshooting below.

---

## 🔍 Detailed Troubleshooting

### Diagnostic Commands (Run These)
```bash
# Basic connectivity test
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Version checks
node --version  # Need 18+
npm --version   # Should exist
code --version  # VS Code version
```

## Installation Problems

### Node.js Version Issues
**❌ Error**: `Node.js version 16.x.x is too old`

**✅ Solution**: Upgrade to Node.js 18+
```bash
# Using nvm (recommended)
nvm install 18 && nvm use 18

# Verify
node --version  # Should show v18.0.0+
```

### Permission Errors
**❌ Error**: `EACCES: permission denied, mkdir '/usr/local/lib/node_modules'`

**✅ Best solution**: Use Node Version Manager
```bash
nvm install 18 && nvm use 18
./scripts/install-global.sh
```

**✅ Alternative**: Fix npm permissions
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Build Failures
**❌ Error**: TypeScript compilation fails

**✅ Solution**: Clean rebuild
```bash
npm run clean
rm -rf node_modules package-lock.json
npm install && npm run build
```

### Binary Not Found
**❌ Error**: `copilot-mcp-server: command not found`

**✅ Solution**: Check PATH and reinstall
```bash
# Check if installed
npm list -g | grep copilot-mcp

# Add npm global to PATH
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Or reinstall
npm uninstall -g copilot-mcp-toolset
./scripts/install-global.sh
```

## Configuration Issues

### Invalid MCP Configuration
**❌ Error**: `Invalid MCP configuration format`

**✅ Solution**: Use 2024-11-05 format
```json
{
  "mcpVersion": "2024-11-05",
  "servers": {
    "copilot-mcp-toolset": {
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"]
    }
  }
}
```

### Configuration File Locations
**Can't find where to put config files?**

**Platform-specific paths**:
- **Linux**: `~/.config/Code/User/mcp.json`
- **macOS**: `~/Library/Application Support/Code/User/mcp.json`
- **Windows**: `%APPDATA%\Code\User\mcp.json`
- **Workspace**: `.vscode/mcp.json` (any project)

### Configuration Validation
**Not sure if config is correct?**

```bash
# Validate config file
npm run validate:config .vscode/mcp.json

# Should show: "✅ Configuration is valid!"
```

## VS Code Integration Issues

### MCP Server Not Starting
**❌ Error**: "MCP server failed to start"

**✅ Diagnostic steps**:
1. **Test manually**: `copilot-mcp-server --help`
2. **Test protocol**: `echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server`
3. **Check VS Code logs**: `Help > Toggle Developer Tools`

**✅ Quick fixes**:
- Restart VS Code completely
- Verify: `which copilot-mcp-server`
- Check config file format and location

### Tools Not Available
**❌ Problem**: GitHub Copilot doesn't show MCP tools

**✅ Quick checks**:
```bash
# Verify GitHub Copilot extension
code --list-extensions | grep github.copilot

# Test in chat
@copilot What tools are available?
```

**✅ Solutions**:
- Restart VS Code after config changes
- Check both global AND workspace configs
- Verify GitHub Copilot subscription active

### Workspace Context Issues
**❌ Problem**: All projects have the same context

**✅ Solution**: Create workspace-specific config
```json
// .vscode/mcp.json
{
  "mcpVersion": "2024-11-05",
  "servers": {
    "copilot-toolset": {
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"]
    }
  }
}
```

**Test**: `@copilot What workspace am I in?`

## GitHub Copilot Feature Issues

### Chat Modes Not Loading
**❌ Problem**: Built-in modes (architect, debugger, etc.) not available

**✅ Quick fixes**:
1. Initialize project: `@copilot Initialize this project`
2. Check directory: `.github/chatmodes/` should exist
3. Regenerate: `@copilot Create built-in chat modes`

**Test**: `@copilot List all available modes`

### Copilot Instructions Not Working
**❌ Problem**: `.github/copilot-instructions.md` not recognized

**✅ Solution**: Regenerate file
```
@copilot Initialize project context and GitHub Copilot instructions
```

### Custom Modes Not Persisting
**❌ Problem**: Custom modes disappear after restart

**✅ Check storage**:
- Global: `~/.copilot-mcp/modes/`
- Project: `.github/chatmodes/`

**✅ Solution**: `@copilot Create a persistent "security" mode`

## Memory System Issues

### Memory Not Persisting
**❌ Problem**: Stored information disappears

**✅ Quick diagnostics**:
```
@copilot Show memory statistics
@copilot What do you remember about my preferences?
```

**✅ Check directories**:
```bash
ls -la .copilot/memory/     # Should show database files
ls -la ~/.copilot-mcp/memory/  # Global memory
```

**✅ Solution**: `@copilot Initialize memory system`

### Memory Search Issues
**❌ Problem**: Search returns no results

**✅ Try broader terms**:
```
@copilot Search memories for coding
@copilot Find any stored preferences
@copilot Search preference layer for patterns
```

**✅ Rebuild index**: `@copilot Rebuild memory search index`

### High Memory Usage
**❌ Problem**: Memory system using too much storage

**✅ Quick cleanup**:
```
@copilot Show detailed memory statistics
@copilot Clean up old and unused memories
```

**✅ Manual cleanup** (careful):
```bash
rm -f .copilot/memory/*.db-backup
```

## Performance Issues

### Slow Response Times
**❌ Problem**: MCP tools respond slowly

**✅ Quick test**:
```bash
time echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server
```

**✅ Solutions**:
- Restart VS Code
- Reduce memory limits in `~/.copilot-mcp/config.json`
- Clean up: `@copilot Close unused workspaces`

### High RAM Usage
**❌ Problem**: MCP server using too much RAM

**✅ Check usage**:
```bash
ps aux | grep copilot-mcp-server
```

**✅ Reduce limits** in `~/.copilot-mcp/config.json`:
```json
{
  "server": {"maxConcurrentProjects": 5},
  "performance": {"resourceLimits": {"maxMemoryPerWorkspace": "25MB"}}
}
```

## 🧪 Advanced Diagnostics

### Complete System Check
```bash
# Server health
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Configuration validation
npm run validate:config .vscode/mcp.json

# Memory system
ls -la .copilot/memory/
du -sh .copilot/memory/

# Version checks
node --version && npm --version && code --version
```

### VS Code Integration Test
1. Open Developer Tools: `Help > Toggle Developer Tools`
2. Check Console for MCP errors
3. Test: `@copilot help`
4. Verify: `@copilot what tools can you use`

### Log Files
**Server logs**: `ls -la ~/.copilot-mcp/logs/`
**VS Code logs**: `Ctrl+Shift+P` → `Developer: Open Logs Folder`

## 🆘 Need More Help?

### Before Reporting Issues
**Run this diagnostic**:
```bash
copilot-mcp-server --help
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server
node --version && npm --version && code --version
```

### Issue Reporting
Include when reporting bugs:
- OS and versions (Node.js, VS Code, GitHub Copilot extensions)
- Complete error messages
- Diagnostic command output
- Config files (remove sensitive info)

### 🎆 Most Issues Fixed By:
1. ✅ **Restart VS Code completely**
2. ✅ **Verify global AND workspace configs**
3. ✅ **Check GitHub Copilot extension active**
4. ✅ **Test server manually** with diagnostics
5. ✅ **Use 2024-11-05 config format**
6. ✅ **Check file permissions** for memory directories

**90% of issues resolve with these steps** ✨