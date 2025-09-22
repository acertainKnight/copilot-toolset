# Team Collaboration Workflows

**Goal**: Advanced patterns for team-based development using shared memory, collaborative modes, and knowledge management.

## Prerequisites

- Understanding of complex workflows
- Experience with memory management
- Team development environment setup
- Familiarity with git workflows

## Team Memory Architecture

### Shared vs Individual Memory Layers

```
┌─────────────────────────────────────────────────────────┐
│                    TEAM MEMORY MODEL                   │
├─────────────────┬─────────────────────┬─────────────────┤
│   INDIVIDUAL    │       SHARED        │     GLOBAL      │
│   (per dev)     │    (team/project)   │   (organization)│
├─────────────────┼─────────────────────┼─────────────────┤
│ • Preferences   │ • Architecture      │ • Best practices│
│ • Local context │ • Team decisions    │ • Standards     │
│ • WIP features  │ • API conventions   │ • Templates     │
│ • Debug notes   │ • Database schema   │ • Security rules│
└─────────────────┴─────────────────────┴─────────────────┘
```

## Workflow 1: Team Onboarding Automation

### Scenario: New Developer Integration

#### Phase 1: Knowledge Base Creation (Team Lead)

```bash
# Create team onboarding mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"team-onboarding","description":"Team onboarding and knowledge transfer specialist","systemPrompt":"You are a team onboarding expert. Help new developers understand project architecture, coding standards, development workflows, and team practices. Provide structured learning paths and practical examples.","tools":["search_memory","store_memory","get_memory_stats"],"temperature":0.3}},"id":1}' | node dist/server/index.js

# Store team coding standards
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"team-coding-standards","value":"Team coding standards: TypeScript strict mode, ESLint with team config, Prettier for formatting. Components: functional with hooks, custom hooks for logic, PropTypes/interfaces. Testing: Jest + RTL, 80% coverage minimum, test user behavior not implementation. Git: feature branches, PR reviews required, conventional commits.","layer":"system"}},"id":1}' | node dist/server/index.js

# Store project architecture overview
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"project-architecture-overview","value":"Project architecture: React frontend with TypeScript, Node.js backend with Express, PostgreSQL database, Redis for caching. Authentication: JWT tokens, role-based access. API: RESTful with OpenAPI docs. Infrastructure: Docker containers, Kubernetes deployment, CI/CD with GitHub Actions.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store team workflows
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"team-development-workflow","value":"Development workflow: 1) Create feature branch from main, 2) Implement feature with tests, 3) Run local quality checks (lint, test, build), 4) Create PR with description, 5) Code review by 2+ team members, 6) Merge to main triggers deployment to staging, 7) QA approval for production deployment.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

#### Phase 2: New Developer Setup (New Team Member)

```bash
# New developer queries onboarding mode
```
**In GitHub Copilot Chat:**
```
@team-onboarding I'm a new developer joining this team. Can you provide:

1. Overview of the project architecture and tech stack
2. Local development setup steps
3. Coding standards and review process
4. Key patterns and conventions to follow
5. Testing strategies and requirements

Please give me a structured learning path for the first week.
```

**Expected AI Response** (leveraging stored team knowledge):
```
Welcome to the team! Here's your structured onboarding path:

## Week 1 Learning Path

### Day 1-2: Architecture & Setup
- **Project Architecture**: React TypeScript frontend, Node.js Express backend, PostgreSQL + Redis
- **Setup**: Clone repo → npm install → docker-compose up → npm run dev
- **Key Patterns**: Functional components with hooks, custom hooks for logic, TypeScript strict mode

### Day 3-4: Coding Standards
- **Code Style**: ESLint + Prettier (auto-format on save)
- **Component Structure**: Export default, PropTypes/interfaces, organized imports
- **Testing**: Jest + RTL, test user behavior, 80% coverage minimum

### Day 5: Team Workflow
- **Git Flow**: Feature branches from main, conventional commits
- **PR Process**: Description template, 2+ reviewer approval required
- **Deployment**: Auto-deploy to staging, manual production deployment

