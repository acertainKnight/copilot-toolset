# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **standalone MCP server** for GitHub Copilot that provides intelligent project initialization with native GitHub Copilot integration, custom chat modes, and a persistent three-tier memory system. The system transforms GitHub Copilot into a context-aware coding assistant with automated setup, structured memory like Letta/MemGPT, and specialized modes like Claude Code.

**Key Architecture**: The project follows a modular MCP server design with three main subsystems:
1. **Memory Management** (`src/memory/`) - Three-tier persistent memory (core, warm, cold storage)
2. **Chat Mode System** (`src/modes/`) - Dynamic creation with dual format support (internal JSON + GitHub Copilot `.chatmode.md`)
3. **Project Initialization** (`src/project/`) - Automatic context generation with both `COPILOT.md` and `.github/copilot-instructions.md` creation

## Development Commands

### Build & Run
- `npm run build` - Build TypeScript to `dist/` directory
- `npm run dev` - Watch mode for development
- `npm run start` - Start the MCP server
- `npm test` - Run unit tests
- `npm run test:all` - Run all test suites (unit, integration, e2e)
- `npm run test:mcp` - Test MCP protocol compliance

### Global Installation & Testing
- `./scripts/install-global.sh` - Install server globally (Linux/macOS/Windows)
- `copilot-mcp-server --help` - Test global installation
- `which copilot-mcp-server` - Verify installation path

### Linting & Quality
- `npm run lint` - ESLint TypeScript files
- `npm run lint:fix` - Auto-fix linting issues

### Testing Strategy
- `npm run test:unit` - Unit tests (Jest)
- `npm run test:integration` - Integration tests
- `npm run test:e2e` - End-to-end tests
- `npm run test:performance` - Performance benchmarks
- `npm run test:coverage` - Generate coverage reports

## Core Architecture

### MCP Server Entry Point (`src/server/index.ts`)
- Main server class `CopilotMCPServer` orchestrates all subsystems
- Implements MCP protocol with tools, resources, and prompts
- **Global Singleton Architecture**: One server instance with workspace-aware context switching
- Handles **8 comprehensive tools**:
  - Core: `init_project`, `store_memory`, `search_memory`, `get_memory_stats`
  - Modes: `create_mode`
  - Self-Healing: `heal_chat_mode`, `heal_project_context`, `optimize_memory`

### Memory System (`src/memory/`)
- **Unified Database Architecture**: Single SQLite database with dual-tier, bifurcated memory
- **Two Memory Tiers**: Core memory (2KB limit, high-priority) + Long-term memory (unlimited)
- **Bifurcated Scoping**: Global scope (cross-project) + Project scope (project-specific isolation)
- `UnifiedMemoryManager.ts` - Main unified memory interface with tier/scope management
- `MemoryMigration.ts` - Migration system from legacy to unified architecture
- **Database Location**: `~/.copilot-mcp/memory/unified.db` (all memories in one database)
- **Project Isolation**: Handled via `project_id` column, not separate storage locations

### Chat Mode System (`src/modes/`)
- `ChatModeManager.ts` - Dynamic mode creation with dual format support
- **GitHub Copilot Integration**: Automatically creates `.github/chatmodes/{name}.chatmode.md` files
- **Dual Storage**: Internal JSON for MCP operations + Copilot-compatible markdown format
- Built-in modes: `general`, `architect`, `debugger`, `refactorer`, `tester`
- Custom mode creation with tools, system prompts, and persistence
- Mode-specific context loading and prompt generation

### Project Initialization (`src/project/`)
- `ProjectInitializer.ts` - Analyzes projects and generates dual context files
- **GitHub Copilot Native Support**: Creates `.github/copilot-instructions.md` in expected format
- **Dual Context Generation**: Both `COPILOT.md` (root) and `.github/copilot-instructions.md` (Copilot-specific)
- **Enhanced Project Detection**: Multi-source name detection with deduplication via database queries
- Detects 20+ project types (React, Vue, Python, Rust, Go, etc.)
- **Unified Memory Integration**: Stores project context directly in unified database (no local directories)
- Generates AI assistant guidelines and project-specific instructions

### Storage & Utilities (`src/utils/`, `src/storage/`)
- File-based storage management for modes and configurations
- JSON configuration handling with validation
- Cross-platform storage path resolution

## Key Design Patterns

### MCP Protocol Implementation
- Uses `@modelcontextprotocol/sdk` for standard MCP compliance
- Tool registration with JSON schema validation (Zod)
- Resource and prompt providers for context delivery
- Stdio transport for VS Code integration

### Unified Memory Architecture Pattern (Inspired by Letta/MemGPT)
- **Core Tier**: High-priority, always-accessible memories (2KB limit per item)
- **Long-term Tier**: Comprehensive storage for detailed information (unlimited size)
- **Global Scope**: Cross-project shared memories (preferences, patterns, solutions)
- **Project Scope**: Project-specific isolation via database columns
- **Single Database**: All memories in `~/.copilot-mcp/memory/unified.db` with tier/scope columns

### Plugin Architecture
- Chat modes as configurable plugins with tools and prompts
- Dynamic loading from JSON configuration files
- Built-in vs custom mode separation
- Mode-specific context and memory scoping

## Configuration & Setup

### Multi-Layer Configuration Architecture

