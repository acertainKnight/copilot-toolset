# Chat Modes Guide

## GitHub Copilot-Compatible Chat Modes

Create specialized AI assistants that integrate seamlessly with GitHub Copilot's chat interface.

## Built-in Expert Modes

### Available Modes
- **Architect**: System design and planning assistance
- **Debugger**: Error analysis and resolution
- **Refactor**: Code improvement and optimization
- **Tester**: Test strategy and implementation
- **General**: Comprehensive coding assistance with full tool access

### Using Built-in Modes
```
# Activate a mode in GitHub Copilot Chat
@copilot Switch to debugger mode and help me analyze this error
@copilot Use architect mode to design a user authentication system
@copilot Switch to tester mode and create unit tests for my UserService
```

## Custom Mode Creation

### Creating Specialized Modes
```
# Create a database expert mode
@copilot Create a 'database-expert' mode that specializes in PostgreSQL optimization, query analysis, and schema design

# System automatically:
✅ Generates expert system prompt
✅ Creates .github/chatmodes/database-expert.chatmode.md with proper YAML frontmatter
✅ Assigns relevant MCP tools and capabilities
✅ Saves internal JSON format for MCP server operations
✅ Makes mode available for GitHub Copilot activation
```

### Custom Mode Examples
```
# Security specialist
@copilot Create a 'security' mode for security analysis, vulnerability assessment, and secure coding practices

# Performance optimizer
@copilot Create a 'performance' mode focused on optimization, profiling, and performance analysis

# DevOps specialist
@copilot Create a 'devops' mode for CI/CD, containerization, and infrastructure management
```

## Mode Architecture

### Dual Format Support
Each chat mode is stored in two formats:
1. **Internal JSON**: Used by the MCP server for tool operations
2. **GitHub Copilot Format**: `.github/chatmodes/{name}.chatmode.md` with YAML frontmatter

### Mode Components
- **System Prompt**: Specialized instructions for the AI
- **Tool Access**: Relevant MCP tools for the mode's domain
- **Context**: Mode-specific memory and knowledge
- **Temperature**: Creativity level for responses

## File Structure

### GitHub Copilot Integration
```
your-project/
├── .github/
│   └── chatmodes/
│       ├── architect.chatmode.md
│       ├── debugger.chatmode.md
│       ├── security.chatmode.md
│       └── database-expert.chatmode.md
```

### Global Mode Storage
```
~/.copilot-mcp/
└── modes/
    ├── architect.json
    ├── debugger.json
    ├── security.json
    └── database-expert.json
```

## Advanced Usage

### Mode-Specific Memory
Each mode can access:
- **Global memory**: Shared across all modes
- **Mode-specific context**: Specialized knowledge for the domain
- **Project memory**: Current workspace context

### Tool Integration
Modes automatically include relevant tools:
- **All modes**: `store_memory`, `search_memory`, `get_memory_stats`
- **Architect mode**: `init_project`, project analysis tools
- **Debugger mode**: Error pattern search, solution history
- **Custom modes**: Tools based on specialization

## Best Practices

### Effective Mode Creation
1. **Clear specialization**: Focus on specific domains or tasks
2. **Tool selection**: Include relevant MCP tools for the domain
3. **System prompt**: Provide clear instructions and expertise areas
4. **Context integration**: Leverage memory system for domain knowledge

### Mode Management
- Use descriptive names for easy identification
- Create modes for frequently used specializations
- Update modes as your workflow evolves
- Leverage both global and project-specific modes