[Detailed explanations with examples...]
```

#### Phase 3: Contextual Learning Support

```bash
# Store new developer's learning progress
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"sarah-onboarding-progress","value":"Sarah (new dev) progress: Week 1 - completed setup, reviewed architecture, implemented first component. Current focus: learning authentication flow and API patterns. Next: implement user profile feature as first task.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store common new developer questions
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"common-onboarding-questions","value":"Common new dev questions: 1) How to mock API calls in tests? Use MSW library, 2) Authentication testing? Mock auth context, 3) Database migrations? Use npm run migrate:dev, 4) Debugging API calls? Check Network tab + backend logs, 5) Component structure? See UserCard component as example","layer":"system"}},"id":1}' | node dist/server/index.js
```

## Workflow 2: Code Review Collaboration

### Scenario: Systematic Code Quality Improvement

#### Phase 1: Review Mode Creation

```bash
# Create team code review mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"team-reviewer","description":"Team code review specialist with team context","systemPrompt":"You are a senior code reviewer with deep knowledge of team standards and project architecture. Focus on code quality, security, performance, maintainability, and adherence to team conventions. Reference established patterns and suggest improvements aligned with team practices.","tools":["search_memory","store_memory"],"temperature":0.1}},"id":1}' | node dist/server/index.js
```

#### Phase 2: Review Pattern Development

```bash
# Store review checklist
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"code-review-checklist","value":"Code review checklist: 1) TypeScript types correct and strict, 2) Tests cover happy path + error cases, 3) Security: input validation, authorization checks, 4) Performance: avoid unnecessary re-renders, optimize queries, 5) Maintainability: clear naming, reasonable complexity, 6) Team standards: follows established patterns","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store common review feedback patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"review-feedback-patterns","value":"Common review feedback: 1) Extract complex logic to custom hooks, 2) Use useCallback for functions passed as props, 3) Add error boundaries for user-facing components, 4) Validate API inputs with Joi/Zod, 5) Use loading states for better UX, 6) Add accessibility attributes (aria-labels, roles)","layer":"system"}},"id":1}' | node dist/server/index.js
```

#### Phase 3: AI-Enhanced Review Process

**Code Review with Team Context:**
```
@team-reviewer Please review this authentication component:

```tsx
export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      onLogin(data.user);
    } catch (error) {
      console.log('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        Login
      </button>
    </form>
  );
};
```

Check against our team standards and suggest improvements.
```

**Expected AI Response** (using stored team patterns):
```
## Code Review Feedback

### ✅ Good Practices
- Proper TypeScript typing with LoginFormProps
- Loading state management
- Form submission handling

### 🔧 Required Improvements

1. **Error Handling** (Team Standard Violation)
   - Missing proper error state management
   - Console.log instead of user feedback
   - No HTTP status code checking

2. **Validation** (Missing)
   - No input validation against team requirements
   - Should use Joi/Zod as per team standards

3. **Security** (Critical)
   - Missing CSRF protection
   - No rate limiting consideration
   - Should use team's auth hook pattern

4. **Accessibility** (Team Standard)
   - Missing aria-labels
   - No error announcements for screen readers

### 📋 Suggested Implementation
[Provides corrected code following stored team patterns...]
```

## Workflow 3: Feature Development Coordination

### Scenario: Multi-Developer Feature Implementation

#### Phase 1: Feature Planning Session

```bash
# Store feature requirements and assignments
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"user-dashboard-feature","value":"User Dashboard Feature: Sprint 2024-Q1-S3. Requirements: User profile management, activity feed, notification center, settings panel. Team: Alice (backend API), Bob (frontend components), Carol (integration + testing). Timeline: 2 weeks. Dependencies: auth system completion.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store API contract
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"dashboard-api-contract","value":"Dashboard API endpoints: GET /api/user/profile (returns user data + preferences), GET /api/user/activity (paginated activity feed), GET /api/notifications (unread count + recent), PUT /api/user/settings (update preferences). Response format: {data, meta, errors}. Authentication: Bearer token required.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

#### Phase 2: Parallel Development with Coordination

