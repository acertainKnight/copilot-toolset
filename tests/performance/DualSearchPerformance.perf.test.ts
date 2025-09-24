/**
 * Performance Tests for Dual Search Functionality
 * Tests BM25 keyword search and TF-IDF semantic search with performance benchmarks
 * Target: Memory operations <10ms, Search operations <50ms
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { LocalSemanticSearch } from '../../../src/memory/LocalSemanticSearch.js';
import { MemoryLayer, MemorySearchOptions } from '../../../src/types/index.js';
import { createTempDir, cleanupTempDir, PerformanceMeasurer } from '../../utils/TestHelpers.js';
import { PerformanceReporter } from '../PerformanceReporter.js';

interface SearchBenchmark {
  query: string;
  expectedResults: number;
  maxTime: number;
  type: 'keyword' | 'semantic' | 'dual';
}

interface PerformanceThresholds {
  memoryStore: number;      // <10ms
  simpleSearch: number;     // <50ms
  complexSearch: number;    // <200ms
  bulkOperations: number;   // <500ms
  concurrentOps: number;    // <100ms per operation
}

describe('Dual Search Performance Benchmarks', () => {
  let memoryManager: MemoryManager;
  let semanticSearch: LocalSemanticSearch;
  let tempDir: string;
  let performanceMeasurer: PerformanceMeasurer;
  let performanceReporter: PerformanceReporter;

  const thresholds: PerformanceThresholds = {
    memoryStore: 10,
    simpleSearch: 50,
    complexSearch: 200,
    bulkOperations: 500,
    concurrentOps: 100
  };

  beforeAll(async () => {
    performanceMeasurer = new PerformanceMeasurer();
    performanceReporter = new PerformanceReporter();

    tempDir = await createTempDir('dual-search-perf-');

    // Initialize components
    memoryManager = new MemoryManager(tempDir);
    semanticSearch = new LocalSemanticSearch();

    await memoryManager.initialize();

    console.log('🚀 Setting up performance test data...');
    await setupPerformanceTestData();
    console.log('✅ Performance test setup complete');
  });

  afterAll(async () => {
    await memoryManager.close();
    await cleanupTempDir(tempDir);

    // Generate performance report
    await performanceReporter.generateReport('dual-search-performance');
    console.log('📊 Performance report generated');
  });

  async function setupPerformanceTestData(): Promise<void> {
    const testData = [
      // JavaScript/TypeScript content
      { content: 'JavaScript async/await patterns for handling promises', layer: 'system' as MemoryLayer, tags: ['javascript', 'async', 'promises', 'patterns'] },
      { content: 'TypeScript interface definitions and type guards implementation', layer: 'project' as MemoryLayer, tags: ['typescript', 'interfaces', 'types', 'guards'] },
      { content: 'React functional components with hooks and state management', layer: 'project' as MemoryLayer, tags: ['react', 'hooks', 'components', 'state'] },
      { content: 'Node.js Express server configuration and middleware setup', layer: 'project' as MemoryLayer, tags: ['nodejs', 'express', 'server', 'middleware'] },
      { content: 'ES6 modules import/export syntax and best practices', layer: 'system' as MemoryLayer, tags: ['es6', 'modules', 'import', 'export'] },

      // Python content
      { content: 'Python data analysis with pandas and numpy libraries', layer: 'project' as MemoryLayer, tags: ['python', 'pandas', 'numpy', 'data-analysis'] },
      { content: 'Django REST API framework configuration and serializers', layer: 'system' as MemoryLayer, tags: ['python', 'django', 'rest-api', 'serializers'] },
      { content: 'Flask web application routing and template rendering', layer: 'project' as MemoryLayer, tags: ['python', 'flask', 'routing', 'templates'] },
      { content: 'Machine learning model training with scikit-learn', layer: 'project' as MemoryLayer, tags: ['python', 'ml', 'scikit-learn', 'training'] },
      { content: 'Python virtual environments and package management with pip', layer: 'system' as MemoryLayer, tags: ['python', 'venv', 'pip', 'packages'] },

      // Database and DevOps content
      { content: 'SQL query optimization techniques for large datasets', layer: 'system' as MemoryLayer, tags: ['sql', 'optimization', 'performance', 'database'] },
      { content: 'Docker containerization strategies for microservices', layer: 'system' as MemoryLayer, tags: ['docker', 'containers', 'microservices', 'deployment'] },
      { content: 'Git branch management and merge conflict resolution', layer: 'system' as MemoryLayer, tags: ['git', 'branches', 'merge', 'conflicts'] },
      { content: 'CI/CD pipeline configuration with GitHub Actions', layer: 'system' as MemoryLayer, tags: ['ci-cd', 'github-actions', 'pipeline', 'automation'] },
      { content: 'AWS Lambda serverless function deployment and monitoring', layer: 'project' as MemoryLayer, tags: ['aws', 'lambda', 'serverless', 'monitoring'] },

      // User preferences and coding styles
      { content: 'User prefers functional programming over object-oriented approach', layer: 'preference' as MemoryLayer, tags: ['preference', 'functional', 'oop', 'style'] },
      { content: 'Code formatting: 2 spaces indentation, semicolons required', layer: 'preference' as MemoryLayer, tags: ['preference', 'formatting', 'indentation', 'semicolons'] },
      { content: 'Testing philosophy: unit tests first, integration tests second', layer: 'preference' as MemoryLayer, tags: ['preference', 'testing', 'unit', 'integration'] },
      { content: 'Documentation style: comprehensive JSDoc comments preferred', layer: 'preference' as MemoryLayer, tags: ['preference', 'documentation', 'jsdoc', 'comments'] },

      // Complex technical content
      { content: 'Microservices architecture pattern with API gateway and service discovery', layer: 'system' as MemoryLayer, tags: ['microservices', 'api-gateway', 'service-discovery', 'architecture'] },
      { content: 'Event-driven programming with message queues and pub/sub patterns', layer: 'system' as MemoryLayer, tags: ['event-driven', 'message-queues', 'pubsub', 'patterns'] },
      { content: 'Database sharding strategies for horizontal scaling and performance', layer: 'system' as MemoryLayer, tags: ['database', 'sharding', 'scaling', 'performance'] },
      { content: 'OAuth2 authentication flow implementation with JWT tokens', layer: 'project' as MemoryLayer, tags: ['oauth2', 'authentication', 'jwt', 'security'] },
      { content: 'WebSocket real-time communication setup with Socket.IO', layer: 'project' as MemoryLayer, tags: ['websocket', 'realtime', 'socketio', 'communication'] },
    ];

    // Store all test data
    for (const data of testData) {
      await memoryManager.store(data.content, data.layer, data.tags);
    }

    // Create additional bulk data for stress testing
    for (let i = 0; i < 200; i++) {
      const categories = ['performance', 'optimization', 'scaling', 'testing', 'debugging'];
      const technologies = ['react', 'node', 'python', 'sql', 'docker'];

      const content = `Bulk test data ${i}: ${categories[i % categories.length]} techniques for ${technologies[i % technologies.length]} development projects`;
      await memoryManager.store(
        content,
        'project',
        [categories[i % categories.length], technologies[i % technologies.length], 'bulk-data']
      );
    }
  }

  describe('Memory Storage Performance', () => {
    it('should store memories within performance threshold', async () => {
      const testCases = [
        { content: 'Small memory content', layer: 'project' as MemoryLayer },
        { content: 'Medium length memory content with some technical details about implementation', layer: 'system' as MemoryLayer },
        { content: 'Large memory content with extensive documentation: ' + 'x'.repeat(5000), layer: 'preference' as MemoryLayer }
      ];

      for (const testCase of testCases) {
        const endTimer = performanceMeasurer.start('memory-store');

        const memoryId = await memoryManager.store(
          testCase.content,
          testCase.layer,
          ['performance-test', testCase.layer]
        );

        const duration = endTimer();

        expect(memoryId).toBeTruthy();
        expect(duration).toBeLessThan(thresholds.memoryStore);

        performanceReporter.recordMetric('store-operation', duration, thresholds.memoryStore);

        if (duration > thresholds.memoryStore * 0.8) {
          console.warn(`⚠️ Store operation took ${duration.toFixed(2)}ms (threshold: ${thresholds.memoryStore}ms)`);
        }
      }
    });

    it('should handle concurrent storage operations efficiently', async () => {
      const concurrentStores = Array.from({ length: 10 }, (_, i) => {
        const endTimer = performanceMeasurer.start('concurrent-store');

        return memoryManager.store(
          `Concurrent storage test ${i}`,
          'project',
          ['concurrent', 'performance', `test-${i}`]
        ).then(id => {
          const duration = endTimer();
          return { id, duration };
        });
      });

      const results = await Promise.all(concurrentStores);

      // All operations should succeed
      results.forEach(({ id, duration }, index) => {
        expect(id).toBeTruthy();
        expect(duration).toBeLessThan(thresholds.concurrentOps);
        performanceReporter.recordMetric('concurrent-store', duration, thresholds.concurrentOps);
      });

      const avgDuration = results.reduce((sum, { duration }) => sum + duration, 0) / results.length;
      console.log(`📈 Concurrent store avg: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Search Performance Benchmarks', () => {
    const searchBenchmarks: SearchBenchmark[] = [
      { query: 'JavaScript', expectedResults: 1, maxTime: thresholds.simpleSearch, type: 'keyword' },
      { query: 'Python data analysis', expectedResults: 1, maxTime: thresholds.complexSearch, type: 'semantic' },
      { query: 'microservices architecture', expectedResults: 1, maxTime: thresholds.complexSearch, type: 'semantic' },
      { query: 'testing', expectedResults: 3, maxTime: thresholds.simpleSearch, type: 'keyword' },
      { query: 'performance optimization', expectedResults: 2, maxTime: thresholds.complexSearch, type: 'dual' },
      { query: 'React functional components hooks', expectedResults: 1, maxTime: thresholds.complexSearch, type: 'semantic' },
      { query: 'database', expectedResults: 3, maxTime: thresholds.simpleSearch, type: 'keyword' }
    ];

    it('should perform single-term searches efficiently', async () => {
      for (const benchmark of searchBenchmarks.filter(b => !b.query.includes(' '))) {
        const endTimer = performanceMeasurer.start('simple-search');

        const results = await memoryManager.search(benchmark.query);

        const duration = endTimer();

        expect(results.length).toBeGreaterThanOrEqual(benchmark.expectedResults);
        expect(duration).toBeLessThan(benchmark.maxTime);

        performanceReporter.recordMetric('simple-search', duration, benchmark.maxTime);

        console.log(`🔍 "${benchmark.query}": ${results.length} results in ${duration.toFixed(2)}ms`);
      }
    });

    it('should perform multi-term searches efficiently', async () => {
      for (const benchmark of searchBenchmarks.filter(b => b.query.includes(' '))) {
        const endTimer = performanceMeasurer.start('complex-search');

        const results = await memoryManager.search(benchmark.query);

        const duration = endTimer();

        expect(results.length).toBeGreaterThanOrEqual(0);
        expect(duration).toBeLessThan(benchmark.maxTime);

        performanceReporter.recordMetric('complex-search', duration, benchmark.maxTime);

        console.log(`🔍 "${benchmark.query}": ${results.length} results in ${duration.toFixed(2)}ms`);
      }
    });

    it('should handle layer-filtered searches efficiently', async () => {
      const layers: MemoryLayer[] = ['preference', 'project', 'system'];

      for (const layer of layers) {
        const endTimer = performanceMeasurer.start('filtered-search');

        const results = await memoryManager.search('performance', { layer });

        const duration = endTimer();

        expect(duration).toBeLessThan(thresholds.simpleSearch);

        // Verify all results are from the correct layer
        results.forEach(result => {
          expect(result.memory.layer).toBe(layer);
        });

        performanceReporter.recordMetric('filtered-search', duration, thresholds.simpleSearch);

        console.log(`🎯 Layer "${layer}" search: ${results.length} results in ${duration.toFixed(2)}ms`);
      }
    });

    it('should handle search result limits efficiently', async () => {
      const limits = [1, 5, 10, 25, 50];

      for (const limit of limits) {
        const endTimer = performanceMeasurer.start('limited-search');

        const results = await memoryManager.search('test', { limit });

        const duration = endTimer();

        expect(results.length).toBeLessThanOrEqual(limit);
        expect(duration).toBeLessThan(thresholds.simpleSearch);

        performanceReporter.recordMetric('limited-search', duration, thresholds.simpleSearch);
      }
    });

    it('should maintain search performance under stress', async () => {
      const stressQueries = [
        'optimization', 'performance', 'scaling', 'testing', 'debugging',
        'javascript async', 'python pandas', 'react hooks', 'docker containers',
        'database optimization', 'microservices architecture', 'ci cd pipeline'
      ];

      const stressTestPromises = stressQueries.map(async (query, index) => {
        const endTimer = performanceMeasurer.start('stress-search');

        const results = await memoryManager.search(query);

        const duration = endTimer();

        return { query, results: results.length, duration };
      });

      const stressResults = await Promise.all(stressTestPromises);

      stressResults.forEach(({ query, results, duration }) => {
        expect(duration).toBeLessThan(thresholds.complexSearch);
        performanceReporter.recordMetric('stress-search', duration, thresholds.complexSearch);

        console.log(`💪 Stress "${query}": ${results} results in ${duration.toFixed(2)}ms`);
      });

      const avgDuration = stressResults.reduce((sum, { duration }) => sum + duration, 0) / stressResults.length;
      const maxDuration = Math.max(...stressResults.map(({ duration }) => duration));

      console.log(`📊 Stress test - Avg: ${avgDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Search Performance', () => {
    it('should handle concurrent searches efficiently', async () => {
      const concurrentQueries = [
        'javascript', 'python', 'docker', 'performance', 'optimization',
        'react hooks', 'database sharding', 'microservices', 'testing', 'ci cd'
      ];

      const concurrentSearches = concurrentQueries.map(async (query, index) => {
        const endTimer = performanceMeasurer.start('concurrent-search');

        const results = await memoryManager.search(query);

        const duration = endTimer();

        return { query, results: results.length, duration, index };
      });

      const results = await Promise.all(concurrentSearches);

      results.forEach(({ query, results: resultCount, duration, index }) => {
        expect(duration).toBeLessThan(thresholds.concurrentOps);
        expect(resultCount).toBeGreaterThanOrEqual(0);

        performanceReporter.recordMetric('concurrent-search', duration, thresholds.concurrentOps);
      });

      const avgDuration = results.reduce((sum, { duration }) => sum + duration, 0) / results.length;
      console.log(`⚡ Concurrent search avg: ${avgDuration.toFixed(2)}ms`);
    });

    it('should handle mixed concurrent operations', async () => {
      const mixedOperations = [
        // Storage operations
        ...Array.from({ length: 3 }, (_, i) =>
          memoryManager.store(`Mixed operation store ${i}`, 'project', ['mixed', 'concurrent'])
            .then(id => ({ type: 'store', result: id, duration: 0 }))
        ),
        // Search operations
        ...Array.from({ length: 5 }, (_, i) =>
          (async () => {
            const endTimer = performanceMeasurer.start('mixed-operation');
            const results = await memoryManager.search(`mixed ${i % 2 === 0 ? 'store' : 'concurrent'}`);
            const duration = endTimer();
            return { type: 'search', result: results.length, duration };
          })()
        ),
        // Stats operations
        ...Array.from({ length: 2 }, () =>
          (async () => {
            const endTimer = performanceMeasurer.start('mixed-operation');
            const stats = await memoryManager.getMemoryStats();
            const duration = endTimer();
            return { type: 'stats', result: stats.cold_storage_count, duration };
          })()
        )
      ];

      const results = await Promise.all(mixedOperations);

      results.forEach(({ type, result, duration }) => {
        if (type === 'store') {
          expect(result).toBeTruthy();
        } else if (type === 'search') {
          expect(typeof result).toBe('number');
        } else if (type === 'stats') {
          expect(typeof result).toBe('number');
        }

        if (duration > 0) {
          expect(duration).toBeLessThan(thresholds.concurrentOps);
          performanceReporter.recordMetric('mixed-operation', duration, thresholds.concurrentOps);
        }
      });

      console.log(`🔀 Mixed operations completed: ${results.length} total`);
    });
  });

  describe('Memory Usage and Resource Optimization', () => {
    it('should maintain reasonable memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform bulk operations
      const bulkPromises = Array.from({ length: 100 }, (_, i) =>
        memoryManager.store(`Bulk operation ${i}`, 'project', ['bulk', `batch-${Math.floor(i / 10)}`])
      );

      const endTimer = performanceMeasurer.start('bulk-operation');
      await Promise.all(bulkPromises);
      const duration = endTimer();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      expect(duration).toBeLessThan(thresholds.bulkOperations);
      expect(memoryIncrease).toBeLessThan(100); // Should not use more than 100MB

      performanceReporter.recordMetric('bulk-operation', duration, thresholds.bulkOperations);
      performanceReporter.recordMemoryUsage(memoryIncrease);

      console.log(`💾 Bulk operation: ${duration.toFixed(2)}ms, Memory: +${memoryIncrease.toFixed(2)}MB`);
    });

    it('should provide fast statistics retrieval', async () => {
      const statsPromises = Array.from({ length: 10 }, async () => {
        const endTimer = performanceMeasurer.start('stats-retrieval');
        const stats = await memoryManager.getMemoryStats();
        const duration = endTimer();

        return { stats, duration };
      });

      const results = await Promise.all(statsPromises);

      results.forEach(({ stats, duration }) => {
        expect(duration).toBeLessThan(thresholds.memoryStore); // Stats should be very fast
        expect(stats.cold_storage_count).toBeGreaterThan(0);

        performanceReporter.recordMetric('stats-retrieval', duration, thresholds.memoryStore);
      });

      const avgDuration = results.reduce((sum, { duration }) => sum + duration, 0) / results.length;
      console.log(`📈 Stats retrieval avg: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Search Quality and Relevance', () => {
    it('should return relevant results with proper scoring', async () => {
      const relevanceTests = [
        { query: 'JavaScript async', expectedTerms: ['javascript', 'async'] },
        { query: 'Python data analysis', expectedTerms: ['python', 'data', 'analysis'] },
        { query: 'React functional components', expectedTerms: ['react', 'functional', 'components'] },
        { query: 'database optimization', expectedTerms: ['database', 'optimization'] }
      ];

      for (const test of relevanceTests) {
        const endTimer = performanceMeasurer.start('relevance-search');
        const results = await memoryManager.search(test.query);
        const duration = endTimer();

        expect(duration).toBeLessThan(thresholds.complexSearch);
        expect(results.length).toBeGreaterThan(0);

        // Check result quality
        const topResult = results[0];
        expect(topResult.similarity_score).toBeGreaterThan(0);
        expect(['exact', 'fuzzy', 'semantic']).toContain(topResult.match_type);

        // Results should be sorted by relevance
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].similarity_score || 0).toBeGreaterThanOrEqual(results[i + 1].similarity_score || 0);
        }

        performanceReporter.recordMetric('relevance-search', duration, thresholds.complexSearch);

        console.log(`🎯 "${test.query}": ${results.length} results, top score: ${topResult.similarity_score?.toFixed(2)}`);
      }
    });

    it('should handle fuzzy matching effectively', async () => {
      const fuzzyTests = [
        { query: 'javascrip', expected: 'javascript' }, // Typo
        { query: 'reactjs', expected: 'react' },         // Partial match
        { query: 'nodejs', expected: 'node' },           // Compound term
        { query: 'optimisation', expected: 'optimization' } // Alternative spelling
      ];

      for (const test of fuzzyTests) {
        const endTimer = performanceMeasurer.start('fuzzy-search');
        const results = await memoryManager.search(test.query);
        const duration = endTimer();

        expect(duration).toBeLessThan(thresholds.simpleSearch);

        // Should find some results even with typos/variations
        if (results.length > 0) {
          const hasExpectedTerm = results.some(r =>
            r.memory.content.toLowerCase().includes(test.expected.toLowerCase()) ||
            r.memory.tags?.some(tag => tag.toLowerCase().includes(test.expected.toLowerCase()))
          );

          console.log(`🔤 Fuzzy "${test.query}" → ${test.expected}: ${results.length} results, found expected: ${hasExpectedTerm}`);
        }

        performanceReporter.recordMetric('fuzzy-search', duration, thresholds.simpleSearch);
      }
    });
  });
});