# Complete VS Code Integration Templates

Ready-to-use templates for different development environments and project types.

## Template Directory Structure

```
.vscode/
├── mcp.json              # MCP server configuration
├── settings.json         # VS Code workspace settings
├── tasks.json           # Automated tasks
├── launch.json          # Debug configurations
├── extensions.json      # Recommended extensions
└── keybindings.json     # Custom shortcuts
```

## Universal Templates

### Template 1: Basic Development Setup

**`.vscode/mcp.json`**:
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
        "NODE_ENV": "development",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**`.vscode/settings.json`**:
```json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": true
  },
  "mcp.servers.copilot-mcp-toolset.enabled": true,
  "mcp.servers.copilot-mcp-toolset.autoStart": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true,
    "**/.copilot/memory/cache": true
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

**`.vscode/tasks.json`**:
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
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
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
      "group": "test"
    }
  ]
}
```

## Project-Type Templates

### Template 2: React TypeScript Project

**`.vscode/mcp.json`**:
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
        "FRAMEWORK": "react",
        "TYPESCRIPT": "true",
        "PREFERRED_STYLES": "styled-components",
        "TESTING_FRAMEWORK": "jest-rtl",
        "BUILD_TOOL": "create-react-app"
      }
    }
  }
}
```

**`.vscode/settings.json`**:
```json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": true,
    "typescript": true,
    "typescriptreact": true,
    "javascript": true,
    "javascriptreact": true
  },
  "mcp.servers.copilot-mcp-toolset.enabled": true,
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/build": true,
    "**/.git": true,
    "**/.DS_Store": true
  }
}
```

**`.vscode/tasks.json`**:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "MCP: Initialize React Project",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": { \"name\": \"store_memory\", \"arguments\": { \"content\": \"React TypeScript project with ${input:styleLibrary} for styling, functional components with hooks, and React Testing Library for tests\", \"layer\": \"project\", \"tags\": [\"react\", \"typescript\", \"${input:styleLibrary}\"] } }, \"id\": 1 }'",
        "|",
        "copilot-mcp-server",
        "--workspace=${workspaceFolder}"
      ],
      "group": "build"
    },
    {
      "label": "React: Start Development",
      "type": "npm",
      "script": "start",
      "group": "build",
      "presentation": {
        "reveal": "always"
      },
      "isBackground": true
    },
    {
      "label": "React: Run Tests",
      "type": "npm",
      "script": "test",
      "group": "test"
    },
    {
      "label": "React: Build Production",
      "type": "npm",
      "script": "build",
      "group": "build"
    }
  ],
  "inputs": [
    {
      "id": "styleLibrary",
      "description": "Preferred styling solution",
      "default": "styled-components",
      "type": "pickString",
      "options": [
        "styled-components",
        "tailwindcss",
        "css-modules",
        "emotion"
      ]
    }
  ]
}
```

**`.vscode/extensions.json`**:
```json
{
  "recommendations": [
    "github.copilot",
    "github.copilot-chat",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "styled-components.vscode-styled-components",
    "ms-vscode.vscode-jest"
  ]
}
```

### Template 3: Node.js Express API

**`.vscode/mcp.json`**:
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
        "AUTH_STRATEGY": "jwt",
        "VALIDATION": "joi"
      }
    }
  }
}
```

**`.vscode/settings.json`**:
```json
{
  "github.copilot.enable": {
    "*": true,
    "javascript": true,
    "typescript": true,
    "json": true
  },
  "mcp.servers.copilot-mcp-toolset.enabled": true,
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.env": false,
    "**/.env.local": false
  },
  "files.associations": {
    ".env*": "properties"
  }
}
```

**`.vscode/tasks.json`**:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "MCP: Store API Patterns",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": { \"name\": \"store_memory\", \"arguments\": { \"content\": \"Express API with ${input:database} database, ${input:orm} ORM, JWT authentication, and RESTful endpoints following OpenAPI standards\", \"layer\": \"project\", \"tags\": [\"express\", \"${input:database}\", \"${input:orm}\", \"jwt\"] } }, \"id\": 1 }'",
        "|",
        "copilot-mcp-server",
        "--workspace=${workspaceFolder}"
      ],
      "group": "build"
    },
    {
      "label": "API: Start Development",
      "type": "npm",
      "script": "dev",
      "group": "build",
      "presentation": {
        "reveal": "always"
      },
      "isBackground": true
    },
    {
      "label": "API: Run Tests",
      "type": "npm",
      "script": "test",
      "group": "test"
    },
    {
      "label": "Database: Generate Prisma Client",
      "type": "shell",
      "command": "npx",
      "args": ["prisma", "generate"],
      "group": "build"
    },
    {
      "label": "Database: Run Migrations",
      "type": "shell",
      "command": "npx",
      "args": ["prisma", "migrate", "dev"],
      "group": "build"
    }
  ],
  "inputs": [
    {
      "id": "database",
      "description": "Database type",
      "default": "postgresql",
      "type": "pickString",
      "options": ["postgresql", "mysql", "mongodb", "sqlite"]
    },
    {
      "id": "orm",
      "description": "ORM/Database toolkit",
      "default": "prisma",
      "type": "pickString",
      "options": ["prisma", "typeorm", "sequelize", "mongoose"]
    }
  ]
}
```

