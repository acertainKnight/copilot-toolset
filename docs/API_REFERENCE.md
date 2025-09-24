# API Reference

Technical reference for all MCP tools and capabilities. Start with [Quick Reference](#quick-reference), then explore detailed specifications.

## Quick Reference

**8 MCP Tools** for GitHub Copilot:

| Tool | Purpose | Quick Example |
|------|---------|---------------|
| `init_project` | Setup project | `@copilot Initialize this project` |
| `store_unified_memory` | Save information | `@copilot Remember: I prefer TypeScript` |
| `search_unified_memory` | Find information | `@copilot Search memories for React patterns` |
| `get_memory_stats` | View usage | `@copilot Show memory stats` |
| `create_mode` | New chat mode | `@copilot Create "security" mode` |
| `heal_chat_mode` | Fix modes | Auto-healing when modes fail |
| `heal_project_context` | Fix context | Auto-healing for outdated files |
| `optimize_memory` | Performance | Auto-optimization of memory system |

**Need implementation details?** See [Detailed Specifications](#detailed-specifications) below.

---

## Detailed Specifications

### Core Tools

#### init_project
**Purpose**: Initialize project with context files and memory system

**Parameters**: `projectPath: string`

**Usage**: `@copilot Initialize this project`

**Creates**:
- `COPILOT.md` - Root project context
- `.github/copilot-instructions.md` - GitHub Copilot format
- **Unified Memory Database**: Initializes project in `~/.copilot-mcp/memory/unified.db`

<details>
<summary>Full JSON Schema & Examples</summary>

**Schema**:
```typescript
{
  projectPath: string  // Path to the project directory
}
```

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "init_project",
    "arguments": {"projectPath": "/home/user/my-react-app"}
  },
  "id": 1
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "✅ Project initialized successfully!\n\nCreated files:\n- COPILOT.md (root project context)\n- .github/copilot-instructions.md (GitHub Copilot specific)\n- .copilot/memory/ (memory structure)\n\nProject type: React TypeScript\nDetected dependencies: react, typescript, vite"
    }]
  },
  "id": 1
}
```
</details>

### Memory Tools

#### store_unified_memory
**Purpose**: Store information in unified dual-tier memory database

**Parameters**:
- `content: string` - What to store (be specific)
- `tier: 'core' | 'longterm'` - Memory tier (core: 2KB limit, longterm: unlimited)
- `scope: 'global' | 'project'` - Memory scope (global: cross-project, project: isolated)
- `project_id?: string` - Required for project-scoped memories
- `tags?: string[]` - Optional categorization
- `metadata?: object` - Optional context

**Memory Architecture**:
- **Core Tier**: High-priority memories (2KB limit per item, always accessible)
- **Long-term Tier**: Comprehensive storage (unlimited size, detailed information)
- **Global Scope**: Shared across ALL projects (preferences, patterns, solutions)
- **Project Scope**: Isolated to specific projects (architecture, project context)

**Usage**: `@copilot Remember: I prefer functional programming patterns`

<details>
<summary>Full JSON Schema & Examples</summary>

**Schema**:
```typescript
{
  content: string,                              // Content to store - be specific and actionable
  tier: 'core' | 'longterm',                   // Memory tier selection
  scope: 'global' | 'project',                 // Memory scope selection
  project_id?: string,                          // Required for project-scoped memories
  tags?: string[],                              // Tags for categorization
  metadata?: Record<string, any>                // Additional context metadata
}
```

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "store_unified_memory",
    "arguments": {
      "content": "User prefers functional programming patterns with TypeScript strict mode enabled",
      "tier": "core",
      "scope": "global",
      "tags": ["typescript", "functional-programming", "preferences"]
    }
  },
  "id": 2
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "Memory stored successfully!\n\nID: preference_1698123456789_abc123\nLayer: preference\nStorage: Core Memory + Global SQLite - Available across ALL projects\nContent: User prefers functional programming patterns with TypeScript...\nTags: typescript, functional-programming, preferences"
    }]
  },
  "id": 2
}
```
</details>

#### search_unified_memory
**Purpose**: Advanced BM25 + semantic search across unified memory database

**Parameters**:
- `query: string` - Search query
- `tier?: 'core' | 'longterm'` - Filter by memory tier (optional)
- `scope?: 'global' | 'project'` - Filter by memory scope (optional)
- `project_id?: string` - Search within specific project (optional)
- `limit?: number` - Max results (default: 10)

**Usage**: `@copilot Search memories for TypeScript patterns`

<details>
<summary>Full JSON Schema & Examples</summary>

