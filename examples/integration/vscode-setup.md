# VS Code Integration Setup

Complete guide for integrating the Copilot MCP Server with Visual Studio Code and GitHub Copilot.

## Prerequisites

1. **VS Code** with latest updates
2. **GitHub Copilot extension** installed and active
3. **Node.js 18+** for running the MCP server
4. **Copilot MCP Server** globally installed

## Global VS Code Configuration

### Step 1: Global MCP Configuration

Create or edit the global MCP configuration file:

**Linux/macOS**: `~/.config/Code/User/mcp.json`
**Windows**: `%APPDATA%\Code\User\mcp.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/mcp/common/mcp.schema.json",
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Step 2: VS Code Settings

Add to your VS Code settings (`settings.json`):

```json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": true
  },
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "debug.testOverrideProxyUrl": "",
    "debug.overrideProxyUrl": ""
  },
  "mcp.servers": {
    "copilot-mcp-toolset": {
      "enabled": true,
      "autoStart": true
    }
  }
}
```

## Workspace-Specific Configuration

### Basic Workspace Setup

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
        "PROJECT_NAME": "${workspaceFolderBasename}",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Development Configuration

For development environments (`.vscode/mcp.json`):

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
        "MEMORY_VERBOSE": "true",
        "DEBUG_MEMORY": "true"
      }
    }
  }
}
```

### Production Configuration

For production/deployment environments:

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
        "LOG_LEVEL": "error",
        "MEMORY_OPTIMIZATION": "true"
      }
    }
  }
}
```

## Project-Type Specific Configurations

### React/Next.js Projects

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
        "PROJECT_TYPE": "react",
        "FRAMEWORK": "nextjs",
        "TYPESCRIPT": "true",
        "PREFERRED_STYLES": "tailwindcss",
        "TESTING_FRAMEWORK": "jest-rtl"
      }
    }
  }
}
```

### Node.js API Projects

```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "nodejs-api",
        "FRAMEWORK": "express",
        "DATABASE": "postgresql",
        "ORM": "prisma",
        "AUTH_STRATEGY": "jwt"
      }
    }
  }
}
```

### Python Projects

```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "python",
        "FRAMEWORK": "fastapi",
        "PYTHON_VERSION": "3.11",
        "DATABASE": "postgresql",
        "ORM": "sqlalchemy"
      }
    }
  }
}
```

## VS Code Tasks Integration

### Basic Tasks Configuration

Create `.vscode/tasks.json`:

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
        "copilot-mcp-server",
        "--workspace=${workspaceFolder}"
      ],
      "group": {
        "kind": "build",
        "isDefault": false
      },
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true
      },
      "problemMatcher": []
    },
    {
      "label": "MCP: Memory Stats",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": { \"name\": \"get_memory_stats\", \"arguments\": {} }, \"id\": 1 }'",
        "|",
        "copilot-mcp-server",
        "--workspace=${workspaceFolder}"
      ],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    },
    {
      "label": "MCP: Store Current Context",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": { \"name\": \"store_memory\", \"arguments\": { \"content\": \"Working on ${fileBasenameNoExtension} - ${input:memoryContent}\", \"layer\": \"prompt\", \"tags\": [\"${fileExtname}\", \"session\"] } }, \"id\": 1 }'",
        "|",
        "copilot-mcp-server",
        "--workspace=${workspaceFolder}"
      ],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "silent"
      }
    },
    {
      "label": "MCP: Test Server Connection",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/list\", \"id\": 1 }'",
        "|",
        "copilot-mcp-server",
        "--workspace=${workspaceFolder}"
      ],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    }
  ],
  "inputs": [
    {
      "id": "memoryContent",
      "description": "What would you like to remember about your current work?",
      "default": "Current implementation progress",
      "type": "promptString"
    }
  ]
}
```

## Launch Configuration

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/copilot-mcp-server/dist/server/index.js",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Test MCP Tools",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/test-mcp-tools.js",
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

## VS Code Extensions Configuration

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "github.copilot",
    "github.copilot-chat",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json"
  ],
  "unwantedRecommendations": []
}
```

## Workspace Settings

### Complete Settings Configuration

Create `.vscode/settings.json`:

