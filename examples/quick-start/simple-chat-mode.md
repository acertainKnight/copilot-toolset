# Creating Your First Custom Chat Mode

**Goal**: Create a working custom chat mode that integrates with GitHub Copilot in 5 minutes.

## Prerequisites

- MCP server running ([first-project.md](first-project.md))
- Basic understanding of memory system ([basic-memory.md](basic-memory.md))

## What Are Chat Modes?

Chat modes are specialized AI assistants with:
- Custom system prompts and personalities
- Specific tool access permissions
- Integrated memory and context
- GitHub Copilot integration via `.chatmode.md` files

## Step 1: Create a Simple Debug Helper Mode (2 minutes)

```bash
# Create a debug-focused chat mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"debug-helper","description":"Specialized assistant for debugging code issues","systemPrompt":"You are a debugging expert. Focus on identifying root causes, suggesting fixes, and preventing similar issues. Always ask for error messages, logs, and reproduction steps.","tools":["search_memory","store_memory"],"temperature":0.1}},"id":1}' | node dist/server/index.js
```

**Expected Result**: Creates two files:
- `~/.copilot-mcp/modes/debug-helper.json` (internal format)
- `.github/chatmodes/debug-helper.chatmode.md` (GitHub Copilot format)

## Step 2: Test the Mode Creation (1 minute)

```bash
# List available modes to confirm creation
echo '{"jsonrpc":"2.0","method":"resources/list","id":1}' | node dist/server/index.js
```

You should see `debug-helper` in the modes list along with built-in modes like `general`, `architect`, `debugger`, etc.

## Step 3: Use the Mode in Practice (2 minutes)

The mode is now available in GitHub Copilot Chat. You can:

1. **In VS Code**: Type `@debug-helper` in Copilot Chat
2. **Access mode memory**: The mode can store and search debugging patterns
3. **Specialized responses**: Gets debugging-focused responses

### Test with Memory Integration

```bash
# Store a debugging pattern for the mode to use
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-rendering-debug","value":"For React re-rendering issues: 1) Check React DevTools Profiler, 2) Look for missing dependencies in useEffect, 3) Verify memo usage on expensive components","layer":"system"}},"id":1}' | node dist/server/index.js

# The debug-helper mode can now search and find this pattern
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"React rendering performance"}},"id":1}' | node dist/server/index.js
```

## Generated Files Explained

### Internal JSON Format (`~/.copilot-mcp/modes/debug-helper.json`)
```json
{
  "name": "debug-helper",
  "description": "Specialized assistant for debugging code issues",
  "systemPrompt": "You are a debugging expert...",
  "tools": ["search_memory", "store_memory"],
  "temperature": 0.1,
  "created": "2024-09-21T...",
  "updated": "2024-09-21T..."
}
```

### GitHub Copilot Format (`.github/chatmodes/debug-helper.chatmode.md`)
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

## More Advanced Mode Examples

### Code Review Assistant
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"code-reviewer","description":"Thorough code review assistant","systemPrompt":"You are a senior engineer performing code reviews. Focus on: code quality, security issues, performance problems, maintainability, and best practices. Provide specific, actionable feedback.","tools":["search_memory","store_memory"],"temperature":0.2}},"id":1}' | node dist/server/index.js
```

### Documentation Writer
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"doc-writer","description":"Technical documentation specialist","systemPrompt":"You are a technical writer specializing in clear, comprehensive documentation. Create well-structured docs with examples, use cases, and troubleshooting sections. Always include practical code examples.","tools":["search_memory","store_memory","get_memory_stats"],"temperature":0.3}},"id":1}' | node dist/server/index.js
```

### Performance Optimizer
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"perf-optimizer","description":"Performance optimization specialist","systemPrompt":"You are a performance optimization expert. Analyze code for bottlenecks, suggest optimizations, and provide benchmarking strategies. Focus on measurable improvements and real-world impact.","tools":["search_memory","store_memory","get_memory_stats"],"temperature":0.1}},"id":1}' | node dist/server/index.js
```

## Using Modes in GitHub Copilot

Once created, use modes in VS Code:

1. **Open Copilot Chat** (Ctrl+Shift+P → "GitHub Copilot: Open Chat")
2. **Reference your mode**: `@debug-helper help me with this React error`
3. **Mode-specific responses**: Gets debugging-focused assistance with access to stored patterns

## Success Indicators

✅ **Mode created** successfully with JSON response
✅ **Files generated** in both locations
✅ **Mode appears** in resources list
✅ **GitHub Copilot** recognizes the `.chatmode.md` file
✅ **Memory integration** works (can store/search patterns)

## What You've Learned

- 🎯 Created a specialized chat mode for debugging
- 📁 Generated both internal JSON and GitHub Copilot markdown formats
- 🔧 Integrated memory system with mode functionality
- 💬 Made the mode available in GitHub Copilot Chat

## Next Steps

1. **Explore advanced modes**: [../chat-modes/mode-examples.md](../chat-modes/mode-examples.md)
2. **Set up complete VS Code integration**: [../integration/vscode-setup.md](../integration/vscode-setup.md)
3. **Learn advanced memory patterns**: [../advanced/complex-workflows.md](../advanced/complex-workflows.md)

## Common Mode Customizations

- **Temperature**: 0.1 (focused) to 0.8 (creative)
- **Tools**: Start minimal, add as needed
- **System Prompts**: Be specific about role and behavior
- **Names**: Use clear, descriptive names for easy @-referencing

## Troubleshooting

- **Mode not appearing in Copilot**: Check `.github/chatmodes/` exists and file is valid markdown
- **Memory not working**: Verify tools include `search_memory` and `store_memory`
- **JSON errors**: Ensure proper escaping in command-line JSON
- **Permission issues**: Check write permissions for `~/.copilot-mcp/modes/`