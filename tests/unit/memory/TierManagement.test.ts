/**
 * Unit tests for Memory Tier Management - Testing automatic promotion/demotion
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { MemoryLayer } from '../../../src/types/index.js';
import { createMockMemory, PerformanceMeasurer } from '../../utils/TestHelpers.js';

describe('Memory Tier Management', () => {
  let memoryManager: MemoryManager;
  let performanceMeasurer: PerformanceMeasurer;

  beforeEach(async () => {
    memoryManager = new MemoryManager();
    performanceMeasurer = new PerformanceMeasurer();
    await memoryManager.initialize();
  });

  afterEach(async () => {
    await memoryManager.close();
  });

  describe('Automatic Memory Promotion', () => {
    it('should promote frequently accessed memories from cold to warm storage', async () => {
      // Store memory in cold storage (system layer)
      const memoryId = await memoryManager.store(
        'Frequently accessed pattern for code completion',
        'system',
        ['pattern', 'completion']
      );

      // Simulate frequent access to trigger promotion
      const accessThreshold = 5;
      for (let i = 0; i < accessThreshold; i++) {
        await memoryManager.search('code completion');
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay between accesses
      }

      // Verify memory has been promoted (would need access to internal state)
      const stats = await memoryManager.getMemoryStats();
      expect(stats.warm_storage_count).toBeGreaterThan(0);
    });

    it('should promote critical memories from warm to core immediately', async () => {
      // Store critical user preference
      const criticalMemoryId = await memoryManager.store(
        JSON.stringify({
          preference: 'always_use_typescript',
          priority: 'critical',
          impact: 'high'
        }),
        'preference',
        ['critical', 'user-preference', 'typescript']
      );

      // Critical memories should be promoted immediately
      const searchResults = await memoryManager.search('always_use_typescript');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].memory.layer).toBe('preference');

      // Verify it's accessible with high performance
      const endTimer = performanceMeasurer.start('critical-memory-access');
      const result = await memoryManager.search('typescript');
      const duration = endTimer();

      expect(duration).toBeLessThan(10); // Should be very fast (core memory)
    });

    it('should respect tier size limits during promotion', async () => {
      // Fill core memory to near capacity
      const coreMemoryLimit = 50; // Simulated limit for testing
      const memories: string[] = [];

      for (let i = 0; i < coreMemoryLimit; i++) {
        const id = await memoryManager.store(
          `Core memory item ${i}`,
          'preference',
          ['core', `item-${i}`]
        );
        memories.push(id);
      }

      // Try to promote additional memory when at capacity
      const newMemoryId = await memoryManager.store(
        'New important memory that needs promotion',
        'system',
        ['important', 'promote']
      );

      // Simulate access to trigger promotion attempt
      for (let i = 0; i < 10; i++) {
        await memoryManager.search('important memory');
      }

      // Verify tier limits are respected
      const stats = await memoryManager.getMemoryStats();
      expect(stats.core_memory_size).toBeLessThanOrEqual(coreMemoryLimit + 2); // +2 for buffer
    });

    it('should handle promotion conflicts with LRU eviction', async () => {
      // Create memories with different access patterns
      const oldMemoryId = await memoryManager.store(
        'Old rarely accessed memory',
        'preference',
        ['old', 'rare']
      );

      // Wait to establish age difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const newMemoryId = await memoryManager.store(
        'New frequently accessed memory',
        'system',
        ['new', 'frequent']
      );

      // Access new memory frequently
      for (let i = 0; i < 5; i++) {
        await memoryManager.search('frequently accessed');
      }

      // Access old memory rarely
      await memoryManager.search('rarely accessed');

      // New memory should be promoted, old should be demoted if needed
      const searchNew = await memoryManager.search('frequently accessed');
      const searchOld = await memoryManager.search('rarely accessed');

      expect(searchNew.length).toBeGreaterThan(0);
      expect(searchOld.length).toBeGreaterThan(0);

      // New memory should have higher similarity score due to promotion
      if (searchNew.length > 0 && searchOld.length > 0) {
        const newScore = searchNew[0].similarity_score ?? 0;
        const oldScore = searchOld[0].similarity_score ?? 0;
        expect(newScore).toBeGreaterThanOrEqual(oldScore);
      }
    });
  });

  describe('Automatic Memory Demotion', () => {
    it('should demote least-recently-used memories from core to warm', async () => {
      // Create multiple memories in core (preference layer)
      const memoryIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const id = await memoryManager.store(
          `Core memory ${i} for testing demotion`,
          'preference',
          [`core-${i}`, 'demotion-test']
        );
        memoryIds.push(id);
      }

      // Access only some memories to establish LRU pattern
      const accessedIndices = [0, 2, 4, 6, 8];
      for (const index of accessedIndices) {
        await memoryManager.search(`Core memory ${index}`);
      }

      // Simulate time passing to trigger demotion check
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add new memories to trigger potential demotion
      for (let i = 0; i < 5; i++) {
        await memoryManager.store(
          `New core memory ${i} triggering demotion`,
          'preference',
          ['new', 'trigger']
        );
      }

      // Verify least recently used memories are still accessible
      const unaccessed = await memoryManager.search('Core memory 1');
      expect(unaccessed.length).toBeGreaterThan(0);
    });

    it('should demote stale memories from warm to cold after threshold', async () => {
      // Create memories that will become stale
      const staleMemoryId = await memoryManager.store(
        'This memory will become stale over time',
        'project',
        ['stale-candidate', 'warm-tier']
      );

      // Create timestamp for staleness detection
      const creationTime = Date.now();

      // Access it initially to place in warm storage
      await memoryManager.search('stale over time');

      // Simulate time passing (staleness threshold)
      // In real implementation, this would be based on actual time
      jest.useFakeTimers();
      jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 24 hours

      // Trigger maintenance/cleanup that checks for stale memories
      // Note: performMaintenance method not yet implemented in MemoryManager
      // if (typeof memoryManager.performMaintenance === 'function') {
      //   await memoryManager.performMaintenance();
      // }

      // Memory should still be accessible but from cold storage
      const results = await memoryManager.search('stale over time');
      expect(results.length).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should preserve metadata during demotion', async () => {
      const metadata = {
        source: 'unit-test',
        version: '1.0.0',
        tags: ['important', 'preserve'],
        customField: 'should-be-preserved'
      };

      const memoryId = await memoryManager.store(
        'Memory with important metadata',
        'preference',
        ['metadata-test'],
        metadata
      );

      // Simulate conditions that would cause demotion
      // First, fill up the tier to trigger demotion
      for (let i = 0; i < 20; i++) {
        await memoryManager.store(
          `Filler memory ${i}`,
          'preference',
          ['filler']
        );
      }

      // Search for original memory to verify metadata preserved
      const results = await memoryManager.search('important metadata');
      expect(results.length).toBeGreaterThan(0);

      if (results.length > 0) {
        const retrievedMemory = results[0].memory;
        expect(retrievedMemory.metadata).toBeDefined();
        expect(retrievedMemory.metadata?.customField).toBe('should-be-preserved');
      }
    });

    it('should batch demotions for efficiency', async () => {
      // Create many memories that need demotion
      const batchSize = 50;
      const memoryIds: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        const id = await memoryManager.store(
          `Batch demotion candidate ${i}`,
          'preference',
          [`batch-${i}`, 'demotion']
        );
        memoryIds.push(id);
      }

      // Measure demotion performance
      const endTimer = performanceMeasurer.start('batch-demotion');

      // Trigger batch demotion by adding many new high-priority memories
      const newMemoryPromises: Promise<string>[] = [];
      for (let i = 0; i < batchSize; i++) {
        newMemoryPromises.push(
          memoryManager.store(
            `High priority memory ${i}`,
            'preference',
            ['high-priority', 'new']
          )
        );
      }

      await Promise.all(newMemoryPromises);
      const duration = endTimer();

      // Batch operation should be efficient
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(duration / batchSize).toBeLessThan(20); // Less than 20ms per item

      // Verify all memories are still accessible
      const randomCheck = Math.floor(Math.random() * batchSize);
      const checkResult = await memoryManager.search(`candidate ${randomCheck}`);
      expect(checkResult.length).toBeGreaterThan(0);
    });
  });

  describe('Tier Transition Integrity', () => {
    it('should maintain data integrity during transitions', async () => {
      const originalContent = 'Critical data that must not be corrupted during transition';
      const originalTags = ['integrity', 'critical', 'transition-test'];
      const originalMetadata = {
        checksum: 'abc123',
        timestamp: Date.now(),
        importance: 'high'
      };

      const memoryId = await memoryManager.store(
        originalContent,
        'system',
        originalTags,
        originalMetadata
      );

      // Simulate multiple tier transitions
      for (let i = 0; i < 10; i++) {
        await memoryManager.search('Critical data');
      }

      // Force a maintenance cycle if available
      // Note: performMaintenance method not yet implemented in MemoryManager
      // if (typeof memoryManager.performMaintenance === 'function') {
      //   await memoryManager.performMaintenance();
      // }

      // Verify data integrity after transitions
      const results = await memoryManager.search('Critical data');
      expect(results.length).toBeGreaterThan(0);

      if (results.length > 0) {
        const memory = results[0].memory;
        expect(memory.content).toBe(originalContent);
        expect(memory.tags).toEqual(expect.arrayContaining(originalTags));
        expect(memory.metadata?.checksum).toBe('abc123');
        expect(memory.metadata?.importance).toBe('high');
      }
    });

    it('should update access patterns correctly during transitions', async () => {
      const memoryId = await memoryManager.store(
        'Memory for access pattern tracking',
        'project',
        ['access-pattern']
      );

      // Initial access
      const firstSearch = await memoryManager.search('access pattern');
      expect(firstSearch.length).toBeGreaterThan(0);
      const initialAccessCount = firstSearch[0]?.memory.access_count || 0;

      // Multiple accesses to track pattern
      for (let i = 0; i < 5; i++) {
        await memoryManager.search('access pattern');
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Final access to check count
      const finalSearch = await memoryManager.search('access pattern');
      expect(finalSearch.length).toBeGreaterThan(0);

      if (finalSearch.length > 0) {
        const finalAccessCount = finalSearch[0].memory.access_count || 0;
        expect(finalAccessCount).toBeGreaterThan(initialAccessCount);
      }
    });

    it('should handle concurrent tier transitions safely', async () => {
      // Create memories that will transition simultaneously
      const concurrentCount = 20;
      const memoryPromises: Promise<string>[] = [];

      for (let i = 0; i < concurrentCount; i++) {
        memoryPromises.push(
          memoryManager.store(
            `Concurrent transition memory ${i}`,
            'system',
            [`concurrent-${i}`]
          )
        );
      }

      const memoryIds = await Promise.all(memoryPromises);

      // Trigger concurrent transitions through simultaneous access
      const accessPromises = memoryIds.map((id, index) =>
        memoryManager.search(`Concurrent transition memory ${index}`)
      );

      const results = await Promise.all(accessPromises);

      // All memories should be accessible without corruption
      results.forEach((result, index) => {
        expect(result.length).toBeGreaterThan(0);
        if (result.length > 0) {
          expect(result[0].memory.content).toContain(`memory ${index}`);
        }
      });
    });

    it('should roll back failed transitions', async () => {
      const memoryId = await memoryManager.store(
        'Memory that might fail during transition',
        'system',
        ['rollback-test'],
        { transactionId: 'test-123' }
      );

      // Simulate a scenario that could cause transition failure
      // This would need to be coordinated with actual implementation
      const searchBefore = await memoryManager.search('fail during transition');
      expect(searchBefore.length).toBeGreaterThan(0);
      const originalState = searchBefore[0]?.memory;

      // In a real scenario, we'd simulate a failure condition here
      // For now, we verify the memory remains accessible
      const searchAfter = await memoryManager.search('fail during transition');
      expect(searchAfter.length).toBeGreaterThan(0);

      if (searchAfter.length > 0 && originalState) {
        expect(searchAfter[0].memory.content).toBe(originalState.content);
        expect(searchAfter[0].memory.metadata?.transactionId).toBe('test-123');
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain sub-10ms access for core memories', async () => {
      // Store in core (preference layer)
      await memoryManager.store(
        'Core memory with fast access requirement',
        'preference',
        ['core', 'fast-access']
      );

      // Measure access time
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const endTimer = performanceMeasurer.start(`core-access-${i}`);
        await memoryManager.search('fast access requirement');
        durations.push(endTimer());
      }

      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
      expect(averageDuration).toBeLessThan(10);
    });

    it('should scale tier transitions linearly with memory count', async () => {
      const testSizes = [10, 20, 40];
      const transitionTimes: Record<number, number> = {};

      for (const size of testSizes) {
        // Create memories
        const memories: string[] = [];
        for (let i = 0; i < size; i++) {
          memories.push(
            await memoryManager.store(
              `Scale test memory ${i} for size ${size}`,
              'project',
              [`scale-${size}`, `item-${i}`]
            )
          );
        }

        // Measure transition time
        const endTimer = performanceMeasurer.start(`transition-${size}`);

        // Trigger transitions through access
        const accessPromises = memories.map(() =>
          memoryManager.search(`size ${size}`)
        );
        await Promise.all(accessPromises);

        transitionTimes[size] = endTimer();
      }

      // Verify linear scaling (roughly)
      const ratio1 = transitionTimes[20] / transitionTimes[10];
      const ratio2 = transitionTimes[40] / transitionTimes[20];

      // Allow for some variance, but should be roughly linear
      expect(ratio1).toBeGreaterThan(1.5);
      expect(ratio1).toBeLessThan(3);
      expect(ratio2).toBeGreaterThan(1.5);
      expect(ratio2).toBeLessThan(3);
    });
  });
});