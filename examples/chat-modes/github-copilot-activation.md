# GitHub Copilot Chat Mode Activation

**Goal**: Learn how to activate and use custom modes in GitHub Copilot Chat with practical examples.

## Prerequisites

- Custom chat modes created ([create-custom-mode.md](create-custom-mode.md))
- VS Code with GitHub Copilot extension
- `.github/chatmodes/` directory with mode files

## Mode Activation in GitHub Copilot

### Method 1: @-References in Copilot Chat

Once you create a mode, GitHub Copilot automatically recognizes `.chatmode.md` files:

```
@debug-helper I'm getting a TypeError in my React component when users click the submit button
```

```
@code-reviewer Please review this authentication function for security issues
```

```
@perf-optimizer This query is taking 3 seconds to run, can you help optimize it?
```

### Method 2: Mode-Specific Conversations

Start a conversation focused on the mode's specialty:

**Debug Helper Example:**
```
@debug-helper

I have a React app where components are re-rendering unnecessarily. Here's my component:

```jsx
const UserList = ({ users, onUserSelect }) => {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} onClick={() => onUserSelect(user)} />
      ))}
    </div>
  );
};
```

The UserCard components re-render every time the parent updates.
```

**Expected Response**: The debug-helper mode will focus on React-specific debugging, suggest React DevTools usage, and identify the inline function creation as the issue.

## Real-World Mode Usage Examples

### Using API Developer Mode

```
@api-developer

I need to create a user registration endpoint with these requirements:
- Email validation
- Password hashing
- Rate limiting
- Input sanitization
- JWT token generation

What's the best structure for this Express.js endpoint?
```

**Mode Behavior**: Provides API-focused responses with security considerations, error handling patterns, and testing suggestions.

### Using Database Designer Mode

```
@db-designer

I'm designing a blog system with these entities:
- Users (can be authors or readers)
- Posts (belong to authors)
- Comments (belong to posts and users)
- Tags (many-to-many with posts)

What's the optimal PostgreSQL schema design?
```

**Mode Behavior**: Focuses on normalization, indexing strategies, and query optimization considerations.

## Mode Integration with Memory System

Custom modes have access to the memory system. Here's how it works:

### Storing Mode-Specific Patterns

When using `@debug-helper`:
```
Store this debugging pattern: "For React hydration errors, check server/client HTML mismatch, verify data serialization, and use suppressHydrationWarning sparingly"
```

The mode can store this in memory for future reference:

```bash
# This happens automatically when the mode processes your request
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-hydration-debug","value":"For React hydration errors, check server/client HTML mismatch, verify data serialization, and use suppressHydrationWarning sparingly","layer":"system"}},"id":1}' | node dist/server/index.js
```

### Retrieving Stored Knowledge

The mode can search its memory:
```
@debug-helper I'm seeing React hydration errors, what's the debugging checklist?
```

The mode searches memory and provides the stored pattern along with contextual advice.

## Built-in Mode Examples

### Using the Architect Mode

```
@architect

I'm building a microservices architecture for an e-commerce platform. I need:
- User service (authentication, profiles)
- Product service (catalog, inventory)
- Order service (cart, checkout, fulfillment)
- Payment service (processing, refunds)

What's the optimal service communication pattern?
```

### Using the Tester Mode

```
@tester

I have this async function that calls multiple APIs. How should I structure my Jest tests?

```javascript
async function processUserOrder(userId, items) {
  const user = await userApi.getUser(userId);
  const inventory = await inventoryApi.checkStock(items);
  const order = await orderApi.createOrder({ user, items: inventory.available });
  const payment = await paymentApi.processPayment(order.id, order.total);
  return { order, payment };
}
```
```

## Mode Configuration in .chatmode.md Files

GitHub Copilot reads these files to understand mode behavior:

### Example: .github/chatmodes/debug-helper.chatmode.md

```markdown
# debug-helper

Specialized assistant for debugging code issues

## Instructions

You are a debugging expert. Focus on identifying root causes, suggesting fixes, and preventing similar issues. Always ask for error messages, logs, and reproduction steps.

## Tools

- search_memory
- store_memory

*This mode was created by Copilot MCP Server*
```

### Example: .github/chatmodes/api-developer.chatmode.md

```markdown
# api-developer

Specialized assistant for REST API development with Node.js and Express

## Instructions

You are an expert API developer. Focus on:
- RESTful design principles
- Security best practices (authentication, authorization, input validation)
- Error handling and status codes
- Performance optimization
- API documentation and testing
- Rate limiting and caching strategies

Always provide working code examples with proper error handling.

## Tools

- search_memory
- store_memory
- get_memory_stats

*This mode was created by Copilot MCP Server*
```

## Mode Switching and Context

You can switch between modes in the same conversation:

```
@debug-helper Help me fix this React error
[debug conversation]

@code-reviewer Now review the fixed code for best practices
[code review conversation]

@tester How should I test this fix?
[testing conversation]
```

## Success Indicators

✅ **Mode activation**: `@modename` works in Copilot Chat
✅ **Specialized responses**: Mode provides focused, domain-specific advice
✅ **Memory integration**: Mode can store and retrieve relevant patterns
✅ **Context awareness**: Mode maintains conversation context
✅ **File recognition**: GitHub Copilot reads `.chatmode.md` files

## Best Practices

### Mode Naming
- Use descriptive, memorable names: `debug-helper`, not `dh`
- Use kebab-case for consistency: `api-developer`, not `API_Developer`
- Keep names under 20 characters for easy @-referencing

### Conversation Flow
```
# Good: Specific, context-rich request
@debug-helper I'm getting "Cannot read property 'id' of undefined" in my React component when filtering an array of users

# Poor: Vague, no context
@debug-helper Fix my code
```

### Memory Utilization
- Store recurring patterns and solutions
- Use specific keys for easy retrieval
- Layer appropriately (system for reusable patterns, project for specific solutions)

## Troubleshooting

### Mode Not Recognized
- Check `.github/chatmodes/` directory exists
- Verify `.chatmode.md` file format is correct
- Restart VS Code after creating new modes

### Mode Not Responding Appropriately
- Check system prompt in mode configuration
- Verify tool access permissions
- Review temperature settings (lower for focused responses)

### Memory Not Working
- Ensure mode has `search_memory` and `store_memory` tools
- Check MCP server is running and accessible
- Verify workspace context is correct

## What's Next

1. **Create specialized modes**: [mode-examples.md](mode-examples.md)
2. **Advanced memory patterns**: [../memory/real-world-examples.md](../memory/real-world-examples.md)
3. **Complete workflow integration**: [../integration/complete-templates.md](../integration/complete-templates.md)