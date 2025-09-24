# Testing Guide for Copilot MCP Server

## Overview

This guide provides comprehensive information about testing the Copilot MCP Server installation, functionality, and integration with GitHub Copilot and VS Code.

## Test Infrastructure

### 1. Test Files Structure

```
tests/
├── e2e/
│   ├── install-global.test.ts     # End-to-end installation tests
│   └── workflows/                  # User workflow tests
├── integration/
│   ├── mcp-connectivity.test.ts   # MCP protocol integration tests
│   ├── memory/                     # Memory system tests
│   ├── server/                     # Server integration tests
│   └── workspace/                  # Workspace management tests
├── unit/                           # Unit tests for individual components
├── performance/                    # Performance benchmarks
└── utils/
    └── installation-test-runner.ts # Cross-platform test orchestrator
```

### 2. Validation Scripts

```
scripts/
├── install-global.sh              # Global installation script
├── validate-installation.sh       # Quick validation script
└── install-server.sh             # Alternative installation method
```

## Quick Validation

### Run Installation Validation

```bash
# Quick validation of installation
./scripts/validate-installation.sh

# This script tests:
# - Node.js requirements (version >= 18)
# - Global installation status
# - Configuration directories
# - VS Code integration
# - MCP protocol communication
# - Memory system
# - Performance metrics
```

## Comprehensive Testing

### 1. Installation Tests

Run the full installation test suite:

```bash
# Run installation tests
npm test -- tests/e2e/install-global.test.ts

# Tests include:
# - Pre-installation validation
# - Installation process
# - Post-installation verification
# - Error recovery and rollback
# - Platform-specific tests
# - VS Code integration
# - Performance validation
```

### 2. MCP Connectivity Tests

Test MCP protocol implementation:

```bash
# Run MCP connectivity tests
npm test -- tests/integration/mcp-connectivity.test.ts

# Tests include:
# - Core MCP protocol (tools/list, resources/list, prompts/list)
# - Tool execution (init_project, store_memory, etc.)
# - Workspace management
# - GitHub Copilot integration
# - Error handling and recovery
# - Performance validation
```

### 3. Cross-Platform Testing

Run platform-specific tests:

```bash
# Run cross-platform test runner
npx ts-node tests/utils/installation-test-runner.ts

# Automatically detects and tests for:
# - Windows
# - macOS
# - Linux
# - WSL (Windows Subsystem for Linux)
```

## Manual Testing Procedures

### 1. Test Global Installation

```bash
# 1. Install globally
npm install -g .

# 2. Verify installation
which copilot-mcp-server
# Expected: /path/to/global/node_modules/.bin/copilot-mcp-server

# 3. Test MCP protocol
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Expected: JSON response with tools list
```

### 2. Test VS Code Integration

1. Check VS Code configuration:
```bash
# Linux/WSL
cat ~/.config/Code/User/mcp.json

# macOS
cat ~/Library/Application\ Support/Code/User/mcp.json

# Windows
type %APPDATA%\Code\User\mcp.json
```

2. Expected configuration:
```json
{
  "servers": {
    "copilotMcpToolset": {
      "type": "stdio",
      "command": "copilot-mcp-server"
    }
  }
}
```

3. Test in VS Code:
- Restart VS Code
- Open any project
- Open GitHub Copilot Chat
- Type: `@copilot init_project`
- Verify tools are available

### 3. Test Memory System

```bash
# Store memory
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"content":"Test memory","layer":"project"}},"id":1}' | copilot-mcp-server

# Search memory
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"test"}},"id":2}' | copilot-mcp-server

# Get memory stats
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":3}' | copilot-mcp-server
```

### 4. Test Workspace Management

```bash
# Test with specific workspace
copilot-mcp-server --workspace=/path/to/project

# Test workspace isolation
# 1. Store memory in workspace A
# 2. Switch to workspace B
# 3. Verify memory is isolated
```

### 5. Test Chat Mode Creation

```bash
# Create a custom mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"test-mode","description":"Test mode","systemPrompt":"You are a test assistant"}},"id":1}' | copilot-mcp-server

# Verify mode files created
ls ~/.copilot-mcp/modes/test-mode.json
ls .github/chatmodes/test-mode.chatmode.md  # If in project directory
```

## Platform-Specific Testing

### Windows Testing

1. Test Windows paths:
```powershell
# Test with Windows-style paths
copilot-mcp-server --workspace=C:\Users\Username\Projects\MyProject

# Verify configuration paths
dir %APPDATA%\Code\User\mcp.json
```

2. Test PowerShell integration:
```powershell
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server
```

### WSL Testing

1. Detect WSL environment:
```bash
echo $WSL_DISTRO_NAME
# Should output distribution name

# Test Windows filesystem access
ls /mnt/c/
```

2. Test cross-filesystem operations:
```bash
# Store memory from WSL
copilot-mcp-server --workspace=/mnt/c/Users/Username/Projects
```

