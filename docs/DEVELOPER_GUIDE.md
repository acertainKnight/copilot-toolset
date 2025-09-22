# Developer Guide

## Development Setup

### Local Development
```bash
git clone <repository-url>
cd copilot-mcp-toolset
npm install
npm run build
npm run dev
```

### Testing the MCP Server
```bash
npm run test:mcp
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | node dist/server/index.js
copilot-mcp-server --help
```

## Architecture Overview

The Copilot MCP Toolset uses a **Global Singleton with Workspace-Aware Context** architecture:

- **Single Global Server**: One server instance handles all workspaces efficiently
- **Workspace Context Switching**: Automatic isolation and context switching per project
- **Hybrid Memory System**: Global preferences + isolated project memory
- **Resource Management**: Automatic cleanup and optimization

## Configuration Layers

### 1. Global Server Config (`~/.copilot-mcp/config.json`)
```json
{
  "server": {
    "maxConcurrentProjects": 10,
    "memoryCleanupInterval": "24h"
  },
  "memory": {
    "sharedMemoryTypes": ["preferences", "common_patterns"],
    "isolatedMemoryTypes": ["project", "prompt", "local_context"]
  },
  "performance": {
    "resourceLimits": {
      "maxMemoryPerWorkspace": "50MB",
      "maxConcurrentWorkspaces": 10
    }
  }
}
```

### 2. VS Code Global Config (`User/mcp.json`)
- MCP server registration
- Global server discovery

### 3. Workspace Config (`.vscode/mcp.json`)
- Project-specific settings
- Workspace arguments
- Tool capabilities
- Environment variables

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

### Adding New Tools
1. Register tool schema in `setupToolHandlers()` in `src/server/index.ts`
2. Use the new schema format: `inputSchema: { field: z.string().describe('...') }`
3. Implement handler method (e.g., `handleNewTool()`)
4. Ensure return types use `as const` for type safety
5. Add tool validation in `ChatModeManager` if mode-specific

## Privacy & Security

- **100% Local**: No external API calls or data transmission
- **Local Storage**: All data stored on your machine in standard directories
- **No Telemetry**: Complete privacy with optional local analytics only
- **Sandboxed**: Safe execution environment with input validation

## Performance Benchmarks

- **Memory Operations**: < 10ms average response time
- **Project Initialization**: < 15s for large projects (1000+ files)
- **Search Operations**: < 200ms for complex queries across all memory tiers
- **Memory Usage**: ~50MB base + project size