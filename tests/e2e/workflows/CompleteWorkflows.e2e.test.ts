/**
 * End-to-end tests for complete Copilot MCP Toolset workflows
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { ProjectInitializer } from '../../../src/project/ProjectInitializer.js';
import { ChatModeManager } from '../../../src/modes/ChatModeManager.js';
import { SelfHealingPromptManager } from '../../../src/prompts/SelfHealingPromptManager.js';
import {
  createTestStoragePaths,
  createTestLogger,
  cleanupTempDir,
  waitFor,
  PerformanceMeasurer
} from '../../utils/TestHelpers.js';

describe('Complete Workflows E2E', () => {
  let memoryManager: MemoryManager;
  let projectInitializer: ProjectInitializer;
  let chatModeManager: ChatModeManager;
  let promptManager: SelfHealingPromptManager;
  let storagePaths: any;
  let logger: any;
  let performanceMeasurer: PerformanceMeasurer;
  let testConfig: any;

  beforeEach(async () => {
    testConfig = (global as any).__E2E_TEST_CONFIG__;
    storagePaths = await createTestStoragePaths();
    const testLogger = createTestLogger();
    logger = testLogger.logger;

    memoryManager = new MemoryManager();
    projectInitializer = new ProjectInitializer();
    chatModeManager = new ChatModeManager(storagePaths, logger);
    promptManager = new SelfHealingPromptManager();
    performanceMeasurer = new PerformanceMeasurer();

    await memoryManager.initialize();
    await chatModeManager.initialize();
  });

  afterEach(async () => {
    await memoryManager.close();
    if (storagePaths?.root) {
      await cleanupTempDir(storagePaths.root);
    }
  });

  describe('Project Initialization and Memory Integration Workflow', () => {
    it('should complete full project initialization with memory storage', async () => {
      const stopTimer = performanceMeasurer.start('full-project-init');

      // Step 1: Initialize a Node.js project
      const projectDir = testConfig.nodeProjectDir;
      const initResult = await projectInitializer.initialize(projectDir);

      expect(initResult).toBeDefined();
      expect(initResult).toContain('nodejs');

      // Step 2: Verify COPILOT.md files were created
      const copilotMdPath = path.join(projectDir, 'COPILOT.md');
      const copilotMdExists = await fs.access(copilotMdPath).then(() => true, () => false);
      expect(copilotMdExists).toBe(true);

      const copilotContent = await fs.readFile(copilotMdPath, 'utf-8');
      expect(copilotContent).toContain('Project Context for GitHub Copilot');
      expect(copilotContent).toContain('express');

      // Step 3: Store project context in memory
      await memoryManager.store(
        `Project initialized: ${projectDir}. Type: Node.js, Framework: Express`,
        'project',
        ['initialization', 'nodejs', 'express']
      );

      // Step 4: Store user preferences
      await memoryManager.updateUserPreferences({
        preferred_framework: 'express',
        coding_style: 'functional',
        project_type: 'nodejs'
      });

      // Step 5: Verify memory integration works
      const projectSearchResults = await memoryManager.search('nodejs');
      expect(projectSearchResults.length).toBeGreaterThan(0);

      const preferenceResults = await memoryManager.search('functional');
      expect(preferenceResults.length).toBeGreaterThan(0);

      // Step 6: Verify memory bank structure was created
      const memoryBankPath = path.join(projectDir, '.copilot', 'memory');
      const memoryBankExists = await fs.access(memoryBankPath).then(() => true, () => false);
      expect(memoryBankExists).toBe(true);

      const configPath = path.join(projectDir, '.copilot', 'config.json');
      const configExists = await fs.access(configPath).then(() => true, () => false);
      expect(configExists).toBe(true);

      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(config.project.type).toBe('nodejs');

      const executionTime = stopTimer();
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Full project initialization completed in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle React project initialization workflow', async () => {
      const stopTimer = performanceMeasurer.start('react-project-init');

      // Initialize React project
      const reactProjectDir = testConfig.reactProjectDir;
      const initResult = await projectInitializer.initialize(reactProjectDir);

      expect(initResult).toContain('react');

      // Store React-specific context
      await memoryManager.store(
        'React project with Vite build tool. Uses JSX and modern React patterns.',
        'project',
        ['react', 'vite', 'jsx', 'frontend']
      );

      // Search for React-related memories
      const reactResults = await memoryManager.search('react');
      expect(reactResults.length).toBeGreaterThan(0);

      // Verify project structure was analyzed correctly
      const copilotMd = await fs.readFile(path.join(reactProjectDir, 'COPILOT.md'), 'utf-8');
      expect(copilotMd).toContain('react');
      expect(copilotMd).toContain('vite');

      const executionTime = stopTimer();
      console.log(`React project initialization completed in ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Chat Mode Creation and Memory Workflow', () => {
    it('should create custom chat mode and integrate with memory system', async () => {
      const stopTimer = performanceMeasurer.start('chat-mode-workflow');

      // Step 1: Create a custom chat mode for React development
      const reactDevMode = await chatModeManager.createMode({
        name: 'react-dev',
        description: 'Specialized React development assistant',
        systemPrompt: 'You are a React development expert. Help with component design, hooks, and modern React patterns.',
        tools: ['store_memory', 'retrieve_memory', 'init_project', 'analyze_project_structure'],
        temperature: 0.7,
        metadata: {
          specialization: 'frontend',
          framework: 'react'
        }
      });

      expect(reactDevMode.name).toBe('react-dev');
      expect(reactDevMode.builtIn).toBe(false);

      // Step 2: Store mode-specific knowledge in memory
      await memoryManager.store(
        'React development best practices: Use functional components, leverage hooks, follow component composition patterns.',
        'prompt',
        ['react', 'best-practices', 'react-dev-mode'],
        { mode: 'react-dev', confidence: 0.9 }
      );

      await memoryManager.store(
        'Common React patterns: useState for state, useEffect for side effects, custom hooks for reusable logic.',
        'prompt',
        ['react', 'hooks', 'patterns'],
        { mode: 'react-dev', confidence: 0.95 }
      );

      // Step 3: Activate the mode
      const activatedMode = await chatModeManager.activateMode('react-dev');
      expect(activatedMode.name).toBe('react-dev');
      expect(chatModeManager.getCurrentMode()).toBe('react-dev');

      // Step 4: Test memory retrieval in context of active mode
      const reactPatternResults = await memoryManager.search('hooks');
      expect(reactPatternResults.length).toBeGreaterThan(0);

      const hooksMemory = reactPatternResults.find(r => r.memory.content.includes('useState'));
      expect(hooksMemory).toBeDefined();

      // Step 5: Update mode based on learned patterns
      await chatModeManager.updateMode('react-dev', {
        systemPrompt: activatedMode.systemPrompt + '\n\nFocus on functional programming patterns and modern React hooks.'
      });

      const updatedMode = await chatModeManager.getMode('react-dev');
      expect(updatedMode?.systemPrompt).toContain('functional programming patterns');

      const executionTime = stopTimer();
      console.log(`Chat mode workflow completed in ${executionTime.toFixed(2)}ms`);
    });

    it('should demonstrate built-in modes with memory integration', async () => {
      // Test architect mode workflow
      await chatModeManager.activateMode('architect');
      expect(chatModeManager.getCurrentMode()).toBe('architect');

      // Store architecture-related knowledge
      await memoryManager.store(
        'System architecture decision: Use microservices pattern for scalability, implement API gateway for routing.',
        'system',
        ['architecture', 'microservices', 'scalability'],
        { mode: 'architect' }
      );

      // Test debugger mode workflow
      await chatModeManager.activateMode('debugger');
      expect(chatModeManager.getCurrentMode()).toBe('debugger');

      // Store debugging knowledge
      await memoryManager.store(
        'Common Node.js debugging approach: Use console.log strategically, leverage debugger statement, check async/await patterns.',
        'prompt',
        ['debugging', 'nodejs', 'async'],
        { mode: 'debugger' }
      );

      // Verify memories can be found across mode switches
      const archResults = await memoryManager.search('microservices');
      expect(archResults.length).toBeGreaterThan(0);

      const debugResults = await memoryManager.search('debugging');
      expect(debugResults.length).toBeGreaterThan(0);
    });
  });

  describe('Self-Healing and Error Recovery Workflow', () => {
    it('should demonstrate complete error handling and learning workflow', async () => {
      const stopTimer = performanceMeasurer.start('error-handling-workflow');

      // Step 1: Simulate common development errors
      const moduleError = new Error('Cannot find module \'nonexistent-package\'');
      const permissionError = new Error('EACCES: permission denied, open \'/restricted/file\'');
      const syntaxError = new Error('SyntaxError: Unexpected token } in JSON at position 45');

      const context = {
        lastCommand: 'npm install',
        currentFile: { extension: 'js' },
        projectType: 'nodejs'
      };

      // Step 2: Process errors through self-healing system
      const moduleHealingStrategy = await promptManager.handleError(moduleError, context);
      const permissionHealingStrategy = await promptManager.handleError(permissionError, context);
      const syntaxHealingStrategy = await promptManager.handleError(syntaxError, context);

      expect(moduleHealingStrategy).toContain('Self-healing approach');
      expect(permissionHealingStrategy).toContain('permission denied');
      expect(syntaxHealingStrategy).toContain('SyntaxError');

      // Step 3: Store healing strategies in memory for future reference
      await memoryManager.addSelfHealingPrompt(
        'Cannot find module',
        moduleHealingStrategy
      );

      await memoryManager.addSelfHealingPrompt(
        'permission denied',
        permissionHealingStrategy
      );

      // Step 4: Verify patterns are learned and retrievable
      const knownPatterns = promptManager.getKnownPatterns();
      expect(knownPatterns).toContain('missing_module');
      expect(knownPatterns).toContain('permission_error');
      expect(knownPatterns).toContain('generic_error');

      // Step 5: Test pattern reuse for similar errors
      const similarModuleError = new Error('Cannot find module \'another-missing-package\'');
      const reusedStrategy = await promptManager.handleError(similarModuleError, context);

      expect(reusedStrategy).toContain('Self-healing approach');

      // Step 6: Verify healing strategies are stored in memory
      const healingResults = await memoryManager.search('self_healing');
      expect(healingResults.length).toBeGreaterThan(0);

      const executionTime = stopTimer();
      console.log(`Error handling workflow completed in ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Cross-Session Memory Persistence Workflow', () => {
    it('should maintain memory across manager restarts', async () => {
      const stopTimer = performanceMeasurer.start('persistence-workflow');

      // Step 1: Store various types of memories
      const memoryId1 = await memoryManager.store(
        'Project uses TypeScript with strict mode enabled',
        'project',
        ['typescript', 'strict-mode', 'configuration']
      );

      const memoryId2 = await memoryManager.store(
        'User prefers 2-space indentation and semicolons',
        'preference',
        ['code-style', 'formatting']
      );

      await memoryManager.updateUserPreferences({
        indentation: '2-spaces',
        semicolons: true,
        quotes: 'single'
      });

      // Step 2: Get initial stats
      const initialStats = await memoryManager.getMemoryStats();
      expect(initialStats.core_memory_size).toBeGreaterThan(2);

      // Step 3: Close and recreate memory manager (simulating restart)
      await memoryManager.close();

      const newMemoryManager = new MemoryManager();
      await newMemoryManager.initialize();

      // Step 4: Verify memories persist across restart
      const projectResults = await newMemoryManager.search('TypeScript');
      expect(projectResults.length).toBeGreaterThan(0);

      const projectMemory = projectResults.find(r => r.memory.content.includes('strict mode'));
      expect(projectMemory).toBeDefined();

      const preferenceResults = await newMemoryManager.search('indentation');
      expect(preferenceResults.length).toBeGreaterThan(0);

      // Step 5: Verify stats are consistent
      const newStats = await newMemoryManager.getMemoryStats();
      expect(newStats.core_memory_size).toBe(initialStats.core_memory_size);

      await newMemoryManager.close();

      const executionTime = stopTimer();
      console.log(`Persistence workflow completed in ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Large-Scale Integration Workflow', () => {
    it('should handle complex project with multiple operations', async () => {
      const stopTimer = performanceMeasurer.start('large-scale-workflow');

      // Step 1: Initialize multiple projects
      const nodeProjectDir = testConfig.nodeProjectDir;
      const reactProjectDir = testConfig.reactProjectDir;

      await projectInitializer.initialize(nodeProjectDir);
      await projectInitializer.initialize(reactProjectDir);

      // Step 2: Create multiple chat modes
      const modes = [
        {
          name: 'fullstack-dev',
          description: 'Full-stack development with Node.js and React',
          systemPrompt: 'You help with both backend Node.js and frontend React development.',
          tools: ['store_memory', 'retrieve_memory', 'init_project']
        },
        {
          name: 'api-designer',
          description: 'REST API design and implementation specialist',
          systemPrompt: 'You specialize in REST API design, OpenAPI specs, and API best practices.',
          tools: ['store_memory', 'retrieve_memory']
        },
        {
          name: 'testing-expert',
          description: 'Testing strategy and implementation expert',
          systemPrompt: 'You help with unit testing, integration testing, and test automation.',
          tools: ['store_memory', 'retrieve_memory', 'analyze_project_structure']
        }
      ];

      for (const modeData of modes) {
        await chatModeManager.createMode(modeData);
      }

      // Step 3: Store extensive knowledge base
      const knowledgeItems = [
        { content: 'Express.js middleware pattern: app.use() for application-level middleware', layer: 'system', tags: ['express', 'middleware', 'patterns'] },
        { content: 'React testing: Use @testing-library/react for component testing', layer: 'prompt', tags: ['react', 'testing', 'best-practices'] },
        { content: 'API versioning: Use URL versioning (/v1/, /v2/) for public APIs', layer: 'system', tags: ['api', 'versioning', 'best-practices'] },
        { content: 'Node.js error handling: Always handle Promise rejections', layer: 'prompt', tags: ['nodejs', 'error-handling', 'promises'] },
        { content: 'React hooks: useCallback for memoizing functions, useMemo for expensive calculations', layer: 'prompt', tags: ['react', 'hooks', 'performance'] }
      ];

      for (const item of knowledgeItems) {
        await memoryManager.store(item.content, item.layer as any, item.tags);
      }

      // Step 4: Simulate complex interactions
      await chatModeManager.activateMode('fullstack-dev');
      const fullstackResults = await memoryManager.search('Express');
      expect(fullstackResults.length).toBeGreaterThan(0);

      await chatModeManager.activateMode('testing-expert');
      const testingResults = await memoryManager.search('testing');
      expect(testingResults.length).toBeGreaterThan(0);

      await chatModeManager.activateMode('api-designer');
      const apiResults = await memoryManager.search('API');
      expect(apiResults.length).toBeGreaterThan(0);

      // Step 5: Test error handling with different contexts
      const errors = [
        { error: new Error('Cannot find module \'express\''), context: { projectType: 'nodejs' } },
        { error: new Error('React component rendering error'), context: { projectType: 'react' } },
        { error: new Error('API endpoint not found'), context: { projectType: 'api' } }
      ];

      for (const { error, context } of errors) {
        const strategy = await promptManager.handleError(error, context);
        expect(strategy).toBeDefined();
        expect(strategy).toContain('Self-healing approach');
      }

      // Step 6: Verify system performance under load
      const finalStats = await memoryManager.getMemoryStats();
      expect(finalStats.core_memory_size).toBeGreaterThan(10);

      const allModes = await chatModeManager.listModes();
      expect(allModes.length).toBeGreaterThan(7); // 5 built-in + 3 custom modes

      const executionTime = stopTimer();
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Large-scale workflow completed in ${executionTime.toFixed(2)}ms`);
      console.log(`Final memory stats:`, finalStats);
    });
  });

  describe('Performance and Reliability Workflow', () => {
    it('should maintain performance under concurrent operations', async () => {
      const stopTimer = performanceMeasurer.start('concurrent-operations');

      // Create promises for concurrent operations
      const concurrentOperations = [
        // Memory operations
        memoryManager.store('Concurrent operation 1', 'system', ['concurrent', 'test1']),
        memoryManager.store('Concurrent operation 2', 'project', ['concurrent', 'test2']),
        memoryManager.store('Concurrent operation 3', 'preference', ['concurrent', 'test3']),

        // Search operations
        memoryManager.search('concurrent'),
        memoryManager.search('test'),

        // Chat mode operations
        chatModeManager.createMode({
          name: 'concurrent-test-1',
          description: 'Concurrent test mode 1',
          systemPrompt: 'Test mode for concurrent operations',
          tools: ['store_memory']
        }),
        chatModeManager.createMode({
          name: 'concurrent-test-2',
          description: 'Concurrent test mode 2',
          systemPrompt: 'Another test mode for concurrent operations',
          tools: ['retrieve_memory']
        }),

        // Error handling operations
        promptManager.handleError(new Error('Concurrent error 1'), { type: 'concurrent' }),
        promptManager.handleError(new Error('Concurrent error 2'), { type: 'concurrent' }),

        // Stats operations
        memoryManager.getMemoryStats()
      ];

      const results = await Promise.all(concurrentOperations);

      // Verify all operations completed successfully
      expect(results).toHaveLength(concurrentOperations.length);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // Verify created resources exist
      const concurrentMode1 = await chatModeManager.getMode('concurrent-test-1');
      const concurrentMode2 = await chatModeManager.getMode('concurrent-test-2');

      expect(concurrentMode1).not.toBeNull();
      expect(concurrentMode2).not.toBeNull();

      const concurrentSearchResults = await memoryManager.search('concurrent');
      expect(concurrentSearchResults.length).toBeGreaterThan(0);

      const executionTime = stopTimer();
      console.log(`Concurrent operations completed in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle system recovery after errors', async () => {
      const stopTimer = performanceMeasurer.start('error-recovery');

      // Step 1: Store some initial state
      await memoryManager.store('Initial state before errors', 'system', ['recovery', 'test']);

      const initialStats = await memoryManager.getMemoryStats();

      // Step 2: Simulate various error conditions and recovery
      const errorScenarios = [
        () => promptManager.handleError(new Error('Memory allocation failed'), {}),
        () => promptManager.handleError(new Error('File system error'), {}),
        () => promptManager.handleError(new Error('Network timeout'), {}),
        () => promptManager.handleError(new Error('Permission denied'), {}),
        () => promptManager.handleError(new Error('Invalid configuration'), {})
      ];

      for (const scenario of errorScenarios) {
        try {
          const result = await scenario();
          expect(result).toBeDefined();
        } catch (error) {
          // Error scenarios should be handled gracefully
          expect(error).toBeInstanceOf(Error);
        }
      }

      // Step 3: Verify system is still functional after errors
      const postErrorStats = await memoryManager.getMemoryStats();
      expect(postErrorStats.core_memory_size).toBeGreaterThanOrEqual(initialStats.core_memory_size);

      const recoveryMemoryId = await memoryManager.store('Recovery verification', 'system', ['recovery']);
      expect(recoveryMemoryId).toBeDefined();

      const recoveryResults = await memoryManager.search('recovery');
      expect(recoveryResults.length).toBeGreaterThan(0);

      const executionTime = stopTimer();
      console.log(`Error recovery workflow completed in ${executionTime.toFixed(2)}ms`);
    });
  });
});