**Backend Developer (Alice):**
```
@team-reviewer I'm implementing the dashboard API endpoints. Here's my approach:

1. User profile endpoint with nested preferences
2. Activity feed with pagination and filtering
3. Notification system with real-time updates
4. Settings management with validation

Please review against our team's API conventions and suggest any improvements.
```

**Frontend Developer (Bob):**
```
@react-dev I need to create dashboard components that work with Alice's API contract:

Components needed:
- UserProfile (displays info + edit mode)
- ActivityFeed (infinite scroll + filters)
- NotificationCenter (real-time updates)
- SettingsPanel (form with validation)

Please provide component structure following our team patterns.
```

#### Phase 3: Integration Documentation

```bash
# Store integration patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"dashboard-integration-patterns","value":"Dashboard integration patterns: Frontend uses custom hooks (useProfile, useActivity, useNotifications) for API calls. Real-time notifications via WebSocket connection. State management with React Query for caching. Error boundaries around each dashboard section. Loading skeletons for better UX.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store testing coordination
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"dashboard-testing-strategy","value":"Dashboard testing approach: Alice - API unit + integration tests, Bob - component tests with MSW for API mocking, Carol - E2E tests with Playwright for complete user flows. Shared test data fixtures in /tests/fixtures/dashboard-data.json.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Workflow 4: Knowledge Sharing and Documentation

### Scenario: Technical Decision Documentation

#### Phase 1: Architecture Decision Records (ADRs)

```bash
# Store architectural decisions with reasoning
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"adr-state-management","value":"ADR-003: Global State Management. Decision: Use React Query for server state, Context API for auth/theme, local useState for component state. Reasoning: React Query handles caching/synchronization, Context avoids prop drilling for global concerns, useState sufficient for local UI state. Alternatives considered: Redux (too complex), Zustand (unnecessary), Recoil (experimental). Status: Adopted.","layer":"system"}},"id":1}' | node dist/server/index.js

# Store technology evaluation results
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"tech-evaluation-ui-library","value":"UI Library Evaluation: Evaluated Material-UI, Chakra UI, Ant Design, custom CSS modules. Winner: Chakra UI. Reasoning: TypeScript support, accessibility built-in, customizable theme system, good documentation, active community. Trade-offs: Bundle size +150KB, learning curve for team. Implementation: gradual adoption, design system components first.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

#### Phase 2: Learning Session Organization

```bash
# Create team learning mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"tech-mentor","description":"Team technical mentoring specialist","systemPrompt":"You are a technical mentor helping teams learn new technologies and patterns. Create structured learning materials, practical exercises, and knowledge sharing sessions. Focus on hands-on examples and team-specific applications.","tools":["search_memory","store_memory"],"temperature":0.4}},"id":1}' | node dist/server/index.js

# Store team learning topics
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"team-learning-topics","value":"Team learning roadmap: Week 1: React Query fundamentals and migration plan, Week 2: Chakra UI design system implementation, Week 3: TypeScript advanced patterns, Week 4: Testing strategy updates, Week 5: Performance optimization techniques. Format: 1-hour sessions with hands-on coding.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

**Learning Session with AI:**
```
@tech-mentor Our team needs to learn React Query for server state management. We currently use useEffect + useState for API calls. Can you create:

1. Learning objectives for React Query adoption
2. Practical migration exercises
3. Common gotchas and best practices
4. Integration with our existing auth system

Focus on our real codebase patterns and provide hands-on examples.
```

## Workflow 5: Cross-Team Communication

### Scenario: Multiple Team Coordination

#### Phase 1: Inter-Team Interface Definition

```bash
# Store team interfaces and contracts
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"team-interface-backend","value":"Backend Team Interface: Provides REST APIs following OpenAPI 3.0 spec, database schema migrations, authentication middleware, error handling patterns. SLA: API response time <200ms 95th percentile, 99.9% uptime. Communication: #backend-team Slack, weekly sync Thursdays 2pm.","layer":"system"}},"id":1}' | node dist/server/index.js

