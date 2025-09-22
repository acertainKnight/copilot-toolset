# Three-Tier Memory System Usage Patterns

**Goal**: Master the three-tier memory architecture with advanced usage patterns and optimization strategies.

## Prerequisites

- Basic memory operations completed ([quick-start.md](quick-start.md))
- Understanding of memory layers and workspace isolation

## Three-Tier Architecture Deep Dive

### Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Core Memory   │    │   Warm Storage   │    │  Cold Storage   │
│     (Map)       │    │    (LevelDB)     │    │   (SQLite)      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Always loaded │    │ • Recent patterns│    │ • Long-term KB  │
│ • 2KB limit     │    │ • Project data   │    │ • Searchable    │
│ • User prefs    │    │ • Fast access    │    │ • Embeddings    │
│ • Active context│    │ • Cache layer    │    │ • Cross-project │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Memory Layer Usage Strategies

### Core Memory (preference layer) - Always Active
**Purpose**: User preferences, active context, immediate access patterns
**Size Limit**: 2KB (automatically managed)
**Scope**: Global across all workspaces

#### Optimal Usage Patterns

```bash
# Store global coding preferences
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"code-style","value":"TypeScript strict mode, detailed JSDoc comments, prefer functional components, use descriptive variable names","layer":"preference"}},"id":1}' | node dist/server/index.js

# Store active development context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"current-focus","value":"Working on user authentication system with OAuth2 integration","layer":"preference"}},"id":1}' | node dist/server/index.js

# Store frequently accessed commands
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"common-commands","value":"npm test -- --watch, npm run build:dev, docker-compose up -d, kubectl get pods","layer":"preference"}},"id":1}' | node dist/server/index.js
```

#### Core Memory Best Practices
- **Keep it concise**: Store only essential, frequently accessed information
- **Update regularly**: Replace outdated context with current focus
- **Use for patterns**: Store recurring preferences and patterns

### Warm Storage (project layer) - Workspace-Specific
**Purpose**: Project-specific context, recent decisions, architecture notes
**Storage**: LevelDB for fast key-value access
**Scope**: Isolated per workspace

#### Advanced Project Context Patterns

```bash
# Architecture decisions with reasoning
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"architecture-decision-auth","value":"Decided on JWT tokens with refresh mechanism. Reasoning: stateless, scalable, secure. Implementation: httpOnly cookies for refresh, memory for access tokens. Libraries: jose for JWT, bcrypt for hashing.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# API design patterns for this project
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"api-conventions","value":"REST endpoints follow /api/v1/{resource} pattern. Use POST for creation, PUT for full updates, PATCH for partial. Always return consistent error format: {error: string, code: number, details?: object}","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Database schema decisions
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"db-schema-users","value":"Users table: id (UUID), email (unique), username (unique), password_hash, created_at, updated_at, is_active. Indexes on email and username. Foreign keys: user_profiles(user_id), user_sessions(user_id)","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Testing strategies for this project
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"testing-strategy","value":"Unit tests with Jest, integration tests with supertest, e2e with Playwright. Mock external APIs, use test database, seed data with fixtures. Coverage target: 80% lines, 90% functions.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

#### Project Context Retrieval Patterns

```bash
# Search for architecture decisions
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"architecture decision authentication JWT","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Find API patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"API design REST endpoints conventions","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Search across all project context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"database schema users table","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

### Cold Storage (system layer) - Long-term Knowledge
**Purpose**: Reusable patterns, cross-project knowledge, technical documentation
**Storage**: SQLite with embeddings for semantic search
**Scope**: Global, shared across all projects

#### Knowledge Base Patterns

