# Project Initialization Workflows

Complete workflows for initializing different types of projects with the MCP server.

## Basic Initialization Workflow

### Step 1: Setup Project Structure

```bash
# Create new project directory
mkdir my-new-project
cd my-new-project

# Initialize git repository (optional)
git init

# Create basic project files (package.json, etc.)
```

### Step 2: Initialize with MCP Server

```bash
# Option A: Using command line
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"project_path":"'"$(pwd)"'"}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

# Option B: Using GitHub Copilot Chat (preferred)
# In VS Code Copilot Chat:
@copilot Initialize this project with the MCP server tools.
```

### Step 3: Verify Initialization

Check that these files were created:
- `COPILOT.md` (root-level project context)
- `.github/copilot-instructions.md` (GitHub Copilot specific)
- `.copilot/memory/` directory structure

```bash
# Verify files created
ls -la COPILOT.md .github/copilot-instructions.md
ls -la .copilot/memory/
```

## Project Type Examples

### React TypeScript Application

```bash
# 1. Create React project
npx create-react-app my-react-app --template typescript
cd my-react-app

# 2. Initialize MCP server (in Copilot Chat)
Initialize this React TypeScript project with these preferences:
- Use functional components with hooks
- Prefer styled-components for styling
- Use React Testing Library for tests
- Follow feature-based folder structure
- TypeScript strict mode enabled

# 3. Store project architecture in memory
Remember for this project: We're building a React dashboard with the following architecture:
- Frontend: React 18 with TypeScript and styled-components
- State management: Zustand for global state
- Routing: React Router v6
- Testing: Jest + React Testing Library
- Build: Create React App with custom webpack config
```

**Generated Files Example:**
```markdown
# COPILOT.md
## Project Context for AI Assistants

This is a React project using TypeScript.

### Architecture Patterns Detected
- React functional components
- TypeScript configuration
- Modern build tooling (Create React App)

### Key Dependencies
- react: ^18.2.0
- typescript: ^4.9.5
- @types/react: ^18.0.28
```

### Node.js Express API

```bash
# 1. Create Express project
mkdir my-express-api
cd my-express-api
npm init -y
npm install express typescript @types/express @types/node
npm install -D nodemon ts-node

# 2. Initialize with MCP (in Copilot Chat)
Initialize this Node.js Express API project with these specifications:
- TypeScript with strict configuration
- Express.js with REST API patterns
- PostgreSQL with Prisma ORM
- JWT authentication
- Input validation with Joi
- Error handling middleware
- Rate limiting and security middleware

# 3. Store API conventions
Remember our API conventions for this project:
- All endpoints return { success: boolean, data?: any, error?: string }
- Use HTTP status codes: 200 success, 400 client error, 500 server error
- Authentication via Authorization: Bearer <token> header
- Input validation with Joi schemas
- Structured error logging
```

### Python FastAPI Project

```bash
# 1. Create Python project
mkdir my-fastapi-project
cd my-fastapi-project
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy pydantic

# 2. Initialize with MCP (in Copilot Chat)
Initialize this Python FastAPI project with these requirements:
- FastAPI with automatic API documentation
- SQLAlchemy ORM with PostgreSQL
- Pydantic v2 for data validation
- Async/await patterns throughout
- pytest for testing with test database
- Alembic for database migrations
- Docker containerization

# 3. Store Python project patterns
Remember for this Python project:
- Use async/await for all database operations
- Pydantic BaseModel for request/response schemas
- SQLAlchemy 2.0 syntax with async sessions
- Dependency injection for database sessions
- Environment-based configuration with Pydantic Settings
- pytest-asyncio for testing async functions
```

### Next.js Full-Stack Application