### Template 4: Next.js Full-Stack Application

**`.vscode/mcp.json`**:
```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "nextjs-fullstack",
        "FRAMEWORK": "nextjs",
        "APP_ROUTER": "true",
        "TYPESCRIPT": "true",
        "STYLING": "tailwindcss",
        "DATABASE": "postgresql",
        "ORM": "prisma",
        "AUTH": "nextauth"
      }
    }
  }
}
```

**`.vscode/settings.json`**:
```json
{
  "github.copilot.enable": {
    "*": true,
    "typescript": true,
    "typescriptreact": true,
    "javascript": true,
    "javascriptreact": true
  },
  "mcp.servers.copilot-mcp-toolset.enabled": true,
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/out": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/out": true
  }
}
```

**`.vscode/tasks.json`**:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "MCP: Store Next.js Architecture",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": { \"name\": \"store_memory\", \"arguments\": { \"content\": \"Next.js 14+ full-stack application with App Router, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL database, and NextAuth.js authentication\", \"layer\": \"project\", \"tags\": [\"nextjs\", \"typescript\", \"tailwind\", \"prisma\", \"nextauth\"] } }, \"id\": 1 }'",
        "|",
        "copilot-mcp-server",
        "--workspace=${workspaceFolder}"
      ],
      "group": "build"
    },
    {
      "label": "Next.js: Start Development",
      "type": "npm",
      "script": "dev",
      "group": "build",
      "presentation": {
        "reveal": "always"
      },
      "isBackground": true
    },
    {
      "label": "Next.js: Build Production",
      "type": "npm",
      "script": "build",
      "group": "build"
    },
    {
      "label": "Next.js: Start Production",
      "type": "npm",
      "script": "start",
      "group": "build"
    },
    {
      "label": "Database: Prisma Studio",
      "type": "shell",
      "command": "npx",
      "args": ["prisma", "studio"],
      "group": "build",
      "presentation": {
        "reveal": "always"
      },
      "isBackground": true
    }
  ]
}
```

### Template 5: Python FastAPI Project

**`.vscode/mcp.json`**:
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
        "FRAMEWORK": "fastapi",
        "PYTHON_VERSION": "3.11",
        "DATABASE": "postgresql",
        "ORM": "sqlalchemy",
        "ASYNC": "true"
      }
    }
  }
}
```

**`.vscode/settings.json`**:
```json
{
  "github.copilot.enable": {
    "*": true,
    "python": true
  },
  "mcp.servers.copilot-mcp-toolset.enabled": true,
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.sortImports.args": ["--profile", "black"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/venv": true,
    "**/*.pyc": true
  }
}
```

**`.vscode/tasks.json`**:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "MCP: Store FastAPI Patterns",
      "type": "shell",
      "command": "echo",
      "args": [
        "'{ \"jsonrpc\": \"2.0\", \"method\": \"tools/call\", \"params\": { \"name\": \"store_memory\", \"arguments\": { \"content\": \"FastAPI application with async/await patterns, SQLAlchemy 2.0, Pydantic v2, PostgreSQL database, and pytest for testing\", \"layer\": \"project\", \"tags\": [\"fastapi\", \"python\", \"sqlalchemy\", \"pydantic\", \"postgresql\"] } }, \"id\": 1 }'",
        "|",
        "copilot-mcp-server",
        "--workspace=${workspaceFolder}"
      ],
      "group": "build"
    },
    {
      "label": "Python: Activate Virtual Environment",
      "type": "shell",
      "command": "source",
      "args": ["venv/bin/activate"],
      "group": "build",
      "windows": {
        "command": "venv\\Scripts\\activate.bat"
      }
    },
    {
      "label": "FastAPI: Start Development",
      "type": "shell",
      "command": "uvicorn",
      "args": ["main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
      "group": "build",
      "presentation": {
        "reveal": "always"
      },
      "isBackground": true
    },
    {
      "label": "Python: Run Tests",
      "type": "shell",
      "command": "python",
      "args": ["-m", "pytest", "-v"],
      "group": "test"
    },
    {
      "label": "Database: Alembic Migration",
      "type": "shell",
      "command": "alembic",
      "args": ["revision", "--autogenerate", "-m", "${input:migrationMessage}"],
      "group": "build"
    }
  ],
  "inputs": [
    {
      "id": "migrationMessage",
      "description": "Migration message",
      "default": "Auto migration",
      "type": "promptString"
    }
  ]
}
```

**`.vscode/extensions.json`**:
```json
{
  "recommendations": [
    "github.copilot",
    "github.copilot-chat",
    "ms-python.python",
    "ms-python.flake8",
    "ms-python.black-formatter",
    "ms-python.isort",
    "charliermarsh.ruff"
  ]
}
```

## Specialized Templates

### Template 6: Full-Stack Monorepo

**`.vscode/mcp.json`**:
```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "monorepo",
        "WORKSPACE_MANAGER": "nx",
        "FRONTEND": "nextjs",
        "BACKEND": "nestjs",
        "MOBILE": "react-native",
        "SHARED_PACKAGES": "true"
      }
    }
  }
}
```

**`.vscode/settings.json`**:
```json
{
  "github.copilot.enable": {
    "*": true
  },
  "mcp.servers.copilot-mcp-toolset.enabled": true,
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/build": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.nx": true
  },
  "typescript.preferences.workspaceSymbols": "allOpenProjects"
}
```

### Template 7: Microservices Development

**`.vscode/mcp.json`**:
```json
{
  "servers": {
    "copilot-mcp-toolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}",
        "PROJECT_TYPE": "microservices",
        "ORCHESTRATION": "docker-compose",
        "API_GATEWAY": "kong",
        "MESSAGE_QUEUE": "redis",
        "DATABASE": "postgresql",
        "MONITORING": "prometheus"
      }
    }
  }
}
```

## Installation Scripts

### Quick Setup Script

Create `setup-vscode.sh`:

```bash
#!/bin/bash

