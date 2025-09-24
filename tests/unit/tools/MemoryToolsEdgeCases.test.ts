/**
 * Edge Case Tests for Memory Tools
 * Tests boundary conditions, error handling, and unusual scenarios
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryTools } from '../../../src/tools/MemoryTools.js';
import { UnifiedMemoryManager } from '../../../src/memory/UnifiedMemoryManager.js';
import type { MemoryTier, MemoryScope, ToolExecutionContext } from '../../../src/types/index.js';

// Mock the memory managers
jest.mock('../../../src/memory/UnifiedMemoryManager.js');
jest.mock('../../../src/memory/MemoryManager.js');

describe('MemoryTools Edge Cases', () => {
  let memoryTools: MemoryTools;
  let mockUnifiedMemory: jest.Mocked<UnifiedMemoryManager>;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUnifiedMemory = new UnifiedMemoryManager() as jest.Mocked<UnifiedMemoryManager>;
    memoryTools = new MemoryTools();

    // @ts-ignore
    memoryTools.unifiedMemoryManager = mockUnifiedMemory;

    mockContext = {
      workspacePath: '/test/workspace',
      timestamp: Date.now()
    };
  });

  describe('Boundary Conditions', () => {
    describe('Content Size Boundaries', () => {
      it('should handle exactly 2KB content in core tier', async () => {
        // Exactly 2048 bytes (2KB)
        const exactContent = 'x'.repeat(2048);
        mockUnifiedMemory.store.mockResolvedValue('core_exact_2kb');

        const result = await memoryTools.storeUnifiedMemory({
          content: exactContent,
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();
      });

      it('should handle 2KB + 1 byte content rejection in core tier', async () => {
        const oversizeContent = 'x'.repeat(2049);
        mockUnifiedMemory.store.mockRejectedValue(
          new Error('Core memory exceeds 2KB limit (2049 bytes)')
        );

        const result = await memoryTools.storeUnifiedMemory({
          content: oversizeContent,
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('exceeds 2KB limit');
      });

      it('should handle empty content gracefully', async () => {
        mockUnifiedMemory.store.mockRejectedValue(
          new Error('Content cannot be empty')
        );

        const result = await memoryTools.storeUnifiedMemory({
          content: '',
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Content cannot be empty');
      });

      it('should handle single character content', async () => {
        mockUnifiedMemory.store.mockResolvedValue('single_char_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: 'a',
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(result.isError).toBeUndefined();
        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({ content: 'a' })
        );
      });

      it('should handle extremely large long-term content', async () => {
        // 10MB content
        const hugeContent = 'x'.repeat(10 * 1024 * 1024);
        mockUnifiedMemory.store.mockResolvedValue('huge_content_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: hugeContent,
          tier: 'longterm',
          scope: 'global'
        }, mockContext);

        expect(result.isError).toBeUndefined();
      });
    });

    describe('Special Characters and Encoding', () => {
      it('should handle Unicode content correctly', async () => {
        const unicodeContent = '🚀 Testing émojis 中文 العربية हिन्दी 🔥';
        mockUnifiedMemory.store.mockResolvedValue('unicode_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: unicodeContent,
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({ content: unicodeContent })
        );
        expect(result.isError).toBeUndefined();
      });

      it('should handle SQL injection attempts safely', async () => {
        const sqlContent = "'; DROP TABLE memories; --";
        mockUnifiedMemory.store.mockResolvedValue('sql_safe_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: sqlContent,
          tier: 'core',
          scope: 'global',
          tags: ["'; DROP TABLE", 'test']
        }, mockContext);

        expect(result.isError).toBeUndefined();
        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({
            content: sqlContent,
            tags: ["'; DROP TABLE", 'test']
          })
        );
      });

      it('should handle JSON strings with nested quotes', async () => {
        const jsonContent = JSON.stringify({
          message: "He said \"Hello\" and then 'Goodbye'",
          data: { nested: "More \"quotes\" here" }
        });
        mockUnifiedMemory.store.mockResolvedValue('json_quotes_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: jsonContent,
          tier: 'longterm',
          scope: 'project'
        }, mockContext);

        expect(result.isError).toBeUndefined();
      });

      it('should handle null bytes in content', async () => {
        const contentWithNull = 'Before\0After';
        mockUnifiedMemory.store.mockRejectedValue(
          new Error('Content contains null bytes')
        );

        const result = await memoryTools.storeUnifiedMemory({
          content: contentWithNull,
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(result.isError).toBe(true);
      });

      it('should handle multiline content with various line endings', async () => {
        const multilineContent = 'Line1\nLine2\r\nLine3\rLine4';
        mockUnifiedMemory.store.mockResolvedValue('multiline_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: multilineContent,
          tier: 'core',
          scope: 'global'
        }, mockContext);

        expect(result.isError).toBeUndefined();
      });
    });

    describe('Tag and Metadata Edge Cases', () => {
      it('should handle empty tags array', async () => {
        mockUnifiedMemory.store.mockResolvedValue('no_tags_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: 'Content without tags',
          tier: 'core',
          scope: 'global',
          tags: []
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({ tags: [] })
        );
        expect(result.isError).toBeUndefined();
      });

      it('should handle duplicate tags', async () => {
        mockUnifiedMemory.store.mockResolvedValue('dup_tags_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: 'Content with duplicate tags',
          tier: 'core',
          scope: 'global',
          tags: ['tag1', 'tag1', 'tag2', 'tag1']
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['tag1', 'tag1', 'tag2', 'tag1'] // Should pass as-is
          })
        );
      });

      it('should handle very long tag names', async () => {
        const longTag = 'x'.repeat(500);
        mockUnifiedMemory.store.mockResolvedValue('long_tag_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: 'Content with long tag',
          tier: 'longterm',
          scope: 'global',
          tags: [longTag, 'normal-tag']
        }, mockContext);

        expect(result.isError).toBeUndefined();
      });

      it('should handle hundreds of tags', async () => {
        const manyTags = Array.from({ length: 500 }, (_, i) => `tag_${i}`);
        mockUnifiedMemory.store.mockResolvedValue('many_tags_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: 'Content with many tags',
          tier: 'longterm',
          scope: 'global',
          tags: manyTags
        }, mockContext);

        expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
          expect.objectContaining({ tags: manyTags })
        );
      });

      it('should handle complex metadata structures', async () => {
        const complexMetadata = {
          nested: {
            deeply: {
              nested: {
                value: 'deep'
              }
            }
          },
          array: [1, 2, { key: 'value' }],
          nullValue: null,
          undefinedValue: undefined,
          boolean: true,
          number: 3.14159,
          bigNumber: Number.MAX_SAFE_INTEGER
        };

        mockUnifiedMemory.store.mockResolvedValue('complex_meta_id');

        const result = await memoryTools.storeUnifiedMemory({
          content: 'Content with complex metadata',
          tier: 'longterm',
          scope: 'project',
          metadata: complexMetadata
        }, mockContext);

        expect(result.isError).toBeUndefined();
      });

      it('should handle circular reference in metadata', async () => {
        const circular: any = { a: 1 };
        circular.self = circular;

        // Should handle or reject gracefully
        const result = await memoryTools.storeUnifiedMemory({
          content: 'Content with circular metadata',
          tier: 'longterm',
          scope: 'global',
          metadata: circular
        }, mockContext);

        // Either succeeds with serialization or fails with clear error
        expect(result).toBeDefined();
      });
    });
  });

  describe('Search Edge Cases', () => {
    it('should handle empty search results', async () => {
      mockUnifiedMemory.search.mockResolvedValue([]);

      const result = await memoryTools.searchUnifiedMemory({
        query: 'nonexistent query that matches nothing'
      }, mockContext);

      expect(result.content[0].text).toContain('No memories found');
      expect(result.content[0].text).toContain('Try:');
      expect(result.isError).toBeUndefined();
    });

    it('should handle search with special regex characters', async () => {
      mockUnifiedMemory.search.mockResolvedValue([]);

      const result = await memoryTools.searchUnifiedMemory({
        query: '.*[]{}()+?^$|\\',
        tier: 'both',
        scope: 'both'
      }, mockContext);

      expect(mockUnifiedMemory.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '.*[]{}()+?^$|\\'
        })
      );
    });

    it('should handle search with exactly limit results', async () => {
      const exactResults = Array.from({ length: 10 }, (_, i) => ({
        id: `result_${i}`,
        content: `Result ${i}`,
        tier: 'core' as MemoryTier,
        scope: 'global' as MemoryScope,
        tags: [],
        created_at: Date.now(),
        score: 0.9 - i * 0.01
      }));

      mockUnifiedMemory.search.mockResolvedValue(exactResults);

      const result = await memoryTools.searchUnifiedMemory({
        query: 'test',
        limit: 10
      }, mockContext);

      expect(result.content[0].text).toContain('Found 10 memory entries');
    });

    it('should handle search with limit exceeding max', async () => {
      mockUnifiedMemory.search.mockResolvedValue([]);

      await memoryTools.searchUnifiedMemory({
        query: 'test',
        limit: 1000 // Exceeds max of 50
      }, mockContext);

      // Should clamp or handle gracefully
      expect(mockUnifiedMemory.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 1000 // Tool might pass through, manager should handle
        })
      );
    });

    it('should handle search with negative limit', async () => {
      mockUnifiedMemory.search.mockResolvedValue([]);

      await memoryTools.searchUnifiedMemory({
        query: 'test',
        limit: -5
      }, mockContext);

      // Should use default or handle gracefully
      expect(mockUnifiedMemory.search).toHaveBeenCalled();
    });

    it('should handle search with undefined tier/scope conversion', async () => {
      mockUnifiedMemory.search.mockResolvedValue([]);

      await memoryTools.searchUnifiedMemory({
        query: 'test',
        tier: 'both',
        scope: 'both'
      }, mockContext);

      // 'both' should convert to undefined for searching all
      expect(mockUnifiedMemory.search).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: undefined,
          scope: undefined
        })
      );
    });

    it('should handle results with missing optional fields', async () => {
      const minimalResults = [{
        id: 'minimal_id',
        content: 'Minimal content',
        tier: 'core' as MemoryTier,
        scope: 'global' as MemoryScope,
        tags: [],
        created_at: Date.now()
        // No score field
      }];

      mockUnifiedMemory.search.mockResolvedValue(minimalResults);

      const result = await memoryTools.searchUnifiedMemory({
        query: 'minimal'
      }, mockContext);

      expect(result.content[0].text).toContain('Score: N/A');
    });
  });

  describe('Context Edge Cases', () => {
    it('should handle completely empty context', async () => {
      mockUnifiedMemory.store.mockResolvedValue('empty_context_id');

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'project'
      }, {}); // Empty context

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'default'
        })
      );
    });

    it('should handle null context', async () => {
      mockUnifiedMemory.store.mockResolvedValue('null_context_id');

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'project'
      }, null as any);

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle undefined workspace in context', async () => {
      mockUnifiedMemory.store.mockResolvedValue('no_workspace_id');

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'project'
      }, { timestamp: Date.now() }); // No workspacePath

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'default'
        })
      );
    });

    it('should handle very long workspace paths', async () => {
      const longPath = '/very/long/path/' + 'subdir/'.repeat(100) + 'workspace';
      mockUnifiedMemory.store.mockResolvedValue('long_path_id');

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'project'
      }, { workspacePath: longPath });

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: longPath
        })
      );
    });

    it('should handle special characters in workspace path', async () => {
      const specialPath = '/path with spaces/and-special@chars!/workspace';
      mockUnifiedMemory.store.mockResolvedValue('special_path_id');

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'project'
      }, { workspacePath: specialPath });

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: specialPath
        })
      );
    });
  });

  describe('Stats Edge Cases', () => {
    it('should handle stats with zero memories', async () => {
      const emptyStats = {
        total_memories: 0,
        core_memories: 0,
        longterm_memories: 0,
        global_memories: 0,
        project_memories: 0,
        total_size: 0,
        core_size: 0,
        longterm_size: 0,
        average_size: 0,
        database_size: 1024 // Database itself has overhead
      };

      mockUnifiedMemory.getStats.mockResolvedValue(emptyStats);

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      expect(result.content[0].text).toContain('Total Memories: 0');
      expect(result.content[0].text).toContain('System Health: 🟡 Empty');
    });

    it('should handle stats with missing optional fields', async () => {
      const minimalStats = {
        total_memories: 100,
        core_memories: 50,
        longterm_memories: 50,
        global_memories: 60,
        project_memories: 40,
        total_size: 50000,
        core_size: 10000,
        longterm_size: 40000,
        average_size: 500,
        database_size: 100000
        // Missing: last_cleanup, memories_created_today, most_active_project, popular_tags
      };

      mockUnifiedMemory.getStats.mockResolvedValue(minimalStats);

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      expect(result.content[0].text).toContain('Last Cleanup: Never');
      expect(result.content[0].text).toContain('Memories Created Today: 0');
      expect(result.content[0].text).toContain('Most Active Project: None');
      expect(result.content[0].text).toContain('Popular Tags: None');
    });

    it('should handle extremely large statistics', async () => {
      const hugeStats = {
        total_memories: Number.MAX_SAFE_INTEGER,
        core_memories: 1000000,
        longterm_memories: Number.MAX_SAFE_INTEGER - 1000000,
        global_memories: Number.MAX_SAFE_INTEGER / 2,
        project_memories: Number.MAX_SAFE_INTEGER / 2,
        total_size: Number.MAX_SAFE_INTEGER,
        core_size: 1073741824, // 1GB
        longterm_size: Number.MAX_SAFE_INTEGER - 1073741824,
        average_size: 1024,
        database_size: Number.MAX_SAFE_INTEGER
      };

      mockUnifiedMemory.getStats.mockResolvedValue(hugeStats);

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      // Should handle large numbers without crashing
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Total Memories:');
    });

    it('should handle NaN and Infinity in stats', async () => {
      const invalidStats = {
        total_memories: 100,
        core_memories: 50,
        longterm_memories: 50,
        global_memories: 60,
        project_memories: 40,
        total_size: NaN,
        core_size: Infinity,
        longterm_size: -Infinity,
        average_size: 0 / 0, // NaN
        database_size: 100000
      };

      mockUnifiedMemory.getStats.mockResolvedValue(invalidStats);

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      // Should handle invalid numbers gracefully
      expect(result.content[0].text).toBeDefined();
    });
  });

  describe('Concurrent Operation Edge Cases', () => {
    it('should handle simultaneous stores to same tier/scope', async () => {
      let callCount = 0;
      mockUnifiedMemory.store.mockImplementation(async () => {
        callCount++;
        // Simulate slight processing delay
        await new Promise(resolve => setTimeout(resolve, 1));
        return `concurrent_${callCount}`;
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        memoryTools.storeUnifiedMemory({
          content: `Concurrent content ${i}`,
          tier: 'core',
          scope: 'global'
        }, mockContext)
      );

      const results = await Promise.all(promises);

      expect(callCount).toBe(10);
      results.forEach((result, index) => {
        expect(result.isError).toBeUndefined();
      });
    });

    it('should handle store during search operation', async () => {
      // Setup search to take some time
      mockUnifiedMemory.search.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return [];
      });

      mockUnifiedMemory.store.mockResolvedValue('concurrent_store_id');

      // Start search
      const searchPromise = memoryTools.searchUnifiedMemory({
        query: 'test'
      }, mockContext);

      // Start store during search
      const storePromise = memoryTools.storeUnifiedMemory({
        content: 'Stored during search',
        tier: 'core',
        scope: 'global'
      }, mockContext);

      const [searchResult, storeResult] = await Promise.all([
        searchPromise,
        storePromise
      ]);

      expect(searchResult.isError).toBeUndefined();
      expect(storeResult.isError).toBeUndefined();
    });
  });

  describe('Error Recovery Edge Cases', () => {
    it('should handle database lock errors', async () => {
      mockUnifiedMemory.store.mockRejectedValue(
        new Error('SQLITE_BUSY: database is locked')
      );

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test during lock',
        tier: 'core',
        scope: 'global'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('database is locked');
    });

    it('should handle out of memory errors', async () => {
      mockUnifiedMemory.store.mockRejectedValue(
        new Error('SQLITE_NOMEM: out of memory')
      );

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'longterm',
        scope: 'global'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('out of memory');
    });

    it('should handle corrupted database errors', async () => {
      mockUnifiedMemory.getStats.mockRejectedValue(
        new Error('SQLITE_CORRUPT: database disk image is malformed')
      );

      const result = await memoryTools.getUnifiedMemoryStats({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('database disk image is malformed');
    });

    it('should handle network/IO errors', async () => {
      mockUnifiedMemory.search.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      const result = await memoryTools.searchUnifiedMemory({
        query: 'test'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('no such file or directory');
    });

    it('should handle undefined error objects', async () => {
      mockUnifiedMemory.store.mockRejectedValue(undefined);

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'global'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error');
    });

    it('should handle non-Error objects thrown', async () => {
      mockUnifiedMemory.store.mockRejectedValue('String error');

      const result = await memoryTools.storeUnifiedMemory({
        content: 'Test',
        tier: 'core',
        scope: 'global'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error');
    });
  });

  describe('Migration and Compatibility Edge Cases', () => {
    it('should handle legacy memory with missing fields', async () => {
      // @ts-ignore
      memoryTools.memoryManager = {
        store: jest.fn().mockResolvedValue('legacy_id')
      };

      const result = await memoryTools.storeLegacyMemory({
        content: 'Legacy content',
        layer: 'preference'
        // Missing tags and metadata
      }, mockContext);

      expect(result.isError).toBeUndefined();
      // @ts-ignore
      expect(memoryTools.memoryManager.store).toHaveBeenCalledWith(
        'Legacy content',
        'preference',
        [], // Default empty tags
        undefined // No metadata
      );
    });

    it('should handle mixed tier/scope searches', async () => {
      const mixedResults = [
        {
          id: 'core_global',
          content: 'Core global',
          tier: 'core' as MemoryTier,
          scope: 'global' as MemoryScope,
          tags: [],
          created_at: Date.now()
        },
        {
          id: 'longterm_project',
          content: 'Long-term project',
          tier: 'longterm' as MemoryTier,
          scope: 'project' as MemoryScope,
          tags: [],
          created_at: Date.now(),
          project_id: '/test/project'
        }
      ];

      mockUnifiedMemory.search.mockResolvedValue(mixedResults);

      const result = await memoryTools.searchUnifiedMemory({
        query: 'test',
        tier: 'both',
        scope: 'both'
      }, mockContext);

      expect(result.content[0].text).toContain('core/global');
      expect(result.content[0].text).toContain('longterm/project');
    });
  });
});