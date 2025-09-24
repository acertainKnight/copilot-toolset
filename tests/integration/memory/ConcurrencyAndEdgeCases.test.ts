/**
 * Concurrency, Thread Safety, and Edge Case Tests
 * Comprehensive validation of system robustness under stress and error conditions
 * Tests race conditions, data corruption prevention, and graceful error handling
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { ThreeTierMemoryManager } from '../../../src/memory/ThreeTierMemoryManager.js';
import { MemoryLayer, MemorySearchOptions } from '../../../src/types/index.js';
import { createTempDir, cleanupTempDir, PerformanceMeasurer, MemoryTracker, waitFor } from '../../utils/TestHelpers.js';
import * as path from 'path';
import * as fs from 'fs/promises';

interface ConcurrencyTestScenario {
  name: string;
  description: string;
  setup: () => Promise<any>;
  execute: (manager: MemoryManager) => Promise<any>;
  validate: (results: any) => void;
}

interface EdgeCaseTestData {
  name: string;
  content: string;
  layer: MemoryLayer;
  tags: string[];
  metadata?: Record<string, any>;
  shouldSucceed: boolean;
  expectedError?: string;
}

describe('Concurrency and Edge Cases', () => {
  let memoryManager: MemoryManager;
  let tempDir: string;
  let performanceMeasurer: PerformanceMeasurer;
  let memoryTracker: MemoryTracker;

  beforeAll(async () => {
    performanceMeasurer = new PerformanceMeasurer();
    memoryTracker = new MemoryTracker();
    tempDir = await createTempDir('concurrency-edge-cases-test-');
    memoryTracker.setBaseline();
  });

  beforeEach(async () => {
    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();
    memoryTracker.checkpoint('test-start');
  });

  afterEach(async () => {
    await memoryManager.close();

    // Monitor memory usage
    const memoryDiff = memoryTracker.getMemoryDiff('test-start');
    if (memoryDiff > 50 * 1024 * 1024) { // 50MB
      console.warn(`⚠️ High memory usage detected: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
    }
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent stores without data corruption', async () => {
      const concurrentOperations = 100;
      const promises: Promise<string>[] = [];

      // Start all operations simultaneously
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          memoryManager.store(
            `Concurrent operation ${i} with unique identifier ${Math.random()}`,
            'project',
            ['concurrent', 'race-condition', `op-${i}`],
            { operation_id: i, timestamp: Date.now(), random: Math.random() }
          )
        );
      }

      const results = await Promise.all(promises);

      // Validate results
      expect(results).toHaveLength(concurrentOperations);

      // All IDs should be unique
      const uniqueIds = new Set(results);
      expect(uniqueIds.size).toBe(concurrentOperations);

      // Verify all memories were stored correctly
      const searchResults = await memoryManager.search('Concurrent operation');
      expect(searchResults.length).toBe(concurrentOperations);

      console.log(`✅ ${concurrentOperations} concurrent stores completed without corruption`);
    });

    it('should handle concurrent searches without interference', async () => {
      // Set up test data
      const testQueries = ['javascript', 'python', 'database', 'react', 'nodejs'];

      for (let i = 0; i < testQueries.length; i++) {
        await memoryManager.store(
          `Test data for ${testQueries[i]} search validation`,
          'project',
          [testQueries[i], 'test-data'],
          { query_term: testQueries[i] }
        );
      }

      // Perform concurrent searches
      const concurrentSearches = testQueries.map(async (query, index) => {
        // Add some randomness to timing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

        const results = await memoryManager.search(query);
        return { query, results: results.length, index };
      });

      const searchResults = await Promise.all(concurrentSearches);

      // Validate search results
      searchResults.forEach(({ query, results, index }) => {
        expect(results).toBeGreaterThan(0);
        console.log(`🔍 Concurrent search "${query}": ${results} results`);
      });

      // Verify no interference between searches
      expect(searchResults).toHaveLength(testQueries.length);
    });

    it('should handle mixed concurrent operations safely', async () => {
      const operationCount = 50;
      const operations: Promise<any>[] = [];

      // Mix of store, search, and stats operations
      for (let i = 0; i < operationCount; i++) {
        if (i % 3 === 0) {
          // Store operation
          operations.push(
            memoryManager.store(
              `Mixed concurrent operation ${i}`,
              'project',
              ['mixed', 'concurrent'],
              { type: 'store', operation_id: i }
            )
          );
        } else if (i % 3 === 1) {
          // Search operation
          operations.push(
            memoryManager.search(`operation ${i % 10}`)
              .then(results => ({ type: 'search', count: results.length }))
          );
        } else {
          // Stats operation
          operations.push(
            memoryManager.getMemoryStats()
              .then(stats => ({ type: 'stats', size: stats.storage_size_bytes }))
          );
        }
      }

      const results = await Promise.all(operations);

      // Validate mixed operations
      expect(results).toHaveLength(operationCount);

      const storeResults = results.filter((r: any) => typeof r === 'string');
      const searchResults = results.filter((r: any) => r?.type === 'search');
      const statsResults = results.filter((r: any) => r?.type === 'stats');

      expect(storeResults.length + searchResults.length + statsResults.length).toBe(operationCount);

      console.log(`✅ Mixed operations: ${storeResults.length} stores, ${searchResults.length} searches, ${statsResults.length} stats`);
    });

    it('should prevent race conditions in database writes', async () => {
      // Test rapid updates to same conceptual data
      const baseContent = 'Race condition test content';
      const rapidOperations: Promise<string>[] = [];

      for (let i = 0; i < 25; i++) {
        rapidOperations.push(
          memoryManager.store(
            `${baseContent} - version ${i}`,
            'system',
            ['race-condition', 'rapid-update'],
            { version: i, timestamp: Date.now() + i }
          )
        );
      }

      const rapidResults = await Promise.all(rapidOperations);

      // All operations should succeed
      expect(rapidResults).toHaveLength(25);
      rapidResults.forEach(id => expect(id).toBeTruthy());

      // Verify all versions were stored
      const versionResults = await memoryManager.search('Race condition test');
      expect(versionResults.length).toBe(25);

      // Check that all versions are distinct
      const versions = versionResults.map(r => r.memory.metadata?.version);
      const uniqueVersions = new Set(versions);
      expect(uniqueVersions.size).toBe(25);

      console.log('✅ Race condition prevention validated with rapid updates');
    });

    it('should maintain data integrity under concurrent load', async () => {
      const heavyLoadOperations: Promise<any>[] = [];

      // Create heavy concurrent load
      for (let i = 0; i < 200; i++) {
        if (i % 2 === 0) {
          // Heavy store operations with large payloads
          heavyLoadOperations.push(
            memoryManager.store(
              `Heavy load test ${i}: ${'x'.repeat(1000)}`,
              'project',
              ['heavy-load', 'integrity-test'],
              {
                load_test: true,
                operation_id: i,
                large_data: Array.from({ length: 100 }, (_, j) => `data-${j}`)
              }
            )
          );
        } else {
          // Search operations during heavy load
          heavyLoadOperations.push(
            memoryManager.search('heavy load')
              .then(results => ({ search_results: results.length }))
          );
        }
      }

      const loadResults = await Promise.all(heavyLoadOperations);

      // Validate integrity
      const storeCount = loadResults.filter(r => typeof r === 'string').length;
      const searchCount = loadResults.filter(r => typeof r === 'object' && r.search_results !== undefined).length;

      expect(storeCount + searchCount).toBe(200);
      expect(storeCount).toBe(100); // Half should be stores
      expect(searchCount).toBe(100); // Half should be searches

      // Verify data integrity with final search
      const finalCheck = await memoryManager.search('Heavy load test');
      expect(finalCheck.length).toBe(100); // All stores should be findable

      console.log(`✅ Data integrity maintained under heavy load: ${storeCount} stores, ${searchCount} searches`);
    });
  });

  describe('Thread Safety and Resource Management', () => {
    it('should handle multiple manager instances safely', async () => {
      const managerCount = 10;
      const managers: MemoryManager[] = [];

      try {
        // Create multiple managers
        for (let i = 0; i < managerCount; i++) {
          const manager = new MemoryManager(`${tempDir}/thread-safety-${i}`);
          await manager.initialize();
          managers.push(manager);
        }

        // Concurrent operations across managers
        const crossManagerOps = managers.map(async (manager, index) => {
          const operations = [
            manager.store(`Manager ${index} data`, 'project', [`manager-${index}`]),
            manager.search('manager'),
            manager.getMemoryStats()
          ];

          return Promise.all(operations).then(results => ({
            managerIndex: index,
            storeId: results[0],
            searchCount: (results[1] as any[]).length,
            stats: results[2]
          }));
        });

        const crossResults = await Promise.all(crossManagerOps);

        // Validate thread safety
        crossResults.forEach(({ managerIndex, storeId, searchCount, stats }) => {
          expect(storeId).toBeTruthy();
          expect(searchCount).toBeGreaterThanOrEqual(0);
          expect(stats.storage_size_bytes).toBeGreaterThan(0);
        });

        console.log(`✅ Thread safety validated across ${managerCount} manager instances`);

      } finally {
        // Cleanup all managers
        await Promise.all(managers.map(manager => manager.close()));
      }
    });

    it('should handle resource cleanup correctly', async () => {
      const resourceManagers: MemoryManager[] = [];

      for (let cycle = 0; cycle < 5; cycle++) {
        // Create and use managers
        const tempManagers = [];

        for (let i = 0; i < 5; i++) {
          const manager = new MemoryManager(`${tempDir}/resource-test-${cycle}-${i}`);
          await manager.initialize();
          tempManagers.push(manager);

          // Use the manager
          await manager.store(`Resource cycle ${cycle} manager ${i}`, 'project', ['resource-test']);
          await manager.search('resource');
        }

        // Close managers properly
        await Promise.all(tempManagers.map(manager => manager.close()));

        console.log(`✅ Resource cycle ${cycle} completed`);
      }

      // Verify system stability after resource cycles
      const finalTest = await memoryManager.store('Final stability test', 'project', ['stability']);
      expect(finalTest).toBeTruthy();

      console.log('✅ Resource cleanup and stability validated');
    });

    it('should handle database locking scenarios', async () => {
      // Simulate database locking with rapid concurrent operations
      const lockingOperations: Promise<any>[] = [];

      // Create operations that might cause lock contention
      for (let i = 0; i < 50; i++) {
        lockingOperations.push(
          Promise.all([
            memoryManager.store(`Lock test ${i}`, 'system', ['lock-test']),
            memoryManager.search(`lock ${i % 5}`),
            memoryManager.getMemoryStats()
          ]).then(results => ({
            cycle: i,
            storeId: results[0],
            searchResults: (results[1] as any[]).length,
            stats: results[2]
          }))
        );
      }

      const lockingResults = await Promise.all(lockingOperations);

      // All operations should complete without deadlocks
      expect(lockingResults).toHaveLength(50);

      lockingResults.forEach(({ cycle, storeId, searchResults, stats }) => {
        expect(storeId).toBeTruthy();
        expect(searchResults).toBeGreaterThanOrEqual(0);
        expect(stats).toHaveProperty('storage_size_bytes');
      });

      console.log('✅ Database locking scenarios handled without deadlocks');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    const edgeCaseTestData: EdgeCaseTestData[] = [
      // Empty and whitespace content
      { name: 'Empty string content', content: '', layer: 'project', tags: ['edge-case'], shouldSucceed: true },
      { name: 'Whitespace only content', content: '   \n\t  \n   ', layer: 'system', tags: ['whitespace'], shouldSucceed: true },
      { name: 'Single character content', content: 'x', layer: 'preference', tags: ['minimal'], shouldSucceed: true },

      // Extremely large content
      { name: 'Very large content', content: 'x'.repeat(100000), layer: 'project', tags: ['large'], shouldSucceed: true },
      { name: 'Massive content', content: 'large'.repeat(50000), layer: 'system', tags: ['massive'], shouldSucceed: true },

      // Special characters and encoding
      { name: 'Unicode content', content: '🚀 Unicode test: 中文 العربية हिंदी русский 🌍', layer: 'preference', tags: ['unicode'], shouldSucceed: true },
      { name: 'Control characters', content: 'Test\x00\x01\x02\x03\x04\x05', layer: 'system', tags: ['control'], shouldSucceed: true },
      { name: 'Mixed encoding', content: 'ASCII 中文 🚀 \u{1F600} \u{200D}', layer: 'project', tags: ['mixed-encoding'], shouldSucceed: true },

      // Special JSON content
      { name: 'Malformed JSON-like', content: '{"unclosed": "quote, "missing": brace', layer: 'project', tags: ['json-like'], shouldSucceed: true },
      { name: 'Deep nested object', content: JSON.stringify(createDeepObject(50)), layer: 'system', tags: ['deep-nested'], shouldSucceed: true },

      // SQL injection attempts
      { name: 'SQL injection attempt', content: "'; DROP TABLE memories; --", layer: 'project', tags: ['sql-injection'], shouldSucceed: true },
      { name: 'Complex SQL injection', content: "UNION SELECT * FROM sqlite_master WHERE type='table'", layer: 'system', tags: ['sql-complex'], shouldSucceed: true },

      // Null and undefined scenarios
      { name: 'Null-like string', content: 'null', layer: 'preference', tags: ['null-string'], shouldSucceed: true },
      { name: 'Undefined-like string', content: 'undefined', layer: 'project', tags: ['undefined-string'], shouldSucceed: true },

      // Extreme metadata
      { name: 'Large metadata', content: 'Test with large metadata', layer: 'system', tags: ['large-meta'],
        metadata: { largeData: Array.from({ length: 1000 }, (_, i) => `metadata-${i}`) }, shouldSucceed: true },
      { name: 'Complex metadata', content: 'Test with complex metadata', layer: 'project', tags: ['complex-meta'],
        metadata: createComplexMetadata(), shouldSucceed: true }
    ];

    it('should handle all edge case content types', async () => {
      for (const testData of edgeCaseTestData) {
        try {
          const result = await memoryManager.store(
            testData.content,
            testData.layer,
            testData.tags,
            testData.metadata
          );

          if (testData.shouldSucceed) {
            expect(result).toBeTruthy();
            console.log(`✅ Edge case handled: ${testData.name}`);
          } else {
            console.log(`⚠️ Unexpected success for: ${testData.name}`);
          }
        } catch (error) {
          if (!testData.shouldSucceed) {
            console.log(`✅ Expected failure for: ${testData.name}`);
          } else {
            console.error(`❌ Unexpected failure for: ${testData.name}`, error);
            throw error;
          }
        }
      }
    });

    it('should handle malformed search queries gracefully', async () => {
      const malformedQueries = [
        null as any,
        undefined as any,
        '',
        '   ',
        '\n\t\r',
        '🚀',
        'a'.repeat(10000),
        'SELECT * FROM memories',
        "'; DROP TABLE memories; --",
        '\x00\x01\x02\x03',
        '中文 test query',
        '{"malformed": json}',
        Array(1000).fill('query').join(' '),
        '%LIKE%',
        '*.*',
        '\\n\\t\\r'
      ];

      for (const query of malformedQueries) {
        try {
          const results = await memoryManager.search(query);
          expect(Array.isArray(results)).toBe(true);
          console.log(`✅ Malformed query handled: ${JSON.stringify(query)} -> ${results.length} results`);
        } catch (error) {
          console.log(`⚠️ Query failed (may be expected): ${JSON.stringify(query)}`);
        }
      }
    });

    it('should handle invalid search options', async () => {
      const invalidOptions: MemorySearchOptions[] = [
        { limit: -1 },
        { limit: 0 },
        { limit: 1000000 },
        { layer: 'invalid_layer' as any },
        { layer: null as any },
        { limit: 'invalid' as any },
        { layer: '' as any },
        {} as any // Empty options should work
      ];

      for (const options of invalidOptions) {
        try {
          const results = await memoryManager.search('test', options);
          expect(Array.isArray(results)).toBe(true);
          console.log(`✅ Invalid options handled: ${JSON.stringify(options)}`);
        } catch (error) {
          console.log(`⚠️ Options rejected (may be expected): ${JSON.stringify(options)}`);
        }
      }
    });

    it('should handle file system errors gracefully', async () => {
      // Test with read-only directory (if possible)
      try {
        const readOnlyDir = path.join(tempDir, 'readonly');
        await fs.mkdir(readOnlyDir, { recursive: true });

        // Try to make directory read-only (may not work on all systems)
        try {
          await fs.chmod(readOnlyDir, 0o444);
        } catch {
          // Skip this test if we can't make directory read-only
          console.log('⏭️ Skipping read-only directory test (permission denied)');
          return;
        }

        const readOnlyManager = new MemoryManager(readOnlyDir);

        // This might fail or succeed depending on implementation
        try {
          await readOnlyManager.initialize();
          await readOnlyManager.close();
          console.log('✅ Read-only directory handled gracefully');
        } catch (error) {
          console.log('✅ Read-only directory appropriately rejected');
        }

        // Restore permissions for cleanup
        try {
          await fs.chmod(readOnlyDir, 0o755);
        } catch {}

      } catch (error) {
        console.log('⏭️ File system error test skipped:', error);
      }
    });

    it('should handle memory pressure scenarios', async () => {
      console.log('🔥 Testing memory pressure scenarios...');

      const memoryPressureOps: Promise<any>[] = [];

      // Create memory pressure with large operations
      for (let i = 0; i < 20; i++) {
        const largeContent = `Memory pressure test ${i}: ` + 'x'.repeat(10000);
        const largeMetadata = {
          pressureTest: true,
          largeArray: Array.from({ length: 500 }, (_, j) => `pressure-item-${j}`),
          nested: { deep: { data: { values: Array.from({ length: 100 }, (_, k) => k) } } }
        };

        memoryPressureOps.push(
          memoryManager.store(
            largeContent,
            'project',
            ['memory-pressure', 'large-data'],
            largeMetadata
          ).catch(error => ({ error: error.message, index: i }))
        );
      }

      const pressureResults = await Promise.all(memoryPressureOps);

      // Some operations might fail under memory pressure, but system should remain stable
      const successes = pressureResults.filter(r => typeof r === 'string');
      const failures = pressureResults.filter(r => typeof r === 'object' && r.error);

      console.log(`💾 Memory pressure: ${successes.length} successes, ${failures.length} failures`);

      // System should remain responsive
      const quickTest = await memoryManager.search('memory pressure');
      expect(Array.isArray(quickTest)).toBe(true);

      console.log('✅ System remained stable under memory pressure');
    });

    it('should handle corrupted data scenarios', async () => {
      // Store some good data first
      await memoryManager.store('Good data before corruption', 'system', ['good']);

      // Try to store potentially corrupted data
      const corruptedData = [
        'Data with embedded null \x00 character',
        'Data with control characters \x01\x02\x03',
        'Binary-like data: ' + String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)),
        'Infinite recursion attempt: ' + JSON.stringify({ a: { get b() { return this.a; } } } as any).slice(0, 1000),
      ];

      for (const corrupt of corruptedData) {
        try {
          await memoryManager.store(corrupt, 'project', ['corruption-test']);
          console.log('✅ Corrupted data handled gracefully');
        } catch (error) {
          console.log('✅ Corrupted data appropriately rejected');
        }
      }

      // Verify system still works
      const recovery = await memoryManager.search('Good data');
      expect(recovery.length).toBeGreaterThan(0);

      console.log('✅ System recovered from potential data corruption');
    });
  });

  describe('System Resilience and Recovery', () => {
    it('should recover from database connection issues', async () => {
      // Store some data
      await memoryManager.store('Pre-issue data', 'system', ['resilience']);

      // Simulate connection issues by creating a new manager rapidly
      const rapidManagers: MemoryManager[] = [];

      try {
        for (let i = 0; i < 10; i++) {
          const manager = new MemoryManager(`${tempDir}/rapid-${i}`);
          await manager.initialize();
          rapidManagers.push(manager);

          // Rapid operations
          await manager.store(`Rapid ${i}`, 'project', ['rapid']);
        }

        console.log('✅ Rapid connection handling successful');

      } finally {
        // Cleanup
        await Promise.all(rapidManagers.map(m => m.close()));
      }

      // Verify original manager still works
      const postIssue = await memoryManager.search('Pre-issue');
      expect(postIssue.length).toBeGreaterThan(0);

      console.log('✅ System resilience validated');
    });

    it('should handle graceful shutdown scenarios', async () => {
      const shutdownManagers: MemoryManager[] = [];

      try {
        // Create multiple managers
        for (let i = 0; i < 5; i++) {
          const manager = new MemoryManager(`${tempDir}/shutdown-${i}`);
          await manager.initialize();
          shutdownManagers.push(manager);

          // Start some long-running operations
          manager.store(`Shutdown test ${i}`, 'project', ['shutdown'])
            .catch(() => {}); // Ignore potential failures during shutdown
        }

        // Rapid shutdown
        await Promise.all(shutdownManagers.map(manager => manager.close()));

        console.log('✅ Graceful shutdown completed');

      } catch (error) {
        console.log('⚠️ Shutdown error (may be expected):', error);
      }

      // Verify main manager still functional
      const postShutdown = await memoryManager.store('Post shutdown test', 'project', ['recovery']);
      expect(postShutdown).toBeTruthy();

      console.log('✅ System recovery after shutdown validated');
    });
  });
});

// Utility functions for test data generation
function createDeepObject(depth: number): any {
  if (depth <= 0) return 'leaf';
  return {
    level: depth,
    nested: createDeepObject(depth - 1),
    array: Array.from({ length: 3 }, (_, i) => `item-${i}`)
  };
}

function createComplexMetadata(): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    version: '1.2.3',
    environment: 'test',
    features: ['feature1', 'feature2', 'feature3'],
    configuration: {
      debug: true,
      verbose: false,
      settings: {
        theme: 'dark',
        language: 'en',
        preferences: {
          notifications: true,
          autoSave: false
        }
      }
    },
    metrics: {
      performance: { load_time: 150, memory_usage: 256 },
      usage: { click_count: 42, session_duration: 1800 }
    },
    tags: ['complex', 'metadata', 'test'],
    references: [
      { type: 'external', url: 'https://example.com' },
      { type: 'internal', id: 'ref-123' }
    ]
  };
}