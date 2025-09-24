/**
 * End-to-End Tests for Project Initialization with Preferences
 * Tests the complete workflow from project setup to context curation
 *
 * @module ProjectInitialization.e2e.test
 * @description E2E tests for project initialization with user preferences and context curation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { MemoryTools } from '../../src/tools/MemoryTools.js';
import { ProjectTools } from '../../src/tools/ProjectTools.js';
import { ChatModeTools } from '../../src/tools/ChatModeTools.js';
import { UnifiedMemoryManager } from '../../src/memory/UnifiedMemoryManager.js';
import { ProjectInitializer } from '../../src/project/ProjectInitializer.js';
import { ChatModeManager } from '../../src/modes/ChatModeManager.js';
import type { ToolExecutionContext } from '../../src/types/index.js';

const exec = promisify(require('child_process').exec);

describe('Project Initialization E2E', () => {
  let testProjects: string[];
  let memoryTools: MemoryTools;
  let projectTools: ProjectTools;
  let chatModeTools: ChatModeTools;
  let unifiedMemory: UnifiedMemoryManager;
  let modeManager: ChatModeManager;

  beforeEach(async () => {
    testProjects = [];

    // Initialize all components
    unifiedMemory = new UnifiedMemoryManager();
    memoryTools = new MemoryTools();
    projectTools = new ProjectTools();
    chatModeTools = new ChatModeTools();
    modeManager = new ChatModeManager();

    // Clear any existing test data
    await unifiedMemory.clearAll();
  });

  afterEach(async () => {
    // Cleanup all test projects
    for (const projectPath of testProjects) {
      await fs.rm(projectPath, { recursive: true, force: true });
    }
    await unifiedMemory.close();
  });

  describe('Complete Project Setup Workflow', () => {
    it('should initialize a React TypeScript project with preferences', async () => {
      // Step 1: Create a new React TypeScript project
      const projectPath = path.join(os.tmpdir(), `e2e-react-ts-${Date.now()}`);
      testProjects.push(projectPath);
      await fs.mkdir(projectPath, { recursive: true });

      const context: ToolExecutionContext = {
        workspacePath: projectPath,
        timestamp: Date.now(),
        userId: 'e2e-test-user'
      };

      // Create realistic React TypeScript project structure
      await createReactTypeScriptProject(projectPath);

      // Step 2: Store user preferences before initialization
      console.log('Step 2: Storing user preferences...');

      await memoryTools.storeUnifiedMemory({
        content: 'Always use functional components with hooks in React',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'react', 'components'],
        metadata: { category: 'react', importance: 0.9 }
      }, context);

      await memoryTools.storeUnifiedMemory({
        content: 'Prefer TypeScript strict mode with all checks enabled',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'typescript', 'configuration'],
        metadata: { category: 'typescript', importance: 1.0 }
      }, context);

      await memoryTools.storeUnifiedMemory({
        content: 'Use Prettier with 2-space indentation and single quotes',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'formatting', 'prettier'],
        metadata: { category: 'formatting', importance: 0.8 }
      }, context);

      await memoryTools.storeUnifiedMemory({
        content: 'Organize imports: React first, then external, then internal',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'imports', 'organization'],
        metadata: { category: 'style', importance: 0.7 }
      }, context);

      // Step 3: Extract preferences from existing code
      console.log('Step 3: Extracting preferences from existing code...');

      const componentCode = await fs.readFile(
        path.join(projectPath, 'src', 'App.tsx'),
        'utf-8'
      );

      const extractResult = await memoryTools.extractCodingPreferences({
        content: componentCode,
        language: 'typescript',
        detectFormatting: true,
        detectPatterns: true
      }, context);

      expect(extractResult.isError).toBeUndefined();

      // Step 4: Initialize project with MCP tools
      console.log('Step 4: Initializing project...');

      const initResult = await projectTools.initProject({}, context);
      expect(initResult.isError).toBeUndefined();

      // Step 5: Verify generated files
      console.log('Step 5: Verifying generated files...');

      // Check COPILOT.md
      const copilotMdPath = path.join(projectPath, 'COPILOT.md');
      const copilotMdExists = await fs.access(copilotMdPath).then(() => true).catch(() => false);
      expect(copilotMdExists).toBe(true);

      const copilotMd = await fs.readFile(copilotMdPath, 'utf-8');
      expect(copilotMd).toContain('React');
      expect(copilotMd).toContain('TypeScript');

      // Check .github/copilot-instructions.md
      const instructionsPath = path.join(projectPath, '.github', 'copilot-instructions.md');
      const instructionsExists = await fs.access(instructionsPath).then(() => true).catch(() => false);
      expect(instructionsExists).toBe(true);

      const instructions = await fs.readFile(instructionsPath, 'utf-8');

      // Should contain preference loading instructions
      expect(instructions).toContain('## Loading User Preferences');
      expect(instructions).toContain('get_user_preferences');
      expect(instructions).toContain('curate_context');

      // Should mention detected technologies
      expect(instructions).toContain('React');
      expect(instructions).toContain('TypeScript');
      expect(instructions).toContain('hooks');

      // Step 6: Create custom chat mode for the project
      console.log('Step 6: Creating custom chat mode...');

      const modeResult = await chatModeTools.createMode({
        name: 'react-developer',
        description: 'React development with TypeScript and user preferences',
        systemPrompt: 'You are a React/TypeScript expert. Apply user preferences.',
        tools: ['get_user_preferences', 'curate_context', 'store_memory'],
        temperature: 0.7
      }, context);

      expect(modeResult.isError).toBeUndefined();

      // Verify chat mode files
      const modePath = path.join(projectPath, '.github', 'chatmodes', 'react-developer.chatmode.md');
      const modeExists = await fs.access(modePath).then(() => true).catch(() => false);
      expect(modeExists).toBe(true);

      // Step 7: Curate comprehensive context
      console.log('Step 7: Curating comprehensive context...');

      const contextResult = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        includePatterns: true,
        maxTokens: 4000,
        format: 'markdown'
      }, context);

      expect(contextResult.isError).toBeUndefined();

      const curatedContext = contextResult.content[0].text;
      expect(curatedContext).toContain('functional components');
      expect(curatedContext).toContain('TypeScript strict mode');
      expect(curatedContext).toContain('2-space indentation');
      expect(curatedContext).toContain('React');

      // Step 8: Simulate GitHub Copilot session
      console.log('Step 8: Simulating GitHub Copilot session...');

      // Store a coding session memory
      await memoryTools.storeUnifiedMemory({
        content: 'User is working on authentication feature using React hooks',
        tier: 'long_term',
        scope: 'project',
        project_id: projectPath,
        tags: ['session', 'feature', 'authentication'],
        metadata: {
          feature: 'authentication',
          timestamp: Date.now()
        }
      }, context);

      // Retrieve relevant context for the session
      const sessionContext = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        searchQuery: 'authentication React hooks',
        maxTokens: 2000
      }, context);

      expect(sessionContext.content[0].text).toContain('authentication');
      expect(sessionContext.content[0].text).toContain('functional components');
    });

    it('should handle Python Django project initialization', async () => {
      const projectPath = path.join(os.tmpdir(), `e2e-django-${Date.now()}`);
      testProjects.push(projectPath);
      await fs.mkdir(projectPath, { recursive: true });

      const context: ToolExecutionContext = {
        workspacePath: projectPath,
        timestamp: Date.now(),
        userId: 'e2e-test-user'
      };

      // Create Django project structure
      await createDjangoProject(projectPath);

      // Store Python-specific preferences
      await memoryTools.storeUnifiedMemory({
        content: 'Use type hints for all function signatures',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'python', 'typing'],
        metadata: { category: 'python' }
      }, context);

      await memoryTools.storeUnifiedMemory({
        content: 'Follow PEP 8 with 4-space indentation',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'formatting', 'python', 'pep8'],
        metadata: { category: 'formatting' }
      }, context);

      await memoryTools.storeUnifiedMemory({
        content: 'Use Django class-based views over function-based views',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'django', 'views'],
        metadata: { category: 'django' }
      }, context);

      // Extract preferences from Python code
      const viewsCode = await fs.readFile(
        path.join(projectPath, 'app', 'views.py'),
        'utf-8'
      );

      await memoryTools.extractCodingPreferences({
        content: viewsCode,
        language: 'python',
        detectFormatting: true
      }, context);

      // Initialize project
      const initResult = await projectTools.initProject({}, context);
      expect(initResult.isError).toBeUndefined();

      // Verify instructions include Python/Django specifics
      const instructionsPath = path.join(projectPath, '.github', 'copilot-instructions.md');
      const instructions = await fs.readFile(instructionsPath, 'utf-8');

      expect(instructions).toContain('Django');
      expect(instructions).toContain('Python');
      expect(instructions).toContain('type hints');

      // Curate Python-specific context
      const contextResult = await memoryTools.curateContext({
        includePreferences: true,
        tags: ['python', 'django'],
        format: 'markdown'
      }, context);

      expect(contextResult.content[0].text).toContain('PEP 8');
      expect(contextResult.content[0].text).toContain('class-based views');
    });

    it('should handle monorepo with multiple projects', async () => {
      const monorepoPath = path.join(os.tmpdir(), `e2e-monorepo-${Date.now()}`);
      testProjects.push(monorepoPath);
      await fs.mkdir(monorepoPath, { recursive: true });

      // Create monorepo structure
      await createMonorepoStructure(monorepoPath);

      // Initialize each package
      const packages = ['frontend', 'backend', 'shared'];

      for (const pkg of packages) {
        const packagePath = path.join(monorepoPath, 'packages', pkg);

        const context: ToolExecutionContext = {
          workspacePath: packagePath,
          timestamp: Date.now(),
          userId: 'e2e-test-user'
        };

        // Store package-specific preferences
        await memoryTools.storeUnifiedMemory({
          content: `Package ${pkg} specific configuration`,
          tier: 'long_term',
          scope: 'project',
          project_id: packagePath,
          tags: ['package', pkg, 'monorepo'],
          metadata: { package: pkg }
        }, context);

        // Initialize package
        const initResult = await projectTools.initProject({}, context);
        expect(initResult.isError).toBeUndefined();
      }

      // Create monorepo-wide context
      const monorepoContext: ToolExecutionContext = {
        workspacePath: monorepoPath,
        timestamp: Date.now(),
        userId: 'e2e-test-user'
      };

      // Store monorepo preferences
      await memoryTools.storeUnifiedMemory({
        content: 'Use lerna for monorepo management',
        tier: 'core',
        scope: 'project',
        project_id: monorepoPath,
        tags: ['preference', 'monorepo', 'lerna'],
        metadata: { tool: 'lerna' }
      }, monorepoContext);

      // Curate monorepo context
      const contextResult = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        workspacePath: monorepoPath
      }, monorepoContext);

      expect(contextResult.content[0].text).toContain('monorepo');
      expect(contextResult.content[0].text).toContain('lerna');
      expect(contextResult.content[0].text).toContain('frontend');
      expect(contextResult.content[0].text).toContain('backend');
    });
  });

  describe('Preference Migration and Evolution', () => {
    it('should migrate preferences across project versions', async () => {
      const projectPath = path.join(os.tmpdir(), `e2e-migration-${Date.now()}`);
      testProjects.push(projectPath);
      await fs.mkdir(projectPath, { recursive: true });

      const context: ToolExecutionContext = {
        workspacePath: projectPath,
        timestamp: Date.now(),
        userId: 'e2e-test-user'
      };

      // Version 1: JavaScript project
      await createJavaScriptProject(projectPath);

      // Store initial preferences
      await memoryTools.storeUnifiedMemory({
        content: 'Use ES6+ features',
        tier: 'core',
        scope: 'project',
        project_id: projectPath,
        tags: ['preference', 'javascript', 'es6'],
        metadata: { version: 1 }
      }, context);

      // Initialize as JavaScript
      await projectTools.initProject({}, context);

      // Simulate migration to TypeScript
      await migrateToTypeScript(projectPath);

      // Update preferences for TypeScript
      await memoryTools.storeUnifiedMemory({
        content: 'Migrated to TypeScript with strict mode',
        tier: 'core',
        scope: 'project',
        project_id: projectPath,
        tags: ['preference', 'typescript', 'migration'],
        metadata: { version: 2, migratedFrom: 'javascript' }
      }, context);

      // Re-initialize after migration
      const reinitResult = await projectTools.initProject({
        enhance: true
      }, context);

      expect(reinitResult.isError).toBeUndefined();

      // Verify migration is reflected in context
      const contextResult = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true
      }, context);

      expect(contextResult.content[0].text).toContain('TypeScript');
      expect(contextResult.content[0].text).toContain('migration');
    });

    it('should handle preference conflicts and resolution', async () => {
      const projectPath = path.join(os.tmpdir(), `e2e-conflicts-${Date.now()}`);
      testProjects.push(projectPath);
      await fs.mkdir(projectPath, { recursive: true });

      const context: ToolExecutionContext = {
        workspacePath: projectPath,
        timestamp: Date.now(),
        userId: 'e2e-test-user'
      };

      // Store conflicting preferences
      await memoryTools.storeUnifiedMemory({
        content: 'Use tabs for indentation',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'formatting', 'indentation'],
        metadata: {
          source: 'user-config',
          timestamp: Date.now() - 10000
        }
      }, context);

      await memoryTools.storeUnifiedMemory({
        content: 'Use 2 spaces for indentation',
        tier: 'core',
        scope: 'project',
        project_id: projectPath,
        tags: ['preference', 'formatting', 'indentation'],
        metadata: {
          source: 'project-config',
          timestamp: Date.now()
        }
      }, context);

      // Resolve conflicts (project-specific should override global)
      const contextResult = await memoryTools.curateContext({
        includePreferences: true,
        resolveConflicts: true
      }, context);

      // Project-specific preference should take precedence
      const contextText = contextResult.content[0].text;
      const spacesIndex = contextText.indexOf('2 spaces');
      const tabsIndex = contextText.indexOf('tabs');

      if (spacesIndex !== -1 && tabsIndex !== -1) {
        expect(spacesIndex).toBeLessThan(tabsIndex); // Spaces mentioned first (higher priority)
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large codebases efficiently', async () => {
      const projectPath = path.join(os.tmpdir(), `e2e-large-${Date.now()}`);
      testProjects.push(projectPath);
      await fs.mkdir(projectPath, { recursive: true });

      const context: ToolExecutionContext = {
        workspacePath: projectPath,
        timestamp: Date.now(),
        userId: 'e2e-test-user'
      };

      // Create large codebase
      await createLargeCodebase(projectPath, 100); // 100 files

      const startTime = Date.now();

      // Initialize large project
      const initResult = await projectTools.initProject({}, context);
      expect(initResult.isError).toBeUndefined();

      const initDuration = Date.now() - startTime;
      expect(initDuration).toBeLessThan(15000); // Should complete within 15 seconds

      // Extract preferences from multiple files
      const files = await fs.readdir(path.join(projectPath, 'src'));
      const extractPromises = files.slice(0, 10).map(async (file) => {
        const content = await fs.readFile(
          path.join(projectPath, 'src', file),
          'utf-8'
        );
        return memoryTools.extractCodingPreferences({
          content,
          language: 'typescript'
        }, context);
      });

      await Promise.all(extractPromises);

      // Curate context for large project
      const contextStartTime = Date.now();
      const contextResult = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        maxTokens: 8000
      }, context);

      const contextDuration = Date.now() - contextStartTime;
      expect(contextDuration).toBeLessThan(500); // Context curation <500ms
      expect(contextResult.isError).toBeUndefined();
    });

    it('should maintain performance with accumulated preferences', async () => {
      const projectPath = path.join(os.tmpdir(), `e2e-accumulation-${Date.now()}`);
      testProjects.push(projectPath);
      await fs.mkdir(projectPath, { recursive: true });

      const context: ToolExecutionContext = {
        workspacePath: projectPath,
        timestamp: Date.now(),
        userId: 'e2e-test-user'
      };

      // Simulate accumulated preferences over time
      const preferenceCount = 200;
      for (let i = 0; i < preferenceCount; i++) {
        await memoryTools.storeUnifiedMemory({
          content: `Preference ${i}: ${generatePreferenceContent(i)}`,
          tier: i < 50 ? 'core' : 'long_term',
          scope: i % 3 === 0 ? 'global' : 'project',
          project_id: i % 3 !== 0 ? projectPath : undefined,
          tags: ['preference', `category-${i % 10}`],
          metadata: {
            index: i,
            timestamp: Date.now() - (preferenceCount - i) * 1000
          }
        }, context);
      }

      // Test retrieval performance
      const retrievalStart = Date.now();
      const prefsResult = await memoryTools.getUserPreferences({}, context);
      const retrievalDuration = Date.now() - retrievalStart;

      expect(retrievalDuration).toBeLessThan(100); // <100ms with 200 preferences
      expect(prefsResult.isError).toBeUndefined();

      // Test context curation with many preferences
      const curationStart = Date.now();
      const contextResult = await memoryTools.curateContext({
        includePreferences: true,
        maxTokens: 4000
      }, context);
      const curationDuration = Date.now() - curationStart;

      expect(curationDuration).toBeLessThan(200); // <200ms
      expect(contextResult.isError).toBeUndefined();
    });
  });

  // Helper functions for creating test projects

  async function createReactTypeScriptProject(projectPath: string): Promise<void> {
    // package.json
    const packageJson = {
      name: 'test-react-app',
      version: '1.0.0',
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        typescript: '^5.0.0'
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.0.0',
        vite: '^4.0.0'
      }
    };

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }]
    };

    await fs.writeFile(
      path.join(projectPath, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );

    // Create src directory and components
    const srcPath = path.join(projectPath, 'src');
    await fs.mkdir(srcPath, { recursive: true });

    // App.tsx
    const appComponent = `import React, { useState, useEffect } from 'react';
import './App.css';

interface User {
  id: string;
  name: string;
  email: string;
}

function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async (): Promise<void> => {
    try {
      setLoading(true);
      // Simulated API call
      const userData: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com'
      };
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <h1>Welcome, {user?.name || 'Guest'}</h1>
      <p>Email: {user?.email}</p>
    </div>
  );
}

export default App;`;

    await fs.writeFile(path.join(srcPath, 'App.tsx'), appComponent);
  }

  async function createDjangoProject(projectPath: string): Promise<void> {
    // requirements.txt
    await fs.writeFile(
      path.join(projectPath, 'requirements.txt'),
      'django>=4.2.0\ndjango-rest-framework>=3.14.0\npython-dotenv>=1.0.0'
    );

    // manage.py
    const managePy = `#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()`;

    await fs.writeFile(path.join(projectPath, 'manage.py'), managePy);

    // Create app directory
    const appPath = path.join(projectPath, 'app');
    await fs.mkdir(appPath, { recursive: true });

    // views.py
    const viewsPy = `from typing import Optional, Dict, Any
from django.shortcuts import render
from django.views.generic import View, ListView, DetailView
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator

class UserListView(ListView):
    """List view for users with pagination."""

    template_name = 'users/list.html'
    context_object_name = 'users'
    paginate_by = 20

    def get_queryset(self):
        """Get filtered queryset of users."""
        queryset = super().get_queryset()
        search_term = self.request.GET.get('search')
        if search_term:
            queryset = queryset.filter(name__icontains=search_term)
        return queryset

@method_decorator(login_required, name='dispatch')
class UserDetailView(DetailView):
    """Detail view for individual user."""

    template_name = 'users/detail.html'
    context_object_name = 'user'

    def get_context_data(self, **kwargs: Any) -> Dict[str, Any]:
        """Add additional context data."""
        context = super().get_context_data(**kwargs)
        context['related_items'] = self.get_related_items()
        return context

    def get_related_items(self) -> list:
        """Get items related to this user."""
        return []`;

    await fs.writeFile(path.join(appPath, 'views.py'), viewsPy);

    // models.py
    const modelsPy = `from typing import Optional
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """Extended user model with additional fields."""

    bio: models.TextField = models.TextField(blank=True)
    avatar: models.ImageField = models.ImageField(upload_to='avatars/', null=True, blank=True)
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.username} ({self.email})"`;

    await fs.writeFile(path.join(appPath, 'models.py'), modelsPy);
  }

  async function createMonorepoStructure(monorepoPath: string): Promise<void> {
    // Root package.json
    const rootPackage = {
      name: 'monorepo',
      private: true,
      workspaces: ['packages/*'],
      devDependencies: {
        lerna: '^7.0.0',
        typescript: '^5.0.0'
      },
      scripts: {
        build: 'lerna run build',
        test: 'lerna run test'
      }
    };

    await fs.writeFile(
      path.join(monorepoPath, 'package.json'),
      JSON.stringify(rootPackage, null, 2)
    );

    // lerna.json
    const lernaConfig = {
      version: 'independent',
      npmClient: 'npm',
      packages: ['packages/*']
    };

    await fs.writeFile(
      path.join(monorepoPath, 'lerna.json'),
      JSON.stringify(lernaConfig, null, 2)
    );

    // Create packages
    const packagesPath = path.join(monorepoPath, 'packages');
    await fs.mkdir(packagesPath, { recursive: true });

    // Frontend package
    const frontendPath = path.join(packagesPath, 'frontend');
    await fs.mkdir(frontendPath, { recursive: true });
    await fs.writeFile(
      path.join(frontendPath, 'package.json'),
      JSON.stringify({
        name: '@monorepo/frontend',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
          '@monorepo/shared': '^1.0.0'
        }
      }, null, 2)
    );

    // Backend package
    const backendPath = path.join(packagesPath, 'backend');
    await fs.mkdir(backendPath, { recursive: true });
    await fs.writeFile(
      path.join(backendPath, 'package.json'),
      JSON.stringify({
        name: '@monorepo/backend',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.0',
          '@monorepo/shared': '^1.0.0'
        }
      }, null, 2)
    );

    // Shared package
    const sharedPath = path.join(packagesPath, 'shared');
    await fs.mkdir(sharedPath, { recursive: true });
    await fs.writeFile(
      path.join(sharedPath, 'package.json'),
      JSON.stringify({
        name: '@monorepo/shared',
        version: '1.0.0',
        main: 'index.js'
      }, null, 2)
    );
  }

  async function createJavaScriptProject(projectPath: string): Promise<void> {
    const packageJson = {
      name: 'javascript-project',
      version: '1.0.0',
      main: 'index.js',
      scripts: {
        start: 'node index.js'
      }
    };

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const indexJs = `// JavaScript ES6+ project
const express = require('express');

class App {
  constructor() {
    this.app = express();
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.json({ message: 'Hello World' });
    });
  }

  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(\`Server running on port \${port}\`);
    });
  }
}

module.exports = App;`;

    await fs.writeFile(path.join(projectPath, 'index.js'), indexJs);
  }

  async function migrateToTypeScript(projectPath: string): Promise<void> {
    // Add TypeScript to package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      typescript: '^5.0.0',
      '@types/node': '^20.0.0',
      '@types/express': '^4.17.0'
    };
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Add tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: './dist',
        rootDir: './'
      }
    };
    await fs.writeFile(
      path.join(projectPath, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );

    // Convert index.js to index.ts
    const indexTs = `// TypeScript migration
import express, { Express, Request, Response } from 'express';

class App {
  private app: Express;

  constructor() {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.get('/', (req: Request, res: Response) => {
      res.json({ message: 'Hello World from TypeScript' });
    });
  }

  public start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(\`Server running on port \${port}\`);
    });
  }
}

export default App;`;

    await fs.writeFile(path.join(projectPath, 'index.ts'), indexTs);

    // Remove old JavaScript file
    await fs.unlink(path.join(projectPath, 'index.js')).catch(() => {});
  }

  async function createLargeCodebase(projectPath: string, fileCount: number): Promise<void> {
    const srcPath = path.join(projectPath, 'src');
    await fs.mkdir(srcPath, { recursive: true });

    // Create package.json
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: 'large-codebase',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
          typescript: '^5.0.0'
        }
      }, null, 2)
    );

    // Generate files
    for (let i = 0; i < fileCount; i++) {
      const fileName = `Component${i}.tsx`;
      const content = `import React, { useState, useEffect } from 'react';

interface Component${i}Props {
  id: string;
  name: string;
  data?: any;
}

export const Component${i}: React.FC<Component${i}Props> = ({ id, name, data }) => {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simulated data loading
      const response = await fetch(\`/api/component${i}/\${id}\`);
      const result = await response.json();
      setState(result);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading Component ${i}...</div>;
  }

  return (
    <div className="component-${i}">
      <h2>{name}</h2>
      <div>ID: {id}</div>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
};

export default Component${i};`;

      await fs.writeFile(path.join(srcPath, fileName), content);
    }
  }

  function generatePreferenceContent(index: number): string {
    const preferences = [
      'Use async/await over callbacks',
      'Prefer const over let',
      'Use template literals for string concatenation',
      'Always handle errors explicitly',
      'Use meaningful variable names',
      'Keep functions small and focused',
      'Write tests for critical paths',
      'Use dependency injection',
      'Follow SOLID principles',
      'Document public APIs'
    ];

    return preferences[index % preferences.length];
  }
});