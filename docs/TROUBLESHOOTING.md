# Troubleshooting Guide

Complete troubleshooting guide for common issues with the Copilot MCP Toolset installation, configuration, and usage.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [VS Code Integration Issues](#vs-code-integration-issues)
- [GitHub Copilot Issues](#github-copilot-issues)
- [Memory System Issues](#memory-system-issues)
- [Performance Problems](#performance-problems)
- [Diagnostic Tools](#diagnostic-tools)

## Installation Issues

### Node.js Version Problems

**Problem**: Installation fails with Node.js version errors
```
❌ Node.js version 16.x.x is too old. Please install Node.js 18+ first.
```

**Solution**:
1. **Install Node.js 18+**:
   ```bash
   # Using nvm (recommended)
   nvm install 18
   nvm use 18

   # Or download from nodejs.org
   ```

2. **Verify installation**:
   ```bash
   node --version  # Should show 18.0.0 or higher
   npm --version   # Should be included
   ```

### Permission Errors During Global Install

**Problem**: `npm install -g` fails with permission errors
```
❌ EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solutions**:

**Option 1: Use Node Version Manager (Recommended)**
```bash
# Install nvm first, then:
nvm install 18
nvm use 18
./scripts/install-global.sh
```

**Option 2: Fix npm permissions**
```bash
# Linux/macOS
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
./scripts/install-global.sh
```

**Option 3: Use sudo (not recommended)**
```bash
sudo ./scripts/install-global.sh
```

### Build Failures

**Problem**: TypeScript compilation fails
```
❌ src/server/index.ts(123,45): error TS2304: Cannot find name 'xyz'
```

**Solution**:
1. **Clean and reinstall**:
   ```bash
   npm run clean
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Check TypeScript version**:
   ```bash
   npx tsc --version  # Should be 5.0+
   ```

### Global Binary Not Found

**Problem**: `copilot-mcp-server: command not found`

**Solutions**:

1. **Check installation path**:
   ```bash
   which copilot-mcp-server
   npm list -g --depth=0 | grep copilot-mcp
   ```

2. **Add to PATH** (if needed):
   ```bash
   # Find npm global path
   npm config get prefix

   # Add to PATH (Linux/macOS)
   echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Reinstall globally**:
   ```bash
   npm uninstall -g copilot-mcp-toolset
   ./scripts/install-global.sh
   ```

## Configuration Problems

### Invalid MCP Configuration Format

**Problem**: VS Code doesn't recognize MCP server
```
VS Code error: Invalid MCP configuration format
```

**Solution**: Use the correct 2024-11-05 format:

**Global config** (`~/.config/Code/User/mcp.json`):
```json
{
  "mcpVersion": "2024-11-05",
  "servers": {
    "copilot-mcp-toolset": {
      "command": "copilot-mcp-server"
    }
  }
}
```

**Workspace config** (`.vscode/mcp.json`):
```json
{
  "mcpVersion": "2024-11-05",
  "servers": {
    "copilot-toolset": {
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

### Configuration File Locations

**Problem**: Can't find where to put MCP configuration files

**VS Code User Settings Locations**:
- **Linux**: `~/.config/Code/User/mcp.json`
- **macOS**: `~/Library/Application Support/Code/User/mcp.json`
- **Windows**: `%APPDATA%\Code\User\mcp.json`

**Workspace Settings**:
- Any project: `.vscode/mcp.json` in project root

### Configuration Validation

**Problem**: Unsure if configuration is correct

**Solution**: Use the validation tool:
```bash
# In the project directory
npm run validate:config .vscode/mcp.json

# For global config
npm run validate:config ~/.config/Code/User/mcp.json
```

Expected output:
```
✅ Configuration is valid!
📊 Configuration Summary:
MCP Version: 2024-11-05
Servers: 1
  • copilot-toolset:
    Command: copilot-mcp-server
    Args: --workspace=${workspaceFolder}
    Environment: 1 variables
```

## VS Code Integration Issues

### MCP Server Not Starting

**Problem**: VS Code shows "MCP server failed to start"

**Diagnostic Steps**:

1. **Test server manually**:
   ```bash
   copilot-mcp-server --help
   # Should show server information
   ```

2. **Test MCP protocol**:
   ```bash
   echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server
   # Should return list of 9 tools
   ```

3. **Check VS Code logs**:
   - Open VS Code Developer Tools: `Help > Toggle Developer Tools`
   - Look for MCP-related errors in Console

**Common Solutions**:
- **Restart VS Code** completely
- **Verify global installation**: `which copilot-mcp-server`
- **Check permissions**: Ensure binary is executable
- **Update configuration**: Ensure correct format and paths

### Tools Not Available in GitHub Copilot

**Problem**: GitHub Copilot doesn't show MCP tools

**Verification**:
1. **Check GitHub Copilot is active**:
   ```bash
   code --list-extensions | grep github.copilot
   # Should show GitHub.copilot and GitHub.copilot-chat
   ```

2. **Verify MCP tools are loaded**:
   ```
   @copilot What tools are available?
   ```

**Solutions**:
- **Restart VS Code** after configuration changes
- **Check both global AND workspace** MCP configurations
- **Verify GitHub Copilot subscription** is active
- **Test with simple command**: `@copilot list available tools`

### Workspace Context Not Loading

**Problem**: Each project seems to have the same context

**Solution**: Ensure workspace-specific configuration:

1. **Create workspace config**:
   ```json
   // .vscode/mcp.json
   {
     "mcpVersion": "2024-11-05",
     "servers": {
       "copilot-toolset": {
         "command": "copilot-mcp-server",
         "args": ["--workspace=${workspaceFolder}"],
         "env": {
           "COPILOT_MCP_WORKSPACE": "${workspaceFolder}"
         }
       }
     }
   }
   ```

2. **Test workspace switching**:
   ```
   @copilot Switch to this workspace and show current context
   @copilot What workspace am I currently in?
   ```

## GitHub Copilot Issues

### Chat Modes Not Loading

**Problem**: Built-in chat modes (architect, debugger, etc.) not available

**Diagnostic**:
```
@copilot List all available modes
```

Expected output should include: general, architect, debugger, refactorer, tester

**Solutions**:

1. **Initialize project first**:
   ```
   @copilot Initialize this project with modes and memory
   ```

2. **Check mode files were created**:
   - Look for `.github/chatmodes/` directory
   - Verify files like `architect.chatmode.md` exist

3. **Manually create missing directory**:
   ```bash
   mkdir -p .github/chatmodes
   ```

4. **Regenerate modes**:
   ```
   @copilot Create built-in chat modes for this project
   ```

### GitHub Copilot Instructions Not Working

**Problem**: `.github/copilot-instructions.md` not being recognized

**Verification**:
1. **Check file exists**: `.github/copilot-instructions.md`
2. **Verify file format**: Should have proper YAML frontmatter
3. **Check GitHub Copilot settings** in VS Code

**Solution**: Regenerate instructions file:
```
@copilot Initialize project context and GitHub Copilot instructions
```

### Custom Chat Modes Not Persisting

**Problem**: Created custom modes disappear after restart

**Solution**: Check storage locations:

1. **Global modes**: `~/.copilot-mcp/modes/`
2. **Project modes**: `.github/chatmodes/`

**Create persistent custom mode**:
```
@copilot Create a custom mode called "security" for security analysis
@copilot Make sure the security mode persists across sessions
```

## Memory System Issues

### Memory Not Persisting

**Problem**: Stored information disappears between sessions

**Diagnostic**:
```
@copilot Show memory statistics
@copilot What do you remember about my preferences?
```

**Solutions**:

1. **Check memory directory exists**:
   ```bash
   ls -la .copilot/memory/
   # Should show database files
   ```

2. **Check permissions**:
   ```bash
   ls -la .copilot/
   # Directory should be writable
   ```

3. **Reinitialize memory**:
   ```
   @copilot Initialize memory system for this project
   ```

4. **Check global memory path**:
   ```bash
   ls -la ~/.copilot-mcp/memory/
   ```

### Memory Search Not Working

**Problem**: Search queries return no results despite stored information

**Diagnostic**:
```
@copilot Search my memories for "test"
@copilot Show all stored memories
```

**Solutions**:

1. **Use broader search terms**:
   ```
   @copilot Search memories for coding
   @copilot Find any stored preferences
   ```

2. **Check memory layers**:
   ```
   @copilot Search preference layer for patterns
   @copilot Search project layer for decisions
   ```

3. **Rebuild memory index**:
   ```
   @copilot Rebuild memory search index
   ```

### Memory Usage Too High

**Problem**: Memory system consuming too much storage

**Diagnostic**:
```
@copilot Show detailed memory statistics
```

**Solutions**:

1. **Clean old memories**:
   ```bash
   # Manual cleanup (careful!)
   rm -f .copilot/memory/*.db-backup
   ```

2. **Adjust memory limits** in `~/.copilot-mcp/config.json`:
   ```json
   {
     "performance": {
       "resourceLimits": {
         "maxMemoryPerWorkspace": "25MB",
         "memoryCleanupThreshold": "50MB"
       }
     }
   }
   ```

3. **Force cleanup**:
   ```
   @copilot Clean up old and unused memories
   ```

## Performance Problems

### Slow Response Times

**Problem**: MCP tools take too long to respond

**Diagnostic**:
1. **Test response time**:
   ```bash
   time echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server
   ```

2. **Check memory statistics**:
   ```
   @copilot Show performance statistics
   ```

**Solutions**:

1. **Reduce memory limits**:
   ```json
   // ~/.copilot-mcp/config.json
   {
     "performance": {
       "resourceLimits": {
         "maxMemoryPerWorkspace": "25MB",
         "maxConcurrentWorkspaces": 5
       },
       "caching": {
         "enableWorkspaceCache": true,
         "cacheExpiry": "30m"
       }
     }
   }
   ```

2. **Clean up workspaces**:
   ```
   @copilot List all active workspaces
   @copilot Close unused workspaces
   ```

3. **Restart the MCP server**:
   - Restart VS Code
   - Or restart via command line if running standalone

### High Memory Usage

**Problem**: MCP server consuming too much RAM

**Solutions**:

1. **Check current usage**:
   ```bash
   ps aux | grep copilot-mcp-server
   ```

2. **Reduce workspace limit**:
   ```json
   // ~/.copilot-mcp/config.json
   {
     "server": {
       "maxConcurrentProjects": 5
     },
     "performance": {
       "resourceLimits": {
         "maxMemoryPerWorkspace": "25MB"
       }
     }
   }
   ```

3. **Enable garbage collection**:
   ```json
   {
     "performance": {
       "optimization": {
         "enableGarbageCollection": true,
         "compressOldMemories": true
       }
     }
   }
   ```

## Diagnostic Tools

### MCP Server Health Check

```bash
# Test basic connectivity
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Test specific tool
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server

# Test with timeout
timeout 10s echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server
```

### Configuration Validation

```bash
# Validate workspace config
npm run validate:config .vscode/mcp.json

# Validate global config
npm run validate:config ~/.config/Code/User/mcp.json

# Test configuration format
node -e "console.log(JSON.stringify(require('./.vscode/mcp.json'), null, 2))"
```

### Memory System Diagnostics

```bash
# Check memory files
ls -la .copilot/memory/

# Check global memory
ls -la ~/.copilot-mcp/memory/

# Check memory usage
du -sh .copilot/memory/
```

### VS Code Integration Test

1. **Open Developer Tools**: `Help > Toggle Developer Tools`
2. **Check Console** for MCP-related errors
3. **Test GitHub Copilot**: `@copilot help`
4. **Verify tools available**: `@copilot what tools can you use`

### Log Files

**Server logs** (if configured):
```bash
# Check log directory
ls -la ~/.copilot-mcp/logs/

# View recent logs
tail -f ~/.copilot-mcp/logs/server.log
```

**VS Code logs**:
- Open Command Palette: `Ctrl+Shift+P`
- Run: `Developer: Open Logs Folder`
- Look for GitHub Copilot and MCP-related logs

## Getting Additional Help

### Before Reporting Issues

1. **Run full diagnostic**:
   ```bash
   copilot-mcp-server --help
   npm run validate:config .vscode/mcp.json
   echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server
   ```

2. **Check versions**:
   ```bash
   node --version
   npm --version
   code --version
   ```

3. **Verify GitHub Copilot**:
   ```bash
   code --list-extensions | grep github.copilot
   ```

### Issue Reporting Information

When reporting issues, include:
- Operating system and version
- Node.js version (`node --version`)
- VS Code version (`code --version`)
- GitHub Copilot extension versions
- Complete error messages
- Output from diagnostic commands above
- Relevant configuration files (with sensitive info removed)

### Common Solutions Summary

**Most issues can be resolved by:**
1. ✅ **Restart VS Code** completely
2. ✅ **Verify both global AND workspace** MCP configurations
3. ✅ **Check GitHub Copilot extension** is active and subscription valid
4. ✅ **Test MCP server manually** with diagnostic commands
5. ✅ **Use correct configuration format** (2024-11-05 with `mcpVersion`)
6. ✅ **Ensure proper file permissions** for memory directories

Most configuration and integration issues can be resolved with these basic troubleshooting steps.