#### 1. Global Server Configuration
- **Location**: `~/.copilot-mcp/config.json`
- **Purpose**: Server performance, memory policies, resource limits
- **Scope**: Affects all workspaces

#### 2. VS Code Global Integration
- **Location**: `~/.config/Code/User/mcp.json` (Linux) or `%APPDATA%\Code\User\mcp.json` (Windows)
- **Purpose**: MCP server registration and discovery
- **Command**: `copilot-mcp-server` (globally installed)

#### 3. Workspace Configuration
- **Location**: `.vscode/mcp.json` (per workspace)
- **Purpose**: Workspace-specific settings, capabilities, environment variables
- **Features**: Workspace arguments (`--workspace=${workspaceFolder}`)

### Storage Architecture
- **Global Storage**: `~/.copilot-mcp/` (server config, unified database, modes, backups)
- **Unified Memory Database**: `~/.copilot-mcp/memory/unified.db` (all memories with tier/scope columns)
- **Generated Files**: `COPILOT.md`, `.github/copilot-instructions.md` (project context files)
- **No Per-Project Storage**: All project memory stored in unified database via `project_id`

## Testing Architecture

### Test Structure (`tests/`)
- **Unit tests** (`tests/unit/`) - Component-level testing
- **Integration tests** (`tests/integration/`) - Cross-system testing
- **E2E tests** (`tests/e2e/`) - Full workflow testing
- **Performance tests** (`tests/performance/`) - Memory and speed benchmarks

### Jest Configuration
- Multiple Jest configs for different test types
- TypeScript support with `ts-jest`
- Coverage reporting and CI integration
- Test fixtures for consistent test data

## Dependencies & Tech Stack

### Core Dependencies
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **better-sqlite3** - Cold storage database
- **level** - Warm storage key-value store
- **zod** - Runtime type validation
- **simple-git** - Git repository analysis

### Development Dependencies
- **TypeScript** - Type-safe JavaScript
- **Jest** - Testing framework
- **ESLint** - Code linting
- **@typescript-eslint** - TypeScript-specific linting rules

## Development Workflow

### Adding New Tools
1. Register tool schema in `setupToolHandlers()` in `src/server/index.ts`
2. Use the new schema format: `inputSchema: { field: z.string().describe('...') }`
3. Implement handler method (e.g., `handleNewTool()`)
4. Ensure return types use `as const` for type safety
5. Add tool validation in `ChatModeManager` if mode-specific
6. Update tool descriptions in `getToolDescription()`

### Working with Workspace Context
```typescript
// Get current workspace context
const context = this.getCurrentContext();
const memoryManager = context?.memoryManager || new MemoryManager();

// Switch workspace contexts
await this.getOrCreateWorkspaceContext(workspacePath);
this.state.currentWorkspace = workspacePath;
```

### Adding New Chat Modes
1. Built-in modes: Add to `loadBuiltInModes()` in `ChatModeManager.ts`
2. Custom modes: Use `create_mode` tool or direct JSON files in storage
3. Include system prompt, tool list, and temperature settings
4. Generate documentation with `generateModePromptFile()`

### Memory System Extensions
1. New memory layers: Update `MemoryLayer` type in `src/memory/types.ts`
2. Search enhancements: Extend `MemorySearchOptions` interface
3. Storage backends: Implement in `BackupManager` and `MemoryManager`

## Common Development Tasks

### Running the MCP Server Locally
```bash
npm run build
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/server/index.js

# Test workspace management
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_workspaces","arguments":{}},"id":1}' | node dist/server/index.js
```

### Testing Global Installation
```bash
./scripts/install-global.sh
copilot-mcp-server --version
which copilot-mcp-server
```

### Testing New Memory Features
```bash
npm run test:unit -- --testPathPattern=memory
npm run test:integration -- --testPathPattern=memory

# Test workspace-aware memory
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | node dist/server/index.js --workspace=/path/to/test
```

### Debugging Chat Modes & GitHub Copilot Integration
- Check mode files in `~/.copilot-mcp/modes/` (internal JSON format)
- Check GitHub Copilot files in `.github/chatmodes/` (Copilot-compatible format)
- Check GitHub Copilot instructions in `.github/copilot-instructions.md`
- Check global config in `~/.copilot-mcp/config.json`
- Use `list_modes`, `list_workspaces`, and `get_memory_stats` tools
- Enable debug logging in `Logger` interface
- Monitor workspace switching with `switch_workspace` tool
- Test chat mode activation in GitHub Copilot Chat

### Performance Monitoring
- Memory operations should complete in <10ms
- Project initialization <15s for large projects
- Workspace switching <100ms
- Resource cleanup automatic every 24h (configurable)
- Use `npm run test:performance` for benchmarks

## File Structure Context

- `src/server/` - MCP server implementation and tool handlers
- `src/memory/` - Three-tier memory system with analytics
- `src/modes/` - Chat mode management and built-in modes
- `src/project/` - Project analysis with dual context generation (COPILOT.md + .github/copilot-instructions.md)
- `src/prompts/` - Self-healing prompt management (basic implementation)
- `src/types/` - TypeScript interfaces and type definitions
- `src/utils/` - Utilities for logging, storage, and file operations
- `tests/` - Comprehensive test suites across all layers
- `docs/` - Additional documentation (installation, API reference)
- `templates/` - VS Code configuration templates
- `scripts/` - Installation and development scripts