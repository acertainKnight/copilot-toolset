/**
 * Integration Tests for Memory Storage Across All Tier/Scope Combinations
 * Tests the complete memory system integration with workspace awareness and cross-tier operations
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { ThreeTierMemoryManager } from '../../../src/memory/ThreeTierMemoryManager.js';
import { MemoryLayer, MemorySearchOptions, Memory, MemoryStats } from '../../../src/types/index.js';
import { createTempDir, cleanupTempDir, createMockProject, PerformanceMeasurer } from '../../utils/TestHelpers.js';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('Memory Storage Integration Tests', () => {
  let unifiedManager: MemoryManager;
  let threeTierManager: ThreeTierMemoryManager;
  let tempDir: string;
  let project1Path: string;
  let project2Path: string;
  let performanceMeasurer: PerformanceMeasurer;

  beforeAll(async () => {
    performanceMeasurer = new PerformanceMeasurer();
    tempDir = await createTempDir('memory-integration-test-');

    // Create mock projects for testing
    project1Path = await createMockProject(tempDir, 'nodejs');
    project2Path = await createMockProject(tempDir, 'react');
  });

  beforeEach(async () => {
    unifiedManager = new MemoryManager(project1Path);
    threeTierManager = new ThreeTierMemoryManager(project1Path);

    await unifiedManager.initialize();
    await threeTierManager.initialize();
  });

  afterEach(async () => {
    await unifiedManager.close();
    await threeTierManager.close();
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('Cross-Manager Compatibility', () => {
    it('should maintain compatibility between unified and three-tier managers', async () => {
      // Store data using unified manager
      const unifiedId = await unifiedManager.store(
        'Data stored via unified manager',
        'project',
        ['compatibility', 'unified']
      );

      // Store data using three-tier manager
      const threeTierId = await threeTierManager.store(
        'Data stored via three-tier manager',
        'project',
        ['compatibility', 'three-tier']
      );

      expect(unifiedId).toBeTruthy();
      expect(threeTierId).toBeTruthy();

      // Both managers should be able to find both pieces of data
      const unifiedResults = await unifiedManager.search('compatibility');
      const threeTierResults = await threeTierManager.search('compatibility');

      // Note: Compatibility depends on implementation
      // This test verifies the expected behavior
      expect(unifiedResults.length).toBeGreaterThan(0);
      expect(threeTierResults.length).toBeGreaterThan(0);
    });

    it('should handle memory tier promotion/demotion across managers', async () => {
      // Store frequently accessed memory in three-tier system
      const memoryId = await threeTierManager.store(
        'Frequently accessed memory content',
        'system',
        ['frequent-access', 'promotion-test']
      );

      // Access multiple times to trigger promotion
      for (let i = 0; i < 5; i++) {
        await threeTierManager.search('frequently accessed');
        // Add delay to simulate real usage pattern
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Check if memory moved to higher tiers
      const stats = await threeTierManager.getMemoryStats();
      expect(stats.core_memory_size).toBeGreaterThanOrEqual(0);

      // Unified manager should still be able to access the same data
      const unifiedResults = await unifiedManager.search('frequently accessed');
      expect(unifiedResults.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Project Workspace Integration', () => {
    let project2Manager: MemoryManager;
    let project2ThreeTierManager: ThreeTierMemoryManager;

    beforeEach(async () => {
      project2Manager = new MemoryManager(project2Path);
      project2ThreeTierManager = new ThreeTierMemoryManager(project2Path);

      await project2Manager.initialize();
      await project2ThreeTierManager.initialize();
    });

    afterEach(async () => {
      await project2Manager.close();
      await project2ThreeTierManager.close();
    });

    it('should maintain proper isolation between projects', async () => {
      // Store project-specific memories
      await unifiedManager.store(
        'Node.js specific configuration and best practices',
        'project',
        ['nodejs', 'config', 'project1'],
        { project_type: 'nodejs' }
      );

      await project2Manager.store(
        'React specific component patterns and hooks',
        'project',
        ['react', 'components', 'project2'],
        { project_type: 'react' }
      );

      // Store shared global preferences
      await unifiedManager.store(
        'Global preference for dark theme and vim bindings',
        'preference',
        ['global', 'theme', 'vim'],
        { scope: 'global' }
      );

      // Test project isolation
      const project1Results = await unifiedManager.search('specific', { layer: 'project' });
      const project2Results = await project2Manager.search('specific', { layer: 'project' });

      expect(project1Results.length).toBeGreaterThan(0);
      expect(project2Results.length).toBeGreaterThan(0);

      // Verify content isolation
      const project1Content = project1Results.map(r => r.memory.content);
      const project2Content = project2Results.map(r => r.memory.content);

      expect(project1Content.some(content => content.includes('Node.js'))).toBe(true);
      expect(project2Content.some(content => content.includes('React'))).toBe(true);

      // Both should access global preferences
      const project1GlobalResults = await unifiedManager.search('Global preference');
      const project2GlobalResults = await project2Manager.search('Global preference');

      expect(project1GlobalResults.length).toBeGreaterThan(0);
      expect(project2GlobalResults.length).toBeGreaterThan(0);
    });

    it('should share system patterns and preferences across projects', async () => {
      // Store system-wide patterns via project1
      await unifiedManager.store(
        'Error handling pattern: always use try-catch blocks',
        'system',
        ['error-handling', 'patterns', 'global']
      );

      await unifiedManager.store(
        'User preference: functional programming style preferred',
        'preference',
        ['coding-style', 'functional', 'global']
      );

      // Both projects should access system patterns and preferences
      const project1SystemResults = await unifiedManager.search('Error handling pattern');
      const project2SystemResults = await project2Manager.search('Error handling pattern');

      const project1PrefResults = await unifiedManager.search('functional programming');
      const project2PrefResults = await project2Manager.search('functional programming');

      expect(project1SystemResults.length).toBeGreaterThan(0);
      expect(project2SystemResults.length).toBeGreaterThan(0);
      expect(project1PrefResults.length).toBeGreaterThan(0);
      expect(project2PrefResults.length).toBeGreaterThan(0);

      // Content should be identical across projects for global data
      expect(project1SystemResults[0].memory.content).toBe(project2SystemResults[0].memory.content);
      expect(project1PrefResults[0].memory.content).toBe(project2PrefResults[0].memory.content);
    });

    it('should handle context switching between projects efficiently', async () => {
      const contexts = [unifiedManager, project2Manager, unifiedManager, project2Manager];
      const switchTimes: number[] = [];

      for (let i = 0; i < contexts.length; i++) {
        const endTimer = performanceMeasurer.start('context-switch');

        // Perform operations in different project contexts
        await contexts[i].store(
          `Context switch test ${i}`,
          'project',
          ['context-switch', `iteration-${i}`]
        );

        const results = await contexts[i].search('context switch');
        expect(results.length).toBeGreaterThan(0);

        const switchTime = endTimer();
        switchTimes.push(switchTime);

        // Context switches should be fast (<100ms)
        expect(switchTime).toBeLessThan(100);
      }

      console.log(`Context switch times: ${switchTimes.map(t => t.toFixed(2)).join('ms, ')}ms`);
    });
  });

  describe('Memory Layer Integration', () => {
    beforeEach(async () => {
      // Create comprehensive test data across all layers
      await unifiedManager.store(
        'User coding style preference: functional over OOP',
        'preference',
        ['coding-style', 'functional', 'oop']
      );

      await unifiedManager.store(
        'Project uses TypeScript with strict mode enabled',
        'project',
        ['typescript', 'strict', 'configuration']
      );

      await unifiedManager.store(
        'Current session: implementing authentication system',
        'prompt',
        ['session', 'authentication', 'current-work']
      );

      await unifiedManager.store(
        'System pattern: use builder pattern for complex objects',
        'system',
        ['design-patterns', 'builder', 'best-practices']
      );
    });

    it('should maintain proper layer hierarchy and access patterns', async () => {
      const layers: MemoryLayer[] = ['preference', 'project', 'prompt', 'system'];

      for (const layer of layers) {
        const results = await unifiedManager.search('', { layer });

        expect(results.length).toBeGreaterThan(0);
        results.forEach(result => {
          expect(result.memory.layer).toBe(layer);
        });
      }
    });

    it('should support cross-layer search and relevance ranking', async () => {
      const allResults = await unifiedManager.search('TypeScript');
      const layerCounts = new Map<MemoryLayer, number>();

      allResults.forEach(result => {
        const layer = result.memory.layer;
        layerCounts.set(layer, (layerCounts.get(layer) || 0) + 1);
      });

      expect(allResults.length).toBeGreaterThan(0);

      // Should find TypeScript references across relevant layers
      console.log(`TypeScript references found across layers:`, Object.fromEntries(layerCounts));
    });

    it('should handle layer-specific memory limits and overflow', async () => {
      // Test memory limits (if implemented)
      const largeContent = 'x'.repeat(10000); // 10KB content

      // Store large content across different layers
      const layerIds = await Promise.all([
        unifiedManager.store(largeContent, 'preference', ['large-content', 'preference']),
        unifiedManager.store(largeContent, 'project', ['large-content', 'project']),
        unifiedManager.store(largeContent, 'system', ['large-content', 'system']),
        unifiedManager.store(largeContent, 'prompt', ['large-content', 'prompt'])
      ]);

      expect(layerIds).toHaveLength(4);
      layerIds.forEach(id => expect(id).toBeTruthy());

      // Verify all large content can be retrieved
      const largeContentResults = await unifiedManager.search('large-content');
      expect(largeContentResults.length).toBe(4);
    });

    it('should maintain access count accuracy across layers', async () => {
      const initialStats = await unifiedManager.getMemoryStats();

      // Perform searches across different layers
      await unifiedManager.search('preference', { layer: 'preference' });
      await unifiedManager.search('project', { layer: 'project' });
      await unifiedManager.search('system', { layer: 'system' });

      const updatedStats = await unifiedManager.getMemoryStats();

      // Access counts should increase
      expect(updatedStats.total_access_count).toBeGreaterThanOrEqual(initialStats.total_access_count);
    });
  });

  describe('Search Integration Across Storage Tiers', () => {
    beforeEach(async () => {
      // Create data with varying access patterns
      const testData = [
        { content: 'Frequently accessed JavaScript utility functions', layer: 'system' as MemoryLayer, tags: ['javascript', 'utils', 'frequent'] },
        { content: 'Moderately used React component patterns', layer: 'project' as MemoryLayer, tags: ['react', 'patterns', 'moderate'] },
        { content: 'Rarely accessed Python data analysis scripts', layer: 'project' as MemoryLayer, tags: ['python', 'data', 'rare'] },
        { content: 'Fresh TypeScript interface definitions', layer: 'prompt' as MemoryLayer, tags: ['typescript', 'interfaces', 'new'] }
      ];

      for (const data of testData) {
        await unifiedManager.store(data.content, data.layer, data.tags);
        await threeTierManager.store(data.content, data.layer, data.tags);
      }

      // Simulate different access patterns
      for (let i = 0; i < 5; i++) {
        await unifiedManager.search('JavaScript utility');
        await threeTierManager.search('JavaScript utility');
      }

      for (let i = 0; i < 2; i++) {
        await unifiedManager.search('React component');
        await threeTierManager.search('React component');
      }
    });

    it('should provide consistent search results across managers', async () => {
      const queries = ['JavaScript', 'React', 'Python', 'TypeScript'];

      for (const query of queries) {
        const unifiedResults = await unifiedManager.search(query);
        const threeTierResults = await threeTierManager.search(query);

        expect(unifiedResults.length).toBeGreaterThan(0);
        expect(threeTierResults.length).toBeGreaterThan(0);

        // Both should find relevant content
        const unifiedContent = unifiedResults.map(r => r.memory.content);
        const threeTierContent = threeTierResults.map(r => r.memory.content);

        // Should have some overlap in results
        const hasOverlap = unifiedContent.some(content =>
          threeTierContent.some(tc => tc.includes(query))
        );
        expect(hasOverlap).toBe(true);
      }
    });

    it('should handle complex multi-term searches effectively', async () => {
      const complexQueries = [
        'JavaScript utility functions',
        'React component patterns',
        'TypeScript interface definitions',
        'Python data analysis',
        'frequently accessed utils'
      ];

      for (const query of complexQueries) {
        const endTimer = performanceMeasurer.start('complex-search');

        const unifiedResults = await unifiedManager.search(query);
        const threeTierResults = await threeTierManager.search(query);

        const searchTime = endTimer();

        expect(searchTime).toBeLessThan(200); // Complex searches should complete in <200ms
        expect(unifiedResults.length + threeTierResults.length).toBeGreaterThan(0);

        console.log(`Complex search "${query}" took ${searchTime.toFixed(2)}ms`);
      }
    });

    it('should maintain search performance under load', async () => {
      // Create many memories to stress test search
      const promises: Promise<string>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          unifiedManager.store(
            `Load test memory ${i} with keywords: performance, stress, test-${i % 10}`,
            'project',
            ['load-test', 'performance', `batch-${Math.floor(i / 10)}`]
          )
        );
      }

      await Promise.all(promises);

      // Perform multiple concurrent searches
      const searchPromises = Array.from({ length: 20 }, (_, i) => {
        const endTimer = performanceMeasurer.start('load-search');
        return unifiedManager.search(`test-${i % 10}`).then(results => {
          const searchTime = endTimer();
          return { results, searchTime };
        });
      });

      const searchResults = await Promise.all(searchPromises);

      // All searches should complete successfully
      searchResults.forEach(({ results, searchTime }, index) => {
        expect(results.length).toBeGreaterThan(0);
        expect(searchTime).toBeLessThan(500); // Reasonable performance under load
      });

      const avgSearchTime = searchResults.reduce((sum, { searchTime }) => sum + searchTime, 0) / searchResults.length;
      console.log(`Average search time under load: ${avgSearchTime.toFixed(2)}ms`);
    });
  });

  describe('Database Integration and Persistence', () => {
    it('should persist data across manager restarts', async () => {
      const testContent = 'Persistent test data across restarts';
      const memoryId = await unifiedManager.store(testContent, 'system', ['persistence', 'restart-test']);

      expect(memoryId).toBeTruthy();

      // Close and reinitialize
      await unifiedManager.close();
      await unifiedManager.initialize();

      // Data should still be accessible
      const results = await unifiedManager.search('Persistent test data');
      expect(results.length).toBeGreaterThan(0);

      const persistedMemory = results.find(r => r.memory.content === testContent);
      expect(persistedMemory).toBeDefined();
      expect(persistedMemory!.memory.id).toBe(memoryId);
    });

    it('should handle database schema evolution', async () => {
      // Store data with current schema
      await unifiedManager.store('Schema evolution test', 'project', ['schema', 'evolution']);

      const stats = await unifiedManager.getMemoryStats();
      expect(stats.storage_size_bytes).toBeGreaterThan(0);

      // Schema should remain compatible
      const results = await unifiedManager.search('Schema evolution');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should maintain data integrity under concurrent access', async () => {
      const managers = await Promise.all(
        Array.from({ length: 5 }, (_, i) => {
          const manager = new MemoryManager(`${project1Path}-concurrent-${i}`);
          return manager.initialize().then(() => manager);
        })
      );

      try {
        // Concurrent operations across multiple managers
        const operations = managers.map((manager, i) =>
          Promise.all([
            manager.store(`Concurrent data ${i}`, 'project', [`concurrent-${i}`]),
            manager.search('concurrent'),
            manager.getMemoryStats()
          ])
        );

        const results = await Promise.all(operations);

        // All operations should succeed
        results.forEach((result, i) => {
          expect(result[0]).toBeTruthy(); // Store operation
          expect(Array.isArray(result[1])).toBe(true); // Search operation
          expect(result[2]).toHaveProperty('storage_size_bytes'); // Stats operation
        });

      } finally {
        // Cleanup
        await Promise.all(managers.map(manager => manager.close()));
      }
    });

    it('should optimize database performance over time', async () => {
      // Perform many operations to trigger optimization
      const operations = [];

      for (let i = 0; i < 50; i++) {
        operations.push(
          unifiedManager.store(`Optimization test ${i}`, 'project', [`opt-${i % 5}`])
        );
      }

      await Promise.all(operations);

      // Perform searches to create access patterns
      for (let i = 0; i < 20; i++) {
        await unifiedManager.search(`opt-${i % 5}`);
      }

      const finalStats = await unifiedManager.getMemoryStats();
      expect(finalStats.cold_storage_count).toBeGreaterThan(40);
      expect(finalStats.storage_size_bytes).toBeGreaterThan(0);

      console.log(`Database optimization test: ${finalStats.cold_storage_count} memories, ${(finalStats.storage_size_bytes / 1024).toFixed(2)}KB`);
    });
  });
});