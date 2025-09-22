# Complex Development Workflows

**Goal**: Master advanced workflows that combine memory management, chat modes, and project initialization for sophisticated development scenarios.

## Prerequisites

- Completed quick-start examples
- Understanding of three-tier memory system
- Experience with custom chat modes
- Familiarity with project templates

## Workflow 1: Full-Stack Feature Development

### Scenario: User Authentication System
Complete implementation from planning to deployment with AI assistance.

#### Phase 1: Architecture Planning (5 minutes)

```bash
# Set development session context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"current-sprint","value":"Implementing user authentication system with registration, login, JWT tokens, password reset, and role-based access control","layer":"preference"}},"id":1}' | node dist/server/index.js

# Store architecture decisions with reasoning
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"auth-architecture","value":"JWT-based auth with refresh tokens. Frontend: React with Context API for auth state. Backend: Express with bcrypt for hashing, JWT for tokens. Database: PostgreSQL with users, roles, sessions tables. Security: httpOnly cookies for refresh tokens, memory storage for access tokens.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

**Chat Mode Usage:**
```
@architect I'm designing an authentication system for a React/Node.js app. Here's my current plan:

- JWT access tokens (15min lifespan)
- Refresh tokens in httpOnly cookies (7 days)
- Role-based access control
- Password reset via email
- Registration with email verification

Please review this architecture and suggest improvements based on security best practices.
```

#### Phase 2: Database Design (10 minutes)

```bash
# Store database schema decisions
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"db-schema-auth","value":"Users table: id (UUID), email (unique), username (unique), password_hash, email_verified, created_at, updated_at. Roles table: id, name, permissions (JSON). User_roles table: user_id, role_id (many-to-many). Sessions table: id, user_id, refresh_token_hash, expires_at, created_at.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store migration strategy
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"migration-strategy","value":"Database migrations with Sequelize/Knex. Order: 1) Create users table, 2) Create roles table with default roles (admin, user), 3) Create user_roles junction table, 4) Create sessions table, 5) Add indexes on email, username, refresh tokens","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

**Chat Mode Usage:**
```
@db-designer Based on my authentication requirements, I need tables for:

1. User management with email verification
2. Role-based access control with permissions
3. Session management for refresh tokens

Here's my initial schema design:
[paste schema]

Please optimize this for performance and security.
```

#### Phase 3: Backend Implementation (30 minutes)

```bash
# Create backend-focused mode for this session
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"auth-backend","description":"Authentication backend specialist","systemPrompt":"You are an expert in Node.js authentication systems. Focus on security best practices, JWT implementation, password hashing, session management, and API design. Always consider security implications and provide secure, production-ready code.","tools":["search_memory","store_memory"],"temperature":0.1}},"id":1}' | node dist/server/index.js
```

**Implementation with AI Assistance:**
```
@auth-backend I need to implement user registration with these requirements:

1. Email and password validation
2. Password hashing with bcrypt
3. Email verification token generation
4. Duplicate email checking
5. Rate limiting for registration attempts

Please provide the complete implementation with error handling.
```

**Store Implementation Decisions:**
```bash
# Store password policy
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"password-policy","value":"Password requirements: minimum 8 characters, at least one uppercase, one lowercase, one number, one special character. Using zxcvbn for strength estimation. Bcrypt rounds: 12 for production, 10 for development.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store rate limiting strategy
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"rate-limiting","value":"Rate limiting: Registration 5 attempts/hour per IP, Login 10 attempts/15min per IP, Password reset 3 attempts/hour per email. Using express-rate-limit with Redis store for distributed environments.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

#### Phase 4: Frontend Implementation (25 minutes)

```bash
# Create frontend-focused mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"react-auth","description":"React authentication specialist","systemPrompt":"You are a React authentication expert. Focus on secure auth flows, Context API state management, form validation, error handling, and user experience. Always implement proper TypeScript typing and accessibility features.","tools":["search_memory","store_memory"],"temperature":0.2}},"id":1}' | node dist/server/index.js
```

**Frontend Development:**
```
@react-auth I need to create a complete React authentication system with:

