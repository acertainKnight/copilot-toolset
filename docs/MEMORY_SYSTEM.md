# Memory System Architecture

## Three-Tier Memory System

The three-tier memory system automatically manages information:

```
┌─────────────────────────┐
│    Core Memory (2KB)    │  ← User preferences, active context
│    Always in context    │
└─────────────────────────┘
            ↕
┌─────────────────────────┐
│  Warm Storage (100MB)   │  ← Recent patterns, project data
│    LevelDB cache        │
└─────────────────────────┘
            ↕
┌─────────────────────────┐
│ Cold Storage (Unlimited)│  ← Full history, embeddings
│    SQLite database      │
└─────────────────────────┘
```

### Core Memory
- **Always-active user preferences and context**
- **Size limit**: 2KB maximum
- **Purpose**: Essential information that should always be in context
- **Storage**: In-memory Map for instant access

### Warm Storage
- **Recent patterns and project data**
- **Storage**: LevelDB for fast key-value access
- **Size limit**: 100MB per workspace
- **Auto-promotion**: Frequently accessed items promoted from cold storage

### Cold Storage
- **Long-term knowledge base**
- **Storage**: SQLite database with embeddings support
- **Size limit**: Unlimited (within system constraints)
- **Purpose**: Full history, patterns, and searchable knowledge

## Memory Workflows

### Memory Usage Examples

**Store Information**:
```
@copilot Remember: This project uses microservices architecture with Docker containers
@copilot Store for this project: Uses JWT authentication with refresh tokens
```

**Search Memory**:
```
@copilot What do you remember about microservices patterns I've used?
@copilot Search memories for authentication implementations
```

**Check Statistics**:
```
@copilot Show my memory stats
@copilot What patterns have you learned about my coding style?
```

## Self-Learning Capabilities

- **Automatic promotion/demotion** based on usage patterns
- **Pattern recognition** for common errors (85%+ success rate)
- **Adaptive storage** optimizes based on access frequency
- **Cross-project learning** applies patterns across workspaces

## Memory Management

### Workspace-Aware Memory
- **Global memory**: Shared preferences across all projects
- **Project memory**: Isolated per workspace
- **Automatic cleanup**: Configurable intervals (default: 24h)
- **Backup system**: Automatic periodic backups

### Memory Layers
- `preference` (global): User coding preferences and patterns
- `project` (workspace): Project-specific context and decisions
- `prompt` (workspace): Conversation history and learned patterns
- `system` (global): System-level optimizations and error patterns