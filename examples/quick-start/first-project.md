# Your First Project with Copilot MCP Server

**Goal**: Get the MCP server running and initialize your first project in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- VS Code with GitHub Copilot extension
- Basic terminal access

## Step 1: Install and Build (2 minutes)

```bash
# Clone and build the project
cd /path/to/copilot-mcp
npm install
npm run build

# Test the server is working
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/server/index.js
```

**Expected Output**: You should see a JSON response listing 8 tools including `init_project`, `store_memory`, `search_memory`, etc.

## Step 2: Initialize Your First Project (2 minutes)

```bash
# Navigate to a test project directory
cd /path/to/your/project

# Initialize the project with MCP server
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"projectPath":"/path/to/your/project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js
```

**Expected Results**:
- Creates `.copilot/memory/` directory structure
- Generates `COPILOT.md` with project analysis
- Creates `.github/copilot-instructions.md` for GitHub Copilot
- Detects project type (React, Python, etc.)

## Step 3: Verify Memory System (1 minute)

```bash
# Store some project context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"project-goal","value":"Building a task management app","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace=/path/to/your/project

# Search for it
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"task management","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace=/path/to/your/project
```

**Expected Output**: Should return the stored memory with relevance scores.

## Success Indicators

✅ **Server responds** to `tools/list` command
✅ **Project files created**: `.copilot/memory/`, `COPILOT.md`, `.github/copilot-instructions.md`
✅ **Memory system working**: Can store and search project context
✅ **Project type detected**: Correct framework/language identified

## What You've Accomplished

- ✨ MCP server is running and responding to commands
- 🔧 Project is initialized with AI-ready context files
- 🧠 Memory system is active and storing project knowledge
- 📝 GitHub Copilot has project-specific instructions

## Next Steps

1. **Set up VS Code integration**: [../integration/vscode-setup.md](../integration/vscode-setup.md)
2. **Try basic memory operations**: [basic-memory.md](basic-memory.md)
3. **Create your first custom chat mode**: [simple-chat-mode.md](simple-chat-mode.md)

## Common Issues

- **"Tools not found"**: Run `npm run build` first
- **Permission errors**: Check file permissions in project directory
- **JSON parse errors**: Ensure proper escaping in command-line JSON
- **Workspace not found**: Use absolute paths for `--workspace` argument

## Troubleshooting

If something isn't working, check [../troubleshooting/common-issues.md](../troubleshooting/common-issues.md) for detailed solutions.