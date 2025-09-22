# Common Issues and Solutions

Comprehensive troubleshooting guide for the Copilot MCP Server.

## Installation Issues

### 1. "copilot-mcp-server: command not found"

**Symptoms**:
- VS Code can't find the MCP server
- Command line shows "command not found"
- MCP tools not available in Copilot Chat

**Diagnosis**:
```bash
# Check if globally installed
which copilot-mcp-server
echo $PATH | grep -o "/usr/local/bin"

# Check npm global packages
npm list -g copilot-mcp-toolset
```

**Solutions**:

**Option A: Reinstall globally**
```bash
cd /path/to/copilot-mcp
npm run build
./scripts/install-global.sh

# Verify installation
copilot-mcp-server --version
```

**Option B: Manual global install**
```bash
npm run build
npm install -g .

# On some systems, you might need sudo
sudo npm install -g .
```

**Option C: Use direct path in VS Code**
```json
// .vscode/mcp.json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "/full/path/to/copilot-mcp/dist/server/index.js",
      "args": ["--workspace=${workspaceFolder}"]
    }
  }
}
```

### 2. Permission Denied Errors

**Symptoms**:
- "Permission denied" when running commands
- Server fails to start
- Cannot execute binary

**Diagnosis**:
```bash
# Check file permissions
ls -la dist/server/index.js
ls -la /usr/local/bin/copilot-mcp-server

# Check if executable
test -x dist/server/index.js && echo "Executable" || echo "Not executable"
```

**Solutions**:

**Fix executable permissions**:
```bash
chmod +x dist/server/index.js
chmod +x /usr/local/bin/copilot-mcp-server
```

**Rebuild with correct permissions**:
```bash
npm run clean
npm run build
./scripts/install-global.sh
```

**For npm permission issues**:
```bash
# Option 1: Use npm's built-in fix
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 2: Change npm's default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
```

### 3. Node.js Version Incompatibility

**Symptoms**:
- Syntax errors when running server
- "Unexpected token" errors
- Import/export errors

**Diagnosis**:
```bash
node --version
npm --version

# Check required version in package.json
grep "engines" package.json -A 3
```

**Solutions**:

