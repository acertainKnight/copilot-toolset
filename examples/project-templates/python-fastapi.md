# Python FastAPI Project Template

**Goal**: Complete setup example for Python FastAPI projects with GitHub Copilot integration.

## Prerequisites

- Python 3.8+
- MCP server built and running
- Basic understanding of Python and FastAPI

## Step 1: Initialize FastAPI Project

```bash
# Create new FastAPI project directory
mkdir my-fastapi-app
cd my-fastapi-app

# Set up Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install FastAPI and dependencies
pip install fastapi uvicorn python-multipart sqlalchemy alembic pytest httpx

# Create basic project structure
mkdir -p app/{models,routers,services,tests}
touch app/__init__.py app/main.py app/database.py
touch requirements.txt

# Initialize with MCP server
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"projectPath":"'$(pwd)'"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"
```

## Step 2: Generated Files and Analysis

### `COPILOT.md` - Root Context File
```markdown
# My FastAPI App - AI Assistant Context

## Project Overview
- **Type**: Python FastAPI Web Application
- **Framework**: FastAPI with Pydantic
- **Database**: SQLAlchemy ORM
- **Testing**: pytest with httpx
- **Migration**: Alembic

## Architecture
- API-first design with automatic OpenAPI documentation
- Pydantic models for request/response validation
- SQLAlchemy for database operations
- Dependency injection for services
- JWT authentication with scopes

## Development Patterns
- Use type hints throughout
- Implement proper error handling with HTTPException
- Use Pydantic BaseModel for data validation
- Follow REST API conventions
- Write comprehensive tests with pytest

## Key Dependencies
- fastapi
- uvicorn (ASGI server)
- sqlalchemy (ORM)
- alembic (migrations)
- pytest (testing)
- httpx (async HTTP client for tests)

## AI Assistant Guidelines
- Always use type hints
- Implement proper async/await patterns
- Use dependency injection for database sessions
- Validate input with Pydantic models
- Handle errors gracefully with proper HTTP status codes
- Write tests for all endpoints
```

### `.github/copilot-instructions.md` - GitHub Copilot Specific
```markdown
# GitHub Copilot Instructions

## Project Context
This is a Python FastAPI application with SQLAlchemy ORM and pytest testing.

## Coding Standards
- Use Python type hints throughout
- Follow PEP 8 style guidelines
- Implement async/await for I/O operations
- Use Pydantic models for data validation

## Preferred Patterns
- Use FastAPI dependency injection
- Implement proper error handling with HTTPException
- Use SQLAlchemy declarative models
- Write comprehensive tests with pytest and httpx
- Use environment variables for configuration

## File Naming
- Routers: snake_case (e.g., `user_router.py`)
- Models: PascalCase (e.g., `UserModel.py`)
- Services: snake_case (e.g., `user_service.py`)
- Tests: `test_*.py` or `*_test.py`
```

## Step 3: Store Project-Specific Context

```bash
# Store FastAPI patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"fastapi-endpoint-pattern","value":"FastAPI endpoints use async def, type hints for parameters, Pydantic models for request/response, and dependency injection for database sessions","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"

# Store SQLAlchemy patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"sqlalchemy-model-pattern","value":"SQLAlchemy models inherit from Base, use Column types, define relationships with foreign keys, and include __repr__ methods","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"

# Store testing patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"fastapi-testing-pattern","value":"Use httpx.AsyncClient for testing FastAPI endpoints, pytest fixtures for database setup, and test both success and error cases","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"
```

## Step 4: Create Custom Python API Chat Mode

```bash
# Create a Python API-focused chat mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"python-api","description":"Python FastAPI development specialist","systemPrompt":"You are a Python FastAPI expert. Focus on API design, async programming, database operations with SQLAlchemy, testing with pytest, and Python best practices. Always use type hints and proper error handling.","tools":["search_memory","store_memory","get_memory_stats"],"temperature":0.2}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js
```

## Step 5: Example API Development with AI Integration

### Creating a User Management API

In GitHub Copilot Chat:
```
@python-api Create a complete user management system with:

- User model with SQLAlchemy
- Pydantic schemas for request/response
- CRUD operations in a service layer
- FastAPI router with all endpoints
- Proper error handling and validation
- JWT authentication
```

Expected AI Response Structure:

#### User Model (`app/models/user.py`)
```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"
```

#### Pydantic Schemas (`app/schemas/user.py`)
```python
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class UserInDB(UserResponse):
    hashed_password: str
```

