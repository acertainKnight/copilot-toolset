# Creating Custom Chat Modes

Learn how to create custom GitHub Copilot chat modes that enhance your development workflow.

## Understanding Chat Modes

Chat modes are specialized configurations for GitHub Copilot that:
- Provide focused system prompts for specific tasks
- Have access to specific MCP tools
- Create `.chatmode.md` files for GitHub Copilot integration
- Can be activated in Copilot Chat with `@modename`

## Basic Chat Mode Creation

### Example 1: API Developer Mode

```bash
# In Copilot Chat:
Create a custom chat mode called "api-developer" with this configuration:
- Description: "Specialized assistant for REST API development with Node.js and Express"
- Focus on API design, error handling, authentication, and testing
- Include tools for memory storage and search
- Use a helpful but technical tone
```

This creates a `.github/chatmodes/api-developer.chatmode.md` file that GitHub Copilot can use.

### Example 2: Database Designer Mode

```bash
# In Copilot Chat:
Create a chat mode named "db-designer" for database design and optimization:
- Specialized in PostgreSQL, MongoDB, and database schema design
- Focuses on performance, indexing, and query optimization
- Includes memory tools for storing schema decisions
- Uses structured, analytical responses
```

## Advanced Chat Mode Examples

### Frontend Specialist Mode