**Install Node.js 18+**:
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Using package manager (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using package manager (macOS)
brew install node@18
```

## Configuration Issues

### 4. VS Code Not Recognizing MCP Server

**Symptoms**:
- MCP tools not available in Copilot Chat
- "@copilot" doesn't show MCP capabilities
- Server appears to be running but not integrated

**Diagnosis**:
```bash
# Check VS Code MCP configuration
cat ~/.config/Code/User/mcp.json
# On Windows: cat %APPDATA%\Code\User\mcp.json

# Check workspace configuration
cat .vscode/mcp.json

# Check VS Code process
ps aux | grep code
```

**Solutions**:

**Fix global configuration**:
```bash
# Create correct global config
mkdir -p ~/.config/Code/User
cat > ~/.config/Code/User/mcp.json << 'EOF'
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
EOF
```

**Fix workspace configuration**:
```bash
# Create workspace-specific config
mkdir -p .vscode
cat > .vscode/mcp.json << 'EOF'
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
EOF
```

**Restart VS Code completely**:
- Close all VS Code windows
- Restart VS Code
- Wait 30 seconds for extensions to load
- Test in Copilot Chat

### 5. Invalid JSON Configuration

**Symptoms**:
- VS Code shows JSON syntax errors
- MCP server configuration ignored
- Parsing errors in console

**Diagnosis**:
```bash
# Validate JSON syntax
python -m json.tool .vscode/mcp.json
# OR
node -e "console.log(JSON.parse(require('fs').readFileSync('.vscode/mcp.json')))"
```

**Solutions**:

**Common JSON fixes**:
```json
// ❌ Bad: Trailing comma
{
  "servers": {
    "copilot-mcp-toolset": { ... },
  }
}

// ✅ Good: No trailing comma
{
  "servers": {
    "copilot-mcp-toolset": { ... }
  }
}

// ❌ Bad: Unescaped quotes
{
  "command": "echo "hello""
}

// ✅ Good: Escaped quotes
{
  "command": "echo \"hello\""
}
```

**Use JSON validator**:
```bash
# Install jq for validation
sudo apt-get install jq  # Ubuntu/Debian
brew install jq          # macOS

# Validate configuration
jq . .vscode/mcp.json
```

## Memory System Issues

### 6. Memory Storage Not Working

**Symptoms**:
- "Memory stored successfully" but search finds nothing
- get_memory_stats shows 0 memories
- Error messages about database access

**Diagnosis**:
```bash
# Check memory directory
ls -la ~/.copilot-mcp/
ls -la ~/.copilot-mcp/memory/

# Test memory commands
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server

# Check database file
file ~/.copilot-mcp/memory/global.db
sqlite3 ~/.copilot-mcp/memory/global.db ".tables"
```

**Solutions**:

**Create memory directory**:
```bash
mkdir -p ~/.copilot-mcp/memory
chmod 755 ~/.copilot-mcp/memory
```

**Reset memory system**:
```bash
# Backup existing data (optional)
cp -r ~/.copilot-mcp/memory ~/.copilot-mcp/memory.backup

# Reset memory system
rm -rf ~/.copilot-mcp/memory
mkdir -p ~/.copilot-mcp/memory

# Test memory system
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"content":"Test memory","layer":"system","tags":["test"]}},"id":1}' | copilot-mcp-server
```

**Fix database permissions**:
```bash
chmod 644 ~/.copilot-mcp/memory/*.db
chown $USER:$USER ~/.copilot-mcp/memory/*.db
```

### 7. Memory Search Returns No Results

**Symptoms**:
- Memory stored successfully but search finds nothing
- "Found 0 memories" despite having stored data
- Search works sometimes but not consistently

**Diagnosis**:
```bash
# Check if memories are actually stored
sqlite3 ~/.copilot-mcp/memory/global.db "SELECT COUNT(*) FROM memories;"
sqlite3 ~/.copilot-mcp/memory/global.db "SELECT content FROM memories LIMIT 5;"

# Test with exact content
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"exact content from stored memory"}},"id":1}' | copilot-mcp-server
```

**Solutions**:

**Use more specific search terms**:
```bash
# Instead of generic terms
search_memory "code"

# Use specific, descriptive terms
search_memory "React functional components with hooks"
```

**Check memory layers**:
```bash
# Search specific layers
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"your search","layer":"project"}},"id":1}' | copilot-mcp-server
```

**Rebuild search index**:
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"optimize_memory","arguments":{"issue":"Search not finding relevant results"}},"id":1}' | copilot-mcp-server
```

## GitHub Copilot Integration Issues

### 8. Copilot Chat Not Showing MCP Tools

**Symptoms**:
- "@copilot" prompts work but no MCP functionality
- Cannot access stored memories
- No project initialization options

**Diagnosis**:
```bash
# Check Copilot extension status
code --list-extensions | grep copilot

# Check MCP server connection
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Check VS Code logs
# Open VS Code > Help > Toggle Developer Tools > Console
```

**Solutions**:

**Update GitHub Copilot extension**:
1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "GitHub Copilot"
3. Click "Update" if available
4. Restart VS Code

**Check MCP integration**:
```bash
# Verify MCP server responds
copilot-mcp-server --help

# Test direct communication
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"
```

**Restart MCP connection**:
1. Open Command Palette (Ctrl+Shift+P)
2. Search "Developer: Reload Window"
3. Wait for extensions to reload
4. Test Copilot Chat again

### 9. Chat Mode Files Not Created

**Symptoms**:
- "create_mode" tool succeeds but no .chatmode.md file
- Missing .github/chatmodes/ directory
- Modes not available in Copilot Chat

**Diagnosis**:
```bash
# Check if directory exists
ls -la .github/chatmodes/

# Test mode creation
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"test-mode","description":"Test","systemPrompt":"Test prompt"}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

# Check file permissions
ls -la .github/chatmodes/
```

**Solutions**:

**Create directory manually**:
```bash
mkdir -p .github/chatmodes
chmod 755 .github/chatmodes
```

**Fix permissions**:
```bash
chmod 755 .github
chmod 755 .github/chatmodes
chmod 644 .github/chatmodes/*.chatmode.md
```

**Test mode creation**:
```bash
# Create test mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"debug-test","description":"Debug test mode","systemPrompt":"You are a debugging assistant"}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

# Verify file created
ls -la .github/chatmodes/debug-test.chatmode.md
```

## Performance Issues

### 10. Slow Response Times

**Symptoms**:
- MCP commands take >5 seconds to respond
- VS Code becomes unresponsive
- High CPU usage

**Diagnosis**:
```bash
# Test response time
time echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server

# Check memory usage
ps aux | grep copilot-mcp-server

# Check disk I/O
iostat -x 1 3
```

**Solutions**:

**Optimize memory system**:
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"optimize_memory","arguments":{"issue":"Slow performance and high memory usage"}},"id":1}' | copilot-mcp-server
```

**Clean up old data**:
```bash
# Clean old temporary data
rm -rf ~/.copilot-mcp/cache/*
rm -rf ~/.copilot-mcp/logs/*.log.old

# Compact database
sqlite3 ~/.copilot-mcp/memory/global.db "VACUUM;"
```

**Reduce memory verbosity**:
```json
// .vscode/mcp.json
{
  "servers": {
    "copilot-mcp-toolset": {
      "env": {
        "LOG_LEVEL": "error",
        "MEMORY_VERBOSE": "false"
      }
    }
  }
}
```

### 11. High Memory Usage

**Symptoms**:
- Server uses >100MB RAM
- System becomes slow
- Out of memory errors

**Diagnosis**:
```bash
# Monitor memory usage
top -p $(pgrep -f copilot-mcp-server)

# Check database sizes
du -sh ~/.copilot-mcp/memory/
ls -lh ~/.copilot-mcp/memory/*.db
```

**Solutions**:

**Set memory limits**:
```bash
# Run with memory limit
node --max-old-space-size=64 dist/server/index.js
```

**Clean up memory system**:
```bash
# Remove old prompt-layer memories
sqlite3 ~/.copilot-mcp/memory/global.db "DELETE FROM memories WHERE layer='prompt' AND created_at < datetime('now', '-7 days');"

# Compact database
sqlite3 ~/.copilot-mcp/memory/global.db "VACUUM;"
```

## Network and Connectivity Issues

### 12. Server Timeout Errors

**Symptoms**:
- Connection timeouts
- "Server not responding" errors
- Intermittent failures

**Diagnosis**:
```bash
# Test server start time
time copilot-mcp-server --help

# Check if server is blocked
netstat -tulpn | grep node
```

**Solutions**:

**Increase timeout values**:
```json
// .vscode/mcp.json
{
  "servers": {
    "copilot-mcp-toolset": {
      "timeout": 30000,
      "retryDelay": 1000,
      "maxRetries": 3
    }
  }
}
```

**Use local debugging**:
```bash
# Run server in debug mode
NODE_ENV=development LOG_LEVEL=debug copilot-mcp-server --workspace="$(pwd)"
```

## Debugging Tools and Commands

### Debug Mode Activation

**Enable verbose logging**:
```bash
export DEBUG=*
export LOG_LEVEL=debug
copilot-mcp-server --workspace="$(pwd)"
```

### Health Check Script

Create `health-check.sh`:
```bash
#!/bin/bash
set -e

echo "🏥 MCP Server Health Check"

# Test 1: Command availability
echo -n "Command availability: "
if command -v copilot-mcp-server >/dev/null 2>&1; then
    echo "✅ PASS"
else
    echo "❌ FAIL - copilot-mcp-server not found"
    exit 1
fi

# Test 2: Server response
echo -n "Server response: "
RESPONSE=$(timeout 10 echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server 2>/dev/null)
if [[ $RESPONSE == *"init_project"* ]]; then
    echo "✅ PASS"
else
    echo "❌ FAIL - Server not responding correctly"
    exit 1
fi

# Test 3: Memory system
echo -n "Memory system: "
MEMORY=$(timeout 10 echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server 2>/dev/null)
if [[ $MEMORY == *"Total memories"* ]]; then
    echo "✅ PASS"
else
    echo "❌ FAIL - Memory system not working"
    exit 1
fi

# Test 4: File system permissions
echo -n "File permissions: "
if [[ -r ~/.copilot-mcp/ && -w ~/.copilot-mcp/ ]]; then
    echo "✅ PASS"
else
    echo "❌ FAIL - Permission issues with ~/.copilot-mcp/"
    exit 1
fi

echo "🎉 All health checks passed!"
```

### Log Analysis Commands

```bash
# View recent logs
tail -f ~/.copilot-mcp/logs/server.log

# Search for errors
grep -i error ~/.copilot-mcp/logs/*.log

# Count memory operations
grep "Stored memory" ~/.copilot-mcp/logs/*.log | wc -l
```

## Getting Help

### When to Seek Support

1. **After trying solutions above** and issue persists
2. **Error messages not covered** in this guide
3. **Performance issues** on supported platforms
4. **Integration problems** with specific VS Code versions

### Information to Include

When reporting issues, include:

```bash
# System information
uname -a
node --version
npm --version
code --version

# Server information
copilot-mcp-server --version
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Configuration
cat .vscode/mcp.json
cat ~/.config/Code/User/mcp.json

# Logs
tail -50 ~/.copilot-mcp/logs/server.log
```

### Support Channels

- **GitHub Issues**: Technical problems and bug reports
- **Documentation**: Check examples and integration guides
- **VS Code Extension Issues**: Report to GitHub Copilot extension
- **Community Forums**: General usage questions