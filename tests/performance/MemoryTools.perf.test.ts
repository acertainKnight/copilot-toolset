/**
 * Performance Tests for Memory Tools
 * Tests memory operations with large datasets and concurrent access
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { MemoryTools } from '../../src/tools/MemoryTools.js';
import { UnifiedMemoryManager } from '../../src/memory/UnifiedMemoryManager.js';
import type { MemoryTier, MemoryScope, ToolExecutionContext } from '../../src/types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Performance thresholds (milliseconds)
const PERFORMANCE_THRESHOLDS = {
  SINGLE_STORE: 10,           // Single memory store should complete in <10ms
  SINGLE_SEARCH: 20,          // Single search should complete in <20ms
  BULK_STORE_PER_ITEM: 5,    // Bulk store should average <5ms per item
  BULK_SEARCH: 100,           // Bulk search should complete in <100ms
  STATS_RETRIEVAL: 50,        // Stats calculation should complete in <50ms
  CONCURRENT_OPS: 200,        // Concurrent operations should complete in <200ms
  LARGE_CONTENT_STORE: 15,    // Large content (near 2KB) should store in <15ms
  MIGRATION_PER_ITEM: 3       // Migration should average <3ms per item
};

describe('MemoryTools Performance', () => {
  let memoryTools: MemoryTools;
  let memoryManager: UnifiedMemoryManager;
  let testDbPath: string;
  let tempDir: string;
  let context: ToolExecutionContext;

  beforeAll(async () => {
    // Setup persistent test environment
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-perf-test-'));
    testDbPath = path.join(tempDir, 'perf-test.db');
  });

  afterAll(async () => {
    // Cleanup test environment
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Initialize fresh memory system for each test
    memoryManager = new UnifiedMemoryManager('/perf/test');
    // @ts-ignore - Override db path for testing
    memoryManager.dbPath = testDbPath;
    await memoryManager.initialize();

    memoryTools = new MemoryTools();
    // @ts-ignore - Replace with real manager
    memoryTools.unifiedMemoryManager = memoryManager;

    context = {
      workspacePath: '/perf/test',
      timestamp: Date.now()
    };
  });

  afterEach(async () => {
    await memoryManager.close();
    // Clear database for next test
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  describe('Single Operation Performance', () => {
    it('should store single memory within performance threshold', async () => {
      const content = 'Performance test content for single store operation';

      const startTime = Date.now();
      const result = await memoryTools.storeUnifiedMemory({
        content,
        tier: 'core',
        scope: 'global',
        tags: ['performance', 'test']
      }, context);
      const elapsed = Date.now() - startTime;

      expect(result.isError).toBeUndefined();
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_STORE);

      console.log(`Single store completed in ${elapsed}ms (threshold: ${PERFORMANCE_THRESHOLDS.SINGLE_STORE}ms)`);
    });

    it('should search memory within performance threshold', async () => {
      // Populate some test data
      for (let i = 0; i < 10; i++) {
        await memoryManager.store(
          `Test content ${i} with searchable keywords`,
          'core',
          'global',
          undefined,
          ['test', `tag${i}`]
        );
      }

      const startTime = Date.now();
      const result = await memoryTools.searchUnifiedMemory({
        query: 'searchable keywords',
        tier: 'both',
        scope: 'both',
        limit: 5
      }, context);
      const elapsed = Date.now() - startTime;

      expect(result.isError).toBeUndefined();
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_SEARCH);

      console.log(`Single search completed in ${elapsed}ms (threshold: ${PERFORMANCE_THRESHOLDS.SINGLE_SEARCH}ms)`);
    });

    it('should retrieve stats within performance threshold', async () => {
      // Populate test data
      for (let i = 0; i < 50; i++) {
        await memoryManager.store(
          `Stat test content ${i}`,
          i % 2 === 0 ? 'core' : 'longterm',
          i % 3 === 0 ? 'global' : 'project',
          i % 3 !== 0 ? '/perf/test' : undefined,
          [`tag${i % 5}`]
        );
      }

      const startTime = Date.now();
      const result = await memoryTools.getUnifiedMemoryStats({}, context);
      const elapsed = Date.now() - startTime;

      expect(result.isError).toBeUndefined();
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.STATS_RETRIEVAL);

      console.log(`Stats retrieval completed in ${elapsed}ms (threshold: ${PERFORMANCE_THRESHOLDS.STATS_RETRIEVAL}ms)`);
    });
  });

  describe('Bulk Operation Performance', () => {
    it('should handle bulk memory storage efficiently', async () => {
      const itemCount = 100;
      const contents = Array.from({ length: itemCount }, (_, i) => ({
        content: `Bulk test content ${i} with various metadata and tags`,
        tier: i % 2 === 0 ? 'core' : 'longterm' as MemoryTier,
        scope: i % 3 === 0 ? 'global' : 'project' as MemoryScope,
        tags: [`bulk`, `item${i}`, `group${i % 10}`]
      }));

      const startTime = Date.now();
      const promises = contents.map(item =>
        memoryTools.storeUnifiedMemory(item, context)
      );
      const results = await Promise.all(promises);
      const elapsed = Date.now() - startTime;

      const avgTimePerItem = elapsed / itemCount;

      // All should succeed
      results.forEach(result => {
        expect(result.isError).toBeUndefined();
      });

      expect(avgTimePerItem).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_STORE_PER_ITEM);

      console.log(`Bulk store of ${itemCount} items completed in ${elapsed}ms (avg: ${avgTimePerItem.toFixed(2)}ms per item)`);
    });

    it('should search through large dataset efficiently', async () => {
      // Create a large dataset
      const itemCount = 500;
      const searchTerms = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];

      for (let i = 0; i < itemCount; i++) {
        const searchTerm = searchTerms[i % searchTerms.length];
        await memoryManager.store(
          `Large dataset item ${i} containing ${searchTerm} and other content`,
          i % 2 === 0 ? 'core' : 'longterm',
          i % 3 === 0 ? 'global' : 'project',
          i % 3 !== 0 ? '/perf/test' : undefined,
          [searchTerm, `item${i}`]
        );
      }

      const startTime = Date.now();
      const result = await memoryTools.searchUnifiedMemory({
        query: 'alpha',
        tier: 'both',
        scope: 'both',
        limit: 20
      }, context);
      const elapsed = Date.now() - startTime;

      expect(result.isError).toBeUndefined();
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_SEARCH);

      console.log(`Search in ${itemCount} items completed in ${elapsed}ms (threshold: ${PERFORMANCE_THRESHOLDS.BULK_SEARCH}ms)`);
    });

    it('should handle mixed read/write operations efficiently', async () => {
      // Prepopulate some data
      for (let i = 0; i < 50; i++) {
        await memoryManager.store(
          `Initial content ${i}`,
          'core',
          'global',
          undefined,
          [`initial${i}`]
        );
      }

      // Mixed operations
      const operations = Array.from({ length: 100 }, (_, i) => {
        if (i % 3 === 0) {
          // Store operation
          return memoryTools.storeUnifiedMemory({
            content: `Mixed op store ${i}`,
            tier: 'longterm',
            scope: 'project'
          }, context);
        } else if (i % 3 === 1) {
          // Search operation
          return memoryTools.searchUnifiedMemory({
            query: `Initial content ${i % 50}`,
            limit: 5
          }, context);
        } else {
          // Stats operation
          return memoryTools.getUnifiedMemoryStats({}, context);
        }
      });

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const elapsed = Date.now() - startTime;

      // All operations should succeed
      results.forEach(result => {
        expect(result.isError).toBeUndefined();
      });

      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPS * 2);

      console.log(`100 mixed operations completed in ${elapsed}ms`);
    });
  });

  describe('Large Content Performance', () => {
    it('should handle near-2KB core memories efficiently', async () => {
      // Create content just under 2KB limit
      const largeContent = 'x'.repeat(2000); // ~2KB

      const startTime = Date.now();
      const result = await memoryTools.storeUnifiedMemory({
        content: largeContent,
        tier: 'core',
        scope: 'global',
        tags: ['large', 'maxsize']
      }, context);
      const elapsed = Date.now() - startTime;

      expect(result.isError).toBeUndefined();
      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_CONTENT_STORE);

      console.log(`Large content (2KB) store completed in ${elapsed}ms`);
    });

    it('should handle very large long-term memories', async () => {
      // Create 100KB content for long-term storage
      const veryLargeContent = JSON.stringify({
        data: 'y'.repeat(100000),
        metadata: {
          size: '100KB',
          type: 'stress-test'
        }
      });

      const startTime = Date.now();
      const result = await memoryTools.storeUnifiedMemory({
        content: veryLargeContent,
        tier: 'longterm',
        scope: 'project',
        tags: ['huge', 'stress-test']
      }, context);
      const elapsed = Date.now() - startTime;

      expect(result.isError).toBeUndefined();
      // Long-term should handle large content but may take longer
      expect(elapsed).toBeLessThan(100); // Still should be under 100ms

      console.log(`Very large content (100KB) store completed in ${elapsed}ms`);
    });

    it('should search large content efficiently', async () => {
      // Store several large documents
      for (let i = 0; i < 20; i++) {
        const content = JSON.stringify({
          id: i,
          title: `Document ${i}`,
          body: 'z'.repeat(5000), // 5KB each
          keywords: ['searchable', `doc${i}`, 'performance']
        });

        await memoryManager.store(
          content,
          'longterm',
          'project',
          '/perf/test',
          ['document', `doc${i}`]
        );
      }

      const startTime = Date.now();
      const result = await memoryTools.searchUnifiedMemory({
        query: 'Document 15',
        tier: 'longterm',
        scope: 'project',
        limit: 10
      }, context);
      const elapsed = Date.now() - startTime;

      expect(result.isError).toBeUndefined();
      expect(elapsed).toBeLessThan(50); // Should find specific document quickly

      console.log(`Search in large documents completed in ${elapsed}ms`);
    });
  });

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent stores without degradation', async () => {
      const concurrentCount = 50;

      const operations = Array.from({ length: concurrentCount }, (_, i) =>
        memoryTools.storeUnifiedMemory({
          content: `Concurrent store ${i}`,
          tier: i % 2 === 0 ? 'core' : 'longterm',
          scope: i % 3 === 0 ? 'global' : 'project',
          tags: [`concurrent`, `op${i}`]
        }, context)
      );

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const elapsed = Date.now() - startTime;

      // All should succeed
      results.forEach(result => {
        expect(result.isError).toBeUndefined();
      });

      const avgTime = elapsed / concurrentCount;
      expect(avgTime).toBeLessThan(10); // Average should still be fast

      console.log(`${concurrentCount} concurrent stores in ${elapsed}ms (avg: ${avgTime.toFixed(2)}ms)`);
    });

    it('should handle concurrent searches efficiently', async () => {
      // Prepopulate data
      for (let i = 0; i < 100; i++) {
        await memoryManager.store(
          `Searchable content ${i} with keyword${i % 10}`,
          'core',
          'global',
          undefined,
          [`keyword${i % 10}`]
        );
      }

      const concurrentSearches = 20;
      const searches = Array.from({ length: concurrentSearches }, (_, i) =>
        memoryTools.searchUnifiedMemory({
          query: `keyword${i % 10}`,
          limit: 10
        }, context)
      );

      const startTime = Date.now();
      const results = await Promise.all(searches);
      const elapsed = Date.now() - startTime;

      results.forEach(result => {
        expect(result.isError).toBeUndefined();
      });

      expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPS);

      console.log(`${concurrentSearches} concurrent searches in ${elapsed}ms`);
    });

    it('should handle read-write contention', async () => {
      // Simulate heavy read-write contention
      const operations: Promise<any>[] = [];

      // Start background writes
      for (let i = 0; i < 30; i++) {
        operations.push(
          memoryTools.storeUnifiedMemory({
            content: `Write operation ${i}`,
            tier: 'longterm',
            scope: 'project'
          }, context)
        );
      }

      // Interleave reads
      for (let i = 0; i < 30; i++) {
        operations.push(
          memoryTools.searchUnifiedMemory({
            query: 'operation',
            limit: 5
          }, context)
        );
      }

      // Add stats queries
      for (let i = 0; i < 10; i++) {
        operations.push(
          memoryTools.getUnifiedMemoryStats({}, context)
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const elapsed = Date.now() - startTime;

      // All should complete without errors
      results.forEach(result => {
        expect(result.isError).toBeUndefined();
      });

      // Should complete in reasonable time despite contention
      expect(elapsed).toBeLessThan(500);

      console.log(`70 operations with contention completed in ${elapsed}ms`);
    });
  });

  describe('Memory Pressure and Limits', () => {
    it('should maintain performance with many small core memories', async () => {
      const count = 200;
      const storePromises = [];

      const startTime = Date.now();
      for (let i = 0; i < count; i++) {
        storePromises.push(
          memoryManager.store(
            `Small core memory ${i}`,
            'core',
            'global',
            undefined,
            [`small${i}`]
          )
        );
      }
      await Promise.all(storePromises);
      const storeElapsed = Date.now() - startTime;

      // Now search through all
      const searchStart = Date.now();
      const result = await memoryTools.searchUnifiedMemory({
        query: 'Small core memory',
        tier: 'core',
        limit: 50
      }, context);
      const searchElapsed = Date.now() - searchStart;

      expect(result.isError).toBeUndefined();
      expect(storeElapsed / count).toBeLessThan(5); // Avg store time
      expect(searchElapsed).toBeLessThan(100); // Search should still be fast

      console.log(`${count} small memories: store ${storeElapsed}ms, search ${searchElapsed}ms`);
    });

    it('should handle memory stats calculation with large dataset', async () => {
      // Create diverse dataset
      const tiers: MemoryTier[] = ['core', 'longterm'];
      const scopes: MemoryScope[] = ['global', 'project'];

      for (let i = 0; i < 1000; i++) {
        await memoryManager.store(
          `Memory ${i} with content of varying sizes ${i % 2 === 0 ? 'x'.repeat(500) : 'y'.repeat(100)}`,
          tiers[i % 2],
          scopes[i % 2],
          scopes[i % 2] === 'project' ? '/perf/test' : undefined,
          [`tag${i % 20}`]
        );
      }

      const startTime = Date.now();
      const result = await memoryTools.getUnifiedMemoryStats({}, context);
      const elapsed = Date.now() - startTime;

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('1000'); // Should show correct count
      expect(elapsed).toBeLessThan(100); // Stats should be fast even with 1000 items

      console.log(`Stats for 1000 memories calculated in ${elapsed}ms`);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance across operations', async () => {
      const iterations = 5;
      const timings: number[] = [];

      for (let iter = 0; iter < iterations; iter++) {
        // Clear and repopulate
        await memoryManager.close();
        await fs.unlink(testDbPath).catch(() => {});
        await memoryManager.initialize();

        // Measure consistent workload
        const iterStart = Date.now();

        // Store 50 items
        const stores = Array.from({ length: 50 }, (_, i) =>
          memoryManager.store(
            `Iteration ${iter} item ${i}`,
            i % 2 === 0 ? 'core' : 'longterm',
            'global'
          )
        );
        await Promise.all(stores);

        // Search 10 times
        const searches = Array.from({ length: 10 }, () =>
          memoryManager.search({ query: 'item', limit: 10 })
        );
        await Promise.all(searches);

        // Get stats
        await memoryManager.getStats();

        const iterTime = Date.now() - iterStart;
        timings.push(iterTime);
      }

      // Calculate variance
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((acc, t) => acc + Math.pow(t - avgTime, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);

      // Performance should be consistent (low standard deviation)
      expect(stdDev).toBeLessThan(avgTime * 0.2); // Within 20% variance

      console.log(`Performance over ${iterations} iterations: avg=${avgTime.toFixed(2)}ms, stdDev=${stdDev.toFixed(2)}ms`);
    });
  });
});

describe('Memory Tool Performance Benchmarks', () => {
  let memoryTools: MemoryTools;
  let memoryManager: UnifiedMemoryManager;
  let testDbPath: string;

  beforeAll(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'benchmark-'));
    testDbPath = path.join(tempDir, 'benchmark.db');

    memoryManager = new UnifiedMemoryManager('/benchmark');
    // @ts-ignore
    memoryManager.dbPath = testDbPath;
    await memoryManager.initialize();

    memoryTools = new MemoryTools();
    // @ts-ignore
    memoryTools.unifiedMemoryManager = memoryManager;
  });

  afterAll(async () => {
    await memoryManager.close();
    await fs.unlink(testDbPath).catch(() => {});
  });

  it('should provide performance benchmark report', async () => {
    console.log('\n=== MEMORY TOOLS PERFORMANCE BENCHMARK ===\n');

    const benchmarks = [
      { name: 'Single Store (Core)', count: 1 },
      { name: 'Single Store (Long-term)', count: 1 },
      { name: 'Bulk Store (100 items)', count: 100 },
      { name: 'Simple Search', count: 1 },
      { name: 'Complex Search', count: 1 },
      { name: 'Stats Retrieval', count: 1 }
    ];

    const results: any[] = [];

    for (const benchmark of benchmarks) {
      const start = Date.now();

      switch (benchmark.name) {
        case 'Single Store (Core)':
          await memoryTools.storeUnifiedMemory({
            content: 'Benchmark content',
            tier: 'core',
            scope: 'global'
          }, {});
          break;

        case 'Single Store (Long-term)':
          await memoryTools.storeUnifiedMemory({
            content: 'x'.repeat(5000),
            tier: 'longterm',
            scope: 'project'
          }, { workspacePath: '/benchmark' });
          break;

        case 'Bulk Store (100 items)':
          const stores = Array.from({ length: 100 }, (_, i) =>
            memoryTools.storeUnifiedMemory({
              content: `Bulk item ${i}`,
              tier: i % 2 === 0 ? 'core' : 'longterm',
              scope: i % 3 === 0 ? 'global' : 'project'
            }, { workspacePath: '/benchmark' })
          );
          await Promise.all(stores);
          break;

        case 'Simple Search':
          await memoryTools.searchUnifiedMemory({
            query: 'Benchmark',
            limit: 10
          }, {});
          break;

        case 'Complex Search':
          await memoryTools.searchUnifiedMemory({
            query: 'Bulk item',
            tier: 'both',
            scope: 'both',
            limit: 50
          }, { workspacePath: '/benchmark' });
          break;

        case 'Stats Retrieval':
          await memoryTools.getUnifiedMemoryStats({}, {});
          break;
      }

      const elapsed = Date.now() - start;
      const opsPerSec = benchmark.count > 1 ? (1000 * benchmark.count / elapsed).toFixed(0) : 'N/A';

      results.push({
        benchmark: benchmark.name,
        time: `${elapsed}ms`,
        ops: opsPerSec !== 'N/A' ? `${opsPerSec} ops/sec` : 'N/A'
      });

      console.log(`${benchmark.name.padEnd(30)} ${elapsed.toString().padStart(6)}ms ${opsPerSec !== 'N/A' ? `(${opsPerSec} ops/sec)` : ''}`);
    }

    console.log('\n==========================================\n');

    // All benchmarks should complete
    expect(results.length).toBe(benchmarks.length);
  });
});