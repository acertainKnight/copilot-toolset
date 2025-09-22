# User Guide

Learn to use the Copilot MCP Toolset effectively. Start with basics, then explore advanced features.

## Getting Started

### First Steps After Installation
1. **Initialize your first project**: `@copilot Initialize this project`
2. **Set your preferences**: `@copilot Remember I prefer functional programming`
3. **Try a specialized mode**: `@copilot Switch to architect mode`
4. **Check your memory**: `@copilot Show my memory stats`

## Core Features Overview

**Three main capabilities** enhance GitHub Copilot:

### 🏗️ Smart Project Setup
- **Auto-detects** project types and creates optimized context files
- **Quick start**: `@copilot Initialize this project`
- **Detailed guide**: [Project Initialization](../examples/workflows/project-initialization.md)

### 🤖 Specialized Chat Modes
- **Built-in experts**: Architect, Debugger, Refactor, Tester modes
- **Custom creation**: `@copilot Create a "security" mode`
- **Complete guide**: [CHAT_MODES.md](CHAT_MODES.md)

### 🧠 Persistent Memory System
- **Three-tier architecture**: Core, warm, and cold storage
- **Cross-project learning**: Remembers patterns and preferences
- **Complete guide**: [MEMORY_SYSTEM.md](MEMORY_SYSTEM.md)

## Essential Tools Quick Reference

### Project Tools
- **`init_project`**: Setup project with context files and memory
- **`switch_workspace`**: Change between project contexts

### Memory Tools
- **`store_memory`**: Save information (preferences, patterns, decisions)
- **`search_memory`**: Find stored information with smart search
- **`get_memory_stats`**: View memory usage and statistics

### Chat Mode Tools
- **`create_mode`**: Build custom specialized assistants
- **`list_modes`**: See all available modes

**Complete reference**: [API_REFERENCE.md](API_REFERENCE.md) - All 8 MCP tools

## Configuration

### Key Configuration Files
- **Global settings**: `~/.copilot-mcp/config.json`
- **VS Code integration**: Platform-specific `mcp.json`
- **Project-specific**: `.vscode/mcp.json` (optional)

**Installation creates these automatically**. Manual editing rarely needed.

**Need custom config?** See [INSTALLATION.md](INSTALLATION.md#advanced-configuration)

## Common Workflows

### New Project Setup
1. `@copilot Initialize this project` (creates context files)
2. `@copilot Remember: I prefer [your coding style]` (set preferences)
3. `@copilot Create a "[domain]" mode for this project type`

### Daily Development
1. **Start with context**: `@copilot What's the architecture of this project?`
2. **Use specialized modes**: `@copilot Switch to debugger mode`
3. **Store learnings**: `@copilot Remember this pattern for future use`

### Memory Management
```
# Store preferences (global)
@copilot Remember: I prefer async/await over Promises

# Store project context (isolated)
@copilot Store for this project: Uses PostgreSQL with JWT auth

# Search and retrieve
@copilot Search memories for React testing patterns
```

### Custom Chat Modes
```
@copilot Create a "security" mode for security analysis
@copilot Create a "performance" mode focused on optimization
@copilot List all my custom modes
```

## Best Practices

### Memory Tips
- Store **specific, actionable** information
- Use **descriptive tags** for better search
- Separate **global preferences** from **project context**

### Mode Usage
- Use **specialized modes** for focused tasks
- **Switch back to general** for broad assistance
- **Create custom modes** for recurring specialized needs

### Project Organization
- Let the system **auto-detect project type** initially
- **Customize generated files** to match team conventions
- Use **workspace config** for project-specific settings

## Need Help?

**Common issues**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
**Technical details**: [API_REFERENCE.md](API_REFERENCE.md)
**Advanced configuration**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)