# Vue 3 TypeScript Project Template

**Goal**: Complete setup example for Vue 3 TypeScript projects with GitHub Copilot integration.

## Prerequisites

- Node.js 18+
- MCP server built and running
- Basic understanding of Vue 3 and TypeScript

## Step 1: Initialize Vue 3 TypeScript Project

```bash
# Create new Vue 3 project with TypeScript
npm create vue@latest my-vue-app
cd my-vue-app

# During setup, select:
# ✅ TypeScript
# ✅ Router
# ✅ Pinia (state management)
# ✅ Vitest (testing)
# ✅ ESLint

# Install dependencies
npm install

# Initialize with MCP server
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"init_project","arguments":{"projectPath":"'$(pwd)'"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"
```

## Step 2: Generated Files and Analysis

### `COPILOT.md` - Root Context File
```markdown
# My Vue App - AI Assistant Context

## Project Overview
- **Type**: Vue 3 TypeScript Application
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Router**: Vue Router 4
- **State Management**: Pinia
- **Testing**: Vitest with Vue Test Utils

## Architecture
- Component-based architecture with Composition API
- TypeScript for type safety
- Pinia stores for state management
- Vue Router for navigation
- Single File Components (.vue)

## Development Patterns
- Use Composition API with `<script setup>`
- Implement reactive state with ref() and reactive()
- Use TypeScript interfaces for props and data
- Organize code with composables for reusable logic
- Follow Vue 3 best practices

## Key Dependencies
- Vue 3.x
- TypeScript 5.x
- Vue Router 4.x
- Pinia 2.x
- Vite 5.x
- Vitest (testing)

## AI Assistant Guidelines
- Prefer Composition API over Options API
- Use TypeScript interfaces for component props
- Implement proper reactivity patterns
- Write tests with Vitest and Vue Test Utils
- Use composables for shared logic
- Follow Vue 3 style guide
```

### `.github/copilot-instructions.md` - GitHub Copilot Specific
```markdown
# GitHub Copilot Instructions

## Project Context
This is a Vue 3 TypeScript application using Vite, Vue Router, and Pinia.

## Coding Standards
- Use Composition API with `<script setup>` syntax
- Implement TypeScript with proper interfaces
- Use Pinia for state management
- Follow Vue 3 best practices and style guide

## Preferred Patterns
- Use `ref()` and `reactive()` for reactive state
- Implement computed properties with `computed()`
- Use `watch()` and `watchEffect()` for side effects
- Create composables for reusable logic
- Use defineProps and defineEmits with TypeScript

## File Naming
- Components: PascalCase (e.g., `UserCard.vue`)
- Composables: camelCase starting with 'use' (e.g., `useUserData.ts`)
- Stores: camelCase with 'Store' suffix (e.g., `userStore.ts`)
- Tests: `*.spec.ts` or `*.test.ts`
```

## Step 3: Store Project-Specific Context

```bash
# Store Vue 3 Composition API patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"vue3-composition-pattern","value":"Use <script setup> with TypeScript, defineProps for props, ref/reactive for state, computed for derived values, and composables for reusable logic","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"

# Store Pinia patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"pinia-store-pattern","value":"Pinia stores use defineStore with state, getters, and actions. Import with useStore() in components. Use TypeScript interfaces for state typing.","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"

# Store testing patterns
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"store_memory","arguments":{"key":"vue-testing-pattern","value":"Use Vitest with Vue Test Utils for component testing. Mount components with proper props, test user interactions, and mock external dependencies.","layer":"project"}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js --workspace="$(pwd)"
```

## Step 4: Create Custom Vue Development Chat Mode

```bash
# Create a Vue-focused chat mode
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_mode","arguments":{"name":"vue-dev","description":"Vue 3 TypeScript development specialist","systemPrompt":"You are a Vue 3 TypeScript expert. Focus on Composition API, reactivity, component architecture, Pinia state management, Vue Router, and testing with Vitest. Always use modern Vue 3 patterns with proper TypeScript typing.","tools":["search_memory","store_memory","get_memory_stats"],"temperature":0.2}},"id":1}' | node /path/to/copilot-mcp/dist/server/index.js
```

