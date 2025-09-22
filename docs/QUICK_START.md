# Quick Start Guide

Get started with the Copilot MCP Toolset in under 10 minutes. Transform GitHub Copilot into a context-aware coding assistant with persistent memory and automated project setup.

## Prerequisites

- **Node.js 18+** (recommended: Node.js 20+)
- **VS Code** with GitHub Copilot extension installed and activated
- **Git** (for cloning the repository)
- **Active GitHub Copilot Subscription** (required for chat modes and custom instructions)

### Verify Prerequisites

```bash
node --version              # Should be 18.0.0 or higher
npm --version               # Should be included with Node.js
code --version              # Verify VS Code is installed
code --list-extensions | grep github.copilot  # Verify GitHub Copilot is installed
```

**Expected GitHub Copilot Extensions:**
- `GitHub.copilot` - Main GitHub Copilot extension
- `GitHub.copilot-chat` - GitHub Copilot Chat extension (if available)

## Installation (3 Simple Steps)

### Step 1: Install the MCP Server

```bash
git clone https://github.com/your-org/copilot-mcp-toolset
cd copilot-mcp-toolset
chmod +x scripts/install-global.sh
./scripts/install-global.sh
```

**Windows users:** Use PowerShell or Git Bash with the same commands

The installation script will:
- ✅ Build the project with TypeScript
- ✅ Install the server globally as `copilot-mcp-server`
- ✅ Create global configuration directory (`~/.copilot-mcp/`)
- ✅ Generate default configuration files
- ✅ Initialize built-in chat modes for GitHub Copilot
- ✅ Test the MCP server functionality
- ✅ Provide exact VS Code configuration instructions for your system

### Step 2: Configure VS Code

The installation script provides exact paths for your system. You need two configuration files:

#### Global Configuration (Required)
Create `~/.config/Code/User/mcp.json` (Linux) or `%APPDATA%\Code\User\mcp.json` (Windows):

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

#### Workspace Configuration (Per Project)
Create `.vscode/mcp.json` in each project workspace:

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

### Step 3: Restart VS Code and Test

1. **Restart VS Code** completely
2. **Open a project** in VS Code
3. **Test with GitHub Copilot Chat:**

```
@copilot Initialize this project and show available modes
```

You should see:
- Project analysis and `COPILOT.md` file creation
- `.github/copilot-instructions.md` generation
- List of available chat modes (general, architect, debugger, refactorer, tester)
- Memory system initialization

## First Time Usage

### Initialize Your First Project

Open GitHub Copilot Chat and try these commands:

1. **Project Initialization:**
   ```
   @copilot Initialize this project with context files and memory setup
   ```

2. **List Available Features:**
   ```
   @copilot What tools and modes are available?
   ```

3. **Switch Chat Modes:**
   ```
   @copilot Switch to architect mode for system design
   @copilot Activate debugger mode for error analysis
   ```

4. **Store and Retrieve Memory:**
   ```
   @copilot Remember: I prefer functional programming patterns
   @copilot Search my preferences for programming patterns
   ```

### Expected File Creation

After initialization, you should see these new files:
- `COPILOT.md` - Project context for AI assistants
- `.github/copilot-instructions.md` - GitHub Copilot specific instructions
- `.github/chatmodes/` - Directory with chat mode files
- `.copilot/memory/` - Memory storage directory

## Verification Commands

Test your installation with these commands:

```bash
# Verify global installation
copilot-mcp-server --help

# Test MCP protocol
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server

# Validate configuration (if you have .vscode/mcp.json)
npm run validate:config .vscode/mcp.json
```

Expected output: List of 9 tools including `init_project`, `store_memory`, `search_memory`, etc.

## What's Next?

Now that you're set up:

1. **Explore Chat Modes:** Try different specialist modes (architect, debugger, refactorer, tester)
2. **Use Memory Features:** Store coding preferences and project patterns
3. **Customize Settings:** Review and adjust configurations in `~/.copilot-mcp/config.json`
4. **Create Custom Modes:** Build specialized assistants for your workflow

## Need Help?

- **Configuration Issues:** Use `npm run validate:config` to check your setup
- **VS Code Not Recognizing MCP:** Ensure both global and workspace configs are correct
- **Tools Not Available:** Verify GitHub Copilot extension is active and restart VS Code
- **Memory Not Persisting:** Check that `.copilot/memory/` directory was created

For detailed troubleshooting, see the **Troubleshooting Guide**.

## Key Features Overview

- **🏗️ Automated Project Setup:** Smart analysis and context generation
- **🤖 GitHub Copilot Chat Modes:** Specialized AI assistants (architect, debugger, etc.)
- **🧠 Persistent Memory:** Three-tier memory system that learns your patterns
- **⚡ MCP Tools:** 9 powerful tools for project management and memory
- **🔧 VS Code Integration:** Native Model Context Protocol support
- **🏠 Local-First:** Complete privacy with no external API calls

Your GitHub Copilot is now enhanced with intelligent project understanding and persistent memory. Start coding smarter!