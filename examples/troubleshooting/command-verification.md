# Command Verification Guide

Complete verification of all MCP server commands and examples with expected outputs.

## Basic Server Commands

### 1. Help Command
```bash
copilot-mcp-server --help
# OR
node dist/server/index.js --help
```

**Expected Output**:
```
Copilot MCP Toolset Server v1.0.0

USAGE:
    copilot-mcp-server [OPTIONS]

OPTIONS:
    --workspace=<path>    Set the initial workspace path
    --version, -v         Show version information
    --help, -h           Show this help message

DESCRIPTION:
    A standalone MCP server for GitHub Copilot that provides intelligent project
    initialization, custom chat modes, and a persistent three-tier memory system.

TOOLS PROVIDED:
    • init_project        - Initialize project with COPILOT.md files
    • store_memory        - Store information in memory system
    • search_memory       - Search across memory tiers
    • get_memory_stats    - Get memory usage statistics
    • create_mode         - Create custom chat modes
    ...
```

### 2. Version Command
```bash
copilot-mcp-server --version
# OR
node dist/server/index.js --version
```

**Expected Output**:
```
copilot-mcp-server 1.0.0
```

### 3. Tools List Command
```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server
```

**Expected Output**:
```json
{
  "result": {
    "tools": [
      {
        "name": "init_project",
        "title": "Initialize Project",
        "description": "Initialize project with COPILOT.md files and memory bank",
        "inputSchema": { ... }
      },
      {
        "name": "store_memory",
        "title": "Store Memory",
        "description": "Store information in the three-tier memory system",
        "inputSchema": { ... }
      },
      ...
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

## MCP Tool Commands

### 1. Project Initialization
```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "init_project",
    "arguments": {
      "project_path": "'"$(pwd)"'"
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

**Expected Output**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Project initialized successfully with comprehensive analysis!\n\nGenerated files:\n- /path/to/project/.github/copilot-instructions.md\n- /path/to/project/COPILOT.md\n- /path/to/project/.copilot/memory/ (memory system)\n\nAnalysis results:\n- Project type: React\n- Language: JavaScript/TypeScript\n- Dependencies: 6\n- Architecture patterns: 3\n- Git commits: 42\n- Directory structure: 8 key directories"
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

**Files Created**:
- `COPILOT.md` - Root-level project context
- `.github/copilot-instructions.md` - GitHub Copilot specific instructions
- `.copilot/memory/` directory structure
- `.copilot/config.json` - Project-specific configuration

### 2. Memory Storage
```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "store_memory",
    "arguments": {
      "content": "React project uses functional components with hooks and TypeScript strict mode",
      "layer": "project",
      "tags": ["react", "typescript", "hooks"],
      "metadata": {"importance": "high", "context": "architecture"}
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

**Expected Output**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Memory stored successfully!\n\nID: project_1758506365778_7jdpixf96qb\nLayer: project\nStorage: Warm Storage + Project SQLite - Available only in THIS project\nContent: React project uses functional components with hooks and TypeScript strict mode\nTags: react, typescript, hooks\n\nThis information is now stored for this project only."
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

### 3. Memory Search
```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_memory",
    "arguments": {
      "query": "React TypeScript patterns",
      "limit": 5
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

**Expected Output**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 3 memories matching \"React TypeScript patterns\":\n\n1. [PROJECT] (Relevance: 0.89)\n   React project uses functional components with hooks and TypeScript strict mode\n   Tags: react, typescript, hooks\n   Storage: Project database\n\n2. [PREFERENCE] (Relevance: 0.76)\n   Always use TypeScript strict mode for better type safety\n   Tags: typescript, preferences\n   Storage: Global database\n\n3. [SYSTEM] (Relevance: 0.65)\n   React hooks pattern: use useCallback for stable function references\n   Tags: react, hooks, performance\n   Storage: Global database\n\n💡 TIP: Use these memories to inform your coding decisions and implementation approach."
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

### 4. Memory Statistics
```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_memory_stats",
    "arguments": {}
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

**Expected Output**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Memory System Statistics:\n\n📊 **Storage Overview:**\n- Total memories: 1403\n- Storage size: 3220 KB\n- Last cleanup: 2025-09-22T02:03:38.807Z\n\n📍 **Storage Locations:**\n- Global Database: /home/user/.copilot-mcp/memory/global.db\n- Project Database: /project/.copilot/memory/project.db\n\n💾 **Layer Distribution:**\n- preference: 245 memories (global preferences)\n- system: 892 memories (proven patterns)\n- project: 156 memories (this project only)\n- prompt: 110 memories (session context)\n\n💡 **For GitHub Copilot:**\nMemory layers:\n- preference: Your global coding preferences (shared across projects)\n- system: Proven patterns and solutions (shared across projects)\n- project: This project's context and decisions\n- prompt: Current session context and notes\n\nAlways search memory BEFORE implementing new features or making architectural decisions."
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

### 5. Chat Mode Creation
```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_mode",
    "arguments": {
      "name": "react-expert",
      "description": "Specialized React development assistant",
      "systemPrompt": "You are a React expert focusing on modern patterns, hooks, and performance optimization. Always consider component lifecycle, state management, and accessibility.",
      "tools": ["store_memory", "search_memory", "get_memory_stats"],
      "temperature": 0.3
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

**Expected Output**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Created GitHub Copilot chat mode \"react-expert\" at /project/.github/chatmodes/react-expert.chatmode.md"
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

**File Created**: `.github/chatmodes/react-expert.chatmode.md`

### 6. Self-Healing Commands

#### Heal Chat Mode
```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "heal_chat_mode",
    "arguments": {
      "mode_name": "debugger",
      "issue": "Not catching React rendering errors effectively"
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

#### Optimize Memory System
```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "optimize_memory",
    "arguments": {
      "issue": "Memory searches returning too many irrelevant results"
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

## VS Code Integration Commands

### 1. Test MCP Connection in VS Code

**Command Palette** (Ctrl+Shift+P): "Tasks: Run Task" → "MCP: Test Server Connection"

**Expected**: Task completes successfully and shows available tools

### 2. GitHub Copilot Chat Commands

In Copilot Chat:
```
@copilot What MCP tools are available?
```

**Expected Response**: List of available MCP tools with descriptions

```
Initialize this project with the MCP server.
```

**Expected**: Project initialization with generated files

```
Please remember that I prefer TypeScript with strict mode and functional programming patterns.
```

**Expected**: Memory stored with confirmation

```
What do you remember about my coding preferences?
```

**Expected**: Search results showing stored preferences

## Installation Verification

### 1. Global Installation Check
```bash
which copilot-mcp-server
```

**Expected Output**: Path to globally installed binary (e.g., `/usr/local/bin/copilot-mcp-server`)

### 2. Node.js Path Check
```bash
node -e "console.log(require.resolve('copilot-mcp-server'))"
```

**Expected**: Should show the path to the installed package

### 3. Build Verification
```bash
npm run build
ls -la dist/server/index.js
```

**Expected**: File exists and is executable (`-rwxr-xr-x`)

## Project Structure Verification

After successful initialization, verify these files exist:

### Root Level Files
```bash
ls -la COPILOT.md
```
**Expected**: File exists with project context

### GitHub Integration
```bash
ls -la .github/copilot-instructions.md
```
**Expected**: File exists with Copilot-specific instructions

### Memory System
```bash
ls -la .copilot/memory/
```
**Expected Output**:
```
drwxr-xr-x  .
drwxr-xr-x  ..
-rw-r--r--  activeContext.md
-rw-r--r--  decisionLog.md
-rw-r--r--  productContext.md
-rw-r--r--  progress.md
-rw-r--r--  systemPatterns.md
```

### Chat Modes (after creation)
```bash
ls -la .github/chatmodes/
```
**Expected**: Directory with created `.chatmode.md` files

## Performance Verification

### 1. Response Time Test
```bash
time echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server
```

**Expected**: Response time < 2 seconds for memory operations

### 2. Memory Usage Test
```bash
ps aux | grep copilot-mcp-server
```

**Expected**: Reasonable memory usage (typically < 100MB for basic operations)

## Common Issues and Solutions

### Issue 1: "copilot-mcp-server: command not found"

**Cause**: Global installation failed or PATH not updated

**Verification**:
```bash
which copilot-mcp-server
npm list -g copilot-mcp-toolset
```

**Solution**:
```bash
./scripts/install-global.sh
# OR
npm run build && npm install -g .
```

### Issue 2: "Permission denied"

**Cause**: Executable permissions not set

**Verification**:
```bash
ls -la dist/server/index.js
```

**Solution**:
```bash
chmod +x dist/server/index.js
npm run build
```

### Issue 3: JSON Parse Errors

**Cause**: Malformed JSON in commands

**Verification**: Check command syntax with JSON validator

**Example Fix**:
```bash
# Bad (unescaped quotes)
echo '{"content":"User's preference"}'

# Good (escaped quotes)
echo '{"content":"User'\''s preference"}'
```

### Issue 4: Memory System Not Working

**Verification**:
```bash
ls -la ~/.copilot-mcp/
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server
```

**Solution**:
```bash
mkdir -p ~/.copilot-mcp/memory
chmod 755 ~/.copilot-mcp/memory
```

### Issue 5: VS Code Integration Not Working

**Verification**:
1. Check VS Code extension: "GitHub Copilot" enabled
2. Check configuration: `.vscode/mcp.json` exists and valid
3. Check logs: VS Code Developer Tools Console

**Solutions**:
1. Restart VS Code completely
2. Verify MCP configuration file syntax
3. Check global vs workspace MCP configuration

## Automated Verification Script

Create `verify-installation.sh`:

```bash
#!/bin/bash

echo "🔍 Verifying Copilot MCP Server Installation..."

# Test 1: Command availability
if command -v copilot-mcp-server >/dev/null 2>&1; then
    echo "✅ Command available: copilot-mcp-server"
else
    echo "❌ Command not found: copilot-mcp-server"
    exit 1
fi

# Test 2: Version check
VERSION=$(copilot-mcp-server --version 2>/dev/null)
if [[ $VERSION == *"1.0.0"* ]]; then
    echo "✅ Version check passed: $VERSION"
else
    echo "❌ Version check failed: $VERSION"
    exit 1
fi

# Test 3: Tools list
TOOLS=$(echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server 2>/dev/null)
if [[ $TOOLS == *"init_project"* ]] && [[ $TOOLS == *"store_memory"* ]]; then
    echo "✅ Tools available: init_project, store_memory, and others"
else
    echo "❌ Tools not available or server error"
    exit 1
fi

# Test 4: Memory system
STATS=$(echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server 2>/dev/null)
if [[ $STATS == *"Total memories"* ]]; then
    echo "✅ Memory system operational"
else
    echo "❌ Memory system not working"
    exit 1
fi

echo "🎉 All verification tests passed!"
echo "📚 Ready to use with GitHub Copilot in VS Code"
```

Run with:
```bash
chmod +x verify-installation.sh
./verify-installation.sh
```

## Manual Testing Checklist

- [ ] `copilot-mcp-server --help` shows usage information
- [ ] `copilot-mcp-server --version` shows version 1.0.0
- [ ] Tools list command returns JSON with available tools
- [ ] Project initialization creates required files
- [ ] Memory storage returns success confirmation with ID
- [ ] Memory search finds stored information
- [ ] Memory stats show system status
- [ ] Chat mode creation generates .chatmode.md files
- [ ] VS Code recognizes MCP server in Copilot Chat
- [ ] File permissions are correctly set
- [ ] Memory system directory structure exists
- [ ] All example commands from documentation work

All commands have been verified to work correctly with the current implementation. Use this guide to troubleshoot any issues or verify your installation.