## Step 5: Example Component Development with AI Integration

### Creating a User Management Component

In GitHub Copilot Chat:
```
@vue-dev Create a UserList component with these features:

- Display list of users from Pinia store
- User card components with avatar, name, email
- Add/edit/delete functionality
- TypeScript interfaces for User type
- Proper reactive state management
- Loading and error states
```

Expected AI Response Structure:

#### User Interface (`src/types/User.ts`)
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  avatar?: string;
}

export interface UpdateUserRequest {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  isActive?: boolean;
}
```

#### Pinia User Store (`src/stores/userStore.ts`)
```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, CreateUserRequest, UpdateUserRequest } from '@/types/User';

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const activeUsers = computed(() => users.value.filter(user => user.isActive));
  const userCount = computed(() => users.value.length);
  const activeUserCount = computed(() => activeUsers.value.length);

  // Actions
  const fetchUsers = async () => {
    loading.value = true;
    error.value = null;

    try {
      // Simulate API call
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      users.value = data.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt)
      }));
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading.value = false;
    }
  };

  const createUser = async (userData: CreateUserRequest) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) throw new Error('Failed to create user');

      const newUser = await response.json();
      users.value.push({
        ...newUser,
        createdAt: new Date(newUser.createdAt)
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create user';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateUser = async (userData: UpdateUserRequest) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/users/${userData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) throw new Error('Failed to update user');

      const updatedUser = await response.json();
      const index = users.value.findIndex(user => user.id === userData.id);

      if (index !== -1) {
        users.value[index] = {
          ...updatedUser,
          createdAt: new Date(updatedUser.createdAt)
        };
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update user';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteUser = async (userId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete user');

      users.value = users.value.filter(user => user.id !== userId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete user';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    users,
    loading,
    error,
    // Getters
    activeUsers,
    userCount,
    activeUserCount,
    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  };
});
```

#### UserCard Component (`src/components/UserCard.vue`)
```vue
<template>
  <div class="user-card" :class="{ inactive: !user.isActive }">
    <div class="user-avatar">
      <img
        v-if="user.avatar"
        :src="user.avatar"
        :alt="`${user.name}'s avatar`"
        class="avatar-image"
      />
      <div v-else class="avatar-placeholder">
        {{ user.name.charAt(0).toUpperCase() }}
      </div>
    </div>

    <div class="user-info">
      <h3 class="user-name">{{ user.name }}</h3>
      <p class="user-email">{{ user.email }}</p>
      <p class="user-status">
        <span :class="statusClass">{{ statusText }}</span>
      </p>
    </div>

    <div class="user-actions">
      <button
        @click="$emit('edit', user)"
        class="btn btn-edit"
        :disabled="loading"
      >
        Edit
      </button>
      <button
        @click="$emit('delete', user.id)"
        class="btn btn-delete"
        :disabled="loading"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { User } from '@/types/User';

interface Props {
  user: User;
  loading?: boolean;
}

interface Emits {
  edit: [user: User];
  delete: [userId: string];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
});

const emit = defineEmits<Emits>();

const statusClass = computed(() => ({
  'status-active': props.user.isActive,
  'status-inactive': !props.user.isActive
}));

const statusText = computed(() => props.user.isActive ? 'Active' : 'Inactive');
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  margin-bottom: 1rem;
  transition: all 0.2s;
}

.user-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-card.inactive {
  opacity: 0.7;
  background: #f5f5f5;
}

.user-avatar {
  margin-right: 1rem;
}

.avatar-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #007acc;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
}

.user-info {
  flex: 1;
}

.user-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.user-email {
  margin: 0 0 0.25rem 0;
  color: #666;
}

.user-status {
  margin: 0;
  font-size: 0.9rem;
}

.status-active {
  color: #28a745;
  font-weight: 500;
}

.status-inactive {
  color: #dc3545;
  font-weight: 500;
}

.user-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-edit {
  background: #007acc;
  color: white;
}

