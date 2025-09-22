# Real-World Memory Examples

Practical examples showing how to use the memory system effectively in real development scenarios.

## Example 1: Full-Stack Development Workflow

### Initial Project Setup

Store project architecture decisions:

```bash
# In Copilot Chat when starting new project:
Please remember for this project:
- Frontend: Next.js 14 with TypeScript and Tailwind
- Backend: Node.js with Express and PostgreSQL
- Authentication: NextAuth.js with Google OAuth
- Deployment: Frontend on Vercel, Backend on Railway
- File uploads: Cloudinary integration
- Email: SendGrid for transactional emails
```

### Store API Design Patterns

```bash
# In Copilot Chat after designing API structure:
Remember our API conventions for this project:
- All endpoints return { success: boolean, data?: any, error?: string }
- Use HTTP status codes: 200 success, 400 client error, 500 server error
- Authentication via Authorization: Bearer <token> header
- Input validation with Joi schemas
- Error logging with Winston
- Rate limiting: 100 requests per minute per IP
```

### Document Database Schema

```bash
# In Copilot Chat after creating database:
Remember our database schema:
- users: id, email, name, avatar_url, created_at, updated_at
- posts: id, title, content, author_id, published, created_at
- comments: id, content, post_id, author_id, created_at
- tags: id, name, color
- post_tags: post_id, tag_id (many-to-many)

Relationships:
- User has many Posts
- Post belongs to User
- Post has many Comments through author
- Posts and Tags many-to-many via post_tags
```

## Example 2: React Component Development

### Store Component Patterns

```bash
# In Copilot Chat when creating reusable patterns:
Remember this component pattern for forms:

```tsx
// FormField.tsx - Reusable form field with validation
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
```

Use this pattern for all form components in this project.
```

### Store State Management Patterns

```bash
# In Copilot Chat:
Remember our Zustand store pattern for this project:

```tsx
// stores/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) =>
        set({ user, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
```

Always use this pattern with persistence for auth state.
```

## Example 3: Bug Fixes and Solutions

### Document Performance Issues

```bash
# In Copilot Chat after solving performance problem:
Remember this performance solution:

**Problem**: React table with 10,000+ rows was causing browser freeze

**Root Cause**: Rendering all rows at once without virtualization

**Solution**:
1. Implemented react-window for virtual scrolling
2. Added useMemo for filtered data
3. Debounced search input with 300ms delay
4. Used React.memo for row components

```tsx
// OptimizedTable.tsx
import { FixedSizeList as List } from 'react-window';

const VirtualizedTable = ({ data, onRowClick }) => {
  const filteredData = useMemo(() =>
    data.filter(item => item.name.includes(searchTerm))
  , [data, searchTerm]);

  const Row = memo(({ index, style }) => (
    <div style={style} onClick={() => onRowClick(filteredData[index])}>
      {filteredData[index].name}
    </div>
  ));

  return (
    <List
      height={600}
      itemCount={filteredData.length}
      itemSize={50}
    >
      {Row}
    </List>
  );
};
```

**Result**: Reduced rendering time from 3000ms to 50ms
Apply this pattern to all large data displays.
```

### Document Security Fixes

```bash
# In Copilot Chat after security audit:
Remember this security solution:

**Problem**: JWT tokens stored in localStorage vulnerable to XSS

**Solution**: Switched to httpOnly cookies with CSRF protection

```tsx
// Backend: Set secure cookie
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Frontend: Use SWR with credentials
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(res => res.json());

const { data, error } = useSWR('/api/user/profile', fetcher);
```

**Additional Security Measures**:
- CSRF token validation on state-changing operations
- Rate limiting on auth endpoints
- Input sanitization with DOMPurify
- Helmet.js for security headers

Apply this pattern to all authentication flows.
```

## Example 4: Testing Strategies

### Store Testing Patterns

```bash
# In Copilot Chat after establishing test patterns:
Remember our testing strategy for this project:

**Unit Tests** (Jest + React Testing Library):
```tsx
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct styles based on variant', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('bg-blue-500');
  });
});
```

**Integration Tests** (Supertest for API):
```tsx
// __tests__/api/posts.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('POST /api/posts', () => {
  it('creates post with valid data', async () => {
    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'Test Post',
        content: 'Test content'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Test Post');
  });
});
```

**E2E Tests** (Playwright):
```tsx
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in and create post', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');

  await page.click('text=New Post');
  await page.fill('input[name="title"]', 'E2E Test Post');
  await page.fill('textarea[name="content"]', 'Test content');
  await page.click('button:has-text("Publish")');

  await expect(page.locator('text=E2E Test Post')).toBeVisible();
});
```

Always maintain 80%+ code coverage and test critical user flows.
```

## Example 5: Deployment and DevOps

### Store Deployment Configurations

```bash
# In Copilot Chat after setting up CI/CD:
Remember our deployment setup:

**Environment Variables**:
```bash
# .env.local (development)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp_dev
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# .env.production (Vercel)
NEXTAUTH_URL=https://myapp.vercel.app
NEXTAUTH_SECRET=production-secret-key
DATABASE_URL=postgresql://user:pass@db.railway.app:5432/railway
CLOUDINARY_URL=cloudinary://prod_key:prod_secret@cloud_name
```

**GitHub Actions Workflow**:
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

**Database Migrations**:
```bash
# Always run migrations before deployment
npm run db:migrate:deploy

# Backup before major schema changes
npm run db:backup
npm run db:migrate:dev
```
```

## Memory Query Examples

### Search by Technology Stack

```bash
# In Copilot Chat:
What do you remember about our React patterns?
# Searches memories tagged with "react", "components", "hooks"

Show me our Next.js configuration decisions.
# Finds project-specific Next.js setup details

What authentication patterns have we used?
# Returns auth-related memories across all layers
```

### Search by Problem Domain

```bash
# In Copilot Chat:
How have we handled file uploads before?
# Searches system layer for file upload solutions

What performance issues have we solved?
# Returns performance optimization memories

Show me our testing strategies.
# Finds testing-related patterns and conventions
```

### Context-Aware Searches

```bash
# When editing a component file:
How should I handle form validation in React?
# Memory system considers you're in React context

# When looking at API routes:
What error handling patterns do we use?
# Prioritizes backend error handling memories

# When writing tests:
What's our testing approach for this type of component?
# Returns relevant testing patterns
```

## Best Practices from Examples

### 1. Be Specific and Actionable
```bash
# Good:
"Use React.memo for components with stable props to prevent unnecessary re-renders"

# Bad:
"React is good for performance"
```

### 2. Include Code Examples
```bash
# Always include working code snippets in memories
# Tag with relevant technologies
# Explain the context and when to use
```

### 3. Document Decisions and Rationale
```bash
# Store not just what you did, but why:
"Chose Zustand over Redux because our app has simple state requirements and team prefers minimal boilerplate"
```

### 4. Update Memories as Projects Evolve
```bash
# In Copilot Chat when patterns change:
Update our React state management approach: We've switched from Zustand to TanStack Query for server state and Context API for UI state. This reduces complexity and improves caching.
```

## Verification Commands

Test these examples work in your setup:

```bash
# Store a sample memory
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "store_memory",
    "arguments": {
      "content": "Sample architecture decision: Using Next.js with TypeScript for better developer experience and type safety",
      "layer": "project",
      "tags": ["nextjs", "typescript", "architecture"]
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"

# Search for it
echo '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_memory",
    "arguments": {
      "query": "Next.js TypeScript"
    }
  },
  "id": 1
}' | copilot-mcp-server --workspace="$(pwd)"
```