```bash
# Store reusable debugging patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-performance-debugging","value":"React performance issues checklist: 1) Use React DevTools Profiler, 2) Check for unnecessary re-renders with why-did-you-render, 3) Verify memo() usage on expensive components, 4) Check useCallback/useMemo dependencies, 5) Look for inline object/function creation in JSX, 6) Profile bundle size with webpack-bundle-analyzer","layer":"system"}},"id":1}' | node dist/server/index.js

# Store security patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"api-security-checklist","value":"API security essentials: 1) Input validation with Joi/Zod, 2) Rate limiting with express-rate-limit, 3) CORS configuration, 4) Helmet for security headers, 5) JWT token validation, 6) SQL injection prevention with parameterized queries, 7) Authentication on all protected routes, 8) HTTPS in production","layer":"system"}},"id":1}' | node dist/server/index.js

# Store testing patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"nodejs-testing-patterns","value":"Node.js testing best practices: 1) Use supertest for API testing, 2) Mock external dependencies with jest.mock(), 3) Use beforeEach/afterEach for setup/cleanup, 4) Test error cases and edge cases, 5) Use factories for test data, 6) Separate unit/integration/e2e tests, 7) Use test databases, 8) Clear state between tests","layer":"system"}},"id":1}' | node dist/server/index.js

# Store optimization patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"database-optimization-patterns","value":"Database optimization strategies: 1) Index frequently queried columns, 2) Use EXPLAIN ANALYZE for query planning, 3) Implement connection pooling, 4) Cache expensive queries with Redis, 5) Paginate large result sets, 6) Use database views for complex joins, 7) Monitor slow query logs, 8) Normalize schema appropriately","layer":"system"}},"id":1}' | node dist/server/index.js
```

## Advanced Memory Usage Patterns

### 1. Context-Aware Development Sessions

Start a development session by loading relevant context:

```bash
# Load authentication-related context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"authentication JWT OAuth security patterns"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store current session focus
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"current-session","value":"Implementing user registration flow with email verification, password validation, and rate limiting","layer":"preference"}},"id":1}' | node dist/server/index.js
```

### 2. Progressive Knowledge Building

Build knowledge incrementally as you work:

```bash
# Store initial implementation
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"auth-implementation-v1","value":"Initial auth implementation: basic JWT with express-jwt middleware, no refresh tokens, storing user in req.user","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Update with improvements
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"auth-implementation-v2","value":"Enhanced auth implementation: JWT access tokens (15min) + refresh tokens (7d) in httpOnly cookies, middleware validates both, automatic token refresh endpoint","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

### 3. Cross-Project Pattern Recognition

Store patterns that work across multiple projects:

```bash
# API error handling pattern
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"express-error-handling","value":"Express error handling middleware pattern: Create custom error class extending Error, use async wrapper for routes, centralized error handler logs and formats responses, different formats for dev/prod environments","layer":"system"}},"id":1}' | node dist/server/index.js

# React component patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-component-architecture","value":"Scalable React component architecture: 1) Container/Presentational pattern, 2) Custom hooks for logic, 3) TypeScript interfaces for props, 4) Styled-components for styling, 5) React.memo for performance, 6) Error boundaries for resilience","layer":"system"}},"id":1}' | node dist/server/index.js
```

### 4. Decision Documentation with Context

Document decisions with full context for future reference:

```bash
# Technology choice with reasoning
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"database-choice-postgres","value":"Chose PostgreSQL over MongoDB for this project. Reasoning: 1) Complex relational data (users, orders, products), 2) ACID compliance needed, 3) Strong consistency requirements, 4) Team expertise with SQL, 5) Rich ecosystem (PostGIS for location data). Trade-offs: More setup complexity, less flexible schema.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Memory Optimization Strategies

### 1. Regular Memory Health Checks

```bash
# Check memory statistics
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

Expected output:
```json
{
  "coreMemoryUsage": "1.8KB / 2KB",
  "warmStorageEntries": 15,
  "coldStorageEntries": 42,
  "workspaces": ["/path/to/project1", "/path/to/project2"],
  "totalMemoryLayers": 4,
  "lastOptimized": "2024-09-21T10:30:00Z"
}
```

### 2. Memory Layer Migration Strategies

As your project evolves, migrate memory between layers:

```bash
# Move successful project patterns to system knowledge
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"successful-auth-pattern","value":"Project auth pattern worked well: JWT + refresh tokens + httpOnly cookies + automatic refresh. Secure, user-friendly, stateless. Recommend for future projects.","layer":"system"}},"id":1}' | node dist/server/index.js

# Update core memory with new focus
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"current-focus","value":"Moving to payment integration phase - Stripe API, webhook handling, subscription management","layer":"preference"}},"id":1}' | node dist/server/index.js
```

### 3. Memory Search Optimization

Use specific, contextual search terms:

```bash
# Specific technical searches
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"React useState optimization useMemo performance"}},"id":1}' | node dist/server/index.js

# Problem-specific searches
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"database slow query optimization indexes"}},"id":1}' | node dist/server/index.js

