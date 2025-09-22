# Basic Memory Operations

**Goal**: Learn the three-tier memory system with practical examples in 5 minutes.

## Prerequisites

- MCP server built and tested ([first-project.md](first-project.md))
- Project initialized with `.copilot/memory/` directory

## Understanding Memory Layers

The system uses three memory tiers:

- **Core Memory** (Map): Always active, 2KB limit - user preferences, active context
- **Warm Storage** (LevelDB): Recent patterns, project data - cached for fast access
- **Cold Storage** (SQLite): Long-term knowledge - searchable database with embeddings

## Step 1: Store Information in Different Layers (2 minutes)

```bash
# Store user preference (global, core memory)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"coding-style","value":"I prefer TypeScript with strict typing and detailed comments","layer":"preference"}},"id":1}' | node dist/server/index.js

# Store project context (workspace-specific)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"architecture","value":"Using React with TypeScript, Redux for state management, and Jest for testing","layer":"project"}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project

# Store system pattern (global knowledge)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-testing-pattern","value":"Always test components with @testing-library/react, mock external dependencies, test user interactions","layer":"system"}},"id":1}' | node dist/server/index.js
```

## Step 2: Search Across Memory Layers (2 minutes)

```bash
# Search for coding preferences
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"TypeScript coding style","layer":"preference"}},"id":1}' | node dist/server/index.js

# Search project-specific information
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"React architecture","layer":"project"}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project

# Search across all layers
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"testing patterns"}},"id":1}' | node dist/server/index.js --workspace=/path/to/your/project
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