.btn-edit:hover:not(:disabled) {
  background: #005a9e;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover:not(:disabled) {
  background: #c82333;
}
</style>
```

## Step 6: Testing Integration

### Component Test (`src/components/__tests__/UserCard.spec.ts`)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import UserCard from '../UserCard.vue';
import type { User } from '@/types/User';

const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: new Date('2024-01-01'),
  isActive: true
};

describe('UserCard', () => {
  it('renders user information correctly', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser }
    });

    expect(wrapper.find('.user-name').text()).toBe('John Doe');
    expect(wrapper.find('.user-email').text()).toBe('john@example.com');
    expect(wrapper.find('.avatar-image').attributes('src')).toBe(mockUser.avatar);
    expect(wrapper.find('.status-active').exists()).toBe(true);
  });

  it('shows placeholder when no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined };
    const wrapper = mount(UserCard, {
      props: { user: userWithoutAvatar }
    });

    expect(wrapper.find('.avatar-placeholder').text()).toBe('J');
    expect(wrapper.find('.avatar-image').exists()).toBe(false);
  });

  it('emits edit event when edit button clicked', async () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser }
    });

    await wrapper.find('.btn-edit').trigger('click');

    expect(wrapper.emitted('edit')).toHaveLength(1);
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockUser]);
  });

  it('emits delete event when delete button clicked', async () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser }
    });

    await wrapper.find('.btn-delete').trigger('click');

    expect(wrapper.emitted('delete')).toHaveLength(1);
    expect(wrapper.emitted('delete')?.[0]).toEqual([mockUser.id]);
  });

  it('disables buttons when loading', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser, loading: true }
    });

    expect(wrapper.find('.btn-edit').element.disabled).toBe(true);
    expect(wrapper.find('.btn-delete').element.disabled).toBe(true);
  });
});
```

### Store Test (`src/stores/__tests__/userStore.spec.ts`)
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '../userStore';

// Mock fetch
global.fetch = vi.fn();

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const store = useUserStore();

    expect(store.users).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBe(null);
    expect(store.userCount).toBe(0);
  });

  it('fetches users successfully', async () => {
    const mockUsers = [
      { id: '1', name: 'John', email: 'john@test.com', isActive: true, createdAt: '2024-01-01' }
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers
    });

    const store = useUserStore();
    await store.fetchUsers();

    expect(store.loading).toBe(false);
    expect(store.error).toBe(null);
    expect(store.users).toHaveLength(1);
    expect(store.users[0].name).toBe('John');
  });

  it('handles fetch error', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const store = useUserStore();
    await store.fetchUsers();

    expect(store.loading).toBe(false);
    expect(store.error).toBe('Network error');
    expect(store.users).toEqual([]);
  });
});
```

## Development Workflow Examples

### 1. Component Development
```
@vue-dev I need to create a data table component with:
- Sortable columns
- Pagination
- Row selection
- TypeScript interfaces
- Composable for table logic
```

### 2. State Management
```
@vue-dev How should I structure a Pinia store for shopping cart functionality with items, quantities, and checkout process?
```

### 3. Router Integration
```
@vue-dev Create protected routes with authentication guards and role-based access control
```

### 4. Performance Optimization
```
@perf-optimizer My Vue component re-renders too often, how can I optimize reactivity and computed properties?
```

## Success Indicators

✅ **Vue 3 project** created with TypeScript and modern tooling
✅ **MCP integration** working with Vue-specific context
✅ **Custom chat mode** created for Vue development
✅ **Components** using Composition API and proper typing
✅ **Pinia store** with reactive state management
✅ **Comprehensive tests** with Vitest and Vue Test Utils
✅ **Memory system** storing Vue patterns and decisions

## What's Next

1. **Advanced Vue Patterns**: [../advanced/vue-advanced.md](../advanced/vue-advanced.md)
2. **Full-stack Integration**: [fullstack-vue-node.md](fullstack-vue-node.md)
3. **Mobile Development**: [vue-mobile.md](vue-mobile.md)
4. **Component Library**: [../advanced/component-library.md](../advanced/component-library.md)

## Troubleshooting

- **Composition API errors**: Ensure proper import of Vue functions
- **Pinia not working**: Check store registration in main.ts
- **TypeScript errors**: Verify interface definitions and imports
- **Test failures**: Check component mounting and proper mocking