**Schema**:
```typescript
{
  query: string,                                // Search query - describe what you're looking for
  tier?: 'core' | 'longterm',                  // Filter by memory tier (optional)
  scope?: 'global' | 'project',                // Filter by memory scope (optional)
  project_id?: string,                          // Search within specific project (optional)
  limit?: number                                // Maximum results (default: 10)
}
```

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_unified_memory",
    "arguments": {
      "query": "typescript functional programming patterns",
      "limit": 5,
      "context": {"currentFile": "src/components/UserList.tsx"}
    }
  },
  "id": 3
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "Found 3 memories matching \"typescript functional programming patterns\":\n\n1. [PREFERENCE] (Relevance: 0.95)\n   User prefers functional programming patterns with TypeScript strict mode enabled\n   Tags: typescript, functional-programming, preferences\n   Storage: GLOBAL\n\n💡 TIP: Use these memories to inform your coding decisions and implementation approach."
    }]
  },
  "id": 3
}
```
</details>

#### get_memory_stats
**Purpose**: View memory system usage and health

**Parameters**: None required

**Usage**: `@copilot Show memory stats`

<details>
<summary>Full JSON Schema & Examples</summary>

**Schema**: `{} // No parameters required`

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {"name": "get_memory_stats", "arguments": {}},
  "id": 4
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "Memory System Statistics:\n\n📊 **Storage Overview:**\n- Total memories: 127\n- Storage size: 45 KB\n- Last cleanup: 2024-01-15T10:30:00.000Z\n\n💾 **Layer Distribution:**\n- preference: Your global coding preferences (shared across projects)\n- system: Proven patterns and solutions (shared across projects)\n- project: This project's context and decisions\n- prompt: Current session context and notes"
    }]
  },
  "id": 4
}
```
</details>

### Chat Mode Tools

#### create_mode
**Purpose**: Create custom GitHub Copilot chat modes

**Parameters**:
- `name: string` - Mode name
- `description: string` - Mode description
- `systemPrompt: string` - AI system prompt
- `tools?: string[]` - Available MCP tools
- `temperature?: number` - Creativity level (0.0-1.0)

**Usage**: `@copilot Create a "security" mode for security analysis`

**Creates**: `.github/chatmodes/{name}.chatmode.md` with YAML frontmatter

<details>
<summary>Full JSON Schema & Examples</summary>

**Schema**:
```typescript
{
  name: string,                                 // Name of the chat mode
  description: string,                          // Description of the chat mode
  systemPrompt: string,                         // System prompt for the chat mode
  tools?: string[],                             // MCP tools available to this mode
  temperature?: number                          // Temperature for the chat mode (0.0-1.0)
}
```

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_mode",
    "arguments": {
      "name": "security-expert",
      "description": "Security analysis and vulnerability assessment specialist",
      "systemPrompt": "You are a cybersecurity expert specializing in code security analysis...",
      "tools": ["search_memory", "store_memory"],
      "temperature": 0.6
    }
  },
  "id": 5
}
```

**Generated File** (`.github/chatmodes/security-expert.chatmode.md`):
```markdown
---
description: "Security analysis and vulnerability assessment specialist"
tools: ["search_memory", "store_memory"]
mcp: ["copilot-mcp"]
temperature: 0.6
---

# Security-expert Mode

You are a cybersecurity expert specializing in code security analysis...
```
</details>

### Self-Healing Tools

#### heal_chat_mode
**Purpose**: Fix malfunctioning chat modes automatically

**Parameters**:
- `modeName: string` - Mode to fix
- `issue: string` - Description of problem

**Usage**: Auto-invoked when modes fail, or manual troubleshooting

<details>
<summary>Full JSON Schema & Examples</summary>

**Schema**:
```typescript
{
  modeName: string,                           // Name of the chat mode to fix
  issue: string                                // Description of what is not working correctly
}
```

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "heal_chat_mode",
    "arguments": {
      "modeName": "debugger",
      "issue": "The debugger mode isn't catching TypeScript compilation errors properly"
    }
  },
  "id": 6
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "Successfully healed chat mode \"debugger\"!\n\nChanges made:\n- Enhanced system prompt for TypeScript error analysis\n- Added compilation error pattern recognition\n- Updated tool selection for better diagnostic capabilities"
    }]
  },
  "id": 6
}
```
</details>

#### heal_project_context
**Purpose**: Fix outdated or incomplete project context files

**Parameters**:
- `filePath: string` - Context file path (e.g., "COPILOT.md")
- `issue: string` - Description of context problem

**Usage**: Auto-healing when context becomes stale

#### optimize_memory
**Purpose**: Optimize memory system performance and organization

**Parameters**:
- `issue: string` - Description of memory system issues

**Usage**: Auto-optimization or manual performance tuning

<details>
<summary>Self-Healing Examples</summary>

**heal_project_context**:
```json
{
  "name": "heal_project_context",
  "arguments": {
    "filePath": "COPILOT.md",
    "issue": "Missing microservices architecture info"
  }
}
```

**optimize_memory**:
```json
{
  "name": "optimize_memory",
  "arguments": {
    "issue": "Memory searches returning too many irrelevant results"
  }
}
```
</details>

---

## Advanced Features

### Resources

#### memory://stats
**URI**: `memory://stats`
**MIME Type**: `application/json`
**Purpose**: Real-time memory system statistics

