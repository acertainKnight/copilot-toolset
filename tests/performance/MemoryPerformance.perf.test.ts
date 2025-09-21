/**
 * Performance benchmarks for Memory System
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryManager } from '../../src/memory/MemoryManager.js';
import { MemoryLayer } from '../../src/memory/types.js';
import {
  PerformanceMeasurer,
  MemoryTracker,
  createMockMemory
} from '../utils/TestHelpers.js';

describe('Memory System Performance', () => {
  let memoryManager: MemoryManager;
  let performanceMeasurer: PerformanceMeasurer;
  let memoryTracker: MemoryTracker;

  beforeEach(async () => {
    memoryManager = new MemoryManager();
    performanceMeasurer = new PerformanceMeasurer();
    memoryTracker = new MemoryTracker();

    await memoryManager.initialize();
    memoryTracker.setBaseline();
  });

  afterEach(async () => {
    await memoryManager.close();
  });

  describe('Memory Storage Performance', () => {
    it('should store 1000 memories within performance threshold', async () => {
      const endTimer = performanceMeasurer.start('bulk-storage-1000');

      const promises = [];
      for (let i = 0; i < 1000; i++) {
        const content = `Performance test memory ${i} with additional content to simulate realistic memory size`;
        const layer: MemoryLayer = ['preference', 'project', 'prompt', 'system'][i % 4] as MemoryLayer;
        const tags = [`perf-test-${i}`, `batch-1000`, `layer-${layer}`];

        promises.push(memoryManager.store(content, layer, tags));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(1000);
      results.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      const duration = endTimer();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Stored 1000 memories in ${duration.toFixed(2)}ms (${(duration/1000).toFixed(2)}ms per memory)`);
    });

    it('should store 10000 memories efficiently', async () => {
      const endTimer = performanceMeasurer.start('bulk-storage-10000');

      // Store in batches to avoid overwhelming the system
      const batchSize = 500;
      const totalMemories = 10000;
      let totalStored = 0;

      for (let batch = 0; batch < totalMemories / batchSize; batch++) {
        const batchPromises = [];

        for (let i = 0; i < batchSize; i++) {
          const memoryIndex = batch * batchSize + i;
          const content = `Large scale test memory ${memoryIndex}`;
          const layer: MemoryLayer = ['preference', 'project', 'prompt', 'system'][memoryIndex % 4] as MemoryLayer;
          const tags = [`large-scale-${memoryIndex}`, `batch-${batch}`];

          batchPromises.push(memoryManager.store(content, layer, tags));
        }

        const batchResults = await Promise.all(batchPromises);
        totalStored += batchResults.length;

        // Log progress every few batches
        if (batch % 5 === 0) {
          console.log(`Progress: ${totalStored}/${totalMemories} memories stored`);
        }
      }

      expect(totalStored).toBe(totalMemories);

      const duration = endTimer();
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      const stats = await memoryManager.getMemoryStats();
      expect(stats.core_memory_size).toBe(totalMemories + 2); // +2 for initial core memories

      console.log(`Stored ${totalMemories} memories in ${duration.toFixed(2)}ms (${(duration/totalMemories).toFixed(3)}ms per memory)`);
    });

    it('should handle concurrent storage operations efficiently', async () => {
      const endTimer = performanceMeasurer.start('concurrent-storage');

      const concurrentOperations = 100;
      const memoriesPerOperation = 10;

      const operationPromises = Array.from({ length: concurrentOperations }, async (_, opIndex) => {
        const operationPromises = [];

        for (let i = 0; i < memoriesPerOperation; i++) {
          const content = `Concurrent operation ${opIndex}, memory ${i}`;
          const layer: MemoryLayer = ['project', 'system'][i % 2] as MemoryLayer;
          const tags = [`concurrent-${opIndex}`, `memory-${i}`];

          operationPromises.push(memoryManager.store(content, layer, tags));
        }

        return Promise.all(operationPromises);
      });

      const results = await Promise.all(operationPromises);

      expect(results).toHaveLength(concurrentOperations);
      const totalMemories = results.flat().length;
      expect(totalMemories).toBe(concurrentOperations * memoriesPerOperation);

      const duration = endTimer();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`${concurrentOperations} concurrent operations (${totalMemories} total memories) completed in ${duration.toFixed(2)}ms`);
    });

    it('should maintain performance with large memory content', async () => {
      const endTimer = performanceMeasurer.start('large-content-storage');

      const largeContentSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB
      const memoriesPerSize = 100;

      for (const contentSize of largeContentSizes) {
        const sizeTimer = performanceMeasurer.start(`size-${contentSize}`);

        const largeContent = 'x'.repeat(contentSize);
        const promises = [];

        for (let i = 0; i < memoriesPerSize; i++) {
          const content = `Large content test ${i}: ${largeContent}`;
          promises.push(memoryManager.store(content, 'system', [`large-content-${contentSize}`, `index-${i}`]));
        }

        await Promise.all(promises);

        const sizeDuration = sizeTimer();
        console.log(`Stored ${memoriesPerSize} memories of ${contentSize} bytes each in ${sizeDuration.toFixed(2)}ms`);

        expect(sizeDuration).toBeLessThan(5000); // Should complete within 5 seconds per size
      }

      const totalDuration = endTimer();
      expect(totalDuration).toBeLessThan(20000); // Total should complete within 20 seconds

      const finalStats = await memoryManager.getMemoryStats();
      expect(finalStats.storage_size_bytes).toBeGreaterThan(1024 * 1024); // Should be > 1MB
    });
  });

  describe('Memory Search Performance', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      const setupPromises = [];
      for (let i = 0; i < 2000; i++) {
        const content = `Search performance test ${i} with keywords: algorithm, performance, javascript, react, node, testing`;
        const layer: MemoryLayer = ['preference', 'project', 'prompt', 'system'][i % 4] as MemoryLayer;
        const tags = [`search-perf-${i}`, 'searchable', 'performance-test'];

        setupPromises.push(memoryManager.store(content, layer, tags));
      }
      await Promise.all(setupPromises);
    });

    it('should search through large dataset quickly', async () => {
      const endTimer = performanceMeasurer.start('large-dataset-search');

      const searchQueries = [
        'algorithm',
        'javascript',
        'react',
        'performance',
        'testing',
        'node'
      ];

      const searchPromises = searchQueries.map(query =>
        memoryManager.search(query)
      );

      const results = await Promise.all(searchPromises);

      expect(results).toHaveLength(searchQueries.length);
      results.forEach(result => {
        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThanOrEqual(10); // Default limit
      });

      const duration = endTimer();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Searched ${searchQueries.length} queries across 2000+ memories in ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent search operations', async () => {
      const endTimer = performanceMeasurer.start('concurrent-search');

      const concurrentSearches = 50;
      const queries = [
        'algorithm performance',
        'javascript react',
        'node testing',
        'search optimization',
        'memory management'
      ];

      const searchPromises = Array.from({ length: concurrentSearches }, (_, index) => {
        const query = queries[index % queries.length];
        return memoryManager.search(query);
      });

      const results = await Promise.all(searchPromises);

      expect(results).toHaveLength(concurrentSearches);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      const duration = endTimer();
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`${concurrentSearches} concurrent searches completed in ${duration.toFixed(2)}ms`);
    });

    it('should perform well with different search options', async () => {
      const endTimer = performanceMeasurer.start('search-options-performance');

      const searchOptionsTests = [
        { options: { limit: 5 }, expected: 5 },
        { options: { limit: 20 }, expected: 20 },
        { options: { layer: 'project' as MemoryLayer }, expected: undefined },
        { options: { layer: 'system' as MemoryLayer, limit: 15 }, expected: 15 }
      ];

      const searchPromises = searchOptionsTests.map(({ options }) =>
        memoryManager.search('performance', options)
      );

      const results = await Promise.all(searchPromises);

      results.forEach((result, index) => {
        const test = searchOptionsTests[index];
        if (test.expected) {
          expect(result.length).toBeLessThanOrEqual(test.expected);
        }
        expect(result.length).toBeGreaterThan(0);
      });

      const duration = endTimer();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      console.log(`Search options performance test completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory System Initialization Performance', () => {
    it('should initialize quickly even after restart', async () => {
      // First, populate with data
      const setupPromises = [];
      for (let i = 0; i < 1000; i++) {
        setupPromises.push(
          memoryManager.store(
            `Initialization test memory ${i}`,
            'project',
            [`init-test-${i}`]
          )
        );
      }
      await Promise.all(setupPromises);

      // Close the current manager
      await memoryManager.close();

      // Measure initialization time
      const endTimer = performanceMeasurer.start('memory-initialization');

      const newMemoryManager = new MemoryManager();
      await newMemoryManager.initialize();

      const duration = endTimer();
      expect(duration).toBeLessThan(2000); // Should initialize within 2 seconds

      // Verify data is accessible
      const searchResults = await newMemoryManager.search('initialization');
      expect(searchResults.length).toBeGreaterThan(0);

      await newMemoryManager.close();

      console.log(`Memory system initialized in ${duration.toFixed(2)}ms`);
    });

    it('should handle multiple rapid initializations', async () => {
      await memoryManager.close();

      const endTimer = performanceMeasurer.start('rapid-initializations');

      const managers = [];
      for (let i = 0; i < 10; i++) {
        const manager = new MemoryManager();
        await manager.initialize();
        managers.push(manager);
      }

      const duration = endTimer();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Clean up
      for (const manager of managers) {
        await manager.close();
      }

      console.log(`10 rapid initializations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory System Statistics Performance', () => {
    it('should generate statistics quickly for large datasets', async () => {
      // Populate with significant amount of data
      const setupPromises = [];
      for (let i = 0; i < 5000; i++) {
        const content = `Stats test memory ${i}`;
        const layer: MemoryLayer = ['preference', 'project', 'prompt', 'system'][i % 4] as MemoryLayer;
        setupPromises.push(memoryManager.store(content, layer, [`stats-${i}`]));
      }
      await Promise.all(setupPromises);

      const endTimer = performanceMeasurer.start('stats-generation');

      const stats = await memoryManager.getMemoryStats();

      const duration = endTimer();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      expect(stats.core_memory_size).toBe(5002); // 5000 + 2 initial memories
      expect(stats.storage_size_bytes).toBeGreaterThan(0);
      expect(stats.total_access_count).toBeGreaterThanOrEqual(0);

      console.log(`Generated statistics for ${stats.core_memory_size} memories in ${duration.toFixed(2)}ms`);
    });

    it('should handle frequent stats requests efficiently', async () => {
      const endTimer = performanceMeasurer.start('frequent-stats-requests');

      const statsPromises = Array.from({ length: 100 }, () =>
        memoryManager.getMemoryStats()
      );

      const results = await Promise.all(statsPromises);

      expect(results).toHaveLength(100);
      results.forEach(stats => {
        expect(stats).toHaveProperty('core_memory_size');
        expect(stats).toHaveProperty('storage_size_bytes');
      });

      const duration = endTimer();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`100 stats requests completed in ${duration.toFixed(2)}ms (${(duration/100).toFixed(2)}ms each)`);
    });
  });

  describe('Memory Usage and Cleanup Performance', () => {
    it('should maintain reasonable memory usage under load', async () => {
      memoryTracker.checkpoint('before-load-test');

      const endTimer = performanceMeasurer.start('memory-usage-test');

      // Create significant load
      const batches = 10;
      const memoriesPerBatch = 500;

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = [];

        for (let i = 0; i < memoriesPerBatch; i++) {
          const content = `Memory usage test batch ${batch}, item ${i}`;
          batchPromises.push(
            memoryManager.store(content, 'system', [`usage-test-${batch}-${i}`])
          );
        }

        await Promise.all(batchPromises);

        // Check memory usage periodically
        if (batch % 3 === 0) {
          memoryTracker.checkpoint(`batch-${batch}`);
          const memoryDiff = memoryTracker.getMemoryDiff(`batch-${batch}`);

          // Memory usage should remain reasonable (less than 100MB growth per batch group)
          expect(memoryDiff).toBeLessThan(100 * 1024 * 1024);
        }
      }

      const duration = endTimer();
      const finalMemoryDiff = memoryTracker.getMemoryDiff('before-load-test');

      console.log(`Memory usage test completed in ${duration.toFixed(2)}ms`);
      console.log(`Memory growth: ${(finalMemoryDiff / 1024 / 1024).toFixed(2)}MB`);

      // Total memory growth should be reasonable for the amount of data stored
      expect(finalMemoryDiff).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    });

    it('should perform maintenance efficiently', async () => {
      // Add some data first
      const setupPromises = [];
      for (let i = 0; i < 1000; i++) {
        setupPromises.push(
          memoryManager.store(
            `Maintenance test ${i}`,
            'system',
            [`maintenance-${i}`]
          )
        );
      }
      await Promise.all(setupPromises);

      const endTimer = performanceMeasurer.start('memory-maintenance');

      await memoryManager.performMaintenance();

      const duration = endTimer();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Memory maintenance completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle empty searches efficiently', async () => {
      const endTimer = performanceMeasurer.start('empty-search-performance');

      const emptySearches = Array.from({ length: 100 }, () =>
        memoryManager.search('nonexistent-term-that-will-not-match')
      );

      const results = await Promise.all(emptySearches);

      results.forEach(result => {
        expect(result).toHaveLength(0);
      });

      const duration = endTimer();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      console.log(`100 empty searches completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle very long search queries efficiently', async () => {
      const endTimer = performanceMeasurer.start('long-query-search');

      const longQuery = 'very long search query with many words that may or may not match anything in the memory system but should still be processed efficiently by the search algorithm without causing performance issues';

      const result = await memoryManager.search(longQuery);

      expect(Array.isArray(result)).toBe(true);

      const duration = endTimer();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      console.log(`Long query search completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle rapid successive operations', async () => {
      const endTimer = performanceMeasurer.start('rapid-successive-operations');

      // Rapid alternating store/search operations
      const operations = [];
      for (let i = 0; i < 200; i++) {
        if (i % 2 === 0) {
          operations.push(
            memoryManager.store(`Rapid operation ${i}`, 'system', [`rapid-${i}`])
          );
        } else {
          operations.push(
            memoryManager.search('rapid')
          );
        }
      }

      const results = await Promise.all(operations);

      expect(results).toHaveLength(200);

      const duration = endTimer();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`200 rapid successive operations completed in ${duration.toFixed(2)}ms`);
    });
  });
});