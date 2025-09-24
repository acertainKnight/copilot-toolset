/**
 * Comprehensive Unit Tests for Memory Tools
 * Tests the new MCP-decorated memory tools with Letta-style behaviors
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryTools } from '../../../src/tools/MemoryTools.js';
import { UnifiedMemoryManager } from '../../../src/memory/UnifiedMemoryManager.js';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import type { MemoryTier, MemoryScope, ToolExecutionContext } from '../../../src/types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock the memory managers
jest.mock('../../../src/memory/UnifiedMemoryManager.js');
jest.mock('../../../src/memory/MemoryManager.js');

describe('MemoryTools - MCP Tool Registration', () => {
  let memoryTools: MemoryTools;
  let mockUnifiedMemory: jest.Mocked<UnifiedMemoryManager>;
  let mockLegacyMemory: jest.Mocked<MemoryManager>;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockUnifiedMemory = new UnifiedMemoryManager() as jest.Mocked<UnifiedMemoryManager>;
    mockLegacyMemory = new MemoryManager() as jest.Mocked<MemoryManager>;

    // Create memory tools instance
    memoryTools = new MemoryTools();

    // Replace internal managers with mocks
    // @ts-ignore - Access private property for testing
    memoryTools.unifiedMemoryManager = mockUnifiedMemory;
    // @ts-ignore - Access private property for testing
    memoryTools.memoryManager = mockLegacyMemory;

    // Setup mock context
    mockContext = {
      workspacePath: '/test/workspace',
      timestamp: Date.now(),
      userId: 'test-user'
    };
  });

  describe('store_unified_memory', () => {
    describe('Core Tier Operations', () => {
      it('should store core memory with 2KB limit validation', async () => {
        const content = 'Critical user preference';
        const mockMemoryId = 'core_global_123456_abc123';

        mockUnifiedMemory.store.mockResolvedValue(mockMemoryId);

        const result = await memoryTools.storeUnifiedMemory({
          content,
          tier: 'core',
          scope: 'global',
          tags: ['preference', 'critical']
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith({
          content,
          tier: 'core',
          scope: 'global',
          project_id: undefined,
          tags: ['preference', 'critical'],
          metadata: {}
        });

        expect(result.content[0].text).toContain('Memory stored successfully');
        expect(result.content[0].text).toContain(mockMemoryId);
        expect(result.content[0].text).toContain('2KB limit, high priority');
        expect(result.isError).toBeUndefined();
      });

      it('should reject core memory exceeding 2KB', async () => {
        const largeContent = 'x'.repeat(2100); // Exceed 2KB
        const errorMessage = 'Core memory exceeds 2KB limit';

        mockUnifiedMemory.store.mockRejectedValue(new Error(errorMessage));

        const result = await memoryTools.storeUnifiedMemory({
          content: largeContent,
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(result.content[0].text).toContain('Failed to store memory');
        expect(result.content[0].text).toContain(errorMessage);
        expect(result.isError).toBe(true);
      });

      it('should handle core memory with project scope', async () => {
        const content = 'Project-specific core memory';
        const mockMemoryId = 'core_project_123456_xyz789';

        mockUnifiedMemory.store.mockResolvedValue(mockMemoryId);

        const result = await memoryTools.storeUnifiedMemory({
          content,
          tier: 'core',
          scope: 'project',
          project_id: '/custom/project'
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith({
          content,
          tier: 'core',
          scope: 'project',
          project_id: '/custom/project',
          tags: [],
          metadata: {}
        });

        expect(result.content[0].text).toContain('project-specific');
      });
    });

    describe('Long-term Tier Operations', () => {
      it('should store large content in long-term tier', async () => {
        const largeContent = JSON.stringify({ data: 'x'.repeat(10000) });
        const mockMemoryId = 'longterm_global_123456_def456';

        mockUnifiedMemory.store.mockResolvedValue(mockMemoryId);

        const result = await memoryTools.storeUnifiedMemory({
          content: largeContent,
          tier: 'longterm',
          scope: 'global',
          metadata: { size: 'large', type: 'json' }
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalled();
        expect(result.content[0].text).toContain('unlimited storage');
        expect(result.isError).toBeUndefined();
      });

      it('should handle structured metadata in long-term', async () => {
        const content = 'Research paper analysis';
        const metadata = {
          source: 'arxiv',
          paperID: '2401.12345',
          citations: 42,
          tags: ['LLM', 'memory systems']
        };

        mockUnifiedMemory.store.mockResolvedValue('longterm_project_123_abc');

        await memoryTools.storeUnifiedMemory({
          content,
          tier: 'longterm',
          scope: 'project',
          metadata
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata
          })
        );
      });
    });

    describe('Scope Management', () => {
      it('should use workspace context for project scope when no project_id provided', async () => {
        mockUnifiedMemory.store.mockResolvedValue('core_project_123_abc');

        await memoryTools.storeUnifiedMemory({
          content: 'Test content',
          tier: 'core',
          scope: 'project'
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({
            project_id: '/test/workspace'
          })
        );
      });

      it('should not set project_id for global scope', async () => {
        mockUnifiedMemory.store.mockResolvedValue('core_global_123_abc');

        await memoryTools.storeUnifiedMemory({
          content: 'Global content',
          tier: 'core',
          scope: 'global',
          project_id: 'should-be-ignored'
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({
            project_id: undefined
          })
        );
      });
    });
  });

  describe('search_unified_memory', () => {
    describe('Search Functionality', () => {
      it('should search across both tiers when specified', async () => {
        const mockResults = [
          {
            id: 'core_global_123',
            content: 'Core memory result',
            tier: 'core' as MemoryTier,
            scope: 'global' as MemoryScope,
            tags: ['test'],
            created_at: Date.now(),
            score: 0.95
          },
          {
            id: 'longterm_project_456',
            content: 'Long-term memory result',
            tier: 'longterm' as MemoryTier,
            scope: 'project' as MemoryScope,
            tags: ['test'],
            created_at: Date.now(),
            score: 0.87
          }
        ];

        mockUnifiedMemory.search.mockResolvedValue(mockResults);

        const result = await memoryTools.searchUnifiedMemory({
          query: 'test query',
          tier: 'both',
          scope: 'both',
          limit: 10
        }, mockContext);

        expect(mockUnifiedMemory.search).toHaveBeenCalledWith({
          query: 'test query',
          tier: undefined, // 'both' should translate to undefined
          scope: undefined, // 'both' should translate to undefined
          project_id: undefined,
          limit: 10
        });

        expect(result.content[0].text).toContain('Found 2 memory entries');
        expect(result.content[0].text).toContain('Core memory result');
        expect(result.content[0].text).toContain('Long-term memory result');
      });

      it('should filter by specific tier', async () => {
        mockUnifiedMemory.search.mockResolvedValue([]);

        await memoryTools.searchUnifiedMemory({
          query: 'specific search',
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(mockUnifiedMemory.search).toHaveBeenCalledWith(
          expect.objectContaining({
            tier: 'core',
            scope: 'global'
          })
        );
      });

      it('should handle empty search results gracefully', async () => {
        mockUnifiedMemory.search.mockResolvedValue([]);

        const result = await memoryTools.searchUnifiedMemory({
          query: 'non-existent'
        }, mockContext);

        expect(result.content[0].text).toContain('No memories found');
        expect(result.content[0].text).toContain('Try:');
        expect(result.content[0].text).toContain('Using different keywords');
      });

      it('should respect search limit parameter', async () => {
        const manyResults = Array.from({ length: 50 }, (_, i) => ({
          id: `memory_${i}`,
          content: `Result ${i}`,
          tier: 'core' as MemoryTier,
          scope: 'global' as MemoryScope,
          tags: [],
          created_at: Date.now(),
          score: 0.9 - i * 0.01
        }));

        mockUnifiedMemory.search.mockResolvedValue(manyResults.slice(0, 25));

        await memoryTools.searchUnifiedMemory({
          query: 'test',
          limit: 25
        }, mockContext);

        expect(mockUnifiedMemory.search).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 25
          })
        );
      });

      it('should display search scores and metadata', async () => {
        const mockResults = [{
          id: 'test_123',
          content: 'Test content',
          tier: 'core' as MemoryTier,
          scope: 'global' as MemoryScope,
          tags: ['tag1', 'tag2'],
          created_at: Date.now(),
          score: 0.923
        }];

        mockUnifiedMemory.search.mockResolvedValue(mockResults);

        const result = await memoryTools.searchUnifiedMemory({
          query: 'test'
        }, mockContext);

        expect(result.content[0].text).toContain('Score: 0.923');
        expect(result.content[0].text).toContain('Tags: tag1, tag2');
      });
    });

    describe('Error Handling', () => {
      it('should handle search errors gracefully', async () => {
        const errorMessage = 'Database connection failed';
        mockUnifiedMemory.search.mockRejectedValue(new Error(errorMessage));

        const result = await memoryTools.searchUnifiedMemory({
          query: 'test'
        }, mockContext);

        expect(result.content[0].text).toContain('Failed to search memory');
        expect(result.content[0].text).toContain(errorMessage);
        expect(result.isError).toBe(true);
      });
    });
  });

  describe('get_unified_memory_stats', () => {
    it('should retrieve and format comprehensive statistics', async () => {
      const mockStats = {
        total_memories: 150,
        core_memories: 50,
        longterm_memories: 100,
        global_memories: 80,
        project_memories: 70,
        total_size: 1048576, // 1 MB
        core_size: 102400, // 100 KB
        longterm_size: 946176,
        average_size: 6990,
        database_size: 2097152, // 2 MB
        last_cleanup: Date.now() - 86400000, // 1 day ago
        memories_created_today: 15,
        most_active_project: '/active/project',
        popular_tags: ['research', 'TODO', 'bug-fix', 'feature', 'documentation']
      };

      mockUnifiedMemory.getStats.mockResolvedValue(mockStats);

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      expect(result.content[0].text).toContain('Total Memories: 150');
      expect(result.content[0].text).toContain('Core Tier: 50 memories');
      expect(result.content[0].text).toContain('Long-term Tier: 100 memories');
      expect(result.content[0].text).toContain('Total Storage: 1 MB');
      expect(result.content[0].text).toContain('Database Size: 2 MB');
      expect(result.content[0].text).toContain('Most Active Project: /active/project');
      expect(result.content[0].text).toContain('Popular Tags: research, TODO, bug-fix, feature, documentation');
    });

    it('should display system health status', async () => {
      const healthyStats = {
        total_memories: 100,
        core_memories: 20,
        longterm_memories: 80,
        database_size: 10485760, // 10 MB
        global_memories: 50,
        project_memories: 50,
        total_size: 5242880,
        core_size: 40960,
        longterm_size: 5201920,
        average_size: 52428
      };

      mockUnifiedMemory.getStats.mockResolvedValue(healthyStats);

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      expect(result.content[0].text).toContain('System Health: 🟢 Healthy');
    });

    it('should warn about large database', async () => {
      const largeDbStats = {
        total_memories: 5000,
        database_size: 150 * 1024 * 1024, // 150 MB
        core_memories: 100,
        longterm_memories: 4900,
        global_memories: 2500,
        project_memories: 2500,
        total_size: 100000000,
        core_size: 200000,
        longterm_size: 99800000,
        average_size: 20000
      };

      mockUnifiedMemory.getStats.mockResolvedValue(largeDbStats);

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      expect(result.content[0].text).toContain('System Health: 🟡 Large Database');
    });

    it('should handle stats retrieval errors', async () => {
      mockUnifiedMemory.getStats.mockRejectedValue(new Error('Stats unavailable'));

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      expect(result.content[0].text).toContain('Failed to get memory statistics');
      expect(result.isError).toBe(true);
    });
  });

  describe('Legacy Memory Compatibility', () => {
    it('should support legacy memory storage with deprecation warning', async () => {
      const mockMemoryId = 'legacy_123456';
      mockLegacyMemory.store.mockResolvedValue(mockMemoryId);

      const result = await memoryTools.storeLegacyMemory({
        content: 'Legacy content',
        layer: 'preference',
        tags: ['legacy'],
        metadata: { deprecated: true }
      }, mockContext);

      expect(mockLegacyMemory.store).toHaveBeenCalledWith(
        'Legacy content',
        'preference',
        ['legacy'],
        { deprecated: true }
      );

      expect(result.content[0].text).toContain('Legacy memory stored successfully');
      expect(result.content[0].text).toContain(mockMemoryId);
      expect(result.content[0].text).toContain('Consider migrating to unified memory system');
    });

    it('should handle legacy storage errors', async () => {
      mockLegacyMemory.store.mockRejectedValue(new Error('Legacy storage failed'));

      const result = await memoryTools.storeLegacyMemory({
        content: 'Test',
        layer: 'system'
      }, mockContext);

      expect(result.content[0].text).toContain('Failed to store legacy memory');
      expect(result.isError).toBe(true);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle missing context gracefully', async () => {
      const emptyContext: ToolExecutionContext = {};
      mockUnifiedMemory.store.mockResolvedValue('test_id');

      await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'project'
      }, emptyContext);

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'default' // Should use default when no context
        })
      );
    });

    it('should handle very long tags arrays', async () => {
      const manyTags = Array.from({ length: 100 }, (_, i) => `tag_${i}`);
      mockUnifiedMemory.store.mockResolvedValue('test_id');

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'longterm',
        scope: 'global',
        tags: manyTags
      }, mockContext);

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: manyTags
        })
      );
    });

    it('should validate tier and scope enums', async () => {
      // TypeScript should catch invalid enums, but we test runtime behavior
      mockUnifiedMemory.store.mockResolvedValue('test_id');

      // Valid enums should work
      await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'global'
      }, mockContext);

      expect(mockUnifiedMemory.store).toHaveBeenCalled();
    });
  });

  describe('Formatting Helpers', () => {
    it('should format bytes correctly', async () => {
      const stats = {
        total_memories: 1,
        total_size: 0,
        core_size: 1024, // 1 KB
        longterm_size: 1048576, // 1 MB
        database_size: 1073741824, // 1 GB
        core_memories: 0,
        longterm_memories: 1,
        global_memories: 1,
        project_memories: 0,
        average_size: 0
      };

      mockUnifiedMemory.getStats.mockResolvedValue(stats);

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      expect(result.content[0].text).toContain('0 B'); // Zero bytes
      expect(result.content[0].text).toContain('1 KB'); // Core size
      expect(result.content[0].text).toContain('1 MB'); // Long-term size
      expect(result.content[0].text).toContain('1 GB'); // Database size
    });
  });
});

describe('MemoryTools - Concurrent Operations', () => {
  let memoryTools: MemoryTools;
  let mockUnifiedMemory: jest.Mocked<UnifiedMemoryManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnifiedMemory = new UnifiedMemoryManager() as jest.Mocked<UnifiedMemoryManager>;
    memoryTools = new MemoryTools();
    // @ts-ignore
    memoryTools.unifiedMemoryManager = mockUnifiedMemory;
  });

  it('should handle concurrent memory stores', async () => {
    const mockIds = ['id1', 'id2', 'id3'];
    let callIndex = 0;

    mockUnifiedMemory.store.mockImplementation(async () => {
      return mockIds[callIndex++];
    });

    const promises = [
      memoryTools.storeUnifiedMemory({
        content: 'Content 1',
        tier: 'core',
        scope: 'global'
      }, { workspacePath: '/test' }),
      memoryTools.storeUnifiedMemory({
        content: 'Content 2',
        tier: 'longterm',
        scope: 'project'
      }, { workspacePath: '/test' }),
      memoryTools.storeUnifiedMemory({
        content: 'Content 3',
        tier: 'core',
        scope: 'project'
      }, { workspacePath: '/test' })
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    expect(mockUnifiedMemory.store).toHaveBeenCalledTimes(3);
    results.forEach((result, index) => {
      expect(result.content[0].text).toContain(mockIds[index]);
    });
  });

  it('should handle concurrent searches', async () => {
    mockUnifiedMemory.search.mockResolvedValue([]);

    const promises = Array.from({ length: 10 }, (_, i) =>
      memoryTools.searchUnifiedMemory({
        query: `query ${i}`,
        tier: i % 2 === 0 ? 'core' : 'longterm'
      }, { workspacePath: '/test' })
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    expect(mockUnifiedMemory.search).toHaveBeenCalledTimes(10);
  });
});