1. AuthContext for global auth state
2. Login/Register forms with validation
3. Protected routes component
4. Automatic token refresh logic
5. Logout functionality that clears all tokens

Please provide TypeScript implementation with proper error handling.
```

**Store Frontend Patterns:**
```bash
# Store auth context pattern
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-auth-context","value":"AuthContext pattern: useReducer for complex state, automatic token refresh with useEffect, protected route wrapper component, login/logout actions, error state management. TypeScript interfaces for User, AuthState, AuthActions.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

#### Phase 5: Testing Strategy (20 minutes)

```
@tester I need comprehensive tests for my authentication system:

Backend:
- Unit tests for auth middleware
- Integration tests for auth endpoints
- Mock email service for verification tests

Frontend:
- Component tests for auth forms
- Integration tests for auth flow
- Mock API responses for testing

Please provide testing strategies and example implementations.
```

**Store Testing Decisions:**
```bash
# Store testing approach
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"auth-testing-strategy","value":"Backend testing: Jest for unit tests, supertest for API testing, sinon for mocking email service. Frontend testing: React Testing Library, MSW for API mocking, user-event for interactions. Test coverage target: 85% for auth modules.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Workflow 2: Performance Optimization Sprint

### Scenario: React Application Performance Issues

#### Phase 1: Performance Analysis (15 minutes)

```bash
# Document performance problems
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"perf-issues-identified","value":"Performance problems: 1) UserList component re-renders on every state change (300ms), 2) Dashboard loads slowly with 50+ API calls, 3) Bundle size 2.5MB (target: 1MB), 4) Memory leaks in chat component, 5) Slow search with 500ms typing delay","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Create performance-focused mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"perf-optimizer","description":"React performance optimization specialist","systemPrompt":"You are a React performance expert. Focus on identifying bottlenecks, optimizing renders, reducing bundle size, fixing memory leaks, and improving user experience. Provide measurable optimization strategies with before/after metrics.","tools":["search_memory","store_memory","get_memory_stats"],"temperature":0.1}},"id":1}' | node dist/server/index.js
```

**Performance Audit with AI:**
```
@perf-optimizer I need to optimize this React component that's causing performance issues:

```jsx
const UserList = ({ users, onUserSelect, filters }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filters.active === undefined || user.isActive === filters.active)
  ).sort((a, b) => a[sortBy].localeCompare(b[sortBy]));

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {filteredUsers.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onClick={() => onUserSelect(user)}
        />
      ))}
    </div>
  );
};
```

This component re-renders frequently and the list is slow with 1000+ users.
```

#### Phase 2: Optimization Implementation (30 minutes)

**Store Optimization Strategies:**
```bash
# Store specific optimizations applied
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"react-optimizations-applied","value":"Applied optimizations: 1) React.memo on UserList and UserCard, 2) useMemo for filtering/sorting, 3) useCallback for event handlers, 4) debounced search input (300ms), 5) virtualized list for 1000+ items with react-window, 6) lazy loading for UserCard images","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store performance metrics
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"performance-results","value":"Performance improvements: UserList render time 300ms → 45ms (85% improvement), Bundle size 2.5MB → 1.2MB (52% reduction), Memory usage reduced 40%, Search responsiveness improved from 500ms to 50ms delay. Tools used: React DevTools Profiler, webpack-bundle-analyzer, Chrome DevTools.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Workflow 3: Microservices Architecture Migration

### Scenario: Monolith to Microservices

#### Phase 1: Architecture Assessment (20 minutes)

