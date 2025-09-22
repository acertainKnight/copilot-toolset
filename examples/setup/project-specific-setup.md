# Project-Specific Setup

Configure the MCP server for specific project needs with workspace-level settings.

## Workspace Configuration

Create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "react-typescript",
        "MEMORY_SCOPE": "project-isolated"
      }
    }
  }
}
```

## Project Types and Configurations

### React TypeScript Project

`.vscode/mcp.json`:
```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "react-typescript",
        "PREFERRED_STYLES": "styled-components",
        "TESTING_FRAMEWORK": "jest-rtl"
      }
    }
  }
}
```

### Python FastAPI Project

```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "python-fastapi",
        "PYTHON_VERSION": "3.11",
        "DATABASE": "postgresql"
      }
    }
  }
}
```

### Node.js Express API

```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "node-express",
        "DATABASE": "mongodb",
        "AUTH_STRATEGY": "jwt"
      }
    }
  }
}
```

## Memory Isolation Levels

### Full Isolation (Default)
Each project has completely separate memory.

```json
{
  "env": {
    "MEMORY_SCOPE": "project-isolated"
  }
}
```

### Shared Preferences Only
Share coding preferences but isolate project-specific context.

```json
{
  "env": {
    "MEMORY_SCOPE": "shared-preferences"
  }
}
```

### Global Sharing
Share all non-sensitive memory across projects.

```json
{
  "env": {
    "MEMORY_SCOPE": "global-shared"
  }
}
```

## Development vs Production

### Development Configuration

```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "MEMORY_VERBOSE": "true"
      }
    }
  }
}
```

### Production Configuration

```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "NODE_ENV": "production",
        "LOG_LEVEL": "error"
      }
    }
  }
}
```

## Project Initialization Examples

### React Project Initialization

```bash
# In Copilot Chat
Initialize this React TypeScript project with these preferences:
- Use functional components with hooks
- Prefer styled-components for styling
- Use React Testing Library for tests
- Follow feature-based folder structure
```

### Python API Initialization

```bash
# In Copilot Chat
Initialize this Python FastAPI project with these settings:
- Use Pydantic v2 for data validation
- PostgreSQL with SQLAlchemy ORM
- JWT authentication
- Follow clean architecture patterns
```

## VS Code Tasks Integration

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "MCP: Initialize Project",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": { \"name\": \"init_project\", \"arguments\": { \"project_path\": \"${workspaceFolder}\" } }, \"id\": 1 }'",
        "|",
        "copilot-mcp-server"
      ],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    },
    {
      "label": "MCP: Get Memory Stats",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": { \"name\": \"get_memory_stats\", \"arguments\": {} }, \"id\": 1 }'",
        "|",
        "copilot-mcp-server"
      ],
      "group": "test"
    }
  ]
}
```

## Verification Commands

Test project-specific setup:

```bash
# Test with workspace argument
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

# Initialize current directory
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"project_path":"'"$(pwd)"'"}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"
```

## Next Steps

1. Try [memory examples](../memory/quick-start.md) with your configured project
2. Create [custom chat modes](../chat-modes/create-custom-mode.md) for your workflow
3. Set up [automated workflows](../workflows/ci-cd-integration.md)