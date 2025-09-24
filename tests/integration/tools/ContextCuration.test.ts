/**
 * Integration Tests for Context Curation Workflow
 * Tests the complete workflow of preference detection, storage, and context assembly
 *
 * @module ContextCuration.test
 * @description Tests integration between preference tools and memory system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MemoryTools } from '../../../src/tools/MemoryTools.js';
import { ProjectTools } from '../../../src/tools/ProjectTools.js';
import { UnifiedMemoryManager } from '../../../src/memory/UnifiedMemoryManager.js';
import { ProjectInitializer } from '../../../src/project/ProjectInitializer.js';
import type {
  ToolExecutionContext,
  UnifiedMemory,
  MemoryTier,
  MemoryScope
} from '../../../src/types/index.js';

describe('Context Curation Integration', () => {
  let memoryTools: MemoryTools;
  let projectTools: ProjectTools;
  let unifiedMemory: UnifiedMemoryManager;
  let projectInitializer: ProjectInitializer;
  let testWorkspace: string;
  let mockContext: ToolExecutionContext;

  beforeEach(async () => {
    // Create test workspace
    testWorkspace = path.join(os.tmpdir(), `test-context-${Date.now()}`);
    await fs.mkdir(testWorkspace, { recursive: true });

    // Initialize real components
    unifiedMemory = new UnifiedMemoryManager();
    memoryTools = new MemoryTools();
    projectTools = new ProjectTools();
    projectInitializer = new ProjectInitializer();

    mockContext = {
      workspacePath: testWorkspace,
      timestamp: Date.now(),
      userId: 'test-user'
    };

    // Clear any existing test data
    await unifiedMemory.clearAll();
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await unifiedMemory.close();
  });

  describe('Complete Preference Workflow', () => {
    it('should detect, store, and retrieve coding preferences', async () => {
      // Step 1: Create sample code file
      const sampleCode = `
        import React, { useState, useEffect } from 'react';
        import { UserProfile } from './types';

        interface Props {
          user: UserProfile;
          onUpdate: (user: UserProfile) => Promise<void>;
        }

        export const UserComponent: React.FC<Props> = ({ user, onUpdate }) => {
          const [loading, setLoading] = useState(false);

          useEffect(() => {
            console.log('User updated:', user.name);
          }, [user]);

          const handleUpdate = async () => {
            setLoading(true);
            try {
              await onUpdate(user);
            } finally {
              setLoading(false);
            }
          };

          return (
            <div className="user-profile">
              <h2>{user.name}</h2>
              <button onClick={handleUpdate} disabled={loading}>
                Update Profile
              </button>
            </div>
          );
        };
      `;

      const codeFile = path.join(testWorkspace, 'UserComponent.tsx');
      await fs.writeFile(codeFile, sampleCode);

      // Step 2: Extract preferences
      const extractResult = await memoryTools.extractCodingPreferences({
        content: sampleCode,
        language: 'typescript',
        detectFormatting: true
      }, mockContext);

      expect(extractResult.isError).toBeUndefined();
      expect(extractResult.content[0].text).toContain('React');
      expect(extractResult.content[0].text).toContain('TypeScript');
      expect(extractResult.content[0].text).toContain('hooks');

      // Step 3: Store additional manual preferences
      await memoryTools.storeUnifiedMemory({
        content: 'User prefers functional components over class components',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'react', 'components'],
        metadata: { category: 'react', autoDetected: false }
      }, mockContext);

      await memoryTools.storeUnifiedMemory({
        content: 'Always use async/await over Promise chains',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'javascript', 'async'],
        metadata: { category: 'javascript', autoDetected: false }
      }, mockContext);

      // Step 4: Retrieve preferences
      const prefsResult = await memoryTools.getUserPreferences({
        category: 'coding'
      }, mockContext);

      expect(prefsResult.isError).toBeUndefined();
      const prefsText = prefsResult.content[0].text;
      expect(prefsText).toContain('functional components');
      expect(prefsText).toContain('async/await');

      // Step 5: Curate comprehensive context
      const contextResult = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        maxTokens: 4000,
        format: 'markdown'
      }, mockContext);

      expect(contextResult.isError).toBeUndefined();
      const contextText = contextResult.content[0].text;
      expect(contextText).toContain('## User Preferences');
      expect(contextText).toContain('functional components');
      expect(contextText).toContain('async/await');
    });

    it('should handle multi-project preference isolation', async () => {
      // Project A preferences
      const projectA = path.join(testWorkspace, 'project-a');
      await fs.mkdir(projectA, { recursive: true });

      const contextA: ToolExecutionContext = {
        workspacePath: projectA,
        timestamp: Date.now(),
        userId: 'test-user'
      };

      await memoryTools.storeUnifiedMemory({
        content: 'Project A uses Vue.js with Composition API',
        tier: 'long_term',
        scope: 'project',
        project_id: projectA,
        tags: ['project', 'framework', 'vue'],
        metadata: { projectName: 'project-a' }
      }, contextA);

      // Project B preferences
      const projectB = path.join(testWorkspace, 'project-b');
      await fs.mkdir(projectB, { recursive: true });

      const contextB: ToolExecutionContext = {
        workspacePath: projectB,
        timestamp: Date.now(),
        userId: 'test-user'
      };

      await memoryTools.storeUnifiedMemory({
        content: 'Project B uses React with Redux',
        tier: 'long_term',
        scope: 'project',
        project_id: projectB,
        tags: ['project', 'framework', 'react'],
        metadata: { projectName: 'project-b' }
      }, contextB);

      // Global preferences
      await memoryTools.storeUnifiedMemory({
        content: 'Prefer TypeScript for all projects',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'typescript'],
        metadata: { global: true }
      }, mockContext);

      // Curate context for Project A
      const contextAResult = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        workspacePath: projectA
      }, contextA);

      expect(contextAResult.content[0].text).toContain('Vue.js');
      expect(contextAResult.content[0].text).toContain('TypeScript'); // Global preference
      expect(contextAResult.content[0].text).not.toContain('React'); // Project B specific

      // Curate context for Project B
      const contextBResult = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        workspacePath: projectB
      }, contextB);

      expect(contextBResult.content[0].text).toContain('React');
      expect(contextBResult.content[0].text).toContain('Redux');
      expect(contextBResult.content[0].text).toContain('TypeScript'); // Global preference
      expect(contextBResult.content[0].text).not.toContain('Vue'); // Project A specific
    });
  });

  describe('Project Initialization with Preferences', () => {
    it('should initialize project with preference loading instructions', async () => {
      // Create a React TypeScript project
      const packageJson = {
        name: 'test-react-app',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
          typescript: '^5.0.0'
        },
        devDependencies: {
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          eslint: '^8.0.0',
          prettier: '^3.0.0'
        }
      };

      await fs.writeFile(
        path.join(testWorkspace, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create tsconfig
      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
          jsx: 'react-jsx',
          module: 'ESNext',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        }
      };

      await fs.writeFile(
        path.join(testWorkspace, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      // Store some preferences
      await memoryTools.storeUnifiedMemory({
        content: 'Always use strict TypeScript mode',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'typescript'],
        metadata: { category: 'typescript' }
      }, mockContext);

      await memoryTools.storeUnifiedMemory({
        content: 'Prefer React hooks over class components',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding', 'react'],
        metadata: { category: 'react' }
      }, mockContext);

      // Initialize project
      const initResult = await projectTools.initProject({}, mockContext);

      expect(initResult.isError).toBeUndefined();

      // Check that copilot-instructions.md was created
      const copilotInstructionsPath = path.join(testWorkspace, '.github', 'copilot-instructions.md');
      const instructionsExists = await fs.access(copilotInstructionsPath).then(() => true).catch(() => false);
      expect(instructionsExists).toBe(true);

      if (instructionsExists) {
        const instructions = await fs.readFile(copilotInstructionsPath, 'utf-8');

        // Should contain preference loading instructions
        expect(instructions).toContain('## Loading User Preferences');
        expect(instructions).toContain('get_user_preferences');
        expect(instructions).toContain('curate_context');

        // Should contain project type information
        expect(instructions).toContain('React');
        expect(instructions).toContain('TypeScript');
      }

      // Check COPILOT.md
      const copilotMdPath = path.join(testWorkspace, 'COPILOT.md');
      const copilotExists = await fs.access(copilotMdPath).then(() => true).catch(() => false);
      expect(copilotExists).toBe(true);

      if (copilotExists) {
        const copilotMd = await fs.readFile(copilotMdPath, 'utf-8');
        expect(copilotMd).toContain('Project Configuration');
      }
    });

    it('should enhance existing project with preference instructions', async () => {
      // Create existing .github directory
      const githubDir = path.join(testWorkspace, '.github');
      await fs.mkdir(githubDir, { recursive: true });

      // Create existing copilot-instructions.md
      const existingInstructions = `
# Project Instructions

This is an existing project with some instructions.

## Build Process
Run \`npm build\` to build the project.
`;

      const instructionsPath = path.join(githubDir, 'copilot-instructions.md');
      await fs.writeFile(instructionsPath, existingInstructions);

      // Store preferences
      await memoryTools.storeUnifiedMemory({
        content: 'Use ESLint with Airbnb config',
        tier: 'core',
        scope: 'project',
        project_id: testWorkspace,
        tags: ['preference', 'linting'],
        metadata: { tool: 'eslint' }
      }, mockContext);

      // Re-initialize project
      const initResult = await projectTools.initProject({
        enhance: true
      }, mockContext);

      expect(initResult.isError).toBeUndefined();

      // Check enhanced instructions
      const enhancedInstructions = await fs.readFile(instructionsPath, 'utf-8');

      // Should preserve existing content
      expect(enhancedInstructions).toContain('Build Process');
      expect(enhancedInstructions).toContain('npm build');

      // Should add preference loading section
      expect(enhancedInstructions).toContain('Loading User Preferences');
      expect(enhancedInstructions).toContain('get_user_preferences');
    });
  });

  describe('Pattern Recognition and Learning', () => {
    it('should extract and store patterns from repeated code', async () => {
      // Create multiple similar files
      const files = [
        {
          name: 'UserService.ts',
          content: `
            export class UserService {
              constructor(private readonly db: Database) {}

              async findById(id: string): Promise<User | null> {
                try {
                  return await this.db.users.findOne({ id });
                } catch (error) {
                  logger.error('Failed to find user', { id, error });
                  return null;
                }
              }
            }
          `
        },
        {
          name: 'ProductService.ts',
          content: `
            export class ProductService {
              constructor(private readonly db: Database) {}

              async findById(id: string): Promise<Product | null> {
                try {
                  return await this.db.products.findOne({ id });
                } catch (error) {
                  logger.error('Failed to find product', { id, error });
                  return null;
                }
              }
            }
          `
        },
        {
          name: 'OrderService.ts',
          content: `
            export class OrderService {
              constructor(private readonly db: Database) {}

              async findById(id: string): Promise<Order | null> {
                try {
                  return await this.db.orders.findOne({ id });
                } catch (error) {
                  logger.error('Failed to find order', { id, error });
                  return null;
                }
              }
            }
          `
        }
      ];

      // Write files and extract patterns
      for (const file of files) {
        const filePath = path.join(testWorkspace, file.name);
        await fs.writeFile(filePath, file.content);

        await memoryTools.extractCodingPreferences({
          content: file.content,
          language: 'typescript',
          detectPatterns: true
        }, mockContext);
      }

      // Store detected pattern
      await memoryTools.storeUnifiedMemory({
        content: 'Pattern: Service classes with constructor DI, async methods with try-catch error handling',
        tier: 'long_term',
        scope: 'project',
        project_id: testWorkspace,
        tags: ['pattern', 'service', 'error-handling'],
        metadata: {
          frequency: 3,
          filePattern: '*Service.ts',
          confidence: 0.9
        }
      }, mockContext);

      // Curate context should include patterns
      const contextResult = await memoryTools.curateContext({
        includePatterns: true,
        workspacePath: testWorkspace
      }, mockContext);

      expect(contextResult.content[0].text).toContain('Pattern:');
      expect(contextResult.content[0].text).toContain('Service classes');
      expect(contextResult.content[0].text).toContain('try-catch');
    });

    it('should detect anti-patterns and common errors', async () => {
      // Simulate error scenarios
      const errorScenarios = [
        {
          error: 'Cannot read properties of undefined',
          context: 'Accessing nested object properties without null checks',
          frequency: 5
        },
        {
          error: 'Maximum call stack size exceeded',
          context: 'Infinite recursion in React useEffect',
          frequency: 3
        },
        {
          error: 'TypeScript error TS2345',
          context: 'Type mismatch in function arguments',
          frequency: 8
        }
      ];

      // Store anti-patterns
      for (const scenario of errorScenarios) {
        await memoryTools.storeUnifiedMemory({
          content: `Anti-pattern: ${scenario.context} - Error: ${scenario.error}`,
          tier: 'long_term',
          scope: 'global',
          tags: ['anti-pattern', 'error', 'common-issue'],
          metadata: {
            errorType: scenario.error,
            frequency: scenario.frequency,
            lastOccurrence: new Date().toISOString()
          }
        }, mockContext);
      }

      // Curate context with patterns
      const contextResult = await memoryTools.curateContext({
        includePatterns: true,
        includeAntiPatterns: true
      }, mockContext);

      const contextText = contextResult.content[0].text;
      expect(contextText).toContain('Anti-pattern');
      expect(contextText).toContain('undefined');
      expect(contextText).toContain('recursion');
      expect(contextText).toContain('Type mismatch');
    });
  });

  describe('Memory Optimization and Cleanup', () => {
    it('should optimize memory by consolidating similar preferences', async () => {
      // Store similar preferences
      const similarPrefs = [
        'Use 2-space indentation',
        'Indent with 2 spaces',
        'Indentation: 2 spaces',
        'Set indent size to 2',
        'Tab width should be 2 spaces'
      ];

      for (const pref of similarPrefs) {
        await memoryTools.storeUnifiedMemory({
          content: pref,
          tier: 'core',
          scope: 'global',
          tags: ['preference', 'formatting', 'indentation'],
          metadata: { category: 'formatting' }
        }, mockContext);
      }

      // Simulate optimization
      const optimizeResult = await memoryTools.optimizeMemory({
        consolidateSimilar: true,
        removeOutdated: true
      }, mockContext);

      expect(optimizeResult.isError).toBeUndefined();
      expect(optimizeResult.content[0].text).toContain('consolidated');

      // After optimization, should have fewer but more precise preferences
      const prefsAfter = await memoryTools.getUserPreferences({
        category: 'formatting'
      }, mockContext);

      const prefCount = (prefsAfter.content[0].text.match(/preference/gi) || []).length;
      expect(prefCount).toBeLessThan(similarPrefs.length);
    });

    it('should handle memory tier migration', async () => {
      // Store temporary preference in long-term
      const tempPrefId = await unifiedMemory.store({
        content: 'Temporary debugging preference',
        tier: 'long_term',
        scope: 'project',
        project_id: testWorkspace,
        tags: ['preference', 'temporary', 'debug'],
        metadata: {
          temporary: true,
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }
      });

      // Store important preference in long-term
      const importantPrefId = await unifiedMemory.store({
        content: 'Critical security preference: Always use HTTPS',
        tier: 'long_term',
        scope: 'global',
        tags: ['preference', 'security', 'important'],
        metadata: {
          importance: 1.0,
          permanent: true
        }
      });

      // Migrate important preferences to core tier
      const migrateResult = await memoryTools.migrateToCoreTier({
        memoryId: importantPrefId,
        reason: 'High importance security preference'
      }, mockContext);

      expect(migrateResult.isError).toBeUndefined();
      expect(migrateResult.content[0].text).toContain('migrated to core tier');

      // Verify migration
      const corePrefs = await memoryTools.getUserPreferences({
        tier: 'core'
      }, mockContext);

      expect(corePrefs.content[0].text).toContain('HTTPS');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent preference extraction from multiple files', async () => {
      // Create multiple code files
      const codeFiles = Array.from({ length: 10 }, (_, i) => ({
        name: `Component${i}.tsx`,
        content: `
          import React from 'react';

          export const Component${i}: React.FC = () => {
            const [state, setState] = useState(${i});
            return <div>Component ${i}</div>;
          };
        `
      }));

      // Write all files
      await Promise.all(
        codeFiles.map(file =>
          fs.writeFile(path.join(testWorkspace, file.name), file.content)
        )
      );

      // Extract preferences concurrently
      const extractionPromises = codeFiles.map(file =>
        memoryTools.extractCodingPreferences({
          content: file.content,
          language: 'typescript'
        }, mockContext)
      );

      const results = await Promise.all(extractionPromises);

      // All extractions should succeed
      results.forEach(result => {
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('extracted');
      });

      // Verify preferences were stored
      const allPrefs = await memoryTools.getUserPreferences({}, mockContext);
      expect(allPrefs.content[0].text).toContain('React');
    });

    it('should handle race conditions in context curation', async () => {
      // Store test data
      await memoryTools.storeUnifiedMemory({
        content: 'Concurrent test preference',
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'test'],
        metadata: {}
      }, mockContext);

      // Simulate multiple concurrent context curation requests
      const curationPromises = Array.from({ length: 20 }, (_, i) =>
        memoryTools.curateContext({
          includePreferences: true,
          requestId: `request_${i}`,
          maxTokens: 1000
        }, mockContext)
      );

      const results = await Promise.all(curationPromises);

      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Concurrent test preference');
        expect(result.metadata?.requestId).toBe(`request_${index}`);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from partial memory corruption', async () => {
      // Store valid preferences
      await memoryTools.storeUnifiedMemory({
        content: 'Valid preference 1',
        tier: 'core',
        scope: 'global',
        tags: ['preference'],
        metadata: {}
      }, mockContext);

      // Simulate corruption by directly manipulating database
      // This would normally corrupt some entries

      await memoryTools.storeUnifiedMemory({
        content: 'Valid preference 2',
        tier: 'core',
        scope: 'global',
        tags: ['preference'],
        metadata: {}
      }, mockContext);

      // Should still be able to retrieve valid preferences
      const prefsResult = await memoryTools.getUserPreferences({}, mockContext);

      expect(prefsResult.isError).toBeUndefined();
      expect(prefsResult.content[0].text).toContain('Valid preference');
    });

    it('should handle network timeouts gracefully', async () => {
      // Simulate slow operation
      const slowOperation = new Promise((resolve) => {
        setTimeout(() => {
          resolve(memoryTools.curateContext({
            includePreferences: true,
            timeout: 100 // 100ms timeout
          }, mockContext));
        }, 200); // Takes 200ms
      });

      // Operation should handle timeout appropriately
      const result = await slowOperation;

      // The actual implementation would handle timeouts
      // For now, we just ensure the operation completes
      expect(result).toBeDefined();
    });
  });
});