# Store cross-team dependencies
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"cross-team-dependencies","value":"Team dependencies: Frontend depends on Backend API contracts, Backend depends on DevOps infrastructure, QA depends on Feature flags system, Product depends on Analytics data. Critical path: Backend API → Frontend implementation → QA testing → Production deployment.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

#### Phase 2: Communication Protocols

```bash
# Store communication patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"team-communication-protocols","value":"Inter-team communication: Breaking changes require 1-week notice, API changes documented in #api-changes, deployment windows communicated 24h advance, incident response via #incidents with on-call rotation. Documentation: Confluence for specs, GitHub for technical docs, Slack for daily coordination.","layer":"system"}},"id":1}' | node dist/server/index.js
```

## Advanced Team Memory Patterns

### Pattern 1: Collective Code Intelligence

```bash
# Store team problem-solving patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"team-debugging-wisdom","value":"Team debugging playbook: 1) Check recent deployments in #deployments, 2) Review monitoring dashboards for anomalies, 3) Check application logs in ELK stack, 4) Verify external service status pages, 5) Roll back if user-impacting, investigate later, 6) Document findings in incident postmortem. Escalation: Dev → Senior → Team Lead → CTO.","layer":"system"}},"id":1}' | node dist/server/index.js

# Store team performance insights
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"team-performance-insights","value":"Team performance patterns: Productivity peaks Tuesday-Thursday 10am-3pm, code reviews most thorough in mornings, complex features best started Monday/Tuesday, deployment Fridays avoided, pair programming effective for knowledge transfer, async code reviews for routine changes, synchronous for architectural decisions.","layer":"system"}},"id":1}' | node dist/server/index.js
```

### Pattern 2: Knowledge Evolution Tracking

```bash
# Track how team practices evolve
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"practice-evolution-testing","value":"Testing practice evolution: Q1 2024: Basic unit tests with Jest. Q2 2024: Added integration tests with supertest. Q3 2024: Introduced E2E with Playwright. Q4 2024: Added visual regression tests. Current state: 85% test coverage, automated in CI/CD. Next: Property-based testing exploration.","layer":"system"}},"id":1}' | node dist/server/index.js
```

### Pattern 3: Contextual Mentoring

```bash
# Store mentoring relationships and progress
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"mentoring-sarah-progress","value":"Sarah (Junior → Mid-level): Mentoring progress - Week 1-4: Learned React fundamentals, Week 5-8: Component architecture patterns, Week 9-12: Testing strategies, Week 13-16: Performance optimization. Current level: Can implement features independently, needs guidance on architecture decisions. Next focus: System design and API design patterns.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Team Workflow Success Indicators

✅ **Onboarding automation** - New developers productive within 1 week
✅ **Knowledge consistency** - Team follows established patterns and standards
✅ **Efficient code reviews** - AI-enhanced reviews catch issues early
✅ **Smooth coordination** - Multi-developer features integrate seamlessly
✅ **Collective intelligence** - Team learns from shared experiences and patterns
✅ **Cross-team communication** - Clear interfaces and protocols reduce conflicts
✅ **Knowledge evolution** - Practices improve based on retrospectives and learning

## Advanced Team Troubleshooting

### Memory Synchronization Issues
- **Problem**: Team members have inconsistent project context
- **Solution**: Regular memory synchronization sessions, shared context validation
- **Prevention**: Establish memory update protocols for major decisions

### Communication Overhead
- **Problem**: Too much coordination reduces productivity
- **Solution**: Automate routine communications, focus on high-impact decisions
- **Tools**: Slack bots for status updates, automated PR notifications

### Knowledge Silos
- **Problem**: Critical knowledge concentrated in few team members
- **Solution**: Systematic knowledge documentation, pair programming rotation
- **Measurement**: Knowledge distribution metrics, bus factor analysis

## What's Next

1. **CI/CD integration patterns**: [cicd-integration.md](cicd-integration.md)
2. **Advanced memory analytics**: [memory-analytics.md](memory-analytics.md)
3. **Custom tool development**: [custom-tools.md](custom-tools.md)
4. **Enterprise scaling patterns**: [enterprise-scaling.md](enterprise-scaling.md)