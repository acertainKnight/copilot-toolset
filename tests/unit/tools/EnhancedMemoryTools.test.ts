/**
 * Enhanced Memory Tools Tests
 *
 * Tests for the new MCP tools:
 * - delete_memory
 * - check_duplicate_memory
 * - migrate_memory_tier
 * - get_memory_analytics
 */

import { MemoryTools } from '../../../src/tools/MemoryTools.js';
import { UnifiedMemoryManager } from '../../../src/memory/UnifiedMemoryManager.js';
import { MemoryTier, MemoryScope, ToolExecutionContext } from '../../../src/types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock the UnifiedMemoryManager
jest.mock('../../../src/memory/UnifiedMemoryManager.js');

describe('EnhancedMemoryTools', () => {
  let memoryTools: MemoryTools;
  let mockMemoryManager: jest.Mocked<UnifiedMemoryManager>;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    // Create mock context
    mockContext = {
      workspacePath: '/test/workspace',
      requestId: 'test-request-123',
      timestamp: new Date(),
      user: {
        id: 'test-user',
        permissions: ['DATABASE_READ', 'DATABASE_WRITE']
      }
    };

    // Create memory tools instance
    memoryTools = new MemoryTools();

    // Get the mocked memory manager instance
    mockMemoryManager = (memoryTools as any).unifiedMemoryManager as jest.Mocked<UnifiedMemoryManager>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('delete_memory tool', () => {
    it('should delete memory successfully without cascade', async () => {
      // Setup mock
      mockMemoryManager.deleteMemory.mockResolvedValue({
        deleted: true,
        relatedDeleted: 0,
        message: 'Successfully deleted memory'
      });

      // Execute tool
      const result = await memoryTools.deleteMemory({
        memory_id: 'test-memory-id',
        cascade_related: false
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Memory Deletion Successful');
      expect(result.content[0].text).toContain('test-memory-id');
      expect(result.isError).toBeUndefined();

      // Verify mock was called correctly
      expect(mockMemoryManager.deleteMemory).toHaveBeenCalledWith('test-memory-id', false);
    });

    it('should delete memory with cascade when enabled', async () => {
      // Setup mock
      mockMemoryManager.deleteMemory.mockResolvedValue({
        deleted: true,
        relatedDeleted: 3,
        message: 'Successfully deleted memory and 3 related memories'
      });

      // Execute tool
      const result = await memoryTools.deleteMemory({
        memory_id: 'test-memory-id',
        cascade_related: true
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Memory Deletion Successful');
      expect(result.content[0].text).toContain('Related memories deleted: 3');
      expect(result.isError).toBeUndefined();

      // Verify mock was called correctly
      expect(mockMemoryManager.deleteMemory).toHaveBeenCalledWith('test-memory-id', true);
    });

    it('should handle deletion failure gracefully', async () => {
      // Setup mock
      mockMemoryManager.deleteMemory.mockResolvedValue({
        deleted: false,
        message: 'Memory with ID test-memory-id not found'
      });

      // Execute tool
      const result = await memoryTools.deleteMemory({
        memory_id: 'test-memory-id',
        cascade_related: false
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Memory Deletion Failed');
      expect(result.content[0].text).toContain('not found');
      expect(result.isError).toBe(true);
    });

    it('should handle exceptions during deletion', async () => {
      // Setup mock to throw error
      mockMemoryManager.deleteMemory.mockRejectedValue(new Error('Database connection failed'));

      // Execute tool
      const result = await memoryTools.deleteMemory({
        memory_id: 'test-memory-id',
        cascade_related: false
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Failed to delete memory');
      expect(result.content[0].text).toContain('Database connection failed');
      expect(result.isError).toBe(true);
    });
  });

  describe('check_duplicate_memory tool', () => {
    it('should detect duplicates successfully', async () => {
      // Setup mock
      const mockDuplicates = [{
        memory: {
          id: 'duplicate-memory-id',
          content: 'Similar content found in existing memory',
          tier: 'core' as MemoryTier,
          scope: 'global' as MemoryScope,
          created_at: new Date(),
          accessed_at: new Date(),
          access_count: 5,
          content_size: 100,
          tags: ['test'],
          project_id: undefined
        },
        similarity_score: 0.85,
        match_type: 'semantic' as const,
        context: 'Test context'
      }];

      mockMemoryManager.checkDuplicateMemory.mockResolvedValue({
        isDuplicate: true,
        duplicates: mockDuplicates,
        recommendation: 'Similar memory found: "Similar content..." (0.850 similarity). Consider updating existing memory instead.'
      });

      // Execute tool
      const result = await memoryTools.checkDuplicateMemory({
        content: 'Test content for duplicate check',
        tier: 'core',
        scope: 'global',
        similarity_threshold: 0.8
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Potential Duplicate Content Detected');
      expect(result.content[0].text).toContain('Similar content found');
      expect(result.content[0].text).toContain('0.850');
      expect(result.isError).toBeUndefined();

      // Verify mock was called correctly
      expect(mockMemoryManager.checkDuplicateMemory).toHaveBeenCalledWith(
        'Test content for duplicate check',
        'core',
        'global',
        '/test/workspace',
        0.8
      );
    });

    it('should report no duplicates when none found', async () => {
      // Setup mock
      mockMemoryManager.checkDuplicateMemory.mockResolvedValue({
        isDuplicate: false,
        duplicates: [],
        recommendation: 'No duplicates found. Safe to store new memory.'
      });

      // Execute tool
      const result = await memoryTools.checkDuplicateMemory({
        content: 'Unique content that has no duplicates',
        similarity_threshold: 0.8
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('No Duplicates Found');
      expect(result.content[0].text).toContain('unique enough');
      expect(result.content[0].text).toContain('Similarity Threshold: 0.8');
      expect(result.isError).toBeUndefined();
    });

    it('should use default similarity threshold when not provided', async () => {
      // Setup mock
      mockMemoryManager.checkDuplicateMemory.mockResolvedValue({
        isDuplicate: false,
        duplicates: [],
        recommendation: 'No duplicates found.'
      });

      // Execute tool without similarity_threshold
      const result = await memoryTools.checkDuplicateMemory({
        content: 'Test content'
      }, mockContext);

      // Verify mock was called with default threshold
      expect(mockMemoryManager.checkDuplicateMemory).toHaveBeenCalledWith(
        'Test content',
        undefined,
        undefined,
        '/test/workspace',
        0.8 // Default threshold
      );
    });

    it('should handle exceptions during duplicate check', async () => {
      // Setup mock to throw error
      mockMemoryManager.checkDuplicateMemory.mockRejectedValue(new Error('Search index corrupted'));

      // Execute tool
      const result = await memoryTools.checkDuplicateMemory({
        content: 'Test content'
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Failed to check for duplicates');
      expect(result.content[0].text).toContain('Search index corrupted');
      expect(result.isError).toBe(true);
    });
  });

  describe('migrate_memory_tier tool', () => {
    it('should migrate memory tier successfully', async () => {
      // Setup mock
      mockMemoryManager.migrateMemoryTier.mockResolvedValue({
        migrated: true,
        fromTier: 'longterm' as MemoryTier,
        toTier: 'core' as MemoryTier,
        message: 'Successfully migrated memory from longterm to core tier'
      });

      // Execute tool
      const result = await memoryTools.migrateMemoryTier({
        memory_id: 'test-memory-id',
        target_tier: 'core',
        reason: 'High priority memory'
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Memory Tier Migration Successful');
      expect(result.content[0].text).toContain('From: longterm tier');
      expect(result.content[0].text).toContain('To: core tier');
      expect(result.content[0].text).toContain('High priority memory');
      expect(result.isError).toBeUndefined();

      // Verify mock was called correctly
      expect(mockMemoryManager.migrateMemoryTier).toHaveBeenCalledWith(
        'test-memory-id',
        'core',
        'High priority memory'
      );
    });

    it('should handle migration failure gracefully', async () => {
      // Setup mock
      mockMemoryManager.migrateMemoryTier.mockResolvedValue({
        migrated: false,
        fromTier: 'longterm' as MemoryTier,
        toTier: 'core' as MemoryTier,
        message: 'Cannot migrate to core tier: content size exceeds 2KB limit'
      });

      // Execute tool
      const result = await memoryTools.migrateMemoryTier({
        memory_id: 'test-memory-id',
        target_tier: 'core'
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Memory Tier Migration Failed');
      expect(result.content[0].text).toContain('exceeds 2KB limit');
      expect(result.isError).toBe(true);
    });

    it('should handle exceptions during migration', async () => {
      // Setup mock to throw error
      mockMemoryManager.migrateMemoryTier.mockRejectedValue(new Error('Database transaction failed'));

      // Execute tool
      const result = await memoryTools.migrateMemoryTier({
        memory_id: 'test-memory-id',
        target_tier: 'longterm'
      }, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Failed to migrate memory tier');
      expect(result.content[0].text).toContain('Database transaction failed');
      expect(result.isError).toBe(true);
    });
  });

  describe('get_memory_analytics tool', () => {
    it('should return comprehensive analytics successfully', async () => {
      // Setup mock analytics data
      const mockAnalytics = {
        totalMemories: 150,
        tierDistribution: { core: 25, longterm: 125 },
        scopeDistribution: { global: 100, project: 50 },
        accessPatterns: {
          mostAccessed: [],
          recentlyAccessed: [],
          leastAccessed: [],
          averageAccessCount: 5.2
        },
        storageAnalytics: {
          totalSize: 1024000, // 1MB
          averageSize: 6826, // ~6.8KB average
          coreTierUtilization: 0.45, // 45%
          longtermGrowthRate: 0.1
        },
        trends: {
          memoriesCreatedToday: 3,
          memoriesCreatedThisWeek: 15,
          topTags: [
            { tag: 'javascript', count: 25 },
            { tag: 'react', count: 20 },
            { tag: 'testing', count: 15 }
          ],
          activeProjects: [
            { project: 'web-app', memoryCount: 30 },
            { project: 'api-service', memoryCount: 20 }
          ]
        }
      };

      mockMemoryManager.getMemoryAnalytics.mockResolvedValue(mockAnalytics);

      // Execute tool
      const result = await memoryTools.getMemoryAnalytics({}, mockContext);

      // Verify result structure
      expect(result.content[0].text).toContain('Comprehensive Memory Analytics');
      expect(result.content[0].text).toContain('Total Memories: 150');
      expect(result.content[0].text).toContain('Core Tier: 25 memories');
      expect(result.content[0].text).toContain('Long-term Tier: 125 memories');
      expect(result.content[0].text).toContain('45.0% of limit');
      expect(result.content[0].text).toContain('Created Today: 3');
      expect(result.content[0].text).toContain('javascript (25)');
      expect(result.content[0].text).toContain('web-app (30)');
      expect(result.isError).toBeUndefined();
    });

    it('should handle empty analytics gracefully', async () => {
      // Setup mock with empty data
      const mockAnalytics = {
        totalMemories: 0,
        tierDistribution: { core: 0, longterm: 0 },
        scopeDistribution: { global: 0, project: 0 },
        accessPatterns: {
          mostAccessed: [],
          recentlyAccessed: [],
          leastAccessed: [],
          averageAccessCount: 0
        },
        storageAnalytics: {
          totalSize: 0,
          averageSize: 0,
          coreTierUtilization: 0,
          longtermGrowthRate: 0
        },
        trends: {
          memoriesCreatedToday: 0,
          memoriesCreatedThisWeek: 0,
          topTags: [],
          activeProjects: []
        }
      };

      mockMemoryManager.getMemoryAnalytics.mockResolvedValue(mockAnalytics);

      // Execute tool
      const result = await memoryTools.getMemoryAnalytics({}, mockContext);

      // Verify result handles empty data
      expect(result.content[0].text).toContain('Total Memories: 0');
      expect(result.content[0].text).toContain('Popular Tags: None');
      expect(result.content[0].text).toContain('Active Projects: None');
      expect(result.isError).toBeUndefined();
    });

    it('should include health warnings in analytics', async () => {
      // Setup mock with concerning metrics
      const mockAnalytics = {
        totalMemories: 100,
        tierDistribution: { core: 15, longterm: 85 },
        scopeDistribution: { global: 70, project: 30 },
        accessPatterns: {
          mostAccessed: [],
          recentlyAccessed: [],
          leastAccessed: new Array(35).fill({}), // 35% of memories never accessed
          averageAccessCount: 2.1
        },
        storageAnalytics: {
          totalSize: 5000000,
          averageSize: 50000,
          coreTierUtilization: 0.85, // 85% - should trigger warning
          longtermGrowthRate: 0.2
        },
        trends: {
          memoriesCreatedToday: 0, // Should trigger warning
          memoriesCreatedThisWeek: 5,
          topTags: [],
          activeProjects: []
        }
      };

      mockMemoryManager.getMemoryAnalytics.mockResolvedValue(mockAnalytics);

      // Execute tool
      const result = await memoryTools.getMemoryAnalytics({}, mockContext);

      // Should contain health warnings
      expect(result.content[0].text).toContain('🟡 Core tier approaching capacity limit');
      expect(result.content[0].text).toContain('🔵 No new memories created today');
    });

    it('should handle exceptions during analytics retrieval', async () => {
      // Setup mock to throw error
      mockMemoryManager.getMemoryAnalytics.mockRejectedValue(new Error('Analytics database error'));

      // Execute tool
      const result = await memoryTools.getMemoryAnalytics({}, mockContext);

      // Verify result
      expect(result.content[0].text).toContain('Failed to get memory analytics');
      expect(result.content[0].text).toContain('Analytics database error');
      expect(result.isError).toBe(true);
    });
  });

  describe('Tool Integration', () => {
    it('should maintain consistent error handling across all tools', async () => {
      const tools = [
        () => memoryTools.deleteMemory({ memory_id: 'test' }, mockContext),
        () => memoryTools.checkDuplicateMemory({ content: 'test' }, mockContext),
        () => memoryTools.migrateMemoryTier({ memory_id: 'test', target_tier: 'core' }, mockContext),
        () => memoryTools.getMemoryAnalytics({}, mockContext)
      ];

      // Setup all mocks to throw the same error
      const error = new Error('Consistent error handling test');
      mockMemoryManager.deleteMemory.mockRejectedValue(error);
      mockMemoryManager.checkDuplicateMemory.mockRejectedValue(error);
      mockMemoryManager.migrateMemoryTier.mockRejectedValue(error);
      mockMemoryManager.getMemoryAnalytics.mockRejectedValue(error);

      // Execute all tools
      const results = await Promise.all(tools.map(tool => tool()));

      // Verify all have consistent error handling
      results.forEach(result => {
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Consistent error handling test');
      });
    });

    it('should work with different context configurations', async () => {
      // Test with minimal context
      const minimalContext: ToolExecutionContext = {
        timestamp: new Date()
      };

      mockMemoryManager.checkDuplicateMemory.mockResolvedValue({
        isDuplicate: false,
        duplicates: [],
        recommendation: 'No duplicates found.'
      });

      // Should still work without workspace path
      const result = await memoryTools.checkDuplicateMemory({
        content: 'Test content'
      }, minimalContext);

      expect(result.isError).toBeUndefined();

      // Verify the call used undefined for workspace
      expect(mockMemoryManager.checkDuplicateMemory).toHaveBeenCalledWith(
        'Test content',
        undefined,
        undefined,
        undefined, // No workspace path
        0.8
      );
    });
  });
});