```bash
# 1. Create Next.js project
npx create-next-app@latest my-nextjs-app --typescript --tailwind --eslint --app
cd my-nextjs-app

# 2. Initialize with MCP (in Copilot Chat)
Initialize this Next.js full-stack application:
- Next.js 14 with App Router
- TypeScript with strict mode
- Tailwind CSS with custom design system
- Prisma with PostgreSQL
- NextAuth.js for authentication
- Server-side rendering and static generation
- API routes with proper error handling
- Zod for runtime validation

# 3. Store Next.js architecture decisions
Remember our Next.js architecture:
- App Router structure with nested layouts
- Server Components by default, Client Components when needed
- API routes in app/api/ with proper TypeScript types
- Database operations in server actions
- Middleware for authentication and rate limiting
- Optimized for Vercel deployment with edge functions
```

## Advanced Initialization Workflows

### Monorepo with Multiple Applications

```bash
# 1. Setup monorepo structure
mkdir my-monorepo
cd my-monorepo
npm init -y
npm install -D lerna nx

# 2. Create workspace structure
mkdir -p apps/web apps/api apps/mobile
mkdir -p packages/ui packages/shared

# 3. Initialize each application
cd apps/web
# Initialize React app with MCP
cd ../api
# Initialize Express API with MCP
cd ../mobile
# Initialize React Native app with MCP

# 4. Store monorepo architecture (in Copilot Chat)
Remember this monorepo architecture:
- Workspace: Lerna + Nx for package management
- apps/web: Next.js frontend with TypeScript
- apps/api: Node.js Express API with PostgreSQL
- apps/mobile: React Native with Expo
- packages/ui: Shared React component library
- packages/shared: Shared utilities and types
- Shared tooling: ESLint, Prettier, TypeScript configs
```

### Microservices Architecture

```bash
# 1. Create microservices structure
mkdir my-microservices
cd my-microservices

# 2. Create individual services
mkdir services/user-service services/order-service services/payment-service
mkdir services/notification-service

# 3. Initialize each service
cd services/user-service
# Initialize with MCP for user management
cd ../order-service
# Initialize with MCP for order processing
cd ../payment-service
# Initialize with MCP for payment processing

# 4. Store microservices architecture (in Copilot Chat)
Remember our microservices architecture:
- API Gateway: Kong or AWS API Gateway for routing
- Services: Node.js with Express, each with own database
- Message Queue: Redis for pub/sub between services
- Authentication: JWT tokens with shared secret
- Database: PostgreSQL per service (database-per-service pattern)
- Deployment: Docker containers with Kubernetes orchestration
- Monitoring: Prometheus + Grafana for metrics
```

## Automated Initialization Scripts

### Shell Script for React Projects

Create `scripts/init-react-project.sh`:

```bash
#!/bin/bash

PROJECT_NAME=$1
if [ -z "$PROJECT_NAME" ]; then
    echo "Usage: $0 <project-name>"
    exit 1
fi

# Create React project
npx create-react-app "$PROJECT_NAME" --template typescript
cd "$PROJECT_NAME"

# Install additional dependencies
npm install styled-components @types/styled-components
npm install -D @testing-library/jest-dom

# Initialize with MCP server
echo "Initializing MCP server..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"project_path":"'"$(pwd)"'"}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

# Store initial project preferences
echo "Storing project preferences..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"content":"React TypeScript project with styled-components, functional components, and React Testing Library","layer":"project","tags":["react","typescript","styled-components"]}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

echo "✅ React project '$PROJECT_NAME' initialized with MCP server"
echo "📁 Generated files: COPILOT.md, .github/copilot-instructions.md, .copilot/memory/"
echo "🚀 Start development: cd $PROJECT_NAME && npm start"
```

### PowerShell Script for Windows

