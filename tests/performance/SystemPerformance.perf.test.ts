/**
 * Performance benchmarks for overall system components
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryManager } from '../../src/memory/MemoryManager.js';
import { ProjectInitializer } from '../../src/project/ProjectInitializer.js';
import { ChatModeManager } from '../../src/modes/ChatModeManager.js';
import { SelfHealingPromptManager } from '../../src/prompts/SelfHealingPromptManager.js';
import {
  createTestStoragePaths,
  createTestLogger,
  createMockProject,
  cleanupTempDir,
  PerformanceMeasurer,
  MemoryTracker,
  createTempDir
} from '../utils/TestHelpers.js';

describe('System Performance', () => {
  let memoryManager: MemoryManager;
  let projectInitializer: ProjectInitializer;
  let chatModeManager: ChatModeManager;
  let promptManager: SelfHealingPromptManager;
  let storagePaths: any;
  let logger: any;
  let performanceMeasurer: PerformanceMeasurer;
  let memoryTracker: MemoryTracker;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('system-perf-test-');
    storagePaths = await createTestStoragePaths();
    const testLogger = createTestLogger();
    logger = testLogger.logger;

    memoryManager = new MemoryManager();
    projectInitializer = new ProjectInitializer();
    chatModeManager = new ChatModeManager(storagePaths, logger);
    promptManager = new SelfHealingPromptManager();
    performanceMeasurer = new PerformanceMeasurer();
    memoryTracker = new MemoryTracker();

    await memoryManager.initialize();
    await chatModeManager.initialize();
    memoryTracker.setBaseline();
  });

  afterEach(async () => {
    await memoryManager.close();
    await cleanupTempDir(tempDir);
    if (storagePaths?.root) {
      await cleanupTempDir(storagePaths.root);
    }
  });

  describe('Project Initialization Performance', () => {
    it('should initialize small projects quickly', async () => {
      const projectDir = await createMockProject(tempDir, 'nodejs');

      const endTimer = performanceMeasurer.start('small-project-initialization');

      const result = await projectInitializer.initialize(projectDir);

      const duration = endTimer();

      expect(result).toBeDefined();
      expect(result).toContain('nodejs');
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      // Verify files were created
      const copilotMdExists = await fs.access(path.join(projectDir, 'COPILOT.md'))
        .then(() => true, () => false);
      expect(copilotMdExists).toBe(true);

      console.log(`Small project initialization completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle multiple project types efficiently', async () => {
      const projectTypes: Array<'nodejs' | 'python' | 'react'> = ['nodejs', 'python', 'react'];
      const projectDirs = await Promise.all(
        projectTypes.map(type => createMockProject(tempDir, type))
      );

      const endTimer = performanceMeasurer.start('multiple-project-initialization');

      const initPromises = projectDirs.map(dir => projectInitializer.initialize(dir));
      const results = await Promise.all(initPromises);

      const duration = endTimer();

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Initialized ${projectTypes.length} different project types in ${duration.toFixed(2)}ms`);
    });

    it('should handle large project structures efficiently', async () => {
      // Create a project with many nested directories and files
      const largeProjectDir = path.join(tempDir, 'large-project');
      await fs.mkdir(largeProjectDir, { recursive: true });

      // Create package.json
      const packageJson = {
        name: 'large-test-project',
        version: '1.0.0',
        dependencies: {}
      };

      // Add many dependencies to simulate a large project
      for (let i = 0; i < 50; i++) {
        packageJson.dependencies[`dependency-${i}`] = `^${i % 5 + 1}.0.0`;
      }

      await fs.writeFile(
        path.join(largeProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create deep directory structure
      const maxDepth = 5;
      const directoriesPerLevel = 5;

      async function createDeepStructure(basePath: string, currentDepth: number) {
        if (currentDepth >= maxDepth) return;

        for (let i = 0; i < directoriesPerLevel; i++) {
          const dirPath = path.join(basePath, `level${currentDepth}-dir${i}`);
          await fs.mkdir(dirPath, { recursive: true });

          // Create some files in each directory
          for (let j = 0; j < 3; j++) {
            await fs.writeFile(
              path.join(dirPath, `file${j}.js`),
              `// File ${j} in ${dirPath}\nconsole.log('Hello from ${dirPath}');`
            );
          }

          await createDeepStructure(dirPath, currentDepth + 1);
        }
      }

      await createDeepStructure(largeProjectDir, 0);

      const endTimer = performanceMeasurer.start('large-project-initialization');

      const result = await projectInitializer.initialize(largeProjectDir, 3); // Limit depth for performance

      const duration = endTimer();

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`Large project initialization completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent project initializations', async () => {
      const concurrentProjects = 5;
      const projectDirs = await Promise.all(
        Array.from({ length: concurrentProjects }, (_, i) =>
          createMockProject(tempDir, 'nodejs')
        )
      );

      const endTimer = performanceMeasurer.start('concurrent-project-initialization');

      const initPromises = projectDirs.map(dir => projectInitializer.initialize(dir));
      const results = await Promise.all(initPromises);

      const duration = endTimer();

      expect(results).toHaveLength(concurrentProjects);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds

      console.log(`${concurrentProjects} concurrent project initializations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Chat Mode Performance', () => {
    it('should create multiple chat modes quickly', async () => {
      const modesCount = 20;
      const endTimer = performanceMeasurer.start('multiple-chat-mode-creation');

      const modePromises = Array.from({ length: modesCount }, (_, i) =>
        chatModeManager.createMode({
          name: `perf-test-mode-${i}`,
          description: `Performance test mode ${i}`,
          systemPrompt: `You are performance test mode ${i} for benchmarking the chat mode creation system.`,
          tools: ['store_memory', 'retrieve_memory']
        })
      );

      const results = await Promise.all(modePromises);

      const duration = endTimer();

      expect(results).toHaveLength(modesCount);
      results.forEach((mode, index) => {
        expect(mode.name).toBe(`perf-test-mode-${index}`);
        expect(mode.enabled).toBe(true);
        expect(mode.builtIn).toBe(false);
      });

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Created ${modesCount} chat modes in ${duration.toFixed(2)}ms (${(duration/modesCount).toFixed(2)}ms per mode)`);
    });

    it('should handle rapid mode switching efficiently', async () => {
      // Create test modes
      const modes = ['test-mode-1', 'test-mode-2', 'test-mode-3'];
      for (let i = 0; i < modes.length; i++) {
        await chatModeManager.createMode({
          name: modes[i],
          description: `Test mode ${i + 1}`,
          systemPrompt: `Test mode ${i + 1} prompt`,
          tools: ['store_memory']
        });
      }

      const endTimer = performanceMeasurer.start('rapid-mode-switching');

      // Perform rapid switching
      const switchOperations = 100;
      for (let i = 0; i < switchOperations; i++) {
        const modeToActivate = modes[i % modes.length];
        await chatModeManager.activateMode(modeToActivate);
        expect(chatModeManager.getCurrentMode()).toBe(modeToActivate);
      }

      const duration = endTimer();

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`${switchOperations} mode switches completed in ${duration.toFixed(2)}ms (${(duration/switchOperations).toFixed(2)}ms per switch)`);
    });

    it('should list many modes efficiently', async () => {
      // Create many modes
      const modesCount = 50;
      const createPromises = Array.from({ length: modesCount }, (_, i) =>
        chatModeManager.createMode({
          name: `list-test-mode-${i}`,
          description: `List test mode ${i}`,
          systemPrompt: `Mode ${i} for testing list performance`,
          tools: ['store_memory']
        })
      );

      await Promise.all(createPromises);

      const endTimer = performanceMeasurer.start('list-many-modes');

      const modes = await chatModeManager.listModes();

      const duration = endTimer();

      expect(modes.length).toBeGreaterThan(modesCount); // Built-in modes + created modes
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      console.log(`Listed ${modes.length} modes in ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent mode operations', async () => {
      const endTimer = performanceMeasurer.start('concurrent-mode-operations');

      const operations = [
        // Create operations
        ...Array.from({ length: 10 }, (_, i) =>
          chatModeManager.createMode({
            name: `concurrent-mode-${i}`,
            description: `Concurrent mode ${i}`,
            systemPrompt: `Concurrent test mode ${i}`,
            tools: ['store_memory']
          })
        ),
        // List operations
        ...Array.from({ length: 5 }, () => chatModeManager.listModes()),
        // Get operations
        ...Array.from({ length: 5 }, () => chatModeManager.getMode('general'))
      ];

      const results = await Promise.all(operations);

      const duration = endTimer();

      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

      console.log(`20 concurrent mode operations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Self-Healing Performance', () => {
    it('should handle many error patterns efficiently', async () => {
      const errorCount = 500;
      const errorTypes = [
        'Cannot find module',
        'permission denied',
        'no such file',
        'syntax error',
        'connection refused'
      ];

      const endTimer = performanceMeasurer.start('many-error-patterns');

      const errorPromises = Array.from({ length: errorCount }, (_, i) => {
        const errorType = errorTypes[i % errorTypes.length];
        const error = new Error(`${errorType} error ${i}`);
        const context = { errorIndex: i, projectType: 'nodejs' };

        return promptManager.handleError(error, context);
      });

      const results = await Promise.all(errorPromises);

      const duration = endTimer();

      expect(results).toHaveLength(errorCount);
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result).toContain('Self-healing approach');
      });

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      const knownPatterns = promptManager.getKnownPatterns();
      expect(knownPatterns.length).toBeGreaterThan(0);

      console.log(`Processed ${errorCount} errors in ${duration.toFixed(2)}ms (${(duration/errorCount).toFixed(3)}ms per error)`);
      console.log(`Learned ${knownPatterns.length} distinct patterns`);
    });

    it('should reuse patterns efficiently for similar errors', async () => {
      // First, learn some patterns
      const learningErrors = [
        new Error('Cannot find module express'),
        new Error('permission denied /etc/passwd'),
        new Error('no such file or directory')
      ];

      for (const error of learningErrors) {
        await promptManager.handleError(error, {});
      }

      const initialPatterns = promptManager.getKnownPatterns();

      const endTimer = performanceMeasurer.start('pattern-reuse');

      // Process many similar errors
      const similarErrorCount = 1000;
      const similarErrorPromises = Array.from({ length: similarErrorCount }, (_, i) => {
        const errorType = i % 3;
        let error: Error;

        switch (errorType) {
          case 0:
            error = new Error(`Cannot find module dependency-${i}`);
            break;
          case 1:
            error = new Error(`permission denied /restricted/file-${i}`);
            break;
          default:
            error = new Error(`no such file or directory file-${i}.txt`);
        }

        return promptManager.handleError(error, { index: i });
      });

      const results = await Promise.all(similarErrorPromises);

      const duration = endTimer();

      expect(results).toHaveLength(similarErrorCount);
      results.forEach(result => {
        expect(typeof result).toBe('string');
      });

      const finalPatterns = promptManager.getKnownPatterns();
      expect(finalPatterns.length).toBe(initialPatterns.length); // Should not create new patterns

      expect(duration).toBeLessThan(5000); // Should be faster due to pattern reuse

      console.log(`Processed ${similarErrorCount} similar errors in ${duration.toFixed(2)}ms using pattern reuse`);
    });

    it('should handle complex error contexts efficiently', async () => {
      const endTimer = performanceMeasurer.start('complex-error-contexts');

      const complexErrors = Array.from({ length: 200 }, (_, i) => {
        const error = new Error(`Complex error scenario ${i}`);
        const context = {
          lastCommand: `complex-command-${i} --option value-${i}`,
          currentFile: {
            extension: ['js', 'ts', 'py', 'go'][i % 4],
            path: `/complex/path/to/file-${i}`,
            size: 1000 + i,
            metadata: {
              functions: i % 10,
              lines: 50 + i,
              complexity: i % 5
            }
          },
          projectType: ['nodejs', 'python', 'react', 'go'][i % 4],
          environment: {
            node: '18.0.0',
            npm: '8.0.0',
            os: 'linux',
            memory: `${1024 + i}MB`
          },
          history: Array.from({ length: i % 5 + 1 }, (_, j) => `historical-command-${j}`)
        };

        return promptManager.handleError(error, context);
      });

      const results = await Promise.all(complexErrors);

      const duration = endTimer();

      expect(results).toHaveLength(200);
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });

      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

      console.log(`Processed 200 complex error contexts in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Integrated System Performance', () => {
    it('should handle complex workflows efficiently', async () => {
      memoryTracker.checkpoint('workflow-start');
      const endTimer = performanceMeasurer.start('complex-integrated-workflow');

      // Step 1: Initialize multiple projects
      const projectTypes: Array<'nodejs' | 'react'> = ['nodejs', 'react'];
      const projectDirs = await Promise.all(
        projectTypes.map(type => createMockProject(tempDir, type))
      );

      const initResults = await Promise.all(
        projectDirs.map(dir => projectInitializer.initialize(dir))
      );

      expect(initResults).toHaveLength(2);

      // Step 2: Create multiple chat modes
      const modePromises = Array.from({ length: 5 }, (_, i) =>
        chatModeManager.createMode({
          name: `workflow-mode-${i}`,
          description: `Workflow test mode ${i}`,
          systemPrompt: `Integrated workflow test mode ${i}`,
          tools: ['store_memory', 'retrieve_memory']
        })
      );

      await Promise.all(modePromises);

      // Step 3: Store extensive knowledge
      const knowledgePromises = Array.from({ length: 100 }, (_, i) =>
        memoryManager.store(
          `Integrated workflow knowledge ${i}: This is comprehensive information about development practices and patterns.`,
          ['preference', 'project', 'prompt', 'system'][i % 4] as any,
          [`workflow-${i}`, 'integration', 'performance']
        )
      );

      await Promise.all(knowledgePromises);

      // Step 4: Perform searches
      const searchPromises = Array.from({ length: 20 }, (_, i) =>
        memoryManager.search(`workflow knowledge ${i}`)
      );

      const searchResults = await Promise.all(searchPromises);
      expect(searchResults).toHaveLength(20);

      // Step 5: Handle errors
      const errorPromises = Array.from({ length: 30 }, (_, i) =>
        promptManager.handleError(
          new Error(`Workflow error ${i}`),
          { step: i, workflow: 'integrated-test' }
        )
      );

      const errorResults = await Promise.all(errorPromises);
      expect(errorResults).toHaveLength(30);

      // Step 6: Mode operations
      await chatModeManager.activateMode('workflow-mode-0');
      const modes = await chatModeManager.listModes();
      expect(modes.length).toBeGreaterThan(5);

      // Step 7: Final statistics
      const finalStats = await memoryManager.getMemoryStats();
      expect(finalStats.core_memory_size).toBeGreaterThan(100);

      const duration = endTimer();
      const memoryUsed = memoryTracker.getMemoryDiff('workflow-start');

      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Complex integrated workflow completed in ${duration.toFixed(2)}ms`);
      console.log(`Memory used: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final memory stats: ${finalStats.core_memory_size} memories, ${(finalStats.storage_size_bytes / 1024).toFixed(2)}KB storage`);
    });

    it('should maintain performance under sustained load', async () => {
      const endTimer = performanceMeasurer.start('sustained-load-test');
      memoryTracker.checkpoint('sustained-load-start');

      // Simulate sustained load over multiple iterations
      const iterations = 20;
      const operationsPerIteration = 50;

      for (let iteration = 0; iteration < iterations; iteration++) {
        const iterationTimer = performanceMeasurer.start(`iteration-${iteration}`);

        const operations = [];

        // Memory operations
        for (let i = 0; i < operationsPerIteration; i++) {
          operations.push(
            memoryManager.store(
              `Sustained load iteration ${iteration}, operation ${i}`,
              'system',
              [`load-test-${iteration}-${i}`]
            )
          );
        }

        // Search operations
        for (let i = 0; i < 10; i++) {
          operations.push(memoryManager.search(`load-test-${iteration}`));
        }

        // Error handling
        for (let i = 0; i < 5; i++) {
          operations.push(
            promptManager.handleError(
              new Error(`Sustained load error ${iteration}-${i}`),
              { iteration, operation: i }
            )
          );
        }

        await Promise.all(operations);

        const iterationDuration = iterationTimer();

        // Each iteration should complete within reasonable time
        expect(iterationDuration).toBeLessThan(5000);

        if (iteration % 5 === 0) {
          const currentMemory = memoryTracker.getMemoryDiff('sustained-load-start');
          console.log(`Iteration ${iteration}: ${iterationDuration.toFixed(2)}ms, Memory: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`);
        }
      }

      const totalDuration = endTimer();
      const totalMemoryUsed = memoryTracker.getMemoryDiff('sustained-load-start');

      expect(totalDuration).toBeLessThan(120000); // Should complete within 2 minutes
      expect(totalMemoryUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB

      console.log(`Sustained load test completed in ${totalDuration.toFixed(2)}ms`);
      console.log(`Total operations: ${iterations * (operationsPerIteration + 15)}`);
      console.log(`Total memory used: ${(totalMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should recover gracefully from peak load', async () => {
      memoryTracker.checkpoint('peak-load-start');

      // Create peak load
      const peakTimer = performanceMeasurer.start('peak-load-generation');

      const peakOperations = [];

      // Generate intensive load
      for (let i = 0; i < 1000; i++) {
        peakOperations.push(
          memoryManager.store(`Peak load ${i}`, 'system', [`peak-${i}`])
        );
      }

      for (let i = 0; i < 100; i++) {
        peakOperations.push(memoryManager.search('peak'));
      }

      for (let i = 0; i < 50; i++) {
        peakOperations.push(
          promptManager.handleError(
            new Error(`Peak load error ${i}`),
            { peak: true, index: i }
          )
        );
      }

      await Promise.all(peakOperations);

      const peakDuration = peakTimer();
      const peakMemory = memoryTracker.getMemoryDiff('peak-load-start');

      // Recovery phase
      const recoveryTimer = performanceMeasurer.start('peak-load-recovery');
      memoryTracker.checkpoint('recovery-start');

      // Perform maintenance and light operations
      await memoryManager.performMaintenance();

      // Light operations to verify system is still responsive
      const recoveryOperations = [];
      for (let i = 0; i < 10; i++) {
        recoveryOperations.push(memoryManager.search('recovery'));
        recoveryOperations.push(memoryManager.getMemoryStats());
      }

      const recoveryResults = await Promise.all(recoveryOperations);

      const recoveryDuration = recoveryTimer();

      expect(recoveryResults).toHaveLength(20);
      expect(recoveryDuration).toBeLessThan(2000); // Recovery should be fast

      console.log(`Peak load: ${peakDuration.toFixed(2)}ms, ${(peakMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Recovery: ${recoveryDuration.toFixed(2)}ms`);
    });
  });
});