# Architecture-specific searches
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"microservices communication patterns API gateway"}},"id":1}' | node dist/server/index.js
```

## Integration with Chat Modes

Memory integrates seamlessly with custom chat modes:

### Architecture Review Mode
```bash
# Create mode that leverages stored architecture decisions
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"architect-reviewer","description":"Architecture review specialist with project context","systemPrompt":"You are an architecture reviewer with access to project decisions and patterns. Review code and designs against established patterns and decisions. Reference stored architecture decisions and suggest improvements.","tools":["search_memory","store_memory"],"temperature":0.1}},"id":1}' | node dist/server/index.js
```

Usage in GitHub Copilot:
```
@architect-reviewer

Review this new user service implementation against our established patterns:

[code here]

Does it follow our authentication architecture decisions and API conventions?
```

The mode will search memory for relevant architecture decisions and provide contextual feedback.

## Real-World Memory Scenarios

### Scenario 1: Debugging Session
```bash
# Store the problem
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"bug-memory-leak","value":"Memory leak in React app: components not unmounting properly, event listeners not cleaned up, useEffect missing cleanup functions","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store the solution
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"bug-memory-leak-solution","value":"Fixed memory leak: added cleanup functions to useEffect, removed event listeners in cleanup, used AbortController for fetch cleanup, added React StrictMode for debugging","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store the prevention pattern
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-cleanup-pattern","value":"React cleanup checklist: 1) Return cleanup function from useEffect, 2) Remove event listeners, 3) Cancel ongoing requests, 4) Clear timers/intervals, 5) Use AbortController for fetch, 6) Test with React StrictMode","layer":"system"}},"id":1}' | node dist/server/index.js
```

### Scenario 2: Performance Optimization
```bash
# Document performance issue
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"perf-issue-api-slow","value":"API response time degraded from 200ms to 2s. Issues: N+1 query problem in user/orders endpoint, missing database indexes, no query optimization","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store optimization results
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"perf-optimization-results","value":"API optimization results: Added indexes on foreign keys (50% improvement), implemented query batching (30% improvement), added Redis caching (20% improvement). Final response time: 180ms average.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

### Scenario 3: Knowledge Transfer
```bash
# Store team knowledge
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"deployment-process","value":"Production deployment checklist: 1) Run full test suite, 2) Build Docker image, 3) Push to staging, 4) Run smoke tests, 5) Database migrations, 6) Deploy to production, 7) Health checks, 8) Monitor logs for 30min","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store tribal knowledge
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"prod-gotchas","value":"Production gotchas: 1) Redis connection pool size matters under load, 2) Database connection timeout should be < load balancer timeout, 3) File uploads need cleanup cron job, 4) Log rotation needed for disk space, 5) Monitor memory usage - Node.js doesn\'t auto-GC large objects","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Success Indicators

✅ **Memory layers** used appropriately for different types of information
✅ **Cross-layer search** finds relevant information quickly
✅ **Project context** builds over time with decisions and patterns
✅ **System knowledge** accumulates reusable patterns
✅ **Chat modes** leverage stored memory for contextual responses
✅ **Memory optimization** maintains performance as knowledge grows

## Best Practices Summary

### Core Memory (preference)
- ✅ User preferences and coding style
- ✅ Current active context and focus
- ✅ Frequently accessed commands and shortcuts
- ❌ Project-specific implementation details
- ❌ Long-term documentation

### Warm Storage (project)
- ✅ Architecture decisions with reasoning
- ✅ API conventions and patterns
- ✅ Database schema and relationships
- ✅ Testing strategies and patterns
- ❌ User preferences
- ❌ Cross-project knowledge

### Cold Storage (system)
- ✅ Reusable patterns and best practices
- ✅ Debugging checklists and procedures
- ✅ Security and performance guidelines
- ✅ Technology comparisons and trade-offs
- ❌ Project-specific context
- ❌ Temporary session information

## What's Next

1. **Advanced workflow integration**: [../advanced/memory-workflows.md](../advanced/memory-workflows.md)
2. **Memory analytics and insights**: [../advanced/memory-analytics.md](../advanced/memory-analytics.md)
3. **Team collaboration patterns**: [../advanced/team-memory.md](../advanced/team-memory.md)
4. **Memory backup and recovery**: [../troubleshooting/memory-recovery.md](../troubleshooting/memory-recovery.md)