```bash
# Document current monolith structure
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"monolith-structure","value":"Current monolith: Node.js Express app with 15 routes, 8 database tables, 45 API endpoints. Modules: auth, users, products, orders, payments, notifications, analytics. Pain points: deployment coupling, team conflicts, scaling issues, single database bottleneck.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Create microservices architect mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"microservices-architect","description":"Microservices architecture specialist","systemPrompt":"You are a microservices architecture expert. Focus on service decomposition, API design, data management, inter-service communication, deployment strategies, and migration patterns. Consider scalability, maintainability, and team organization.","tools":["search_memory","store_memory"],"temperature":0.2}},"id":1}' | node dist/server/index.js
```

**Architecture Planning:**
```
@microservices-architect I need to break down this monolith into microservices:

Current system:
- User management (auth, profiles, preferences)
- Product catalog (inventory, categories, search)
- Order processing (cart, checkout, fulfillment)
- Payment processing (billing, subscriptions)
- Notifications (email, SMS, push)
- Analytics and reporting

Please suggest an optimal service decomposition with communication patterns.
```

#### Phase 2: Service Decomposition Strategy (25 minutes)

```bash
# Store service boundaries
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"service-boundaries","value":"Microservices decomposition: 1) User Service (auth, profiles), 2) Product Service (catalog, inventory), 3) Order Service (cart, orders), 4) Payment Service (billing, transactions), 5) Notification Service (messaging), 6) Analytics Service (reporting). Communication: API Gateway + gRPC for internal, events for async.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store migration strategy
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"migration-strategy","value":"Migration approach: Strangler Fig pattern. Phase 1: Extract User Service, Phase 2: Extract Product Service, Phase 3: Extract Order Service, Phase 4: Remaining services. Database per service, shared data through APIs. Gradual traffic routing with feature flags.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

#### Phase 3: Implementation Planning (20 minutes)

**Technology Stack Decision:**
```
@microservices-architect For my microservices implementation, I'm considering:

- Container orchestration: Kubernetes vs Docker Swarm
- Service mesh: Istio vs Linkerd vs none
- API Gateway: Kong vs Ambassador vs AWS API Gateway
- Message broker: RabbitMQ vs Apache Kafka
- Service discovery: Consul vs etcd vs Kubernetes built-in
- Monitoring: Prometheus/Grafana vs ELK stack

Please recommend the best stack for a team of 8 developers with moderate DevOps experience.
```

```bash
# Store technology decisions
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"microservices-tech-stack","value":"Technology stack: Kubernetes for orchestration, Kong API Gateway, gRPC for sync communication, RabbitMQ for async messaging, Prometheus/Grafana for monitoring, Jaeger for tracing. Database per service: PostgreSQL for transactional, Redis for caching, MongoDB for analytics.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Workflow 4: Code Review and Quality Improvement

### Scenario: Legacy Code Modernization

#### Phase 1: Code Assessment (15 minutes)

```bash
# Create code review mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"code-modernizer","description":"Legacy code modernization specialist","systemPrompt":"You are a code modernization expert. Focus on identifying technical debt, suggesting modern patterns, improving maintainability, and ensuring security. Provide specific refactoring strategies with clear before/after examples.","tools":["search_memory","store_memory"],"temperature":0.15}},"id":1}' | node dist/server/index.js
```

**Legacy Code Review:**
```
@code-modernizer I need to modernize this legacy JavaScript codebase:

```javascript
var UserManager = function() {
  var users = [];

  return {
    addUser: function(name, email) {
      var user = {
        id: Math.random(),
        name: name,
        email: email,
        created: new Date()
      };
      users.push(user);
      return user;
    },

    findUser: function(id) {
      for (var i = 0; i < users.length; i++) {
        if (users[i].id == id) {
          return users[i];
        }
      }
      return null;
    }
  };
}();
```

Please suggest modernization strategies and provide updated implementation.
```

#### Phase 2: Systematic Refactoring (40 minutes)