### macOS Testing

1. Test Library paths:
```bash
# Verify VS Code config location
ls ~/Library/Application\ Support/Code/User/mcp.json

# Test with macOS-specific paths
copilot-mcp-server --workspace=~/Documents/Projects
```

## Performance Testing

### Response Time Benchmarks

```bash
# Measure response time
time echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Expected: < 1 second
```

### Concurrent Request Testing

```bash
# Test concurrent requests
for i in {1..5}; do
  echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":'$i'}' | copilot-mcp-server &
done
wait

# All requests should complete successfully
```

### Memory Usage Testing

```bash
# Monitor memory usage during operations
# Linux/macOS
ps aux | grep copilot-mcp-server

# Windows
tasklist | findstr copilot-mcp-server
```

## Error Recovery Testing

### 1. Test Missing Dependencies

```bash
# Temporarily rename Node.js
mv $(which node) $(which node).backup

# Try to run server
./scripts/validate-installation.sh
# Expected: Clear error about missing Node.js

# Restore Node.js
mv $(which node).backup $(which node)
```

### 2. Test Corrupted Configuration

```bash
# Backup and corrupt config
cp ~/.copilot-mcp/config.json ~/.copilot-mcp/config.json.backup
echo "invalid json" > ~/.copilot-mcp/config.json

# Test server response
./scripts/validate-installation.sh
# Should detect invalid JSON

# Restore config
mv ~/.copilot-mcp/config.json.backup ~/.copilot-mcp/config.json
```

### 3. Test Permission Issues

```bash
# Remove write permissions
chmod 444 ~/.copilot-mcp/config.json

# Try to update config
# Server should handle gracefully

# Restore permissions
chmod 644 ~/.copilot-mcp/config.json
```

## Continuous Integration Testing

### GitHub Actions Workflow

```yaml
name: Test Installation

on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: ${{ matrix.node }}

      - run: npm install
      - run: npm run build
      - run: ./scripts/validate-installation.sh
      - run: npm test
```

## Test Coverage Requirements

### Critical Tests (Must Pass)
- [ ] Node.js version >= 18
- [ ] Global installation successful
- [ ] MCP protocol responds
- [ ] Tools are available
- [ ] Configuration directories exist

### Important Tests (Should Pass)
- [ ] VS Code integration configured
- [ ] Memory system functional
- [ ] Workspace management works
- [ ] Chat modes can be created
- [ ] Performance within limits

### Nice-to-Have Tests
- [ ] All platform-specific features work
- [ ] Concurrent requests handled
- [ ] Error messages are helpful
- [ ] Documentation matches behavior

## Troubleshooting Test Failures

### Installation Fails

1. Check Node.js version:
```bash
node --version  # Must be >= 18
```

2. Check npm permissions:
```bash
npm config get prefix
# Ensure you have write access
```

3. Clear npm cache:
```bash
npm cache clean --force
```

### MCP Protocol Not Responding

1. Check if server is running:
```bash
ps aux | grep copilot-mcp-server
```

2. Check for port conflicts:
```bash
lsof -i :3000  # If using network transport
```

3. Enable debug logging:
```bash
DEBUG=* copilot-mcp-server
```

### Memory System Issues

1. Check database location:
```bash
ls -la ~/.copilot-mcp/memory/
```

2. Verify database integrity:
```bash
sqlite3 ~/.copilot-mcp/memory/unified.db "PRAGMA integrity_check;"
```

3. Reset memory if needed:
```bash
rm -rf ~/.copilot-mcp/memory/
mkdir -p ~/.copilot-mcp/memory/
```

## Test Reporting

### Generate Test Report

```bash
# Run all tests and generate report
npm test -- --coverage --json --outputFile=test-report.json

# Convert to HTML
npx jest-html-reporter
```

### Submit Test Results

When reporting issues, include:
1. Output of `./scripts/validate-installation.sh`
2. Platform information (`uname -a` or `systeminfo`)
3. Node.js version (`node --version`)
4. Error messages and logs
5. Steps to reproduce

## Best Practices

1. **Always test after installation**: Run validation script immediately after install
2. **Test in clean environment**: Use fresh test directories when possible
3. **Test all platforms**: If developing features, test on Windows, macOS, and Linux
4. **Monitor performance**: Ensure response times stay under 1 second
5. **Test error cases**: Verify graceful handling of failures
6. **Document test results**: Keep records of test runs for regression tracking
7. **Automate when possible**: Use CI/CD for consistent testing

## Next Steps

After successful testing:
1. Restart VS Code
2. Open a project
3. Use GitHub Copilot Chat with `@copilot` commands
4. Initialize project with `init_project` tool
5. Create custom chat modes as needed
6. Monitor memory usage with `get_memory_stats`

For issues or questions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or open an issue on GitHub.