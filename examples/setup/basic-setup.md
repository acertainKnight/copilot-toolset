# Basic Setup Guide

This guide shows you how to set up the Copilot MCP Server with GitHub Copilot from scratch.

## Step 1: Global Installation

```bash
# Clone and build the project
git clone <your-repo-url>
cd copilot-mcp
npm install
npm run build

# Install globally
npm run install-global  # or ./scripts/install-global.sh

# Test global installation
copilot-mcp-server --help
```

## Step 2: VS Code Global Configuration

Create or edit your global MCP configuration file:

**Linux/macOS**: `~/.config/Code/User/mcp.json`
**Windows**: `%APPDATA%\Code\User\mcp.json`

```json
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
```

## Step 3: Test Basic Functionality

1. **Restart VS Code** after configuration changes
2. Open any project folder in VS Code
3. Open GitHub Copilot Chat
4. Try these commands:

```
@copilot /help

# This should show MCP tools are available
```

## Step 4: Initialize Your First Project

In Copilot Chat, run:

```
Can you initialize this project with the MCP server?
```

Copilot will use the `init_project` tool automatically and create:
- `COPILOT.md` (root-level project context)
- `.github/copilot-instructions.md` (GitHub Copilot specific)
- `.copilot/memory/` directory structure

## Step 5: Test Memory System

Store some information:

```
Please remember that I prefer using TypeScript with strict mode enabled, and I like to use functional programming patterns.
```

Search for it later:

```
What do you remember about my coding preferences?
```

## Verification

If everything is working, you should see:
1. Copilot recognizes MCP tools in chat
2. Project initialization creates expected files
3. Memory storage and search functions work
4. Custom chat modes are available

## Next Steps

- Try [memory examples](../memory/quick-start.md)
- Create [custom chat modes](../chat-modes/create-custom-mode.md)
- Set up [project-specific configurations](project-specific-setup.md)

## Troubleshooting

If things aren't working:
1. Check [common issues](../troubleshooting/common-issues.md)
2. Verify installation with `copilot-mcp-server --version`
3. Check VS Code developer console for errors
4. Test the server manually: `echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server`