```bash
# Store modernization patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"modernization-patterns","value":"Legacy modernization approach: 1) Convert to ES6+ syntax (const/let, arrow functions, classes), 2) Add TypeScript for type safety, 3) Implement proper error handling, 4) Add input validation, 5) Use modern async patterns, 6) Add comprehensive tests, 7) Implement security best practices","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store refactoring progress
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"refactoring-progress","value":"Refactoring completed: UserManager converted to TypeScript class, UUID library for IDs, input validation with Joi, async/await for database operations, comprehensive Jest tests, ESLint/Prettier setup. Code coverage: 92%. Performance improved 35%.","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Advanced Memory Workflow Patterns

### Pattern 1: Context Switching Between Projects

```bash
# Save current project context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"project-context-snapshot","value":"Current work state: implementing OAuth2 integration, debugging token refresh issue, next: implement role-based permissions. Tech stack: React/Node.js, PostgreSQL, Redis. Active PR: #123 - user authentication system","layer":"preference"}},"id":1}' | node dist/server/index.js

# Switch to different project workspace
cd /path/to/different/project

# Load new project context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"project architecture API design patterns","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

### Pattern 2: Knowledge Extraction and Documentation

```bash
# Extract reusable patterns from completed work
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"successful-auth-implementation","value":"Successful auth pattern: JWT access (15min) + refresh tokens (7d) in httpOnly cookies, automatic refresh with axios interceptors, React Context for state, protected routes with HOC. Security considerations: XSS prevention, CSRF tokens, rate limiting. Performance: token validation middleware caching.","layer":"system"}},"id":1}' | node dist/server/index.js

# Document anti-patterns to avoid
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"auth-antipatterns","value":"Auth anti-patterns to avoid: 1) Storing JWT in localStorage (XSS vulnerability), 2) Long-lived access tokens, 3) No token rotation, 4) Missing rate limiting, 5) Weak password policies, 6) No session management, 7) Missing logout cleanup","layer":"system"}},"id":1}' | node dist/server/index.js
```

### Pattern 3: Collaborative Development Memory

```bash
# Store team decisions and context
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"team-code-review-feedback","value":"Team code review insights: 1) Prefer composition over inheritance, 2) Always use TypeScript strict mode, 3) Write tests before refactoring, 4) Use descriptive variable names over comments, 5) Limit function complexity to 10 lines, 6) Extract custom hooks for reusable logic","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"

# Store onboarding knowledge
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"new-dev-gotchas","value":"New developer gotchas: 1) Local database seeds required for development, 2) Environment variables in .env.example must match .env, 3) Redis must be running for session storage, 4) API rate limits apply to localhost:3000, 5) Email service mock in development mode","layer":"project"}},"id":1}' | node dist/server/index.js --workspace="$(pwd)"
```

## Success Indicators for Complex Workflows

✅ **Multi-phase planning** with architectural decisions stored in memory
✅ **Context-aware AI assistance** leveraging stored project knowledge
✅ **Cross-system integration** (frontend, backend, database, deployment)
✅ **Performance optimization** with measurable improvements documented
✅ **Knowledge extraction** patterns that benefit future projects
✅ **Team collaboration** enhanced with shared memory context
✅ **Quality improvements** through systematic refactoring approaches

## Advanced Troubleshooting

### Memory Context Issues
- **Problem**: AI responses not contextually relevant
- **Solution**: Verify memory layer usage and search for existing patterns
- **Check**: `get_memory_stats` and targeted `search_memory` queries

### Workflow Integration Problems
- **Problem**: Chat modes not accessing project context
- **Solution**: Ensure modes have proper tool permissions
- **Check**: Mode configuration includes `search_memory` and `store_memory`

### Performance Degradation
- **Problem**: Complex workflows become slow
- **Solution**: Optimize memory usage and clean up unused context
- **Check**: Memory statistics and workspace isolation

## What's Next

1. **Team collaboration workflows**: [team-workflows.md](team-workflows.md)
2. **CI/CD integration patterns**: [cicd-integration.md](cicd-integration.md)
3. **Advanced memory analytics**: [memory-analytics.md](memory-analytics.md)
4. **Custom tool development**: [custom-tools.md](custom-tools.md)