Create `scripts/Init-ReactProject.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName
)

# Create React project
npx create-react-app $ProjectName --template typescript
Set-Location $ProjectName

# Install additional dependencies
npm install styled-components "@types/styled-components"
npm install -D "@testing-library/jest-dom"

# Initialize with MCP server
Write-Host "Initializing MCP server..." -ForegroundColor Green
$initCommand = '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"project_path":"' + (Get-Location).Path.Replace('\', '\\') + '"}},"id":1}'
$initCommand | copilot-mcp-server --workspace="$(Get-Location)"

# Store initial project preferences
Write-Host "Storing project preferences..." -ForegroundColor Green
$storeCommand = '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"content":"React TypeScript project with styled-components, functional components, and React Testing Library","layer":"project","tags":["react","typescript","styled-components"]}},"id":1}'
$storeCommand | copilot-mcp-server --workspace="$(Get-Location)"

Write-Host "✅ React project '$ProjectName' initialized with MCP server" -ForegroundColor Green
Write-Host "📁 Generated files: COPILOT.md, .github/copilot-instructions.md, .copilot/memory/" -ForegroundColor Yellow
Write-Host "🚀 Start development: cd $ProjectName && npm start" -ForegroundColor Cyan
```

## Verification and Testing

### Verify Initialization Success

```bash
# Check files were created
test_init_success() {
    echo "Testing initialization success..."

    # Check required files exist
    if [[ -f "COPILOT.md" && -f ".github/copilot-instructions.md" && -d ".copilot/memory" ]]; then
        echo "✅ All required files created"
    else
        echo "❌ Missing required files"
        return 1
    fi

    # Test memory system
    echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server --workspace="$(pwd)" > /tmp/memory_test.json

    if grep -q "Total memories" /tmp/memory_test.json; then
        echo "✅ Memory system operational"
    else
        echo "❌ Memory system not working"
        return 1
    fi

    echo "🎉 Initialization verification complete!"
}

# Run verification
test_init_success
```

### Integration Test

```bash
# Complete integration test
integration_test() {
    echo "Running integration test..."

    # 1. Create test project
    mkdir test-integration-$(date +%s)
    cd test-integration-*

    # 2. Create basic package.json
    echo '{"name":"test","version":"1.0.0","scripts":{"start":"echo start"}}' > package.json

    # 3. Initialize with MCP
    echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"project_path":"'"$(pwd)"'"}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

    # 4. Test memory operations
    echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"content":"Integration test memory","layer":"project","tags":["test"]}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

    echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_memory","arguments":{"query":"integration test"}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

    # 5. Cleanup
    cd ..
    rm -rf test-integration-*

    echo "✅ Integration test completed successfully"
}

# Run integration test
integration_test
```

## Common Issues and Solutions

### Issue: MCP Server Not Found

```bash
# Solution: Verify global installation
which copilot-mcp-server
# If not found, run:
./scripts/install-global.sh
```

### Issue: Permission Denied

```bash
# Solution: Fix file permissions
chmod +x dist/server/index.js
# Or reinstall globally:
npm run build && ./scripts/install-global.sh
```

### Issue: Memory System Not Working

```bash
# Solution: Check memory system status
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_memory_stats","arguments":{}},"id":1}' | copilot-mcp-server

# If errors, check storage directories:
ls -la ~/.copilot-mcp/
```

### Issue: Project Files Not Generated

```bash
# Solution: Check project path and permissions
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"project_path":"'"$(pwd)"'"}},"id":1}' | copilot-mcp-server --workspace="$(pwd)"

# Check if directory is writable
touch test-write && rm test-write
```

## Next Steps

After successful initialization:

1. **Configure VS Code**: Set up [VS Code integration](../integration/vscode-setup.md)
2. **Create Custom Modes**: Add [project-specific chat modes](../chat-modes/create-custom-mode.md)
3. **Store Project Knowledge**: Use [memory system](../memory/quick-start.md) to store decisions
4. **Set up Automation**: Implement [CI/CD workflows](ci-cd-integration.md)

## Templates and Boilerplates

Find complete project templates in:
- [React TypeScript Template](../templates/react-typescript-template/)
- [Node.js API Template](../templates/nodejs-api-template/)
- [Full-Stack Next.js Template](../templates/nextjs-fullstack-template/)
- [Python FastAPI Template](../templates/python-fastapi-template/)