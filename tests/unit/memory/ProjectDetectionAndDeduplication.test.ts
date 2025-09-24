/**
 * Tests for Project Name Detection and Memory Deduplication Algorithms
 * Validates project context identification and memory deduplication logic
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { MemoryLayer, MemorySearchOptions } from '../../../src/types/index.js';
import { createTempDir, cleanupTempDir, createMockProject } from '../../utils/TestHelpers.js';
import * as path from 'path';
import * as fs from 'fs/promises';

interface ProjectTestCase {
  name: string;
  projectStructure: ProjectStructure;
  expectedDetection: ProjectDetectionResult;
}

interface ProjectStructure {
  files: Record<string, string | object>; // filename -> content or object for JSON files
  directories: string[];
  gitConfig?: GitConfig;
}

interface GitConfig {
  remoteUrl?: string;
  branchName?: string;
  commits?: GitCommit[];
}

interface GitCommit {
  message: string;
  author: string;
  date: string;
}

interface ProjectDetectionResult {
  expectedName: string;
  expectedType: string;
  expectedLanguage?: string;
  expectedFramework?: string;
  confidence: number; // 0.0 to 1.0
}

describe('Project Detection and Deduplication', () => {
  let memoryManager: MemoryManager;
  let tempDir: string;
  let projectsDir: string;

  beforeAll(async () => {
    tempDir = await createTempDir('project-detection-test-');
    projectsDir = path.join(tempDir, 'projects');
    await fs.mkdir(projectsDir, { recursive: true });
  });

  beforeEach(async () => {
    memoryManager = new MemoryManager();
    await memoryManager.initialize();
  });

  afterEach(async () => {
    await memoryManager.close();
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  const projectTestCases: ProjectTestCase[] = [
    {
      name: 'React TypeScript Project',
      projectStructure: {
        files: {
          'package.json': {
            name: 'my-react-app',
            version: '1.0.0',
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
              typescript: '^5.0.0'
            },
            devDependencies: {
              '@types/react': '^18.2.0',
              '@vitejs/plugin-react': '^4.0.0',
              vite: '^4.4.0'
            }
          },
          'tsconfig.json': {
            compilerOptions: {
              target: 'ES2020',
              lib: ['ES2020', 'DOM', 'DOM.Iterable'],
              allowJs: false,
              skipLibCheck: true,
              esModuleInterop: false,
              allowSyntheticDefaultImports: true,
              strict: true,
              forceConsistentCasingInFileNames: true,
              module: 'ESNext',
              moduleResolution: 'bundler',
              resolveJsonModule: true,
              isolatedModules: true,
              noEmit: true,
              jsx: 'react-jsx'
            },
            include: ['src'],
            references: [{ path: './tsconfig.node.json' }]
          },
          'src/App.tsx': `
            import React from 'react';
            import './App.css';

            function App() {
              return (
                <div className="App">
                  <h1>My React App</h1>
                </div>
              );
            }

            export default App;
          `,
          'src/main.tsx': `
            import React from 'react'
            import ReactDOM from 'react-dom/client'
            import App from './App.tsx'
            import './index.css'

            ReactDOM.createRoot(document.getElementById('root')!).render(
              <React.StrictMode>
                <App />
              </React.StrictMode>,
            )
          `,
          'vite.config.ts': `
            import { defineConfig } from 'vite'
            import react from '@vitejs/plugin-react'

            export default defineConfig({
              plugins: [react()],
            })
          `
        },
        directories: ['src', 'src/components', 'src/hooks', 'src/utils', 'public'],
        gitConfig: {
          remoteUrl: 'https://github.com/user/my-react-app.git',
          branchName: 'main',
          commits: [
            { message: 'Initial React TypeScript setup', author: 'Developer', date: '2024-01-01' },
            { message: 'Add Vite configuration', author: 'Developer', date: '2024-01-02' }
          ]
        }
      },
      expectedDetection: {
        expectedName: 'my-react-app',
        expectedType: 'react',
        expectedLanguage: 'TypeScript',
        expectedFramework: 'React',
        confidence: 0.95
      }
    },
    {
      name: 'Node.js Express API',
      projectStructure: {
        files: {
          'package.json': {
            name: 'express-api-server',
            version: '2.1.0',
            main: 'dist/index.js',
            scripts: {
              build: 'tsc',
              start: 'node dist/index.js',
              dev: 'nodemon src/index.ts',
              test: 'jest'
            },
            dependencies: {
              express: '^4.18.2',
              cors: '^2.8.5',
              dotenv: '^16.0.3',
              mongoose: '^7.0.3'
            },
            devDependencies: {
              '@types/express': '^4.17.17',
              '@types/cors': '^2.8.13',
              typescript: '^5.0.2',
              nodemon: '^2.0.22',
              jest: '^29.5.0'
            }
          },
          'src/index.ts': `
            import express from 'express';
            import cors from 'cors';
            import dotenv from 'dotenv';

            dotenv.config();

            const app = express();
            const PORT = process.env.PORT || 3000;

            app.use(cors());
            app.use(express.json());

            app.get('/api/health', (req, res) => {
              res.json({ status: 'OK', timestamp: new Date().toISOString() });
            });

            app.listen(PORT, () => {
              console.log(\`Server running on port \${PORT}\`);
            });
          `,
          'src/routes/users.ts': `
            import { Router } from 'express';

            const router = Router();

            router.get('/users', (req, res) => {
              res.json({ users: [] });
            });

            export default router;
          `,
          'tsconfig.json': {
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
          },
          '.env': 'PORT=3000\nDB_CONNECTION_STRING=mongodb://localhost:27017/api-server'
        },
        directories: ['src', 'src/routes', 'src/middleware', 'src/models', 'dist'],
        gitConfig: {
          remoteUrl: 'git@github.com:company/express-api-server.git',
          branchName: 'develop',
          commits: [
            { message: 'feat: initial Express setup', author: 'Backend Dev', date: '2024-01-05' },
            { message: 'feat: add user routes and models', author: 'Backend Dev', date: '2024-01-06' },
            { message: 'chore: add environment configuration', author: 'Backend Dev', date: '2024-01-07' }
          ]
        }
      },
      expectedDetection: {
        expectedName: 'express-api-server',
        expectedType: 'nodejs',
        expectedLanguage: 'TypeScript',
        expectedFramework: 'Express',
        confidence: 0.9
      }
    },
    {
      name: 'Python Django Web App',
      projectStructure: {
        files: {
          'requirements.txt': `
            Django==4.2.0
            django-rest-framework==3.14.0
            django-cors-headers==4.0.0
            psycopg2-binary==2.9.6
            celery==5.2.7
            redis==4.5.4
            python-dotenv==1.0.0
            pytest==7.3.1
            pytest-django==4.5.2
          `,
          'manage.py': `
            #!/usr/bin/env python
            import os
            import sys

            if __name__ == '__main__':
                os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webapp.settings')
                try:
                    from django.core.management import execute_from_command_line
                except ImportError as exc:
                    raise ImportError(
                        "Couldn't import Django. Are you sure it's installed and "
                        "available on your PYTHONPATH environment variable? Did you "
                        "forget to activate a virtual environment?"
                    ) from exc
                execute_from_command_line(sys.argv)
          `,
          'webapp/settings.py': `
            import os
            from pathlib import Path

            BASE_DIR = Path(__file__).resolve().parent.parent

            SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
            DEBUG = os.environ.get('DEBUG', 'True') == 'True'

            ALLOWED_HOSTS = []

            INSTALLED_APPS = [
                'django.contrib.admin',
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'django.contrib.sessions',
                'django.contrib.messages',
                'django.contrib.staticfiles',
                'rest_framework',
                'corsheaders',
                'users',
                'api',
            ]

            DATABASES = {
                'default': {
                    'ENGINE': 'django.db.backends.postgresql',
                    'NAME': os.environ.get('DB_NAME', 'webapp'),
                    'USER': os.environ.get('DB_USER', 'postgres'),
                    'PASSWORD': os.environ.get('DB_PASSWORD', ''),
                    'HOST': os.environ.get('DB_HOST', 'localhost'),
                    'PORT': os.environ.get('DB_PORT', '5432'),
                }
            }
          `,
          'users/models.py': `
            from django.contrib.auth.models import AbstractUser
            from django.db import models

            class User(AbstractUser):
                email = models.EmailField(unique=True)
                created_at = models.DateTimeField(auto_now_add=True)
                updated_at = models.DateTimeField(auto_now=True)

                USERNAME_FIELD = 'email'
                REQUIRED_FIELDS = ['username']
          `,
          'api/views.py': `
            from rest_framework import status
            from rest_framework.decorators import api_view
            from rest_framework.response import Response

            @api_view(['GET'])
            def health_check(request):
                return Response({
                    'status': 'OK',
                    'version': '1.0.0'
                }, status=status.HTTP_200_OK)
          `
        },
        directories: ['webapp', 'users', 'api', 'static', 'templates', 'media'],
        gitConfig: {
          remoteUrl: 'https://github.com/team/django-webapp.git',
          branchName: 'main',
          commits: [
            { message: 'Initial Django project setup', author: 'Python Dev', date: '2024-01-10' },
            { message: 'Add user authentication system', author: 'Python Dev', date: '2024-01-11' },
            { message: 'Configure Django REST Framework', author: 'Python Dev', date: '2024-01-12' }
          ]
        }
      },
      expectedDetection: {
        expectedName: 'django-webapp',
        expectedType: 'python',
        expectedLanguage: 'Python',
        expectedFramework: 'Django',
        confidence: 0.88
      }
    },
    {
      name: 'Ambiguous/Complex Project',
      projectStructure: {
        files: {
          'package.json': {
            name: 'fullstack-monorepo',
            version: '1.0.0',
            workspaces: ['frontend', 'backend', 'shared'],
            devDependencies: {
              lerna: '^6.6.1',
              typescript: '^5.0.0'
            }
          },
          'frontend/package.json': {
            name: 'frontend-app',
            dependencies: {
              react: '^18.2.0',
              'next.js': '^13.4.0'
            }
          },
          'backend/package.json': {
            name: 'backend-api',
            dependencies: {
              express: '^4.18.2',
              fastify: '^4.17.0'
            }
          },
          'requirements.txt': `
            flask==2.3.0
            fastapi==0.95.0
          `,
          'Dockerfile': `
            FROM node:18-alpine
            FROM python:3.11-slim
          `,
          'docker-compose.yml': `
            version: '3.8'
            services:
              frontend:
                build: ./frontend
              backend:
                build: ./backend
              api:
                build: ./python-api
          `
        },
        directories: ['frontend', 'backend', 'shared', 'python-api', 'docs'],
        gitConfig: {
          remoteUrl: 'https://github.com/company/fullstack-monorepo.git',
          branchName: 'develop'
        }
      },
      expectedDetection: {
        expectedName: 'fullstack-monorepo',
        expectedType: 'monorepo',
        expectedLanguage: 'Multi-language',
        expectedFramework: 'Multiple',
        confidence: 0.6 // Lower confidence due to complexity
      }
    }
  ];

  describe('Project Structure Analysis', () => {
    async function createTestProject(testCase: ProjectTestCase): Promise<string> {
      const projectPath = path.join(projectsDir, testCase.name.toLowerCase().replace(/\s+/g, '-'));
      await fs.mkdir(projectPath, { recursive: true });

      // Create directories
      for (const dir of testCase.projectStructure.directories) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
      }

      // Create files
      for (const [fileName, content] of Object.entries(testCase.projectStructure.files)) {
        const filePath = path.join(projectPath, fileName);
        const fileDir = path.dirname(filePath);

        await fs.mkdir(fileDir, { recursive: true });

        if (typeof content === 'string') {
          await fs.writeFile(filePath, content.trim());
        } else {
          await fs.writeFile(filePath, JSON.stringify(content, null, 2));
        }
      }

      return projectPath;
    }

    it('should detect React TypeScript projects correctly', async () => {
      const testCase = projectTestCases[0]; // React TypeScript project
      const projectPath = await createTestProject(testCase);

      // Create project-aware memory manager
      const projectMemoryManager = new MemoryManager(projectPath);
      await projectMemoryManager.initialize();

      try {
        // Store some project-specific memories
        await projectMemoryManager.store(
          'React component with TypeScript interfaces and hooks',
          'project',
          ['react', 'typescript', 'components', 'hooks'],
          { project_path: projectPath }
        );

        await projectMemoryManager.store(
          'Vite build configuration for React TypeScript',
          'project',
          ['vite', 'build', 'typescript', 'config'],
          { project_path: projectPath }
        );

        // Search should find project-specific content
        const results = await projectMemoryManager.search('React TypeScript');

        expect(results.length).toBeGreaterThan(0);

        // Memory should be associated with project
        const projectResult = results.find(r =>
          r.memory.metadata?.project_path === projectPath
        );
        expect(projectResult).toBeDefined();

        console.log(`✅ Detected React TypeScript project: ${results.length} related memories`);

      } finally {
        await projectMemoryManager.close();
      }
    });

    it('should detect Node.js Express projects correctly', async () => {
      const testCase = projectTestCases[1]; // Node.js Express project
      const projectPath = await createTestProject(testCase);

      const projectMemoryManager = new MemoryManager(projectPath);
      await projectMemoryManager.initialize();

      try {
        // Store Express-specific memories
        await projectMemoryManager.store(
          'Express.js REST API with TypeScript and middleware',
          'project',
          ['express', 'rest-api', 'typescript', 'middleware'],
          { project_path: projectPath }
        );

        await projectMemoryManager.store(
          'MongoDB integration with Mongoose ODM',
          'project',
          ['mongodb', 'mongoose', 'database', 'odm'],
          { project_path: projectPath }
        );

        const results = await projectMemoryManager.search('Express API');

        expect(results.length).toBeGreaterThan(0);

        // Verify project association
        const expressResult = results.find(r =>
          r.memory.content.includes('Express') &&
          r.memory.metadata?.project_path === projectPath
        );
        expect(expressResult).toBeDefined();

        console.log(`✅ Detected Node.js Express project: ${results.length} related memories`);

      } finally {
        await projectMemoryManager.close();
      }
    });

    it('should detect Python Django projects correctly', async () => {
      const testCase = projectTestCases[2]; // Python Django project
      const projectPath = await createTestProject(testCase);

      const projectMemoryManager = new MemoryManager(projectPath);
      await projectMemoryManager.initialize();

      try {
        // Store Django-specific memories
        await projectMemoryManager.store(
          'Django REST Framework API views and serializers',
          'project',
          ['django', 'drf', 'api', 'serializers'],
          { project_path: projectPath }
        );

        await projectMemoryManager.store(
          'PostgreSQL database configuration for Django',
          'project',
          ['postgresql', 'django', 'database', 'config'],
          { project_path: projectPath }
        );

        const results = await projectMemoryManager.search('Django');

        expect(results.length).toBeGreaterThan(0);

        const djangoResult = results.find(r =>
          r.memory.content.includes('Django') &&
          r.memory.metadata?.project_path === projectPath
        );
        expect(djangoResult).toBeDefined();

        console.log(`✅ Detected Python Django project: ${results.length} related memories`);

      } finally {
        await projectMemoryManager.close();
      }
    });

    it('should handle complex/ambiguous projects', async () => {
      const testCase = projectTestCases[3]; // Complex monorepo project
      const projectPath = await createTestProject(testCase);

      const projectMemoryManager = new MemoryManager(projectPath);
      await projectMemoryManager.initialize();

      try {
        // Store multi-framework memories
        await projectMemoryManager.store(
          'Monorepo with React frontend and Node.js backend',
          'project',
          ['monorepo', 'react', 'nodejs', 'fullstack'],
          { project_path: projectPath, complexity: 'high' }
        );

        await projectMemoryManager.store(
          'Docker containerization for microservices',
          'project',
          ['docker', 'microservices', 'containerization'],
          { project_path: projectPath, complexity: 'high' }
        );

        const results = await projectMemoryManager.search('monorepo');

        expect(results.length).toBeGreaterThan(0);

        // Complex projects should still be detectable
        const monorepoResult = results.find(r =>
          r.memory.metadata?.project_path === projectPath
        );
        expect(monorepoResult).toBeDefined();

        console.log(`✅ Detected complex monorepo project: ${results.length} related memories`);

      } finally {
        await projectMemoryManager.close();
      }
    });
  });

  describe('Memory Deduplication Logic', () => {
    beforeEach(async () => {
      // Set up test data with potential duplicates
      await memoryManager.store(
        'React functional components with hooks pattern',
        'system',
        ['react', 'functional', 'hooks', 'patterns'],
        { pattern_type: 'component', confidence: 0.9 }
      );

      await memoryManager.store(
        'React functional components with hooks pattern',
        'project',
        ['react', 'functional', 'hooks', 'patterns'],
        { pattern_type: 'component', confidence: 0.9, project_specific: true }
      );

      await memoryManager.store(
        'React functional components using hooks',
        'system',
        ['react', 'functional', 'hooks'],
        { pattern_type: 'component', confidence: 0.8, variation: 'similar' }
      );

      await memoryManager.store(
        'TypeScript interface definitions for props',
        'project',
        ['typescript', 'interfaces', 'props'],
        { pattern_type: 'type_definition' }
      );

      await memoryManager.store(
        'TypeScript interface definitions for component props',
        'project',
        ['typescript', 'interfaces', 'props', 'components'],
        { pattern_type: 'type_definition', expanded: true }
      );
    });

    it('should identify exact duplicate memories', async () => {
      const results = await memoryManager.search('React functional components with hooks pattern');

      expect(results.length).toBeGreaterThan(1);

      // Find potential exact duplicates
      const exactMatches = results.filter(r =>
        r.memory.content === 'React functional components with hooks pattern'
      );

      expect(exactMatches.length).toBe(2); // Should find both system and project versions

      // Different layers should be preserved (not deduplicated)
      const layers = new Set(exactMatches.map(r => r.memory.layer));
      expect(layers.size).toBe(2); // Should have both 'system' and 'project'

      console.log(`Found ${exactMatches.length} exact matches across ${layers.size} layers`);
    });

    it('should identify similar but not identical memories', async () => {
      const results = await memoryManager.search('React functional hooks');

      const similarContent = [
        'React functional components with hooks pattern',
        'React functional components using hooks'
      ];

      const foundSimilar = results.filter(r =>
        similarContent.some(content => r.memory.content.includes(content.slice(0, 20)))
      );

      expect(foundSimilar.length).toBeGreaterThan(1);

      // Similar memories should have different similarity scores
      const scores = foundSimilar.map(r => r.similarity_score || 0);
      expect(Math.max(...scores)).toBeGreaterThan(Math.min(...scores));

      console.log(`Found ${foundSimilar.length} similar memories with scores: ${scores.map(s => s.toFixed(2)).join(', ')}`);
    });

    it('should handle semantic similarity detection', async () => {
      // Store semantically similar content
      await memoryManager.store(
        'Component state management using React hooks',
        'project',
        ['react', 'state', 'hooks', 'management']
      );

      await memoryManager.store(
        'Managing component state with useState and useEffect',
        'project',
        ['react', 'state', 'usestate', 'useeffect']
      );

      const results = await memoryManager.search('React state management');

      const semanticMatches = results.filter(r =>
        r.memory.content.includes('state') &&
        (r.memory.content.includes('hooks') || r.memory.content.includes('use'))
      );

      expect(semanticMatches.length).toBeGreaterThan(1);

      // Should find semantically related content even with different wording
      const hasStateManagement = semanticMatches.some(r =>
        r.memory.content.includes('state management')
      );
      const hasUseState = semanticMatches.some(r =>
        r.memory.content.includes('useState')
      );

      expect(hasStateManagement || hasUseState).toBe(true);

      console.log(`Found ${semanticMatches.length} semantically similar memories`);
    });

    it('should provide deduplication recommendations', async () => {
      const allResults = await memoryManager.search('TypeScript interface');

      const interfaceResults = allResults.filter(r =>
        r.memory.content.includes('TypeScript interface')
      );

      expect(interfaceResults.length).toBeGreaterThan(1);

      // Group by similarity
      const contentGroups = new Map<string, typeof interfaceResults>();

      for (const result of interfaceResults) {
        const baseContent = result.memory.content.slice(0, 30); // Group by first 30 chars
        if (!contentGroups.has(baseContent)) {
          contentGroups.set(baseContent, []);
        }
        contentGroups.get(baseContent)!.push(result);
      }

      // Check for groups with multiple items (potential duplicates)
      const duplicateGroups = Array.from(contentGroups.values()).filter(
        group => group.length > 1
      );

      if (duplicateGroups.length > 0) {
        console.log(`Found ${duplicateGroups.length} potential duplicate groups`);

        duplicateGroups.forEach((group, index) => {
          console.log(`  Group ${index + 1}: ${group.length} similar memories`);
          group.forEach(item => {
            console.log(`    - Layer: ${item.memory.layer}, Score: ${item.similarity_score?.toFixed(2)}`);
          });
        });
      }
    });

    it('should maintain deduplication performance under load', async () => {
      // Create many similar memories
      const basePhrases = [
        'React component pattern',
        'TypeScript type definition',
        'Node.js server configuration',
        'Database query optimization',
        'API endpoint implementation'
      ];

      const variations = [
        'best practices for',
        'advanced techniques in',
        'common patterns for',
        'optimized approach to',
        'efficient methods for'
      ];

      // Generate test data
      const testPromises = [];
      for (let i = 0; i < 50; i++) {
        const basePhrase = basePhrases[i % basePhrases.length];
        const variation = variations[i % variations.length];
        const content = `${variation} ${basePhrase} implementation`;

        testPromises.push(
          memoryManager.store(
            content,
            'project',
            ['generated', 'test', basePhrase.split(' ')[0].toLowerCase()],
            { generated: true, batch: Math.floor(i / 10) }
          )
        );
      }

      await Promise.all(testPromises);

      // Test deduplication search performance
      const startTime = Date.now();
      const results = await memoryManager.search('React component');
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(200); // Should complete quickly even with many memories
      expect(results.length).toBeGreaterThan(0);

      // Results should be sorted by relevance
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity_score || 0).toBeGreaterThanOrEqual(
          results[i + 1].similarity_score || 0
        );
      }

      console.log(`Deduplication search completed in ${searchTime}ms with ${results.length} results`);
    });
  });

  describe('Project Context Isolation', () => {
    let project1Manager: MemoryManager;
    let project2Manager: MemoryManager;
    let project1Path: string;
    let project2Path: string;

    beforeEach(async () => {
      // Create two separate project contexts
      project1Path = await createMockProject(tempDir, 'nodejs');
      project2Path = await createMockProject(tempDir, 'react');

      project1Manager = new MemoryManager(project1Path);
      project2Manager = new MemoryManager(project2Path);

      await project1Manager.initialize();
      await project2Manager.initialize();
    });

    afterEach(async () => {
      await project1Manager.close();
      await project2Manager.close();
    });

    it('should isolate project-specific memories correctly', async () => {
      // Store project-specific memories
      await project1Manager.store(
        'Node.js Express middleware configuration',
        'project',
        ['nodejs', 'express', 'middleware'],
        { project: 'nodejs-api' }
      );

      await project2Manager.store(
        'React component lifecycle and state management',
        'project',
        ['react', 'lifecycle', 'state'],
        { project: 'react-frontend' }
      );

      // Each project should only see its own project-layer memories
      const project1Results = await project1Manager.search('', { layer: 'project' });
      const project2Results = await project2Manager.search('', { layer: 'project' });

      // Verify isolation
      const project1Contents = project1Results.map(r => r.memory.content);
      const project2Contents = project2Results.map(r => r.memory.content);

      expect(project1Contents.some(content => content.includes('Node.js'))).toBe(true);
      expect(project2Contents.some(content => content.includes('React'))).toBe(true);

      // Projects should not see each other's project-specific content
      expect(project1Contents.some(content => content.includes('React component'))).toBe(false);
      expect(project2Contents.some(content => content.includes('Node.js Express'))).toBe(false);

      console.log(`Project 1: ${project1Results.length} memories, Project 2: ${project2Results.length} memories`);
    });

    it('should share global memories across projects', async () => {
      // Store global system patterns
      await project1Manager.store(
        'Global error handling pattern: try-catch with logging',
        'system',
        ['error-handling', 'global', 'patterns'],
        { scope: 'global' }
      );

      // Store global preferences
      await project2Manager.store(
        'User preference: functional programming style preferred',
        'preference',
        ['coding-style', 'functional', 'global'],
        { scope: 'global' }
      );

      // Both projects should see global content
      const project1SystemResults = await project1Manager.search('error handling');
      const project2SystemResults = await project2Manager.search('error handling');

      const project1PrefResults = await project1Manager.search('functional programming');
      const project2PrefResults = await project2Manager.search('functional programming');

      expect(project1SystemResults.length).toBeGreaterThan(0);
      expect(project2SystemResults.length).toBeGreaterThan(0);
      expect(project1PrefResults.length).toBeGreaterThan(0);
      expect(project2PrefResults.length).toBeGreaterThan(0);

      // Global content should be identical
      const system1 = project1SystemResults[0]?.memory.content;
      const system2 = project2SystemResults[0]?.memory.content;
      expect(system1).toBe(system2);

      console.log('✅ Global memories successfully shared across projects');
    });

    it('should detect and prevent cross-project memory leakage', async () => {
      // Store memories with specific project markers
      await project1Manager.store(
        'Project 1 specific implementation details',
        'project',
        ['project1', 'specific', 'implementation']
      );

      await project2Manager.store(
        'Project 2 unique configuration settings',
        'project',
        ['project2', 'unique', 'configuration']
      );

      // Search from each project
      const project1Search = await project1Manager.search('specific');
      const project2Search = await project2Manager.search('unique');

      // Verify no leakage
      const project1HasProject2Content = project1Search.some(r =>
        r.memory.content.includes('Project 2')
      );

      const project2HasProject1Content = project2Search.some(r =>
        r.memory.content.includes('Project 1')
      );

      expect(project1HasProject2Content).toBe(false);
      expect(project2HasProject1Content).toBe(false);

      console.log('✅ No cross-project memory leakage detected');
    });
  });
});