```bash
# Command line creation:
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_mode",
    "arguments": {
      "name": "frontend-specialist",
      "description": "Expert assistant for modern frontend development",
      "systemPrompt": "You are a frontend development specialist focusing on React, Next.js, TypeScript, and modern web technologies. Provide detailed, actionable advice with code examples. Always consider performance, accessibility, and user experience. When suggesting solutions, explain the reasoning and any trade-offs.",
      "tools": ["store_memory", "search_memory", "get_memory_stats"],
      "temperature": 0.3
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

### DevOps Automation Mode

```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_mode",
    "arguments": {
      "name": "devops-automation",
      "description": "Specialized assistant for DevOps, CI/CD, and infrastructure automation",
      "systemPrompt": "You are a DevOps specialist focused on automation, containerization, cloud infrastructure, and CI/CD pipelines. Provide practical solutions for Docker, Kubernetes, GitHub Actions, AWS, and monitoring. Always consider security, scalability, and cost optimization. Include infrastructure-as-code examples when relevant.",
      "tools": ["store_memory", "search_memory", "init_project", "get_memory_stats"],
      "temperature": 0.2
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

### Security Auditor Mode

```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "security-auditor",
    "arguments": {
      "name": "security-auditor",
      "description": "Security-focused assistant for code review and vulnerability assessment",
      "systemPrompt": "You are a security auditor specializing in web application security, code analysis, and vulnerability assessment. Focus on OWASP Top 10, authentication, authorization, input validation, and secure coding practices. Provide specific remediation steps and explain security implications. Always consider both frontend and backend security concerns.",
      "tools": ["store_memory", "search_memory", "get_memory_stats"],
      "temperature": 0.1
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

## Project-Specific Chat Modes

### E-commerce Mode for Online Store Project

```bash
# In Copilot Chat:
Create a project-specific chat mode called "ecommerce-expert" for this online store project:
- Specializes in e-commerce functionality: shopping carts, payments, inventory
- Knows about Stripe integration, order management, and user authentication
- Familiar with our tech stack: Next.js, PostgreSQL, Prisma
- Includes memory tools to remember our specific business rules and API patterns
```

### Game Development Mode

```bash
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_mode",
    "arguments": {
      "name": "game-dev",
      "description": "Specialized assistant for game development with Unity and C#",
      "systemPrompt": "You are a game development expert specializing in Unity, C#, game mechanics, and performance optimization for games. Focus on gameplay systems, physics, rendering, audio, and user interface design. Consider platform-specific requirements (mobile, PC, console) and provide examples with Unity-specific code patterns. Always think about performance, memory management, and user experience in games.",
      "tools": ["store_memory", "search_memory", "get_memory_stats"],
      "temperature": 0.4
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

## Built-in Mode Examples

The server comes with several built-in modes you can reference:

### General Mode
- All-purpose development assistant
- Access to all MCP tools
- Balanced approach to problem-solving

### Architect Mode
- System design and architecture focus
- High-level planning and technical decisions
- Emphasis on scalability and maintainability

### Debugger Mode
- Specialized in troubleshooting and debugging
- Error analysis and root cause investigation
- Performance profiling and optimization

### Refactorer Mode
- Code improvement and refactoring
- Design pattern implementation
- Code quality and maintainability focus

### Tester Mode
- Testing strategy and implementation
- Unit, integration, and e2e testing
- Test automation and coverage

## Chat Mode Best Practices

### 1. Specific System Prompts

```bash
# Good: Specific and actionable
"You are a React performance specialist. Focus on optimization techniques like memoization, lazy loading, code splitting, and bundle analysis. Always provide measurable performance improvements."

# Bad: Too generic
"You are helpful with React."
```

### 2. Appropriate Tool Selection

```bash
# For learning/documentation modes:
"tools": ["store_memory", "search_memory"]

# For project setup modes:
"tools": ["init_project", "store_memory", "search_memory"]

# For maintenance modes:
"tools": ["store_memory", "search_memory", "get_memory_stats", "optimize_memory"]
```

### 3. Temperature Settings

```bash
# Creative tasks (architecture, brainstorming): 0.6-0.8
"temperature": 0.7

# Technical tasks (debugging, security): 0.1-0.3
"temperature": 0.2

# Balanced tasks (general development): 0.3-0.5
"temperature": 0.4
```

## Using Custom Chat Modes

### Activation in GitHub Copilot

```bash
# Once created, use in Copilot Chat:
@frontend-specialist How should I optimize this React component for performance?

@security-auditor Please review this authentication code for vulnerabilities.

@devops-automation Help me set up a CI/CD pipeline for this Node.js API.
```

### Mode-Specific Workflows

#### With Frontend Specialist Mode:
```bash
@frontend-specialist
I need to create a reusable data table component with sorting, filtering, and pagination. What's the best approach using React and TypeScript?

# The mode will provide React-specific advice with TypeScript examples
```

#### With Security Auditor Mode:
```bash
@security-auditor
Review this login endpoint for security issues:

[paste your code]

# The mode focuses on security concerns like input validation, authentication, etc.
```

## Managing Chat Modes

### List Available Modes

```bash
# Command line:
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_modes",
    "arguments": {}
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```

### Update Existing Mode

```bash
# In Copilot Chat:
Update the "api-developer" chat mode to also focus on GraphQL APIs and include real-time features with WebSockets.
```

### Mode Healing

If a mode isn't working correctly:

```bash
# In Copilot Chat:
The "frontend-specialist" mode isn't giving good advice about React hooks. Can you fix it?

# This uses the heal_chat_mode tool automatically
```

## Verification and Testing

### Test Mode Creation

```bash
# 1. Create a test mode
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_mode",
    "arguments": {
      "name": "test-mode",
      "description": "Test mode for verification",
      "systemPrompt": "You are a test assistant. Always respond with confirmation that the mode is working correctly.",
      "tools": ["get_memory_stats"]
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"

# 2. Check if file was created
ls -la .github/chatmodes/test-mode.chatmode.md

# 3. Test in Copilot Chat
@test-mode Are you working correctly?
```

## Advanced Features

### Context-Aware Modes

Modes automatically consider:
- Current file type and content
- Project structure and dependencies
- Previously stored memories
- Active workspace context

### Memory Integration

Chat modes seamlessly use the memory system:

```bash
# Store mode-specific information:
@frontend-specialist Remember that our team prefers styled-components over CSS modules for React styling.

# Later, the mode will use this memory:
@frontend-specialist How should I style this new component?
# Will suggest styled-components based on stored preference
```

### Tool Integration

Modes can use MCP tools contextually:

```bash
@devops-automation Set up monitoring for this Node.js application.
# Mode will use init_project to understand the project structure
# Then provide specific monitoring setup for the detected stack
```

## File Structure

After creating modes, you'll see:

```
.github/
  chatmodes/
    api-developer.chatmode.md
    frontend-specialist.chatmode.md
    security-auditor.chatmode.md
    devops-automation.chatmode.md
    game-dev.chatmode.md
```

Each `.chatmode.md` file contains GitHub Copilot-compatible mode definitions that can be used with `@modename` in Copilot Chat.

## Next Steps

- Try the [workflow examples](../workflows/) with your new modes
- Set up [automated mode generation](../workflows/mode-automation.md)
- Learn about [mode troubleshooting](../troubleshooting/chat-mode-issues.md)