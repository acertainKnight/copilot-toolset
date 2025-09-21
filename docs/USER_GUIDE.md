# User Guide

Complete guide to using the Copilot MCP Toolset features, chat modes, memory system, and advanced capabilities.

## Table of Contents

- [Core Features](#core-features)
- [GitHub Copilot Chat Modes](#github-copilot-chat-modes)
- [Memory System](#memory-system)
- [MCP Tools](#mcp-tools)
- [Project Initialization](#project-initialization)
- [Configuration Options](#configuration-options)
- [Usage Examples](#usage-examples)

## Core Features

### 🏗️ Automated Project Setup

The toolset automatically analyzes your project and generates intelligent context files:

- **Project Type Detection**: Supports 20+ project types (React, Vue, Python, Rust, Go, etc.)
- **Dual Context Generation**: Creates both `COPILOT.md` (root context) and `.github/copilot-instructions.md` (GitHub Copilot specific)
- **Memory Bank Setup**: Initializes structured `.copilot/memory/` directory
- **Smart Analysis**: Extracts dependencies, conventions, architecture patterns, and development workflows

**Usage:**
```
@copilot Initialize this project with full context analysis
```

### 🤖 GitHub Copilot-Compatible Chat Modes

Specialized AI assistants that enhance GitHub Copilot with expert knowledge:

#### Built-in Modes

**General Mode** (Default)
- Comprehensive coding assistance with full tool access
- Memory-aware responses based on your preferences
- Project context understanding

**Architect Mode**
- System design and planning assistance
- Architecture recommendations and patterns
- Technology selection guidance

**Debugger Mode**
- Error analysis and resolution
- Step-by-step debugging guidance
- Performance issue identification

**Refactorer Mode**
- Code improvement and optimization
- Design pattern implementation
- Technical debt reduction

**Tester Mode**
- Test strategy development
- Test case generation and coverage analysis
- Testing framework recommendations

#### Mode Commands

```
@copilot Switch to architect mode for system design
@copilot Activate debugger mode
@copilot List all available modes
@copilot Create a new mode called "security" for security analysis
```

### 🧠 Three-Tier Memory System

Persistent memory that learns and adapts to your coding patterns:

#### Memory Layers

**Core Memory**
- Always-active user preferences and context
- Coding style preferences and patterns
- Frequently used libraries and frameworks

**Warm Storage** (LevelDB)
- Recent patterns and project data
- Session-specific context and decisions
- Frequently accessed information

**Cold Storage** (SQLite)
- Long-term knowledge base
- Historical project patterns
- Archived learning and insights

#### Memory Commands

```
@copilot Remember: I prefer functional programming patterns in JavaScript
@copilot Store this debugging approach for React rendering issues
@copilot Search my memories for API testing patterns
@copilot What do you remember about my coding preferences?
@copilot Show memory statistics and usage
```

## MCP Tools Reference

### Project Management

**`init_project`** - Initialize project with context files
- Creates COPILOT.md and .github/copilot-instructions.md
- Sets up memory directory structure
- Analyzes project type and dependencies

**`switch_workspace`** - Switch between project contexts
- Maintains separate memory per project
- Preserves workspace-specific settings

**`list_workspaces`** - Show all active workspaces
- Displays current workspace status
- Shows memory usage per workspace

### Memory Management

**`store_memory`** - Store information in memory system
- Accepts different memory layers (preference, project, prompt)
- Supports categorization and tagging

**`search_memory`** - Search stored memories
- Fuzzy matching and similarity search
- Filter by layer, category, or date

**`get_memory_stats`** - Display memory usage statistics
- Shows storage usage by layer
- Memory efficiency metrics

### Chat Mode Management

**`create_mode`** - Create custom chat modes
- Define system prompts and tool access
- Generate GitHub Copilot compatible files

**`list_modes`** - Show available modes
- Built-in and custom modes
- Mode descriptions and capabilities

**`activate_mode`** - Switch chat modes
- Change assistant specialization
- Apply mode-specific context

## Configuration Options

### Global Configuration (`~/.copilot-mcp/config.json`)

```json
{
  "version": "1.0.0",
  "server": {
    "globalInstance": true,
    "maxConcurrentProjects": 10,
    "memoryCleanupInterval": "24h",
    "logLevel": "info"
  },
  "memory": {
    "globalStoragePath": "~/.copilot-mcp/memory/global.db",
    "projectStoragePattern": "{{projectRoot}}/.copilot/memory",
    "sharedMemoryTypes": ["preferences", "common_patterns"],
    "isolatedMemoryTypes": ["project", "prompt", "local_context"]
  },
  "modes": {
    "globalModes": ["general", "architect", "debugger", "refactorer", "tester"],
    "allowCustomModes": true,
    "modeStoragePath": "~/.copilot-mcp/modes"
  },
  "performance": {
    "resourceLimits": {
      "maxMemoryPerWorkspace": "50MB",
      "maxConcurrentWorkspaces": 10
    },
    "caching": {
      "enableWorkspaceCache": true,
      "cacheExpiry": "1h"
    }
  }
}
```

### Workspace Configuration (`.vscode/mcp.json`)

```json
{
  "mcpVersion": "2024-11-05",
  "servers": {
    "copilot-toolset": {
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "COPILOT_MCP_PROJECT_TYPE": "auto-detect"
      }
    }
  }
}
```

## Usage Examples

### Project Setup Workflow

1. **Initialize New Project:**
   ```
   @copilot Initialize this React project with TypeScript configuration
   ```

2. **Review Generated Context:**
   - Check `COPILOT.md` for project overview
   - Review `.github/copilot-instructions.md` for GitHub Copilot settings
   - Explore `.github/chatmodes/` for available modes

3. **Configure Preferences:**
   ```
   @copilot Remember: I prefer functional components and hooks in React
   @copilot Store preference: Use ESLint with Prettier for formatting
   ```

### Daily Development Workflow

1. **Start with Project Context:**
   ```
   @copilot What should I know about this project's architecture?
   @copilot Show me the current development priorities
   ```

2. **Use Specialized Modes:**
   ```
   @copilot Switch to architect mode
   How should I structure the user authentication module?

   @copilot Switch to debugger mode
   Help me debug this async/await issue
   ```

3. **Store Learning:**
   ```
   @copilot Remember this solution for handling React state updates
   @copilot Store this debugging approach for database connection issues
   ```

### Memory Management Examples

**Store Coding Preferences:**
```
@copilot Remember: I prefer using async/await over Promise.then()
@copilot Store preference: Always use TypeScript strict mode
@copilot Remember: For React components, use function components with hooks
```

**Search and Retrieve:**
```
@copilot What do you remember about my React preferences?
@copilot Search memories for database testing patterns
@copilot Find my previous solutions for authentication errors
```

**Project-Specific Memory:**
```
@copilot Store for this project: API endpoints use JWT authentication
@copilot Remember project decision: Using PostgreSQL for data persistence
@copilot Store architecture note: Microservices with Docker containers
```

### Custom Chat Mode Creation

```
@copilot Create a new mode called "security" for security analysis and code review
@copilot Create mode "performance" with system prompts focused on optimization
@copilot List all custom modes I've created
```

## Advanced Features

### Multi-Workspace Management

- **Workspace Isolation**: Each project maintains separate memory and context
- **Global Preferences**: User preferences shared across all projects
- **Context Switching**: Seamlessly switch between active projects
- **Memory Sync**: Optionally share learning between related projects

### GitHub Integration

- **Native Copilot Files**: Generates proper `.github/copilot-instructions.md`
- **Chat Mode Compatibility**: Creates `.github/chatmodes/` with YAML frontmatter
- **Workflow Integration**: Works with GitHub Codespaces and Actions

### Performance Optimization

- **Lazy Loading**: Memory and context loaded on demand
- **Smart Caching**: Frequently accessed data cached for speed
- **Resource Limits**: Configurable memory and CPU usage limits
- **Background Cleanup**: Automatic cleanup of old data and logs

## Best Practices

### Memory Usage
- Store specific, actionable information rather than general notes
- Use descriptive categories and tags for better searchability
- Regularly review and clean up outdated memories
- Use project-specific memory for context, global memory for preferences

### Chat Mode Usage
- Use specialized modes for focused tasks (debugger for errors, architect for design)
- Switch back to general mode for broader assistance
- Create custom modes for recurring specialized tasks
- Combine modes with memory for personalized assistance

### Project Organization
- Let the system auto-detect project type initially
- Customize generated files to match your team's conventions
- Use workspace configuration for project-specific settings
- Maintain consistent naming and structure across projects

## Troubleshooting

### Common Issues

**Memory not persisting:**
- Ensure `.copilot/memory/` directory exists and is writable
- Check global configuration path is accessible

**Chat modes not loading:**
- Verify `.github/chatmodes/` directory was created
- Confirm GitHub Copilot extension is active

**Tools not available:**
- Restart VS Code after configuration changes
- Verify both global and workspace MCP configurations
- Check that `copilot-mcp-server` is globally accessible

**Performance issues:**
- Review memory usage limits in global config
- Clear cache: delete `.copilot/memory/cache/`
- Reduce concurrent workspace limit

For detailed troubleshooting steps, see the **Troubleshooting Guide**.