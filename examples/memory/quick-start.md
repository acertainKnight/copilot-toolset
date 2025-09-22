# Memory System Quick Start

Learn how to effectively use the three-tier memory system with practical examples.

## Memory Layer Overview

- **`preference`**: Global coding preferences (shared across all projects)
- **`system`**: Proven patterns and solutions (shared across all projects)
- **`project`**: Project-specific context and decisions (this project only)
- **`prompt`**: Session context and temporary notes (temporary)

## Basic Memory Operations

### Storing Information

#### Store Global Preferences
```bash
# In Copilot Chat:
Please remember that I prefer:
- TypeScript with strict mode enabled
- Functional programming patterns over OOP
- Jest for testing with React Testing Library
- ESLint with Prettier for code formatting
- Feature-based folder structure
```

#### Store System Patterns
```bash
# In Copilot Chat:
Remember this error solution: When getting "Cannot resolve module" errors in TypeScript, check:
1. Update @types/node version
2. Verify paths in tsconfig.json
3. Clear node_modules and reinstall
4. Check import extensions (.js vs .ts)
This pattern applies to all TypeScript projects.
```

#### Store Project Context
```bash
# In Copilot Chat:
For this project specifically, remember:
- We're building a React dashboard with Chart.js
- API endpoints are at /api/v1/
- User authentication uses JWT tokens
- Database is PostgreSQL with Prisma ORM
- Deploy to Vercel with environment variables
```

### Searching Memory

#### Basic Search
```bash
# In Copilot Chat:
What do you remember about my TypeScript preferences?
```

#### Context-Aware Search
```bash
# In Copilot Chat:
I'm getting a build error. What solutions do you remember for TypeScript build issues?
```

#### Layer-Specific Search
```bash
# In Copilot Chat:
What project-specific context do you have for this dashboard app?
```

## Command Line Examples

### Direct Memory Operations

```bash
# Store a preference
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "store_memory",
    "arguments": {
      "content": "Always use const for variables that don'\''t change, prefer arrow functions, use async/await over .then()",
      "layer": "preference",
      "tags": ["javascript", "coding-style", "async"]
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"

# Search memory
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_memory",
    "arguments": {
      "query": "javascript coding style"
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"

# Get memory statistics
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_memory_stats",
    "arguments": {}
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

## Real-World Usage Patterns

### 1. Onboarding New Team Member

Store team conventions:
```bash
# In Copilot Chat:
Remember our team coding standards:
- Use conventional commits (feat:, fix:, docs:)
- All components must have TypeScript interfaces
- Write unit tests for business logic functions
- Use descriptive variable names, avoid abbreviations
- Review checklist: security, performance, accessibility
```

### 2. Bug Fix Documentation

Store solutions for future reference:
```bash
# In Copilot Chat:
Remember this solution: For React useEffect infinite loop with object dependencies, use useCallback or useMemo to stabilize the reference:

```tsx
// Problem: effect runs infinitely
useEffect(() => {
  fetchData(config);
}, [config]); // config is recreated every render

// Solution: stabilize with useCallback
const stableConfig = useMemo(() => config, [config.apiKey, config.timeout]);
useEffect(() => {
  fetchData(stableConfig);
}, [stableConfig]);
```

This pattern applies to all React projects with object dependencies.
```

### 3. Project Architecture Decisions

Document architectural choices:
```bash
# In Copilot Chat:
For this e-commerce project, remember our architecture decisions:
- Next.js 13+ with app router
- Zustand for state management (chose over Redux for simplicity)
- Prisma with PostgreSQL (chose over MongoDB for ACID compliance)
- Stripe for payments with webhooks
- Tailwind CSS with shadcn/ui components
- Deploy on Vercel with edge functions
```

### 4. Performance Optimization Knowledge

Store optimization techniques:
```bash
# In Copilot Chat:
Remember these React performance patterns:
1. Use React.memo for components with stable props
2. Implement virtual scrolling for lists >100 items
3. Code-split routes with React.lazy()
4. Optimize images with Next.js Image component
5. Use useMemo for expensive calculations
6. Prefer CSS-in-JS over inline styles for performance
These apply across all React projects.
```

## Memory Organization Best Practices

### Effective Tagging

```bash
# Good: Specific, searchable tags
"tags": ["react", "performance", "hooks", "optimization"]

# Bad: Too generic or redundant
"tags": ["code", "programming", "stuff"]
```

### Layer Selection Guide

```bash
# preference: Personal coding style
"I prefer arrow functions over function declarations"

# system: Universal technical solutions
"To fix CORS errors, set Access-Control-Allow-Origin header"

# project: This project's specific context
"Our API uses GraphQL with Apollo Client"

# prompt: Temporary session notes
"Currently debugging the login component issue"
```

## Memory Maintenance

### Regular Cleanup

```bash
# In Copilot Chat every few weeks:
Can you optimize my memory system? I've been getting too many irrelevant search results.
```

### Memory Health Check

```bash
# Check memory statistics
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_memory_stats",
    "arguments": {}
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

## Advanced Usage

### Context-Aware Search

The memory system considers:
- Current file type and content
- Selected code in editor
- Active chat mode
- Project structure

```bash
# In Copilot Chat (while editing a React component):
How should I handle state management in this component?
# Will prioritize React state patterns from memory
```

### Integration with Chat Modes

Memory works seamlessly with custom chat modes:

```bash
# In "debugger" chat mode:
What debugging patterns do you remember for Node.js applications?
# Will search system layer for debugging solutions
```

## Verification and Testing

Test your memory setup:

```bash
# 1. Store test information
# In Copilot Chat:
Remember that I'm testing the memory system with a sample preference.

# 2. Search for it
# In Copilot Chat:
What do you remember about testing the memory system?

# 3. Check if it's stored correctly
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_memory",
    "arguments": {
      "query": "testing memory system"
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

## Next Steps

- Try [chat mode examples](../chat-modes/create-custom-mode.md)
- Set up [automated workflows](../workflows/memory-automation.md)
- Learn [troubleshooting](../troubleshooting/memory-issues.md)