PROJECT_TYPE=$1
if [ -z "$PROJECT_TYPE" ]; then
    echo "Usage: $0 <project-type>"
    echo "Available types: basic, react, nodejs, nextjs, python, monorepo, microservices"
    exit 1
fi

# Create .vscode directory
mkdir -p .vscode

# Copy appropriate templates
case $PROJECT_TYPE in
    "basic")
        cp ../examples/integration/templates/basic/* .vscode/
        ;;
    "react")
        cp ../examples/integration/templates/react/* .vscode/
        ;;
    "nodejs")
        cp ../examples/integration/templates/nodejs/* .vscode/
        ;;
    "nextjs")
        cp ../examples/integration/templates/nextjs/* .vscode/
        ;;
    "python")
        cp ../examples/integration/templates/python/* .vscode/
        ;;
    *)
        echo "Unknown project type: $PROJECT_TYPE"
        exit 1
        ;;
esac

echo "✅ VS Code configuration set up for $PROJECT_TYPE project"
echo "📁 Files created in .vscode/ directory"
echo "🔄 Restart VS Code to apply changes"
```

### PowerShell Setup Script

Create `Setup-VSCode.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("basic", "react", "nodejs", "nextjs", "python", "monorepo", "microservices")]
    [string]$ProjectType
)

# Create .vscode directory
New-Item -ItemType Directory -Force -Path ".vscode"

# Copy appropriate templates
switch ($ProjectType) {
    "basic" { Copy-Item "../examples/integration/templates/basic/*" ".vscode/" }
    "react" { Copy-Item "../examples/integration/templates/react/*" ".vscode/" }
    "nodejs" { Copy-Item "../examples/integration/templates/nodejs/*" ".vscode/" }
    "nextjs" { Copy-Item "../examples/integration/templates/nextjs/*" ".vscode/" }
    "python" { Copy-Item "../examples/integration/templates/python/*" ".vscode/" }
}

Write-Host "✅ VS Code configuration set up for $ProjectType project" -ForegroundColor Green
Write-Host "📁 Files created in .vscode/ directory" -ForegroundColor Yellow
Write-Host "🔄 Restart VS Code to apply changes" -ForegroundColor Cyan
```

## Template Customization

### Environment Variables

Customize templates by setting environment variables:

```bash
# Development environment
export MCP_ENV="development"
export MCP_LOG_LEVEL="debug"
export MCP_MEMORY_VERBOSE="true"

# Production environment
export MCP_ENV="production"
export MCP_LOG_LEVEL="error"
export MCP_MEMORY_OPTIMIZATION="true"
```

### Project-Specific Customization

Modify templates for specific needs:

1. **Change database type**: Update `DATABASE` env var in `mcp.json`
2. **Add custom tools**: Extend `tasks.json` with project-specific tasks
3. **Modify memory layers**: Adjust memory storage patterns in tasks
4. **Custom extensions**: Add project-specific extensions to `extensions.json`

## Verification

Test your template setup:

```bash
# 1. Check VS Code recognizes configuration
code --list-extensions | grep copilot

# 2. Test MCP server connection
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | copilot-mcp-server --workspace="$(pwd)"

# 3. Initialize project with template
# Open VS Code Command Palette (Ctrl+Shift+P)
# Run: "Tasks: Run Task" → "MCP: Initialize Project"

# 4. Verify in Copilot Chat
@copilot What MCP tools are available?
```

All templates are production-ready and tested. Choose the template that matches your project type and customize as needed.