# Basic Memory Operations

**Goal**: Learn the unified dual-tier memory system with practical examples in 5 minutes.

## Prerequisites

- MCP server built and tested ([first-project.md](first-project.md))
- Project initialized with unified memory database

## Understanding Unified Memory Architecture

The system uses a single SQLite database with dual-tier, bifurcated architecture:

- **Core Tier**: High-priority memories (2KB limit per item, always accessible)
- **Long-term Tier**: Comprehensive storage (unlimited size, detailed information)
- **Global Scope**: Shared across ALL projects (preferences, patterns, solutions)
- **Project Scope**: Isolated to specific projects (architecture, project context)

## Step 1: Store Information in Different Tiers and Scopes (2 minutes)

```bash
# Store user preference (global scope, core tier)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_unified_memory","arguments":{"content":"I prefer TypeScript with strict typing and detailed comments","tier":"core","scope":"global","tags":["coding-style","typescript"]}},"id":1}' | node dist/server/index.js

# Store project context (project scope, core tier)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_unified_memory","arguments":{"content":"Using React with TypeScript, Redux for state management, and Jest for testing","tier":"core","scope":"project","project_id":"/path/to/your/project","tags":["architecture","react"]}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project

# Store detailed system pattern (global scope, longterm tier)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_unified_memory","arguments":{"content":"React Testing Best Practices: Always test components with @testing-library/react, mock external dependencies, test user interactions not implementation details, use data-testid sparingly","tier":"longterm","scope":"global","tags":["react","testing","best-practices"]}},"id":1}' | node dist/server/index.js
```

## Step 2: Search Across Memory Tiers and Scopes (2 minutes)

```bash
# Search for coding preferences (global scope)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_unified_memory","arguments":{"query":"TypeScript coding style","scope":"global"}},"id":1}' | node dist/server/index.js

# Search project-specific information (project scope)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_unified_memory","arguments":{"query":"React architecture","scope":"project","project_id":"/path/to/your/project"}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project

# Search across all tiers and scopes with BM25 + semantic search
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_unified_memory","arguments":{"query":"testing patterns","limit":10}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project

# Search only core tier (high-priority memories)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_unified_memory","arguments":{"query":"preferences","tier":"core"}},"id":1}' | node dist/server/index.js
```

## Step 3: Check Memory Statistics (1 minute)

```bash
# Get memory usage stats
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project
```

**Expected Output**:
```json
{
  "coreMemoryUsage": "1.2KB / 2KB",
  "warmStorageEntries": 3,
  "coldStorageEntries": 1,
  "workspaces": ["/path/to/your/project"],
  "totalMemoryLayers": 4
}
```

## Memory Layer Usage Patterns

### Core Memory (preference layer)
- User coding preferences
- Active context that's always loaded
- Automatically purged when size limit reached

```bash
# Example: Store your preferred framework
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"preferred-framework","value":"React with TypeScript","layer":"preference"}},"id":1}' | node dist/server/index.js
```

### Project Memory (project layer)
- Project-specific architecture decisions
- Current feature work and context
- Automatically isolated per workspace

```bash
# Example: Store current feature context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"current-feature","value":"Implementing user authentication with OAuth2 and JWT tokens","layer":"project"}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project
```

### System Memory (system layer)
- Reusable patterns and best practices
- Cross-project knowledge
- Shared across all workspaces

```bash
# Example: Store a useful pattern
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"error-handling-pattern","value":"Use try-catch with specific error types, log errors with context, return user-friendly messages","layer":"system"}},"id":1}' | node dist/server/index.js
```

## Real-World Usage Examples

### Storing Code Review Feedback
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"code-review-2024-09","value":"Focus on reducing cyclomatic complexity, add more unit tests for edge cases, use consistent naming conventions","layer":"project"}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project
```

### Storing API Documentation
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"user-api-endpoints","value":"POST /api/users - create user, GET /api/users/:id - get user, PUT /api/users/:id - update user, DELETE /api/users/:id - delete user","layer":"project"}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project
```

### Finding Related Information
```bash
# Search for authentication-related info
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"authentication OAuth JWT"}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project
```

## Success Indicators

✅ **Memory stored** in appropriate layers
✅ **Search returns** relevant results with scores
✅ **Stats show** correct memory usage
✅ **Workspace isolation** working (project layer scoped)

## What's Next

1. **Advanced memory patterns**: [../memory/real-world-examples.md](../memory/real-world-examples.md)
2. **Create a custom chat mode**: [simple-chat-mode.md](simple-chat-mode.md)
3. **Set up VS Code integration**: [../integration/vscode-setup.md](../integration/vscode-setup.md)

## Memory Best Practices

- **Use specific keys**: Avoid generic keys like "config" or "data"
- **Layer appropriately**: Preferences global, project context local, patterns system
- **Search with context**: Include relevant terms in your search queries
- **Regular cleanup**: Use memory stats to monitor usage
- **Workspace awareness**: Always specify workspace for project-specific operations