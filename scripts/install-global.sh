#!/bin/bash

# Global Installation Script for Copilot MCP Toolset
# This script installs the MCP server globally and configures VS Code

set -e  # Exit on any error

echo "🚀 Installing Copilot MCP Toolset globally..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
MIN_VERSION="18.0.0"

if [ "$(printf '%s\n' "$MIN_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$MIN_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Build the project
echo "🔨 Building project..."
npm run build

# Install globally
echo "📦 Installing globally..."
npm install -g .

# Verify installation
if command -v copilot-mcp-server &> /dev/null; then
    echo "✅ copilot-mcp-server installed successfully"
    echo "   Location: $(which copilot-mcp-server)"
else
    echo "❌ Failed to install copilot-mcp-server globally"
    exit 1
fi

# Create global configuration directory
GLOBAL_CONFIG_DIR="$HOME/.copilot-mcp"
echo "📁 Creating global configuration directory: $GLOBAL_CONFIG_DIR"
mkdir -p "$GLOBAL_CONFIG_DIR"
mkdir -p "$GLOBAL_CONFIG_DIR/memory"
mkdir -p "$GLOBAL_CONFIG_DIR/modes"
mkdir -p "$GLOBAL_CONFIG_DIR/backups"
mkdir -p "$GLOBAL_CONFIG_DIR/logs"

# Copy configuration if it doesn't exist
if [ ! -f "$GLOBAL_CONFIG_DIR/config.json" ]; then
    echo "⚙️ Creating global configuration..."
    cat > "$GLOBAL_CONFIG_DIR/config.json" << 'EOF'
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
  "vscode": {
    "autoDetectWorkspace": true,
    "workspaceConfigOverrides": true,
    "defaultSettings": {
      "enableAutoInit": true,
      "defaultMode": "general",
      "memoryPersistence": true
    }
  },
  "performance": {
    "resourceLimits": {
      "maxMemoryPerWorkspace": "50MB",
      "maxConcurrentWorkspaces": 10,
      "memoryCleanupThreshold": "100MB"
    },
    "caching": {
      "enableWorkspaceCache": true,
      "cacheExpiry": "1h",
      "maxCacheSize": "20MB"
    },
    "optimization": {
      "lazyLoadMemory": true,
      "compressOldMemories": true,
      "enableGarbageCollection": true
    }
  }
}
EOF
    echo "✅ Global configuration created"
else
    echo "ℹ️ Global configuration already exists"
fi

# Test the installation
echo "🧪 Testing MCP server..."
if echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | timeout 5 copilot-mcp-server > /dev/null 2>&1; then
    echo "✅ MCP server is responding correctly"
else
    echo "⚠️ MCP server test failed - this might be normal if no tools are registered yet"
fi

# Detect VS Code settings path
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    VSCODE_CONFIG_PATH="$HOME/.config/Code/User"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    VSCODE_CONFIG_PATH="$HOME/Library/Application Support/Code/User"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    VSCODE_CONFIG_PATH="$APPDATA/Code/User"
else
    VSCODE_CONFIG_PATH="~/.config/Code/User"
fi

# Auto-create VS Code global configuration
echo "🎯 Configuring VS Code integration..."
mkdir -p "$VSCODE_CONFIG_PATH"

if [ ! -f "$VSCODE_CONFIG_PATH/mcp.json" ]; then
    echo "⚙️ Creating global VS Code MCP configuration..."
    cat > "$VSCODE_CONFIG_PATH/mcp.json" << 'EOF'
{
  "servers": {
    "copilotMcpToolset": {
      "type": "stdio",
      "command": "copilot-mcp-server"
    }
  }
}
EOF
    echo "✅ Global VS Code configuration created at: $VSCODE_CONFIG_PATH/mcp.json"
else
    echo "ℹ️ VS Code global configuration already exists"
fi

# Create workspace configuration template
echo "📝 Creating workspace configuration template..."
if [ ! -f ".vscode/mcp.json" ]; then
    mkdir -p .vscode
    cat > ".vscode/mcp.json" << 'EOF'
{
  "servers": {
    "copilotMcpToolset": {
      "type": "stdio",
      "command": "copilot-mcp-server",
      "args": ["--workspace=${workspaceFolder}"],
      "env": {
        "COPILOT_MCP_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
EOF
    echo "✅ Workspace configuration template created at: .vscode/mcp.json"
else
    echo "ℹ️ Workspace configuration already exists"
fi

echo ""
echo "🎉 Installation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ VS Code is now configured automatically!"
echo "✅ Global MCP configuration: $VSCODE_CONFIG_PATH/mcp.json"
echo "✅ Workspace template created: .vscode/mcp.json"
echo ""
echo "🚀 Ready to use! Just:"
echo "   1. Restart VS Code"
echo "   2. Open any project"
echo "   3. Ask GitHub Copilot: '@copilot Initialize this project'"
echo ""
echo "🛠️ Available tools: init_project, store_memory, search_memory, get_memory_stats, create_mode, heal_chat_mode, heal_project_context, optimize_memory"
echo "📚 For help: See docs/QUICK_START.md or docs/TROUBLESHOOTING.md"