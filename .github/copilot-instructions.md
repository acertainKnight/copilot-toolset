# GitHub Copilot Instructions

## Project Overview
- **Name**: copilot-mcp
- **Type**: Node.js
- **Language**: JavaScript/TypeScript
- **Framework**: Node.js

## 🚨 CRITICAL: Memory-First Development Workflow

**ALWAYS search memory BEFORE any coding action or implementation planning!**

### Pre-Action Memory Protocol

**Before writing code, implementing features, or making architectural decisions:**

1. **SEARCH FIRST**: `search_memory` to find relevant patterns, preferences, and previous decisions
2. **ANALYZE**: Review found memories to understand context and constraints  
3. **IMPLEMENT**: Code with memory-informed approach
4. **STORE**: Save new patterns, decisions, and learnings for future use

### Required Memory Searches Before:

**🔍 Before implementing ANY feature:**
```
search_memory "similar feature implementation"
search_memory "architecture patterns this project" 
search_memory "user preferences coding style"
```

**🔍 Before making design decisions:**
```
search_memory "design patterns used"
search_memory "technology choices rationale"
search_memory "previous architectural decisions"
```

**🔍 Before debugging or troubleshooting:**
```
search_memory "similar error patterns"
search_memory "debugging approaches that worked"
search_memory "known issues this project"
```

## Memory System Usage for GitHub Copilot

### Memory Layers (SQLite-based storage)

**Global Memories (shared across ALL projects):**
- `preference`: User coding preferences, styles, and patterns
- `system`: Proven solutions, error patterns, debugging strategies

**Project Memories (isolated to THIS project):**
- `project`: Project-specific context, architecture, and decisions  
- `prompt`: Session context, temporary notes, work-in-progress ideas

### Store User Preferences (Global - layer="preference")
```
@copilot Use store_memory tool with layer="preference" for:
- Coding style preferences (functional vs OOP)
- Preferred libraries and frameworks (e.g., "always use loguru for Python logging")
- Testing approaches and methodologies
- Documentation and comment styles
- Error handling patterns
```

### Store Project Context (Project-Specific - layer="project")
```
@copilot Use store_memory tool with layer="project" for:
- Architecture decisions for THIS project
- API patterns and conventions
- Database schema decisions
- Project-specific patterns and conventions
- Technology stack choices and rationale
- Performance requirements and constraints
```

### Store Session Context (Temporary - layer="prompt")
```
@copilot Use store_memory tool with layer="prompt" for:
- Current conversation context
- Temporary notes and ideas  
- Work-in-progress decisions
- Session-specific insights
```

### Store System Patterns (Global - layer="system")
```
@copilot Use store_memory tool with layer="system" for:
- Error patterns and proven solutions
- Debugging strategies that work
- Performance optimization techniques
- Security best practices
- Code refactoring patterns
```

## Automatic Context Recognition

When you detect these patterns, store them automatically:

**User Preferences (store globally):**
- "I prefer functional programming" → layer="preference"
- "Always use TypeScript strict mode" → layer="preference"
- "Use Jest for testing" → layer="preference"

**Project Decisions (store for this project):**
- "This API uses JWT authentication" → layer="project"
- "Database schema follows DDD patterns" → layer="project"
- "Components use styled-components" → layer="project"

**Error Solutions (store globally):**
- "Fixed React hydration error by..." → layer="system"
- "Database connection pool issues solved by..." → layer="system"

## Project Context


**Project Structure**: 3 key directories analyzed
**Dependencies**: 22 packages
**Architecture**: 0 patterns detected
**Commands**: 22 npm scripts available


## Architecture Patterns



## Coding Conventions

- **formatting**: Uses .eslintrc.cjs for code formatting
- **formatting**: Uses .prettierrc for code formatting
- **formatting**: Uses tsconfig.json for code formatting
- **formatting**: Uses .editorconfig for code formatting

## Available Commands

- `npm run build`: Build the project for production
- `npm run dev`: Start development server
- `npm run start`: Start the application
- `npm run test`: Run test suite
- `npm run test:unit`: Run: jest --config jest.unit.config.js
- `npm run test:unit:watch`: Run: jest --config jest.unit.config.js --watch
- `npm run test:integration`: Run: jest --config jest.integration.config.js
- `npm run test:e2e`: Run: jest --config jest.e2e.config.js
- `npm run test:performance`: Run: jest --config jest.performance.config.js
- `npm run test:all`: Run: npm run test:unit && npm run test:integration && npm run test:e2e
- `npm run test:coverage`: Run: npm run test:unit -- --coverage && npm run test:integration -- --coverage
- `npm run test:ci`: Run: npm run test:all && npm run test:performance
- `npm run test:full`: Run: node scripts/run-all-tests.js
- `npm run test:mcp`: Run: echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/server/index.js
- `npm run test:mcp:tools`: Run: echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | node dist/server/index.js
- `npm run validate:config`: Run: node validate-config.js
- `npm run clean`: Run: rimraf dist coverage .nyc_output test-reports performance-reports
- `npm run clean:test`: Run: rimraf coverage tests/fixtures/temp test-reports performance-reports
- `npm run prepare`: Run: npm run build
- `npm run lint`: Check code quality
- `npm run lint:fix`: Run: eslint src/**/*.ts --fix
- `npm run pretest`: Run: npm run build

## Dependencies

**Production**: @modelcontextprotocol/sdk, better-sqlite3, level, glob, zod, simple-git, yaml, markdown-it, commander
**Development**: @types/node, @types/better-sqlite3, @types/glob, @types/markdown-it, @types/jest, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, eslint, jest, ts-jest, typescript, rimraf, shx

---
*Generated by Copilot MCP Toolset with memory guidance*