```json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": true,
    "yaml": true,
    "json": true
  },
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4"
  },
  "mcp.servers.copilot-mcp-toolset.enabled": true,
  "mcp.servers.copilot-mcp-toolset.autoStart": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/.DS_Store": true,
    "**/dist": true,
    "**/.copilot/memory/cache": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.copilot/memory": false
  },
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Keybindings and Commands

### Custom Keybindings

Create `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+m",
    "command": "workbench.action.tasks.runTask",
    "args": "MCP: Memory Stats",
    "when": "workspaceFolderCount > 0"
  },
  {
    "key": "ctrl+shift+i",
    "command": "workbench.action.tasks.runTask",
    "args": "MCP: Initialize Project",
    "when": "workspaceFolderCount > 0"
  },
  {
    "key": "ctrl+shift+s",
    "command": "workbench.action.tasks.runTask",
    "args": "MCP: Store Current Context",
    "when": "editorTextFocus"
  }
]
```

## Verification and Testing

### Test VS Code Integration

1. **Restart VS Code** after configuration changes
2. **Open Command Palette** (Ctrl+Shift+P)
3. **Run**: "Tasks: Run Task" → "MCP: Test Server Connection"

Expected output should show available MCP tools.

### Test Copilot Chat Integration

In GitHub Copilot Chat:

```
@copilot What MCP tools are available?

Initialize this project with the MCP server.

Store this in memory: I prefer using async/await over Promises.

What do you remember about my coding preferences?
```

### Verify File Generation

After running initialization:

```bash
# Check generated files
ls -la COPILOT.md .github/copilot-instructions.md
ls -la .copilot/memory/

# Test memory system
code .copilot/memory/
```

## Troubleshooting

### Common Issues

#### 1. MCP Server Not Found

**Problem**: VS Code can't find `copilot-mcp-server` command

**Solution**:
```bash
# Check if globally installed
which copilot-mcp-server

# If not found, install globally
cd path/to/copilot-mcp
./scripts/install-global.sh

# Verify installation
copilot-mcp-server --version
```

#### 2. Permission Issues

**Problem**: Permission denied when running MCP server

**Solution**:
```bash
# Fix permissions
chmod +x dist/server/index.js
chmod +x /usr/local/bin/copilot-mcp-server  # or wherever it's installed

# Or reinstall
npm run build && ./scripts/install-global.sh
```

#### 3. VS Code Not Loading Configuration

**Problem**: MCP configuration not being recognized

**Solution**:
1. Restart VS Code completely
2. Check file paths are correct
3. Validate JSON syntax
4. Check VS Code developer console for errors

#### 4. Memory System Not Working

**Problem**: Memory storage/search not functioning

**Solution**:
```bash
# Test manually
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_memory_stats",
    "arguments": {}
  },
  "id": 1
}' | copilot-mcp-server

# Check storage directory
ls -la ~/.copilot-mcp/

# Reset memory system if needed
rm -rf ~/.copilot-mcp/memory/ && mkdir -p ~/.copilot-mcp/memory/
```

### Debug Mode

Enable debug mode by adding to `.vscode/mcp.json`:

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
        "DEBUG": "*"
      }
    }
  }
}
```

Check VS Code Developer Console (Help → Toggle Developer Tools) for detailed logs.

## Advanced Configuration

### Multi-Workspace Setup

For multi-root workspaces, create workspace-specific settings:

`.code-workspace` file:
```json
{
  "folders": [
    { "path": "./frontend" },
    { "path": "./backend" },
    { "path": "./shared" }
  ],
  "settings": {
    "mcp.servers": {
      "copilot-mcp-toolset": {
        "enabled": true,
        "workspace": "${workspaceFolder:frontend}"
      }
    }
  }
}
```

### Environment-Specific Configurations

Use different configurations for different environments:

```bash
# Development
cp .vscode/mcp.development.json .vscode/mcp.json

# Staging
cp .vscode/mcp.staging.json .vscode/mcp.json

# Production
cp .vscode/mcp.production.json .vscode/mcp.json
```

## Template Files

All template files are available in the [`templates/vscode-mcp-config/`](../../templates/vscode-mcp-config/) directory:

- `mcp.template.json` - Basic MCP configuration
- `settings.template.json` - VS Code settings
- `tasks.template.json` - Task automation
- `launch.template.json` - Debug configuration
- `extensions.template.json` - Recommended extensions

Copy and customize these templates for your specific project needs.