<details>
<summary>Resource Content Example</summary>

```json
{
  "cold_storage_count": 127,
  "storage_size_bytes": 46234,
  "last_cleanup": "2024-01-15T10:30:00.000Z",
  "storage_locations": {
    "cold": "/home/user/.copilot-mcp/memory/global.db",
    "project": "/home/user/project/.copilot/memory"
  },
  "layer_distribution": {
    "preference": 23,
    "project": 45,
    "prompt": 12,
    "system": 47
  }
}
```
</details>

### Prompts

#### memory_context
**Purpose**: Generate contextual memory-based prompts
**Parameters**: `task_type: string`

<details>
<summary>Prompt Usage Example</summary>

```json
{
  "jsonrpc": "2.0",
  "method": "prompts/get",
  "params": {
    "name": "memory_context",
    "arguments": {"task_type": "component-refactoring"}
  },
  "id": 9
}
```
</details>

---

## Error Handling

**Common MCP Error Codes**:
- **-32602** (InvalidArguments): Missing or invalid parameters
- **-32601** (ToolNotFound): Tool doesn't exist
- **-32603** (InternalError): Server-side error

<details>
<summary>Error Response Examples</summary>

**InvalidArguments (-32602)**:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": "project_path is required"
  },
  "id": 1
}
```

**ToolNotFound (-32601)**:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": "Tool 'unknown_tool' does not exist"
  },
  "id": 1
}
```

**InternalError (-32603)**:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "Memory system initialization failed"
  },
  "id": 1
}
```
</details>

---

## TypeScript Interfaces

<details>
<summary>Core Type Definitions</summary>

```typescript
// Memory system types
interface Memory {
  id?: string;
  content: string;
  layer: MemoryLayer;
  tags: string[];
  created_at?: Date;
  accessed_at?: Date;
  access_count: number;
  metadata?: Record<string, any>;
}

type MemoryLayer = 'preference' | 'project' | 'prompt' | 'system';

interface MemorySearchOptions {
  layer?: MemoryLayer;
  tags?: string[];
  limit?: number;
  includeMetadata?: boolean;
}

interface MemorySearchResult {
  memory: Memory;
  similarity_score?: number;
  match_type: 'exact' | 'partial' | 'semantic';
  context: string;
}

// Chat mode types
interface ChatModeRequest {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: string[];
  temperature?: number;
}
```
</details>

---

## Integration Examples

### Standard Command Patterns
```
# Project Setup
@copilot Initialize this project
@copilot Initialize this React project

# Memory Management
@copilot Remember: I prefer functional programming patterns
@copilot Search memories for React state management patterns
@copilot Show my memory stats

# Chat Mode Management
@copilot Create a "security" mode for security analysis
@copilot Switch to debugger mode
@copilot List all available modes
```

### VS Code Configuration
```json
// .vscode/mcp.json
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

---

## Performance Specifications

| Operation | Target Performance |
|-----------|-------------------|
| Memory Operations | < 10ms average |
| Project Initialization | < 15s (large projects) |
| Search Operations | < 200ms (complex queries) |
| Concurrent Projects | Up to 10 workspaces |
| Memory Capacity | Unlimited cold storage, 2KB core per layer |

---

## Additional Resources

**Usage & Implementation**:
- [User Guide](USER_GUIDE.md) - Comprehensive usage patterns and workflows
- [Memory System](MEMORY_SYSTEM.md) - Three-tier memory architecture deep dive
- [Chat Modes](CHAT_MODES.md) - Creating and using custom assistants

**Setup & Development**:
- [Installation Guide](INSTALLATION.md) - Complete setup and configuration
- [Developer Guide](DEVELOPER_GUIDE.md) - Architecture and extending the system
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

**Working Examples**:
- [Examples Directory](../examples/) - Tested, working examples for all features