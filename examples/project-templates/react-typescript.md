# React TypeScript Project Template

**Goal**: Complete setup example for React TypeScript projects with GitHub Copilot integration.

## Prerequisites

- Node.js 18+
- MCP server built and running
- Basic understanding of React and TypeScript

## Step 1: Initialize React TypeScript Project

```bash
# Create new React TypeScript app
npx create-react-app my-react-app --template typescript
cd my-react-app

# Initialize with MCP server
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"projectPath":"'$(pwd)'"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"
```

## Step 2: Generated Files and Analysis

The MCP server creates several files:

### `.copilot/memory/` Directory Structure
```
.copilot/memory/
├── core/           # Core memory (always loaded)
├── warm/          # Recent patterns and context
├── cold/          # Long-term project knowledge
└── backup/        # Memory backups
```

### `COPILOT.md` - Root Context File
```markdown
# My React App - AI Assistant Context

## Project Overview
- **Type**: React TypeScript Application
- **Framework**: React 18.x with TypeScript
- **Build Tool**: Create React App
- **Package Manager**: npm

## Architecture
- Component-based architecture with functional components
- TypeScript for type safety
- CSS Modules for styling
- Jest and React Testing Library for testing

## Development Patterns
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow React best practices for state management
- Use proper error boundaries for error handling

## Key Dependencies
- React 18.x
- TypeScript 4.x
- @testing-library/react
- @types/node, @types/react

## AI Assistant Guidelines
- Prefer TypeScript over JavaScript
- Use descriptive component and prop names
- Implement proper error handling
- Write tests for components and utilities
- Follow React hooks best practices
```

### `.github/copilot-instructions.md` - GitHub Copilot Specific
```markdown
# GitHub Copilot Instructions

## Project Context
This is a React TypeScript application using Create React App.

## Coding Standards
- Use TypeScript with strict mode
- Implement functional components with hooks
- Use proper prop types and interfaces
- Follow React best practices

## Preferred Patterns
- Use `useState` and `useEffect` for state management
- Implement custom hooks for reusable logic
- Use CSS Modules for component styling
- Write unit tests with React Testing Library

## File Naming
- Components: PascalCase (e.g., `UserCard.tsx`)
- Hooks: camelCase starting with 'use' (e.g., `useUserData.ts`)
- Utilities: camelCase (e.g., `apiClient.ts`)
- Tests: `*.test.tsx` or `*.spec.tsx`
```

## Step 3: Store Project-Specific Context

```bash
# Store React-specific patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-component-pattern","value":"Use functional components with TypeScript interfaces for props. Always define proper types and use React.FC when needed.","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"

# Store testing patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-testing-pattern","value":"Use @testing-library/react for component tests. Test user interactions, not implementation details. Mock external dependencies.","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"

# Store state management approach
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"state-management","value":"Using React hooks (useState, useReducer) for local state. Consider Context API for app-wide state. Avoid prop drilling.","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"
```

## Step 4: Create Custom React Chat Mode

```bash
# Create a React-focused chat mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"react-dev","description":"React TypeScript development specialist","systemPrompt":"You are a React TypeScript expert. Focus on component architecture, hooks, performance optimization, testing, and TypeScript best practices. Always provide type-safe solutions with proper interfaces and error handling.","tools":["search_memory","store_memory","get_memory_stats"],"temperature":0.2}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js
```

## Step 5: Example Component Development with AI Integration

### Creating a User Card Component

In GitHub Copilot Chat:
```
@react-dev Create a UserCard component that displays user information with these TypeScript interfaces:

User interface with id, name, email, avatar properties
Props for the UserCard component
Proper styling with CSS modules
Click handler for user selection
```

Expected AI Response:
```typescript
// types/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// components/UserCard/UserCard.tsx
import React from 'react';
import styles from './UserCard.module.css';
import { User } from '../../types/User';

interface UserCardProps {
  user: User;
  onUserSelect: (user: User) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onUserSelect, className }) => {
  const handleClick = () => {
    onUserSelect(user);
  };

  return (
    <div className={`${styles.userCard} ${className || ''}`} onClick={handleClick}>
      {user.avatar && (
        <img
          src={user.avatar}
          alt={`${user.name}'s avatar`}
          className={styles.avatar}
        />
      )}
      <div className={styles.userInfo}>
        <h3 className={styles.name}>{user.name}</h3>
        <p className={styles.email}>{user.email}</p>
      </div>
    </div>
  );
};
```

## Step 6: Store Development Decisions

```bash
# Store the component pattern used
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"usercard-component","value":"UserCard component uses TypeScript interfaces, CSS modules, and proper event handling. Includes accessibility with alt text and semantic HTML.","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"

# Store CSS module approach
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"css-modules-pattern","value":"Using CSS modules for component styling. Files named Component.module.css, imported as styles object, using camelCase class names.","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"
```

## VS Code Configuration

### `.vscode/mcp.json` - Workspace-specific MCP setup

```json
{
  "mcpServers": {
    "copilot-mcp": {
      "command": "copilot-mcp-server",
      "args": ["--workspace", "${workspaceFolder}"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### `.vscode/settings.json` - React-specific VS Code settings

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "emmet.includeLanguages": {
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.css": "css"
  }
}
```

## Testing Integration

### Test with Memory System

```typescript
// __tests__/UserCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from '../components/UserCard/UserCard';
import { User } from '../types/User';

const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://example.com/avatar.jpg'
};

describe('UserCard', () => {
  it('renders user information correctly', () => {
    const onUserSelect = jest.fn();

    render(<UserCard user={mockUser} onUserSelect={onUserSelect} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByAltText("John Doe's avatar")).toBeInTheDocument();
  });

  it('calls onUserSelect when clicked', () => {
    const onUserSelect = jest.fn();

    render(<UserCard user={mockUser} onUserSelect={onUserSelect} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onUserSelect).toHaveBeenCalledWith(mockUser);
  });
});
```

## Development Workflow

### 1. Component Development
```
@react-dev I need to create a form component with validation for user registration
```

### 2. Testing Strategy
```
@tester How should I test this React form component with user input validation?
```

### 3. Performance Optimization
```
@perf-optimizer This UserList component re-renders too often, how can I optimize it?
```

### 4. Code Review
```
@code-reviewer Please review this React component for best practices and potential issues
```

## Success Indicators

✅ **Project initialized** with proper directory structure
✅ **AI context files** generated (`COPILOT.md`, `.github/copilot-instructions.md`)
✅ **Memory system** storing React-specific patterns
✅ **Custom chat mode** created for React development
✅ **VS Code integration** configured
✅ **Development workflow** established with specialized AI assistance

## Common React Patterns Stored

The system automatically stores and learns these patterns:

- Component creation with proper TypeScript interfaces
- Hook usage patterns and custom hook development
- Testing approaches with React Testing Library
- State management strategies
- Performance optimization techniques
- Error boundary implementation
- CSS-in-JS and CSS Modules usage

## What's Next

1. **Vue.js Template**: [vue-typescript.md](vue-typescript.md)
2. **Python FastAPI Template**: [python-fastapi.md](python-fastapi.md)
3. **Full-stack Template**: [fullstack-react-node.md](fullstack-react-node.md)
4. **Advanced React Patterns**: [../advanced/react-advanced.md](../advanced/react-advanced.md)

## Troubleshooting

- **MCP server not responding**: Verify `--workspace` argument uses absolute path
- **Memory not persisting**: Check `.copilot/memory/` directory permissions
- **Chat modes not available**: Ensure `.github/chatmodes/` exists and files are valid
- **TypeScript errors**: Verify proper interface definitions and imports