#### User Service (`app/services/user_service.py`)
```python
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from passlib.context import CryptContext
from typing import Optional, List

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    async def create_user(db: Session, user_create: UserCreate) -> User:
        try:
            hashed_password = UserService.get_password_hash(user_create.password)
            db_user = User(
                email=user_create.email,
                username=user_create.username,
                hashed_password=hashed_password
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            return db_user
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username already registered"
            )

    @staticmethod
    async def get_user(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    async def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    async def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    async def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
        db_user = await UserService.get_user(db, user_id)
        if not db_user:
            return None

        update_data = user_update.dict(exclude_unset=True)
        if "password" in update_data:
            update_data["hashed_password"] = UserService.get_password_hash(update_data.pop("password"))

        for field, value in update_data.items():
            setattr(db_user, field, value)

        try:
            db.commit()
            db.refresh(db_user)
            return db_user
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username already exists"
            )

    @staticmethod
    async def delete_user(db: Session, user_id: int) -> bool:
        db_user = await UserService.get_user(db, user_id)
        if not db_user:
            return False

        db.delete(db_user)
        db.commit()
        return True
```

## Step 6: Testing Integration

### Test Configuration (`app/tests/conftest.py`)
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db
from app.models.user import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

### User API Tests (`app/tests/test_users.py`)
```python
import pytest
from fastapi import status

def test_create_user(client):
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123"
    }
    response = client.post("/users/", json=user_data)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["username"] == user_data["username"]
    assert "id" in data
    assert "hashed_password" not in data

def test_create_user_duplicate_email(client):
    user_data = {
        "email": "test@example.com",
        "username": "testuser1",
        "password": "testpassword123"
    }
    client.post("/users/", json=user_data)

    # Try to create another user with same email
    user_data["username"] = "testuser2"
    response = client.post("/users/", json=user_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_get_user(client):
    # Create user first
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123"
    }
    create_response = client.post("/users/", json=user_data)
    user_id = create_response.json()["id"]

    # Get user
    response = client.get(f"/users/{user_id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["username"] == user_data["username"]

def test_get_user_not_found(client):
    response = client.get("/users/999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
```

## Step 7: Store Development Decisions

```bash
# Store the service pattern used
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"service-layer-pattern","value":"Using service layer with static methods for business logic, dependency injection for database sessions, proper error handling with HTTPException","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"

# Store authentication approach
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"auth-pattern","value":"Using bcrypt for password hashing, JWT tokens for authentication, and FastAPI security dependencies","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"
```

## Development Workflow Examples

### 1. API Development
```
@python-api I need to create an order management system with:
- Order model with items and total
- Payment processing integration
- Order status tracking
- Inventory validation
```

### 2. Database Operations
```
@python-api How should I implement a complex query that joins users, orders, and products with filtering and pagination?
```

### 3. Testing Strategy
```
@tester I need comprehensive tests for my FastAPI authentication system with JWT tokens
```

### 4. Performance Optimization
```
@perf-optimizer My API endpoints are slow, how can I optimize database queries and response times?
```

## VS Code Configuration

### `.vscode/settings.json`
```json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["app/tests"],
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black"
}
```

## Requirements Management

### `requirements.txt`
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
pydantic[email]==2.5.0
python-multipart==0.0.6
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
pytest==7.4.3
httpx==0.25.2
pytest-asyncio==0.21.1
```

## Success Indicators

✅ **Project structure** created with proper Python package layout
✅ **Virtual environment** activated and dependencies installed
✅ **MCP integration** working with Python-specific context
✅ **Custom chat mode** created for FastAPI development
✅ **Complete CRUD API** implemented with proper patterns
✅ **Comprehensive tests** written and passing
✅ **Memory system** storing Python/FastAPI patterns

## Common Python API Patterns Stored

- FastAPI endpoint creation with proper async/await
- SQLAlchemy model definition and relationships
- Pydantic schema validation and serialization
- Service layer pattern for business logic
- JWT authentication and authorization
- Error handling with HTTPException
- Testing with pytest and httpx
- Database migration with Alembic

## What's Next

1. **Full-stack Template**: [fullstack-react-node.md](fullstack-react-node.md)
2. **Vue.js Template**: [vue-typescript.md](vue-typescript.md)
3. **Advanced Python Patterns**: [../advanced/python-advanced.md](../advanced/python-advanced.md)
4. **Microservices Architecture**: [../advanced/microservices.md](../advanced/microservices.md)

## Troubleshooting

- **Import errors**: Ensure virtual environment is activated and packages installed
- **Database errors**: Check SQLAlchemy connection string and migrations
- **Test failures**: Verify test database isolation and proper fixtures
- **Memory not working**: Check MCP server workspace argument and permissions