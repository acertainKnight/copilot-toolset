/**
 * Enhanced Unified Memory Manager Tests
 *
 * Tests for new enhanced memory functionality including:
 * - Memory deletion with cascade handling
 * - Duplicate detection using semantic similarity
 * - Memory tier migration
 * - Access frequency tracking
 * - Comprehensive analytics
 */

import { UnifiedMemoryManager } from '../../../src/memory/UnifiedMemoryManager.js';
import { MemoryTier, MemoryScope } from '../../../src/types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('EnhancedUnifiedMemoryManager', () => {
  let memoryManager: UnifiedMemoryManager;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a temporary database path for testing
    const testDir = path.join(os.tmpdir(), 'copilot-mcp-test', `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    testDbPath = path.join(testDir, 'test-unified.db');

    // Initialize memory manager with test database
    memoryManager = new UnifiedMemoryManager();
    // Override the database path for testing
    (memoryManager as any).dbPath = testDbPath;

    await memoryManager.initialize();
  });

  afterEach(async () => {
    try {
      await memoryManager.close();
      // Clean up test database
      if (testDbPath) {
        const testDir = path.dirname(testDbPath);
        await fs.rm(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Memory Deletion with Cascade Handling', () => {
    it('should delete a single memory successfully', async () => {
      // Store a test memory
      const memoryId = await memoryManager.store(
        'Test memory for deletion',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['test', 'deletion']
      );

      // Delete the memory
      const result = await memoryManager.deleteMemory(memoryId, false);

      expect(result.deleted).toBe(true);
      expect(result.relatedDeleted).toBe(0);
      expect(result.message).toContain('Successfully deleted memory');
    });

    it('should delete memory with related memories when cascade is enabled', async () => {
      // Store related memories with similar content
      const baseContent = 'React component testing best practices';
      const memory1Id = await memoryManager.store(
        baseContent,
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['react', 'testing']
      );

      const memory2Id = await memoryManager.store(
        'React component testing patterns and practices',
        'longterm' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['react', 'testing', 'patterns']
      );

      const memory3Id = await memoryManager.store(
        'Testing React components with Jest',
        'longterm' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['react', 'testing', 'jest']
      );

      // Delete with cascade enabled
      const result = await memoryManager.deleteMemory(memory1Id, true);

      expect(result.deleted).toBe(true);
      expect(result.relatedDeleted).toBeGreaterThan(0);
    });

    it('should return false when trying to delete non-existent memory', async () => {
      const result = await memoryManager.deleteMemory('non-existent-id', false);

      expect(result.deleted).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('Duplicate Detection with Semantic Similarity', () => {
    it('should detect duplicate content with high similarity', async () => {
      // Store original memory
      await memoryManager.store(
        'JavaScript async/await patterns for handling promises',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['javascript', 'async', 'promises']
      );

      // Check for duplicates with very similar content
      const result = await memoryManager.checkDuplicateMemory(
        'JavaScript async await patterns for promise handling',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        0.7 // 70% similarity threshold
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicates.length).toBeGreaterThan(0);
      expect(result.recommendation).toContain('Similar memory found');
    });

    it('should not detect duplicates for dissimilar content', async () => {
      // Store original memory
      await memoryManager.store(
        'Python data analysis with pandas',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['python', 'pandas', 'data']
      );

      // Check for duplicates with completely different content
      const result = await memoryManager.checkDuplicateMemory(
        'CSS flexbox layout techniques',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        0.8 // 80% similarity threshold
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicates.length).toBe(0);
      expect(result.recommendation).toContain('No duplicates found');
    });

    it('should respect similarity threshold parameter', async () => {
      // Store original memory
      await memoryManager.store(
        'Database optimization strategies',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['database', 'optimization']
      );

      // Check with high threshold (should not find duplicates)
      const strictResult = await memoryManager.checkDuplicateMemory(
        'Database performance optimization techniques',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        0.9 // 90% similarity threshold
      );

      // Check with low threshold (should find duplicates)
      const lenientResult = await memoryManager.checkDuplicateMemory(
        'Database performance optimization techniques',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        0.3 // 30% similarity threshold
      );

      expect(strictResult.isDuplicate).toBe(false);
      expect(lenientResult.isDuplicate).toBe(true);
    });
  });

  describe('Memory Tier Migration', () => {
    it('should migrate memory from core to longterm tier successfully', async () => {
      // Store in core tier
      const memoryId = await memoryManager.store(
        'Small memory for migration test',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['test', 'migration']
      );

      // Migrate to longterm tier
      const result = await memoryManager.migrateMemoryTier(
        memoryId,
        'longterm' as MemoryTier,
        'Testing tier migration'
      );

      expect(result.migrated).toBe(true);
      expect(result.fromTier).toBe('core');
      expect(result.toTier).toBe('longterm');
      expect(result.message).toContain('Successfully migrated');
    });

    it('should migrate memory from longterm to core tier if size permits', async () => {
      // Store in longterm tier with small content
      const memoryId = await memoryManager.store(
        'Small memory for reverse migration',
        'longterm' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['test', 'reverse']
      );

      // Migrate to core tier
      const result = await memoryManager.migrateMemoryTier(
        memoryId,
        'core' as MemoryTier,
        'Testing reverse migration'
      );

      expect(result.migrated).toBe(true);
      expect(result.fromTier).toBe('longterm');
      expect(result.toTier).toBe('core');
    });

    it('should reject migration to core if content exceeds size limit', async () => {
      // Create content that exceeds 2KB limit
      const largeContent = 'x'.repeat(3000); // 3KB content

      const memoryId = await memoryManager.store(
        largeContent,
        'longterm' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['test', 'large']
      );

      // Attempt migration to core tier (should fail)
      const result = await memoryManager.migrateMemoryTier(
        memoryId,
        'core' as MemoryTier,
        'Testing size limit rejection'
      );

      expect(result.migrated).toBe(false);
      expect(result.message).toContain('exceeds 2KB limit');
    });

    it('should return false when trying to migrate non-existent memory', async () => {
      const result = await memoryManager.migrateMemoryTier(
        'non-existent-id',
        'longterm' as MemoryTier,
        'Testing non-existent migration'
      );

      expect(result.migrated).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should not migrate memory that is already in target tier', async () => {
      const memoryId = await memoryManager.store(
        'Memory already in core tier',
        'core' as MemoryTier,
        'global' as MemoryScope
      );

      const result = await memoryManager.migrateMemoryTier(
        memoryId,
        'core' as MemoryTier,
        'Testing same tier migration'
      );

      expect(result.migrated).toBe(false);
      expect(result.message).toContain('already in core tier');
    });
  });

  describe('Memory Analytics', () => {
    beforeEach(async () => {
      // Populate database with test data
      await memoryManager.store(
        'Core memory 1',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['tag1', 'common']
      );

      await memoryManager.store(
        'Core memory 2',
        'core' as MemoryTier,
        'project' as MemoryScope,
        'test-project-1',
        ['tag2', 'common']
      );

      await memoryManager.store(
        'Longterm memory 1',
        'longterm' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['tag3', 'common']
      );

      await memoryManager.store(
        'Longterm memory 2',
        'longterm' as MemoryTier,
        'project' as MemoryScope,
        'test-project-2',
        ['tag4', 'special']
      );
    });

    it('should provide comprehensive analytics', async () => {
      const analytics = await memoryManager.getMemoryAnalytics();

      expect(analytics.totalMemories).toBe(4);
      expect(analytics.tierDistribution.core).toBe(2);
      expect(analytics.tierDistribution.longterm).toBe(2);
      expect(analytics.scopeDistribution.global).toBe(2);
      expect(analytics.scopeDistribution.project).toBe(2);
    });

    it('should calculate storage analytics correctly', async () => {
      const analytics = await memoryManager.getMemoryAnalytics();

      expect(analytics.storageAnalytics.totalSize).toBeGreaterThan(0);
      expect(analytics.storageAnalytics.averageSize).toBeGreaterThan(0);
      expect(analytics.storageAnalytics.coreTierUtilization).toBeGreaterThanOrEqual(0);
    });

    it('should track access patterns', async () => {
      // Access some memories to create patterns
      await memoryManager.search('memory', { limit: 5 });

      const analytics = await memoryManager.getMemoryAnalytics();

      expect(analytics.accessPatterns).toBeDefined();
      expect(analytics.accessPatterns.mostAccessed.length).toBeGreaterThanOrEqual(0);
      expect(analytics.accessPatterns.recentlyAccessed.length).toBeGreaterThanOrEqual(0);
      expect(analytics.accessPatterns.averageAccessCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide trend analysis', async () => {
      const analytics = await memoryManager.getMemoryAnalytics();

      expect(analytics.trends).toBeDefined();
      expect(analytics.trends.memoriesCreatedToday).toBeGreaterThanOrEqual(0);
      expect(analytics.trends.memoriesCreatedThisWeek).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analytics.trends.topTags)).toBe(true);
      expect(Array.isArray(analytics.trends.activeProjects)).toBe(true);
    });

    it('should identify popular tags', async () => {
      const analytics = await memoryManager.getMemoryAnalytics();

      const commonTag = analytics.trends.topTags.find(t => t.tag === 'common');
      expect(commonTag).toBeDefined();
      expect(commonTag?.count).toBe(3); // 'common' tag appears 3 times
    });

    it('should identify active projects', async () => {
      const analytics = await memoryManager.getMemoryAnalytics();

      expect(analytics.trends.activeProjects.length).toBeGreaterThanOrEqual(2);

      const project1 = analytics.trends.activeProjects.find(p => p.project === 'test-project-1');
      const project2 = analytics.trends.activeProjects.find(p => p.project === 'test-project-2');

      expect(project1).toBeDefined();
      expect(project2).toBeDefined();
      expect(project1?.memoryCount).toBe(1);
      expect(project2?.memoryCount).toBe(1);
    });
  });

  describe('Access Frequency Tracking', () => {
    it('should update access count when searching memories', async () => {
      // Store a test memory
      const memoryId = await memoryManager.store(
        'Memory for access tracking test',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['access', 'tracking']
      );

      // Search multiple times to increase access count
      await memoryManager.search('access tracking', { limit: 5 });
      await memoryManager.search('access tracking', { limit: 5 });
      await memoryManager.search('access tracking', { limit: 5 });

      // Get analytics and verify access patterns
      const analytics = await memoryManager.getMemoryAnalytics();

      expect(analytics.accessPatterns.averageAccessCount).toBeGreaterThan(0);
      expect(analytics.accessPatterns.mostAccessed.length).toBeGreaterThan(0);

      // The memory we created should have been accessed
      const accessedMemory = analytics.accessPatterns.mostAccessed.find(m => m.id === memoryId);
      if (accessedMemory) {
        expect(accessedMemory.access_count).toBeGreaterThan(0);
      }
    });

    it('should update accessed_at timestamp when memories are accessed', async () => {
      const memoryId = await memoryManager.store(
        'Memory for timestamp tracking',
        'core' as MemoryTier,
        'global' as MemoryScope
      );

      const initialTime = new Date();

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Access the memory
      await memoryManager.search('timestamp tracking', { limit: 5 });

      const analytics = await memoryManager.getMemoryAnalytics();
      const recentlyAccessed = analytics.accessPatterns.recentlyAccessed[0];

      if (recentlyAccessed && recentlyAccessed.id === memoryId) {
        expect(recentlyAccessed.accessed_at.getTime()).toBeGreaterThan(initialTime.getTime());
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in deleteMemory', async () => {
      // Close the database to simulate an error
      await memoryManager.close();

      await expect(memoryManager.deleteMemory('any-id', false))
        .rejects.toThrow();
    });

    it('should handle database errors gracefully in checkDuplicateMemory', async () => {
      // Close the database to simulate an error
      await memoryManager.close();

      await expect(memoryManager.checkDuplicateMemory('content'))
        .rejects.toThrow();
    });

    it('should handle database errors gracefully in migrateMemoryTier', async () => {
      // Close the database to simulate an error
      await memoryManager.close();

      await expect(memoryManager.migrateMemoryTier('any-id', 'longterm' as MemoryTier))
        .rejects.toThrow();
    });

    it('should handle database errors gracefully in getMemoryAnalytics', async () => {
      // Close the database to simulate an error
      await memoryManager.close();

      await expect(memoryManager.getMemoryAnalytics())
        .rejects.toThrow();
    });
  });

  describe('Integration with Existing Functionality', () => {
    it('should work seamlessly with existing store and search methods', async () => {
      // Use existing store method
      const memoryId = await memoryManager.store(
        'Integration test memory',
        'core' as MemoryTier,
        'global' as MemoryScope,
        undefined,
        ['integration', 'test']
      );

      // Use existing search method
      const searchResults = await memoryManager.search('integration test', { limit: 5 });
      expect(searchResults.length).toBeGreaterThan(0);

      // Use new delete method
      const deleteResult = await memoryManager.deleteMemory(memoryId, false);
      expect(deleteResult.deleted).toBe(true);

      // Verify memory is gone
      const postDeleteSearch = await memoryManager.search('integration test', { limit: 5 });
      expect(postDeleteSearch.length).toBe(0);
    });

    it('should maintain existing memory statistics compatibility', async () => {
      // Store some memories
      await memoryManager.store('Test 1', 'core' as MemoryTier, 'global' as MemoryScope);
      await memoryManager.store('Test 2', 'longterm' as MemoryTier, 'project' as MemoryScope, 'test-project');

      // Get existing stats
      const oldStats = await memoryManager.getMemoryStats();
      expect(oldStats).toBeDefined();
      expect(oldStats.storage_size_bytes).toBeGreaterThan(0);

      // Get new analytics
      const analytics = await memoryManager.getMemoryAnalytics();
      expect(analytics).toBeDefined();
      expect(analytics.totalMemories).toBe(2);
    });
  });
});