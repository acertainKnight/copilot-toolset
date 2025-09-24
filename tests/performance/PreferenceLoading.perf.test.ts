/**
 * Performance Tests for User Preference Loading
 * Validates that preference operations meet performance targets
 *
 * @module PreferenceLoading.perf.test
 * @description Performance benchmarks for preference and context operations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { MemoryTools } from '../../src/tools/MemoryTools.js';
import { UnifiedMemoryManager } from '../../src/memory/UnifiedMemoryManager.js';
import type { ToolExecutionContext, UnifiedMemory } from '../../src/types/index.js';

interface PerformanceMetrics {
  operation: string;
  duration: number;
  iterations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  throughput: number; // operations per second
}

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startOperation(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      const durations = this.metrics.get(name) || [];
      durations.push(duration);
      this.metrics.set(name, durations);
    };
  }

  getMetrics(operation: string): PerformanceMetrics | null {
    const durations = this.metrics.get(operation);
    if (!durations || durations.length === 0) return null;

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      operation,
      duration: sum,
      iterations: sorted.length,
      avgDuration: sum / sorted.length,
      minDuration: sorted[0],
      maxDuration: sorted[sorted.length - 1],
      p95Duration: sorted[Math.floor(sorted.length * 0.95)],
      p99Duration: sorted[Math.floor(sorted.length * 0.99)],
      throughput: (sorted.length / sum) * 1000
    };
  }

  reset(): void {
    this.metrics.clear();
  }

  printReport(): void {
    console.log('\n=== Performance Report ===\n');
    for (const [operation, _] of this.metrics) {
      const metrics = this.getMetrics(operation);
      if (metrics) {
        console.log(`${operation}:`);
        console.log(`  Iterations: ${metrics.iterations}`);
        console.log(`  Avg: ${metrics.avgDuration.toFixed(2)}ms`);
        console.log(`  Min: ${metrics.minDuration.toFixed(2)}ms`);
        console.log(`  Max: ${metrics.maxDuration.toFixed(2)}ms`);
        console.log(`  P95: ${metrics.p95Duration.toFixed(2)}ms`);
        console.log(`  P99: ${metrics.p99Duration.toFixed(2)}ms`);
        console.log(`  Throughput: ${metrics.throughput.toFixed(2)} ops/sec`);
        console.log();
      }
    }
  }
}

describe('Preference Loading Performance', () => {
  let memoryTools: MemoryTools;
  let unifiedMemory: UnifiedMemoryManager;
  let testWorkspace: string;
  let mockContext: ToolExecutionContext;
  let monitor: PerformanceMonitor;

  beforeEach(async () => {
    testWorkspace = path.join(os.tmpdir(), `perf-test-${Date.now()}`);
    await fs.mkdir(testWorkspace, { recursive: true });

    unifiedMemory = new UnifiedMemoryManager();
    memoryTools = new MemoryTools();
    monitor = new PerformanceMonitor();

    mockContext = {
      workspacePath: testWorkspace,
      timestamp: Date.now(),
      userId: 'perf-test-user'
    };

    // Clear any existing data
    await unifiedMemory.clearAll();
  });

  afterEach(async () => {
    monitor.printReport();
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await unifiedMemory.close();
  });

  describe('Preference Loading Benchmarks', () => {
    it('should load preferences within 50ms target', async () => {
      // Setup: Store test preferences
      const preferences = Array.from({ length: 50 }, (_, i) => ({
        content: `User preference ${i}: ${Math.random() < 0.5 ? 'TypeScript' : 'JavaScript'}`,
        tier: 'core' as const,
        scope: 'global' as const,
        tags: ['preference', 'coding', `pref-${i}`],
        metadata: {
          category: 'language',
          index: i,
          timestamp: Date.now()
        }
      }));

      // Store all preferences
      for (const pref of preferences) {
        await unifiedMemory.store(pref);
      }

      // Benchmark: Load preferences
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const endTimer = monitor.startOperation('get_user_preferences');
        await memoryTools.getUserPreferences({ category: 'coding' }, mockContext);
        endTimer();
      }

      const metrics = monitor.getMetrics('get_user_preferences');
      expect(metrics).not.toBeNull();
      expect(metrics!.avgDuration).toBeLessThan(50); // Target: <50ms average
      expect(metrics!.p95Duration).toBeLessThan(75); // P95: <75ms
      expect(metrics!.p99Duration).toBeLessThan(100); // P99: <100ms
    });

    it('should handle large preference sets efficiently', async () => {
      // Setup: Store large number of preferences
      const largePreferenceSet = Array.from({ length: 500 }, (_, i) => ({
        content: `Preference ${i}: ${'x'.repeat(Math.floor(Math.random() * 100 + 50))}`,
        tier: Math.random() < 0.2 ? 'core' as const : 'long_term' as const,
        scope: Math.random() < 0.7 ? 'global' as const : 'project' as const,
        project_id: Math.random() < 0.3 ? testWorkspace : undefined,
        tags: ['preference', `cat-${i % 10}`, `type-${i % 5}`],
        metadata: { index: i }
      }));

      for (const pref of largePreferenceSet) {
        await unifiedMemory.store(pref);
      }

      // Benchmark: Load preferences with filtering
      const endTimer = monitor.startOperation('large_preference_load');
      const result = await memoryTools.getUserPreferences({
        category: 'cat-5',
        limit: 100
      }, mockContext);
      endTimer();

      const metrics = monitor.getMetrics('large_preference_load');
      expect(metrics!.minDuration).toBeLessThan(100); // Should handle large sets <100ms
      expect(result.isError).toBeUndefined();
    });

    it('should paginate preference loading efficiently', async () => {
      // Setup: Create paginated preferences
      const totalPreferences = 200;
      for (let i = 0; i < totalPreferences; i++) {
        await unifiedMemory.store({
          content: `Paginated preference ${i}`,
          tier: 'core',
          scope: 'global',
          tags: ['preference', 'paginated'],
          metadata: { index: i, page: Math.floor(i / 20) }
        });
      }

      // Benchmark: Paginated loading
      const pageSize = 20;
      const pages = 10;

      for (let page = 0; page < pages; page++) {
        const endTimer = monitor.startOperation(`page_${page}`);
        await memoryTools.getUserPreferences({
          offset: page * pageSize,
          limit: pageSize
        }, mockContext);
        endTimer();
      }

      // Check consistent performance across pages
      for (let page = 0; page < pages; page++) {
        const metrics = monitor.getMetrics(`page_${page}`);
        expect(metrics!.minDuration).toBeLessThan(30); // Each page <30ms
      }
    });
  });

  describe('Context Curation Performance', () => {
    it('should curate context within 200ms for typical workload', async () => {
      // Setup: Create typical memory distribution
      // Core preferences
      for (let i = 0; i < 20; i++) {
        await unifiedMemory.store({
          content: `Core preference ${i}: Important setting`,
          tier: 'core',
          scope: 'global',
          tags: ['preference', 'core'],
          metadata: { importance: 0.8 + Math.random() * 0.2 }
        });
      }

      // Project context
      for (let i = 0; i < 50; i++) {
        await unifiedMemory.store({
          content: `Project context ${i}: Technical detail about the project`,
          tier: 'long_term',
          scope: 'project',
          project_id: testWorkspace,
          tags: ['project', 'context'],
          metadata: { relevance: Math.random() }
        });
      }

      // Patterns
      for (let i = 0; i < 30; i++) {
        await unifiedMemory.store({
          content: `Pattern ${i}: Common coding pattern observed`,
          tier: 'long_term',
          scope: 'global',
          tags: ['pattern', 'coding'],
          metadata: { frequency: Math.floor(Math.random() * 10) }
        });
      }

      // Benchmark: Context curation
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        const endTimer = monitor.startOperation('curate_context');
        await memoryTools.curateContext({
          includePreferences: true,
          includeProjectContext: true,
          includePatterns: true,
          maxTokens: 4000
        }, mockContext);
        endTimer();
      }

      const metrics = monitor.getMetrics('curate_context');
      expect(metrics).not.toBeNull();
      expect(metrics!.avgDuration).toBeLessThan(200); // Target: <200ms average
      expect(metrics!.p95Duration).toBeLessThan(300); // P95: <300ms
    });

    it('should handle token limit enforcement efficiently', async () => {
      // Create large memory set
      const largeMemories = Array.from({ length: 1000 }, (_, i) => ({
        content: `Memory ${i}: ${'x'.repeat(200)}`, // ~50 tokens each
        tier: 'long_term' as const,
        scope: 'global' as const,
        tags: ['large'],
        metadata: { index: i }
      }));

      for (const mem of largeMemories) {
        await unifiedMemory.store(mem);
      }

      // Benchmark: Token-limited curation
      const tokenLimits = [500, 1000, 2000, 4000];

      for (const limit of tokenLimits) {
        const endTimer = monitor.startOperation(`token_limit_${limit}`);
        const result = await memoryTools.curateContext({
          maxTokens: limit
        }, mockContext);
        endTimer();

        // Verify token limit is respected
        const estimatedTokens = result.content[0].text.length / 4;
        expect(estimatedTokens).toBeLessThanOrEqual(limit * 1.2); // Allow 20% margin
      }

      // Performance should be consistent regardless of token limit
      for (const limit of tokenLimits) {
        const metrics = monitor.getMetrics(`token_limit_${limit}`);
        expect(metrics!.minDuration).toBeLessThan(250); // All should complete <250ms
      }
    });
  });

  describe('Preference Extraction Performance', () => {
    it('should extract preferences from code within 100ms', async () => {
      // Generate test code files
      const codeFiles = [
        {
          name: 'small',
          lines: 50,
          content: generateTypeScriptCode(50)
        },
        {
          name: 'medium',
          lines: 500,
          content: generateTypeScriptCode(500)
        },
        {
          name: 'large',
          lines: 2000,
          content: generateTypeScriptCode(2000)
        }
      ];

      for (const file of codeFiles) {
        const iterations = file.name === 'large' ? 10 : 20;

        for (let i = 0; i < iterations; i++) {
          const endTimer = monitor.startOperation(`extract_${file.name}`);
          await memoryTools.extractCodingPreferences({
            content: file.content,
            language: 'typescript',
            detectFormatting: true
          }, mockContext);
          endTimer();
        }

        const metrics = monitor.getMetrics(`extract_${file.name}`);
        expect(metrics).not.toBeNull();

        // Performance targets based on file size
        const target = file.name === 'large' ? 100 : file.name === 'medium' ? 50 : 25;
        expect(metrics!.avgDuration).toBeLessThan(target);
      }
    });

    it('should detect patterns efficiently in multiple files', async () => {
      // Create file set for pattern detection
      const fileContents = Array.from({ length: 20 }, (_, i) =>
        generateTypeScriptCode(100 + i * 10)
      );

      // Benchmark: Batch pattern extraction
      const endBatchTimer = monitor.startOperation('batch_pattern_extraction');

      const extractionPromises = fileContents.map((content, i) =>
        memoryTools.extractCodingPreferences({
          content,
          language: 'typescript',
          detectPatterns: true,
          fileIndex: i
        }, mockContext)
      );

      await Promise.all(extractionPromises);
      endBatchTimer();

      const metrics = monitor.getMetrics('batch_pattern_extraction');
      expect(metrics!.minDuration).toBeLessThan(500); // Batch of 20 files <500ms
    });
  });

  describe('Memory Operations Under Load', () => {
    it('should maintain performance under concurrent load', async () => {
      // Setup: Pre-populate with data
      for (let i = 0; i < 100; i++) {
        await unifiedMemory.store({
          content: `Base memory ${i}`,
          tier: i % 3 === 0 ? 'core' : 'long_term',
          scope: i % 2 === 0 ? 'global' : 'project',
          project_id: i % 2 === 1 ? testWorkspace : undefined,
          tags: ['base', `type-${i % 5}`],
          metadata: { index: i }
        });
      }

      // Simulate concurrent operations
      const operations = [
        () => memoryTools.getUserPreferences({}, mockContext),
        () => memoryTools.curateContext({ maxTokens: 1000 }, mockContext),
        () => memoryTools.extractCodingPreferences({
          content: generateTypeScriptCode(50),
          language: 'typescript'
        }, mockContext),
        () => memoryTools.storeUnifiedMemory({
          content: `Concurrent store ${Date.now()}`,
          tier: 'core',
          scope: 'global',
          tags: ['concurrent']
        }, mockContext)
      ];

      // Run operations concurrently
      const concurrentRuns = 10;
      const endTimer = monitor.startOperation('concurrent_operations');

      const allPromises = [];
      for (let run = 0; run < concurrentRuns; run++) {
        for (const op of operations) {
          allPromises.push(op());
        }
      }

      await Promise.all(allPromises);
      endTimer();

      const metrics = monitor.getMetrics('concurrent_operations');
      const totalOps = concurrentRuns * operations.length;
      const throughput = (totalOps / metrics!.minDuration) * 1000;

      expect(throughput).toBeGreaterThan(50); // At least 50 ops/sec
    });

    it('should handle memory pressure gracefully', async () => {
      // Fill memory to near capacity
      const nearCapacityData = Array.from({ length: 1000 }, (_, i) => ({
        content: `Memory pressure test ${i}: ${'x'.repeat(500)}`,
        tier: 'long_term' as const,
        scope: 'global' as const,
        tags: ['pressure-test'],
        metadata: { index: i, size: 500 }
      }));

      // Store data in batches to avoid overwhelming
      const batchSize = 100;
      for (let i = 0; i < nearCapacityData.length; i += batchSize) {
        const batch = nearCapacityData.slice(i, i + batchSize);
        await Promise.all(batch.map(data => unifiedMemory.store(data)));
      }

      // Benchmark operations under memory pressure
      const operations = [
        'search_under_pressure',
        'curate_under_pressure',
        'store_under_pressure'
      ];

      // Search operation
      const searchTimer = monitor.startOperation('search_under_pressure');
      await memoryTools.getUserPreferences({}, mockContext);
      searchTimer();

      // Curation operation
      const curateTimer = monitor.startOperation('curate_under_pressure');
      await memoryTools.curateContext({ maxTokens: 2000 }, mockContext);
      curateTimer();

      // Store operation
      const storeTimer = monitor.startOperation('store_under_pressure');
      await memoryTools.storeUnifiedMemory({
        content: 'New memory under pressure',
        tier: 'core',
        scope: 'global',
        tags: ['new']
      }, mockContext);
      storeTimer();

      // All operations should still complete reasonably fast
      for (const op of operations) {
        const metrics = monitor.getMetrics(op);
        expect(metrics!.minDuration).toBeLessThan(500); // <500ms even under pressure
      }
    });
  });

  describe('Optimization Performance', () => {
    it('should optimize memory efficiently', async () => {
      // Create fragmented memory state
      const fragmentedData = [];

      // Duplicate preferences
      for (let i = 0; i < 50; i++) {
        fragmentedData.push({
          content: 'Prefer TypeScript over JavaScript',
          tier: 'core' as const,
          scope: 'global' as const,
          tags: ['preference', 'duplicate'],
          metadata: { version: i }
        });
      }

      // Outdated memories
      for (let i = 0; i < 100; i++) {
        fragmentedData.push({
          content: `Outdated memory ${i}`,
          tier: 'long_term' as const,
          scope: 'project' as const,
          project_id: `/old/project/${i}`,
          tags: ['outdated'],
          metadata: {
            lastAccessed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
      }

      // Store fragmented data
      for (const data of fragmentedData) {
        await unifiedMemory.store(data);
      }

      // Benchmark: Memory optimization
      const endTimer = monitor.startOperation('memory_optimization');
      const result = await memoryTools.optimizeMemory({
        consolidateSimilar: true,
        removeOutdated: true,
        compactDatabase: true
      }, mockContext);
      endTimer();

      expect(result.isError).toBeUndefined();

      const metrics = monitor.getMetrics('memory_optimization');
      expect(metrics!.minDuration).toBeLessThan(1000); // Optimization <1s

      // Verify optimization improved subsequent operations
      const postOptTimer = monitor.startOperation('post_optimization_search');
      await memoryTools.getUserPreferences({}, mockContext);
      postOptTimer();

      const postMetrics = monitor.getMetrics('post_optimization_search');
      expect(postMetrics!.minDuration).toBeLessThan(30); // Faster after optimization
    });
  });

  // Helper function to generate TypeScript code
  function generateTypeScriptCode(lines: number): string {
    const components = [
      'interface User { id: string; name: string; age: number; }',
      'type Status = "active" | "inactive" | "pending";',
      'const getData = async (): Promise<User[]> => { return []; }',
      'function processUser(user: User): void { console.log(user.name); }',
      'class UserService { constructor(private db: Database) {} }',
      'export const Component: React.FC = () => { return <div>Test</div>; }',
      '// This is a comment explaining the code',
      'const config = { timeout: 5000, retries: 3 };',
      'if (user.age > 18) { return "adult"; } else { return "minor"; }',
      'users.map(u => ({ ...u, processed: true }))',
    ];

    const code = [];
    for (let i = 0; i < lines; i++) {
      code.push(components[i % components.length]);
    }
    return code.join('\n');
  }
});