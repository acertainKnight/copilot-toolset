/**
 * Comprehensive Performance Benchmarks for Unified Memory System
 * Target: Memory operations <10ms, Search operations <50ms, Concurrent ops <100ms
 * Includes stress testing, load testing, and resource optimization validation
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { ThreeTierMemoryManager } from '../../../src/memory/ThreeTierMemoryManager.js';
import { MemoryLayer, MemorySearchOptions } from '../../../src/types/index.js';
import { createTempDir, cleanupTempDir, PerformanceMeasurer, MemoryTracker } from '../../utils/TestHelpers.js';
import { PerformanceReporter } from '../PerformanceReporter.js';

interface PerformanceBenchmark {
  name: string;
  operation: () => Promise<any>;
  threshold: number; // milliseconds
  category: 'memory' | 'search' | 'concurrent' | 'bulk';
  description: string;
}

interface ResourceUsage {
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  duration: number;
  operationCount: number;
}

const PERFORMANCE_THRESHOLDS = {
  MEMORY_STORE: 10,     // <10ms per memory store operation
  SIMPLE_SEARCH: 50,    // <50ms for simple searches
  COMPLEX_SEARCH: 200,  // <200ms for complex multi-term searches
  CONCURRENT_OP: 100,   // <100ms per concurrent operation
  BULK_OPERATION: 500,  // <500ms for bulk operations (per 100 items)
  STATS_RETRIEVAL: 5,   // <5ms for statistics
  INITIALIZATION: 100,  // <100ms for system initialization
  CLEANUP: 50          // <50ms for cleanup operations
} as const;

describe('Comprehensive Performance Benchmarks', () => {
  let unifiedManager: MemoryManager;
  let threeTierManager: ThreeTierMemoryManager;
  let tempDir: string;
  let performanceMeasurer: PerformanceMeasurer;
  let memoryTracker: MemoryTracker;
  let performanceReporter: PerformanceReporter;

  beforeAll(async () => {
    performanceMeasurer = new PerformanceMeasurer();
    memoryTracker = new MemoryTracker();
    performanceReporter = new PerformanceReporter();

    tempDir = await createTempDir('comprehensive-perf-test-');

    console.log('🚀 Initializing comprehensive performance benchmark environment...');

    // Set baseline memory usage
    memoryTracker.setBaseline();
  });

  beforeEach(async () => {
    unifiedManager = new MemoryManager(tempDir);
    threeTierManager = new ThreeTierMemoryManager(tempDir);

    const initTimer = performanceMeasurer.start('initialization');
    await unifiedManager.initialize();
    await threeTierManager.initialize();
    const initTime = initTimer();

    expect(initTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIALIZATION);
    performanceReporter.recordMetric('initialization', initTime, PERFORMANCE_THRESHOLDS.INITIALIZATION);

    memoryTracker.checkpoint('test-start');
  });

  afterEach(async () => {
    const cleanupTimer = performanceMeasurer.start('cleanup');
    await unifiedManager.close();
    await threeTierManager.close();
    const cleanupTime = cleanupTimer();

    expect(cleanupTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CLEANUP);
    performanceReporter.recordMetric('cleanup', cleanupTime, PERFORMANCE_THRESHOLDS.CLEANUP);

    // Check for memory leaks
    const memoryDiff = memoryTracker.getMemoryDiff('test-start');
    performanceReporter.recordMemoryUsage(memoryDiff / 1024 / 1024); // Convert to MB
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);

    // Generate comprehensive performance report
    await performanceReporter.generateReport('comprehensive-performance-benchmarks');
    console.log('📊 Comprehensive performance report generated');
  });

  describe('Memory Operation Benchmarks', () => {
    const testMemoryData = [
      { content: 'Small memory item', layer: 'project' as MemoryLayer, tags: ['small'] },
      { content: 'Medium memory item with more detailed content describing implementation patterns', layer: 'system' as MemoryLayer, tags: ['medium', 'patterns'] },
      { content: 'Large memory item with extensive content: ' + 'x'.repeat(5000), layer: 'preference' as MemoryLayer, tags: ['large', 'extensive'] },
      { content: JSON.stringify({ complex: { nested: { data: Array.from({length: 100}, (_, i) => `item-${i}`) } } }), layer: 'prompt' as MemoryLayer, tags: ['json', 'complex'] }
    ];

    it('should meet memory store performance targets', async () => {
      for (const testData of testMemoryData) {
        const endTimer = performanceMeasurer.start('memory-store');

        const memoryId = await unifiedManager.store(
          testData.content,
          testData.layer,
          testData.tags,
          { size_category: testData.tags[0] }
        );

        const duration = endTimer();

        expect(memoryId).toBeTruthy();
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_STORE);

        performanceReporter.recordMetric('memory-store', duration, PERFORMANCE_THRESHOLDS.MEMORY_STORE);

        if (duration > PERFORMANCE_THRESHOLDS.MEMORY_STORE * 0.8) {
          console.warn(`⚠️ Store operation for ${testData.tags[0]} content took ${duration.toFixed(2)}ms`);
        }
      }

      console.log(`✅ All memory store operations met <${PERFORMANCE_THRESHOLDS.MEMORY_STORE}ms threshold`);
    });

    it('should handle memory store batches efficiently', async () => {
      const batchSizes = [10, 50, 100, 200];

      for (const batchSize of batchSizes) {
        const promises: Promise<string>[] = [];

        const batchTimer = performanceMeasurer.start(`batch-store-${batchSize}`);

        for (let i = 0; i < batchSize; i++) {
          promises.push(
            unifiedManager.store(
              `Batch item ${i} for performance testing`,
              'project',
              ['batch', 'performance', `size-${batchSize}`],
              { batch_index: i, batch_size: batchSize }
            )
          );
        }

        const results = await Promise.all(promises);
        const batchTime = batchTimer();

        expect(results).toHaveLength(batchSize);
        results.forEach(id => expect(id).toBeTruthy());

        const avgTimePerItem = batchTime / batchSize;
        expect(avgTimePerItem).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_STORE);

        performanceReporter.recordMetric(`batch-store-${batchSize}`, avgTimePerItem, PERFORMANCE_THRESHOLDS.MEMORY_STORE);

        console.log(`📦 Batch ${batchSize}: ${batchTime.toFixed(2)}ms total, ${avgTimePerItem.toFixed(2)}ms avg per item`);
      }
    });

    it('should compare unified vs three-tier performance', async () => {
      const testOperations = [
        { content: 'Performance comparison test 1', layer: 'system' as MemoryLayer },
        { content: 'Performance comparison test 2', layer: 'project' as MemoryLayer },
        { content: 'Performance comparison test 3', layer: 'preference' as MemoryLayer }
      ];

      const unifiedTimes: number[] = [];
      const threeTierTimes: number[] = [];

      for (const operation of testOperations) {
        // Test unified manager
        const unifiedTimer = performanceMeasurer.start('unified-store');
        await unifiedManager.store(operation.content, operation.layer, ['comparison']);
        const unifiedTime = unifiedTimer();
        unifiedTimes.push(unifiedTime);

        // Test three-tier manager
        const threeTierTimer = performanceMeasurer.start('three-tier-store');
        await threeTierManager.store(operation.content, operation.layer, ['comparison']);
        const threeTierTime = threeTierTimer();
        threeTierTimes.push(threeTierTime);
      }

      const unifiedAvg = unifiedTimes.reduce((sum, time) => sum + time, 0) / unifiedTimes.length;
      const threeTierAvg = threeTierTimes.reduce((sum, time) => sum + time, 0) / threeTierTimes.length;

      console.log(`📊 Performance comparison - Unified: ${unifiedAvg.toFixed(2)}ms avg, Three-tier: ${threeTierAvg.toFixed(2)}ms avg`);

      // Both should meet thresholds
      expect(unifiedAvg).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_STORE);
      expect(threeTierAvg).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_STORE * 2); // More lenient for complex system

      performanceReporter.recordMetric('unified-avg', unifiedAvg, PERFORMANCE_THRESHOLDS.MEMORY_STORE);
      performanceReporter.recordMetric('three-tier-avg', threeTierAvg, PERFORMANCE_THRESHOLDS.MEMORY_STORE * 2);
    });
  });

  describe('Search Performance Benchmarks', () => {
    beforeEach(async () => {
      // Set up comprehensive search test data
      const searchTestData = [
        // Technology stack data
        { content: 'React TypeScript components with hooks and state management', layer: 'project', tags: ['react', 'typescript', 'hooks', 'state'] },
        { content: 'Node.js Express API server with middleware and routing', layer: 'project', tags: ['nodejs', 'express', 'api', 'server'] },
        { content: 'Python Django web framework with ORM and authentication', layer: 'system', tags: ['python', 'django', 'web', 'orm'] },
        { content: 'Database optimization techniques for PostgreSQL and MongoDB', layer: 'system', tags: ['database', 'optimization', 'postgresql', 'mongodb'] },

        // Programming patterns
        { content: 'Functional programming patterns: map, filter, reduce operations', layer: 'system', tags: ['functional', 'programming', 'patterns', 'operations'] },
        { content: 'Object-oriented design principles: SOLID, DRY, KISS', layer: 'system', tags: ['oop', 'design', 'principles', 'solid'] },
        { content: 'Microservices architecture with API gateway and service discovery', layer: 'system', tags: ['microservices', 'architecture', 'api-gateway', 'discovery'] },

        // User preferences
        { content: 'User prefers dark theme with syntax highlighting', layer: 'preference', tags: ['theme', 'dark', 'syntax', 'highlighting'] },
        { content: 'Code formatting: 2 spaces, semicolons, trailing commas', layer: 'preference', tags: ['formatting', 'spaces', 'semicolons', 'commas'] },

        // Current session context
        { content: 'Working on authentication system with JWT tokens', layer: 'prompt', tags: ['authentication', 'jwt', 'tokens', 'current'] },
        { content: 'Implementing user dashboard with real-time updates', layer: 'prompt', tags: ['dashboard', 'realtime', 'updates', 'user'] }
      ];

      for (const data of searchTestData) {
        await unifiedManager.store(data.content, data.layer as MemoryLayer, data.tags);
      }

      // Add bulk data for stress testing
      for (let i = 0; i < 100; i++) {
        await unifiedManager.store(
          `Bulk search test item ${i} with keywords: performance, testing, optimization`,
          'project',
          ['bulk', 'search', 'performance', `item-${i}`],
          { batch: Math.floor(i / 10) }
        );
      }
    });

    it('should meet simple search performance targets', async () => {
      const simpleQueries = [
        'React',
        'Python',
        'database',
        'authentication',
        'performance'
      ];

      for (const query of simpleQueries) {
        const searchTimer = performanceMeasurer.start('simple-search');
        const results = await unifiedManager.search(query);
        const searchTime = searchTimer();

        expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_SEARCH);
        expect(results.length).toBeGreaterThan(0);

        performanceReporter.recordMetric('simple-search', searchTime, PERFORMANCE_THRESHOLDS.SIMPLE_SEARCH);

        console.log(`🔍 "${query}": ${results.length} results in ${searchTime.toFixed(2)}ms`);
      }
    });

    it('should meet complex search performance targets', async () => {
      const complexQueries = [
        'React TypeScript components hooks',
        'Node.js Express API middleware',
        'functional programming patterns operations',
        'microservices architecture API gateway',
        'authentication system JWT tokens'
      ];

      for (const query of complexQueries) {
        const searchTimer = performanceMeasurer.start('complex-search');
        const results = await unifiedManager.search(query);
        const searchTime = searchTimer();

        expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SEARCH);
        expect(results.length).toBeGreaterThan(0);

        performanceReporter.recordMetric('complex-search', searchTime, PERFORMANCE_THRESHOLDS.COMPLEX_SEARCH);

        // Verify result quality
        const topResult = results[0];
        expect(topResult.similarity_score).toBeGreaterThan(0);

        console.log(`🔍 "${query}": ${results.length} results in ${searchTime.toFixed(2)}ms (top score: ${topResult.similarity_score?.toFixed(2)})`);
      }
    });

    it('should handle filtered searches efficiently', async () => {
      const layers: MemoryLayer[] = ['preference', 'project', 'system', 'prompt'];
      const limits = [5, 10, 25, 50];

      for (const layer of layers) {
        for (const limit of limits) {
          const searchTimer = performanceMeasurer.start('filtered-search');
          const results = await unifiedManager.search('test', { layer, limit });
          const searchTime = searchTimer();

          expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_SEARCH);
          expect(results.length).toBeLessThanOrEqual(limit);

          // Verify all results are from correct layer
          results.forEach(result => {
            expect(result.memory.layer).toBe(layer);
          });

          performanceReporter.recordMetric('filtered-search', searchTime, PERFORMANCE_THRESHOLDS.SIMPLE_SEARCH);
        }
      }

      console.log(`✅ All filtered searches completed within ${PERFORMANCE_THRESHOLDS.SIMPLE_SEARCH}ms threshold`);
    });

    it('should maintain search performance under stress', async () => {
      const stressQueries = Array.from({ length: 50 }, (_, i) => {
        const queryTypes = ['React', 'Node.js', 'Python', 'database', 'authentication'];
        const modifiers = ['optimization', 'patterns', 'best practices', 'implementation', 'configuration'];
        return `${queryTypes[i % queryTypes.length]} ${modifiers[i % modifiers.length]}`;
      });

      const searchPromises = stressQueries.map(async (query, index) => {
        const searchTimer = performanceMeasurer.start('stress-search');
        const results = await unifiedManager.search(query);
        const searchTime = searchTimer();

        return { query, results: results.length, duration: searchTime, index };
      });

      const stressResults = await Promise.all(searchPromises);

      stressResults.forEach(({ query, results, duration, index }) => {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SEARCH);
        expect(results).toBeGreaterThanOrEqual(0);

        performanceReporter.recordMetric('stress-search', duration, PERFORMANCE_THRESHOLDS.COMPLEX_SEARCH);
      });

      const avgDuration = stressResults.reduce((sum, { duration }) => sum + duration, 0) / stressResults.length;
      const maxDuration = Math.max(...stressResults.map(({ duration }) => duration));

      console.log(`💪 Stress test: ${stressResults.length} searches, avg: ${avgDuration.toFixed(2)}ms, max: ${maxDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_SEARCH);
    });
  });

  describe('Concurrent Operations Benchmarks', () => {
    it('should handle concurrent memory stores efficiently', async () => {
      const concurrentStores = Array.from({ length: 25 }, (_, i) => {
        const storeTimer = performanceMeasurer.start('concurrent-store');

        return unifiedManager.store(
          `Concurrent store operation ${i}`,
          'project',
          ['concurrent', 'store', `op-${i}`],
          { operation_id: i, timestamp: Date.now() }
        ).then(id => {
          const duration = storeTimer();
          return { id, duration, index: i };
        });
      });

      const results = await Promise.all(concurrentStores);

      results.forEach(({ id, duration, index }) => {
        expect(id).toBeTruthy();
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OP);

        performanceReporter.recordMetric('concurrent-store', duration, PERFORMANCE_THRESHOLDS.CONCURRENT_OP);
      });

      const avgDuration = results.reduce((sum, { duration }) => sum + duration, 0) / results.length;
      console.log(`⚡ Concurrent stores: ${results.length} operations, avg: ${avgDuration.toFixed(2)}ms`);
    });

    it('should handle mixed concurrent operations', async () => {
      const mixedOperations = [
        // Store operations
        ...Array.from({ length: 8 }, (_, i) =>
          unifiedManager.store(`Mixed concurrent store ${i}`, 'project', ['mixed', 'concurrent'])
            .then(id => ({ type: 'store', result: id, duration: 0 }))
        ),
        // Search operations
        ...Array.from({ length: 10 }, (_, i) => {
          const searchTimer = performanceMeasurer.start('mixed-search');
          return unifiedManager.search(`concurrent ${i % 3}`)
            .then(results => {
              const duration = searchTimer();
              return { type: 'search', result: results.length, duration };
            });
        }),
        // Stats operations
        ...Array.from({ length: 5 }, () => {
          const statsTimer = performanceMeasurer.start('mixed-stats');
          return unifiedManager.getMemoryStats()
            .then(stats => {
              const duration = statsTimer();
              return { type: 'stats', result: stats.cold_storage_count, duration };
            });
        })
      ];

      const results = await Promise.all(mixedOperations);

      results.forEach(({ type, result, duration }) => {
        if (type === 'store') {
          expect(result).toBeTruthy();
        } else if (type === 'search') {
          expect(typeof result).toBe('number');
          expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OP);
        } else if (type === 'stats') {
          expect(typeof result).toBe('number');
          expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.STATS_RETRIEVAL);
        }

        if (duration > 0) {
          performanceReporter.recordMetric(`mixed-${type}`, duration, PERFORMANCE_THRESHOLDS.CONCURRENT_OP);
        }
      });

      console.log(`🔀 Mixed operations: ${results.length} total operations completed successfully`);
    });

    it('should scale with concurrent users', async () => {
      // Simulate multiple users with separate managers
      const userManagers = Array.from({ length: 5 }, (_, i) => ({
        id: `user-${i}`,
        manager: new MemoryManager(`${tempDir}/user-${i}`)
      }));

      // Initialize all managers
      await Promise.all(userManagers.map(({ manager }) => manager.initialize()));

      try {
        // Simulate concurrent user operations
        const userOperations = userManagers.map(({ id, manager }, userIndex) =>
          Promise.all([
            // Each user stores some memories
            manager.store(`User ${id} preference data`, 'preference', ['user', id]),
            manager.store(`User ${id} project context`, 'project', ['user', id, 'project']),
            // Each user performs searches
            manager.search(`user ${userIndex % 2}`),
            manager.search('preference'),
            // Each user gets stats
            manager.getMemoryStats()
          ]).then(results => ({ userId: id, results }))
        );

        const userTimer = performanceMeasurer.start('multi-user-operations');
        const userResults = await Promise.all(userOperations);
        const multiUserTime = userTimer();

        expect(multiUserTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OP * 2); // Allow some overhead

        userResults.forEach(({ userId, results }) => {
          expect(results).toHaveLength(5); // All operations should complete
          expect(results[0]).toBeTruthy(); // Store preference
          expect(results[1]).toBeTruthy(); // Store project
          expect(Array.isArray(results[2])).toBe(true); // Search results
          expect(Array.isArray(results[3])).toBe(true); // Search results
          expect(results[4]).toHaveProperty('storage_size_bytes'); // Stats
        });

        console.log(`👥 Multi-user test: ${userManagers.length} users, ${multiUserTime.toFixed(2)}ms total`);

        performanceReporter.recordMetric('multi-user', multiUserTime / userManagers.length, PERFORMANCE_THRESHOLDS.CONCURRENT_OP);

      } finally {
        // Cleanup all user managers
        await Promise.all(userManagers.map(({ manager }) => manager.close()));
      }
    });
  });

  describe('Resource Usage and Optimization', () => {
    it('should maintain reasonable memory footprint', async () => {
      const initialMemory = process.memoryUsage();

      // Perform memory-intensive operations
      const operations: Promise<any>[] = [];

      for (let i = 0; i < 200; i++) {
        operations.push(
          unifiedManager.store(
            `Memory footprint test ${i}: ${'x'.repeat(1000)}`,
            'project',
            ['footprint', 'test', `batch-${Math.floor(i / 20)}`],
            { index: i, data: Array.from({ length: 50 }, (_, j) => `item-${j}`) }
          )
        );
      }

      const bulkTimer = performanceMeasurer.start('bulk-memory-operations');
      await Promise.all(operations);
      const bulkTime = bulkTimer();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      expect(bulkTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION * 2); // 200 items
      expect(memoryIncrease).toBeLessThan(200); // Should not use excessive memory

      console.log(`💾 Bulk operations: ${operations.length} items in ${bulkTime.toFixed(2)}ms, memory: +${memoryIncrease.toFixed(2)}MB`);

      performanceReporter.recordMetric('bulk-operations', bulkTime, PERFORMANCE_THRESHOLDS.BULK_OPERATION * 2);
      performanceReporter.recordMemoryUsage(memoryIncrease);

      // Perform searches to ensure system remains responsive
      const searchTimer = performanceMeasurer.start('post-bulk-search');
      const searchResults = await unifiedManager.search('footprint test');
      const searchTime = searchTimer();

      expect(searchResults.length).toBeGreaterThan(100);
      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_SEARCH);

      console.log(`🔍 Post-bulk search: ${searchResults.length} results in ${searchTime.toFixed(2)}ms`);
    });

    it('should handle statistics retrieval efficiently', async () => {
      // Create some data for statistics
      for (let i = 0; i < 20; i++) {
        await unifiedManager.store(`Stats test ${i}`, 'project', ['stats', 'test']);
      }

      // Test multiple rapid stats calls
      const statsCalls = Array.from({ length: 20 }, async () => {
        const statsTimer = performanceMeasurer.start('stats-retrieval');
        const stats = await unifiedManager.getMemoryStats();
        const duration = statsTimer();

        return { stats, duration };
      });

      const statsResults = await Promise.all(statsCalls);

      statsResults.forEach(({ stats, duration }) => {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.STATS_RETRIEVAL);
        expect(stats.cold_storage_count).toBeGreaterThan(0);
        expect(stats.storage_size_bytes).toBeGreaterThan(0);

        performanceReporter.recordMetric('stats-retrieval', duration, PERFORMANCE_THRESHOLDS.STATS_RETRIEVAL);
      });

      const avgDuration = statsResults.reduce((sum, { duration }) => sum + duration, 0) / statsResults.length;
      console.log(`📊 Stats retrieval: ${statsResults.length} calls, avg: ${avgDuration.toFixed(2)}ms`);
    });

    it('should optimize for sustained high load', async () => {
      console.log('🔥 Starting sustained load test...');

      const loadTestDuration = 10000; // 10 seconds
      const startTime = Date.now();
      let operationCount = 0;
      const operationTimes: number[] = [];

      while (Date.now() - startTime < loadTestDuration) {
        const operations = [
          // Store operations
          unifiedManager.store(`Load test ${operationCount}`, 'project', ['load', 'sustained']),
          // Search operations
          unifiedManager.search(`load ${operationCount % 10}`),
          // Stats operations (less frequent)
          operationCount % 10 === 0 ? unifiedManager.getMemoryStats() : Promise.resolve({})
        ];

        const opTimer = performanceMeasurer.start('sustained-load-op');
        await Promise.all(operations);
        const opTime = opTimer();

        operationTimes.push(opTime);
        operationCount += operations.length;

        // Brief pause to simulate realistic usage
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const totalTime = Date.now() - startTime;
      const avgOperationTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length;
      const operationsPerSecond = (operationCount / totalTime) * 1000;

      console.log(`🔥 Sustained load: ${operationCount} ops in ${totalTime}ms`);
      console.log(`📈 Performance: ${operationsPerSecond.toFixed(2)} ops/sec, avg: ${avgOperationTime.toFixed(2)}ms`);

      expect(avgOperationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OP);
      expect(operationsPerSecond).toBeGreaterThan(50); // Should handle reasonable throughput

      performanceReporter.recordMetric('sustained-load', avgOperationTime, PERFORMANCE_THRESHOLDS.CONCURRENT_OP);
      performanceReporter.recordThroughput(operationsPerSecond);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across test runs', async () => {
      const testRuns = 5;
      const runResults: Array<{ run: number; storeTime: number; searchTime: number; statsTime: number }> = [];

      for (let run = 0; run < testRuns; run++) {
        // Store operation
        const storeTimer = performanceMeasurer.start(`regression-store-run-${run}`);
        await unifiedManager.store(`Regression test run ${run}`, 'project', ['regression', `run-${run}`]);
        const storeTime = storeTimer();

        // Search operation
        const searchTimer = performanceMeasurer.start(`regression-search-run-${run}`);
        await unifiedManager.search(`regression run ${run}`);
        const searchTime = searchTimer();

        // Stats operation
        const statsTimer = performanceMeasurer.start(`regression-stats-run-${run}`);
        await unifiedManager.getMemoryStats();
        const statsTime = statsTimer();

        runResults.push({ run, storeTime, searchTime, statsTime });
      }

      // Analyze consistency
      const storeTimes = runResults.map(r => r.storeTime);
      const searchTimes = runResults.map(r => r.searchTime);
      const statsTimes = runResults.map(r => r.statsTime);

      const storeVariance = calculateVariance(storeTimes);
      const searchVariance = calculateVariance(searchTimes);
      const statsVariance = calculateVariance(statsTimes);

      // Performance should be consistent (low variance)
      expect(storeVariance).toBeLessThan(25); // Low variance in store times
      expect(searchVariance).toBeLessThan(100); // Low variance in search times
      expect(statsVariance).toBeLessThan(10); // Low variance in stats times

      console.log(`📊 Regression test consistency:`);
      console.log(`   Store: avg ${average(storeTimes).toFixed(2)}ms, variance ${storeVariance.toFixed(2)}`);
      console.log(`   Search: avg ${average(searchTimes).toFixed(2)}ms, variance ${searchVariance.toFixed(2)}`);
      console.log(`   Stats: avg ${average(statsTimes).toFixed(2)}ms, variance ${statsVariance.toFixed(2)}`);
    });
  });
});

// Utility functions
function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

function average(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}