# Developer Guide

Complete guide for developers working with the Copilot MCP Toolset codebase, contributing to the project, and extending functionality.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Core Components](#core-components)
- [Adding Features](#adding-features)
- [Testing Strategy](#testing-strategy)
- [Contributing Guidelines](#contributing-guidelines)
- [API Reference](#api-reference)

## Architecture Overview

The Copilot MCP Toolset follows a modular MCP server design with three main subsystems:

### System Architecture

```
┌─────────────────────────────────────────────┐
│               MCP Client (VS Code)           │
├─────────────────────────────────────────────┤
│            MCP Protocol Layer                │
├─────────────────────────────────────────────┤
│         CopilotMCPServer (Global)           │
├─────────────────┬───────────────────────────┤
│  Memory System  │  Chat Mode System         │
│  - Core         │  - Built-in Modes         │
│  - Warm (Level) │  - Custom Modes          │
│  - Cold (SQLite)│  - GitHub Integration     │
├─────────────────┼───────────────────────────┤
│     Project Initialization System           │
│  - Type Detection  - Context Generation     │
│  - Dual File Format  - Memory Setup         │
└─────────────────────────────────────────────┘
```

### Key Design Patterns

**Global Singleton Architecture**
- One server instance with workspace-aware context switching
- Shared global preferences, isolated project memory
- Efficient resource management across multiple workspaces

**MCP Protocol Compliance**
- Full Model Context Protocol implementation using `@modelcontextprotocol/sdk`
- Tool registration with JSON schema validation (Zod)
- Resource and prompt providers for context delivery
- Stdio transport for VS Code integration

**Memory Architecture (Letta/MemGPT-inspired)**
- **Core Memory**: Always-active user preferences and context (2KB limit)
- **Warm Storage**: Recent patterns and project data (LevelDB cache)
- **Cold Storage**: Long-term knowledge base (SQLite with future embedding support)
- Auto-promotion/demotion based on access patterns

## Development Setup

### Prerequisites

- **Node.js 18+** (recommended: Node.js 20+)
- **TypeScript 5.0+**
- **Git**
- **VS Code** with GitHub Copilot (for testing)

### Initial Setup

```bash
git clone <repository-url>
cd copilot-mcp-toolset
npm install
npm run build
```

### Development Commands

```bash
# Build & Run
npm run build          # Build TypeScript to dist/ directory
npm run dev            # Watch mode for development
npm run start          # Start the MCP server

# Testing
npm test               # Run unit tests
npm run test:all       # Run all test suites (unit, integration, e2e)
npm run test:mcp       # Test MCP protocol compliance
npm run test:coverage  # Generate coverage reports

# Global Installation & Testing
./scripts/install-global.sh  # Install server globally (Linux/macOS)
copilot-mcp-server --help    # Test global installation

# Quality & Validation
npm run lint           # ESLint TypeScript files
npm run lint:fix       # Auto-fix linting issues
npm run validate:config # Validate MCP configuration files
```

## Core Components

### MCP Server Entry Point (`src/server/index.ts`)

Main server class that orchestrates all subsystems:

```typescript
export class CopilotMCPServer {
  private server: Server;
  private state: ServerState;

  constructor() {
    this.server = new Server(/* MCP SDK setup */);
    this.state = new ServerState();
    this.setupToolHandlers();
  }

  // Global singleton with workspace context switching
  private getCurrentContext(): WorkspaceContext | null {
    return this.state.workspaces.get(this.state.currentWorkspace);
  }
}
```

**Key Responsibilities:**
- MCP protocol implementation and tool registration
- Workspace management and context switching
- Global state coordination across subsystems
- Error handling and logging

### Memory System (`src/memory/`)

Three-tier memory architecture with workspace isolation:

**MemoryManager.ts** - Main interface
```typescript
export class MemoryManager {
  private coreMemory: Map<string, any>;
  private warmStorage: Level;
  private coldStorage: Database;

  async store(layer: MemoryLayer, key: string, value: any): Promise<void>
  async search(query: string, options?: MemorySearchOptions): Promise<MemoryEntry[]>
  async getStats(): Promise<MemoryStats>
}
```

**BackupManager.ts** - Persistence and recovery
```typescript
export class BackupManager {
  async createBackup(workspacePath: string): Promise<string>
  async restoreBackup(backupPath: string): Promise<void>
  async scheduleAutoBackup(interval: string): Promise<void>
}
```

**Memory Layers:**
- `preference` (global): User coding preferences and patterns
- `project` (workspace): Project-specific context and decisions
- `prompt` (workspace): Session-specific context and conversations
- `system` (global): System patterns and error recovery strategies

### Chat Mode System (`src/modes/`)

Dynamic mode creation with GitHub Copilot integration:

**ChatModeManager.ts** - Core mode management
```typescript
export class ChatModeManager {
  private modes: Map<string, ChatMode>;

  async createMode(config: ChatModeConfig): Promise<ChatMode>
  async activateMode(name: string): Promise<void>
  async generateModeFile(mode: ChatMode): Promise<void> // GitHub Copilot format
}
```

**Dual Format Support:**
- **Internal JSON**: Full MCP tool integration and system prompts
- **GitHub Copilot `.chatmode.md`**: YAML frontmatter format for native Copilot support

**Built-in Modes:**
```typescript
const BUILT_IN_MODES = {
  general: { /* comprehensive assistance */ },
  architect: { /* system design focus */ },
  debugger: { /* error analysis focus */ },
  refactorer: { /* code improvement focus */ },
  tester: { /* testing strategy focus */ }
};
```

### Project Initialization (`src/project/`)

Intelligent project analysis and context generation:

**ProjectInitializer.ts** - Main initialization logic
```typescript
export class ProjectInitializer {
  async initializeProject(projectPath: string): Promise<InitializationResult> {
    const analysis = await this.analyzeProject(projectPath);
    const contexts = await this.generateContextFiles(analysis);
    await this.setupMemoryStructure(projectPath);
    return { analysis, contexts, memoryPath };
  }
}
```

**Features:**
- Detects 20+ project types (React, Vue, Python, Rust, Go, etc.)
- Generates dual context files: `COPILOT.md` + `.github/copilot-instructions.md`
- Creates `.copilot/memory/` directory structure
- Extracts dependencies, patterns, and conventions

## Adding Features

### Adding New MCP Tools

1. **Register Tool Schema** in `setupToolHandlers()`:
```typescript
this.server.registerTool("my_new_tool", {
  title: "My New Tool",
  description: "Description of what the tool does",
  inputSchema: {
    parameter: z.string().describe('Parameter description')
  }
}, async ({ parameter }) => {
  // Implementation
  return { type: "text", text: "Result" } as const;
});
```

2. **Implement Handler Method:**
```typescript
private async handleMyNewTool(parameter: string): Promise<string> {
  // Tool logic here
  return "success";
}
```

3. **Add Tool Validation** (if mode-specific):
```typescript
// In ChatModeManager.ts
private validateModeTools(tools: string[]): boolean {
  const validTools = [...this.getAvailableTools(), 'my_new_tool'];
  return tools.every(tool => validTools.includes(tool));
}
```

4. **Update Tool Descriptions:**
```typescript
private getToolDescription(toolName: string): string {
  const descriptions = {
    my_new_tool: "Performs custom functionality for user workflow",
    // ... other tools
  };
  return descriptions[toolName] || "Tool description not available";
}
```

### Adding New Chat Modes

1. **Built-in Mode** - Add to `loadBuiltInModes()`:
```typescript
private async loadBuiltInModes(): Promise<void> {
  const myMode: ChatModeConfig = {
    name: "my_mode",
    title: "My Specialized Mode",
    description: "Expert assistance for specific domain",
    systemPrompt: "You are an expert in...",
    tools: ["init_project", "store_memory", "search_memory"],
    temperature: 0.7,
    isBuiltIn: true
  };

  this.modes.set("my_mode", await this.createModeFromConfig(myMode));
}
```

2. **Custom Mode** - Via tool or JSON file:
```json
{
  "name": "security",
  "title": "Security Specialist",
  "description": "Expert in security analysis and code review",
  "systemPrompt": "You are a security expert...",
  "tools": ["init_project", "search_memory"],
  "temperature": 0.3,
  "isBuiltIn": false
}
```

### Extending Memory System

1. **New Memory Layer** - Update `MemoryLayer` type:
```typescript
// In src/memory/types.ts
export type MemoryLayer =
  | 'preference'
  | 'project'
  | 'prompt'
  | 'system'
  | 'my_new_layer'; // Add here
```

2. **Layer-Specific Logic** - Update `MemoryManager`:
```typescript
private getStorageForLayer(layer: MemoryLayer): Storage {
  switch (layer) {
    case 'my_new_layer':
      return this.myCustomStorage;
    // ... other cases
  }
}
```

3. **Configuration** - Update global config schema:
```json
{
  "memory": {
    "isolatedMemoryTypes": ["project", "prompt", "my_new_layer"]
  }
}
```

## Testing Strategy

### Test Structure

```
tests/
├── unit/              # Component-level testing
│   ├── memory/        # Memory system tests
│   ├── modes/         # Chat mode tests
│   ├── server/        # MCP server tests
│   └── project/       # Project initialization tests
├── integration/       # Cross-system testing
│   ├── mcp-protocol/  # MCP compliance tests
│   ├── workspace/     # Workspace switching tests
│   └── end-to-end/    # Full workflow tests
├── e2e/              # End-to-end testing
│   ├── vscode/       # VS Code integration tests
│   └── github/       # GitHub Copilot tests
└── performance/      # Performance benchmarks
    ├── memory/       # Memory system benchmarks
    └── server/       # Server response time tests
```

### Writing Tests

**Unit Test Example:**
```typescript
// tests/unit/memory/MemoryManager.test.ts
import { MemoryManager } from '../../../src/memory/MemoryManager';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager(':memory:');
  });

  test('should store and retrieve memory', async () => {
    await memoryManager.store('preference', 'coding_style', 'functional');
    const result = await memoryManager.search('coding');
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('functional');
  });
});
```

**Integration Test Example:**
```typescript
// tests/integration/mcp-protocol/tools.test.ts
import { CopilotMCPServer } from '../../../src/server';

describe('MCP Tools Integration', () => {
  test('should list all registered tools', async () => {
    const server = new CopilotMCPServer();
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1
    });

    expect(response.result.tools).toHaveLength(9);
    expect(response.result.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'init_project' }),
        expect.objectContaining({ name: 'store_memory' })
      ])
    );
  });
});
```

### Performance Testing

```typescript
// tests/performance/memory/search.test.ts
describe('Memory Search Performance', () => {
  test('should search 1000 entries under 10ms', async () => {
    const startTime = performance.now();
    await memoryManager.search('test query');
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(10);
  });
});
```

## Contributing Guidelines

### Code Style

- **TypeScript Strict Mode**: All code must pass strict type checking
- **ESLint Configuration**: Follow project ESLint rules
- **Functional Patterns**: Prefer functional programming patterns
- **Error Handling**: Use proper error boundaries and logging

### Git Workflow

1. **Fork and Clone**: Fork the repository and create feature branch
2. **Development**: Make changes following code style guidelines
3. **Testing**: Add tests for new features and ensure all tests pass
4. **Documentation**: Update relevant documentation
5. **Pull Request**: Submit PR with clear description and test results

### PR Requirements

- [ ] All tests pass (`npm run test:all`)
- [ ] Code coverage maintained (>85%)
- [ ] ESLint passes (`npm run lint`)
- [ ] Documentation updated
- [ ] MCP protocol compliance verified (`npm run test:mcp`)

## API Reference

### MCP Tools

#### Core Tools
- **`init_project`** - Initialize project with context files and memory setup
- **`store_memory`** - Store information in the three-tier memory system
- **`search_memory`** - Search stored memories with fuzzy matching
- **`get_memory_stats`** - Display memory usage statistics and analytics

#### Mode Management
- **`create_mode`** - Create custom chat modes with specialized prompts
- **`list_modes`** - List all available built-in and custom modes
- **`activate_mode`** - Switch to a specific chat mode

#### Workspace Management
- **`switch_workspace`** - Switch between project workspaces
- **`list_workspaces`** - Show all active workspaces and their status

### TypeScript Interfaces

```typescript
// Core interfaces for development
export interface ChatModeConfig {
  name: string;
  title: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  temperature?: number;
  isBuiltIn: boolean;
}

export interface MemoryEntry {
  id: string;
  layer: MemoryLayer;
  key: string;
  value: any;
  timestamp: number;
  category?: string;
  tags?: string[];
}

export interface WorkspaceContext {
  path: string;
  memoryManager: MemoryManager;
  projectType?: string;
  lastAccessed: number;
}
```

### Configuration Schema

See `mcp-config-schema.json` for complete JSON schema validation of MCP configurations.

## Performance Guidelines

### Memory Optimization
- **Lazy Loading**: Load memory and context only when needed
- **Smart Caching**: Cache frequently accessed data with TTL
- **Resource Limits**: Respect configured memory limits per workspace
- **Background Cleanup**: Implement automatic cleanup of old data

### Response Time Targets
- Memory operations: <10ms for search/store
- Project initialization: <15s for large projects
- Workspace switching: <100ms context switch
- Tool responses: <500ms for complex operations

### Monitoring
```typescript
// Performance monitoring example
const startTime = performance.now();
const result = await this.performOperation();
const duration = performance.now() - startTime;

Logger.performance(`Operation completed in ${duration.toFixed(2)}ms`);
```

## Troubleshooting Development

### Common Issues

**TypeScript Compilation Errors:**
- Ensure all dependencies are installed: `npm install`
- Check TypeScript version: `npx tsc --version`
- Verify tsconfig.json configuration

**MCP Protocol Issues:**
- Test with: `npm run test:mcp`
- Verify JSON-RPC message format
- Check tool schema validation with Zod

**Memory System Issues:**
- Check SQLite database permissions
- Verify LevelDB directory access
- Monitor memory usage with `get_memory_stats`

**VS Code Integration Issues:**
- Verify MCP configuration files
- Check VS Code extension compatibility
- Restart VS Code after configuration changes

For user-facing issues, see the **Troubleshooting Guide**.

## Release Process

1. **Version Update**: Update version in `package.json`
2. **Build Verification**: Ensure clean build with `npm run build`
3. **Test Suite**: Run full test suite with `npm run test:ci`
4. **Documentation**: Update CHANGELOG and API documentation
5. **Tag Release**: Create Git tag with version number
6. **Publish**: Publish to npm registry (if applicable)

The project follows semantic versioning (semver) for releases.