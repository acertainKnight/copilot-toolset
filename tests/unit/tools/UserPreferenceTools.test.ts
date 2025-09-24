/**
 * Comprehensive Unit Tests for User Preference and Context Curation Tools
 * Tests new MCP tools for preference management and context assembly
 *
 * @module UserPreferenceTools.test
 * @description Tests get_user_preferences, extract_coding_preferences, and curate_context tools
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryTools } from '../../../src/tools/MemoryTools.js';
import { UnifiedMemoryManager } from '../../../src/memory/UnifiedMemoryManager.js';
import type {
  ToolExecutionContext,
  MemoryTier,
  MemoryScope,
  UnifiedMemory,
  UnifiedMemorySearchResult
} from '../../../src/types/index.js';

// Mock dependencies
jest.mock('../../../src/memory/UnifiedMemoryManager.js');

describe('User Preference Tools', () => {
  let memoryTools: MemoryTools;
  let mockUnifiedMemory: jest.Mocked<UnifiedMemoryManager>;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUnifiedMemory = new UnifiedMemoryManager() as jest.Mocked<UnifiedMemoryManager>;
    memoryTools = new MemoryTools();

    // @ts-ignore - Access private property for testing
    memoryTools.unifiedMemoryManager = mockUnifiedMemory;

    mockContext = {
      workspacePath: '/test/workspace',
      timestamp: Date.now(),
      userId: 'test-user'
    };
  });

  describe('get_user_preferences', () => {
    it('should retrieve preferences from core tier with specified category', async () => {
      const mockPreferences: UnifiedMemorySearchResult[] = [
        {
          id: 'pref_001',
          content: 'User prefers TypeScript over JavaScript',
          tier: 'core',
          scope: 'global',
          tags: ['preference', 'coding', 'language'],
          metadata: { category: 'language' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          importance_score: 0.9
        },
        {
          id: 'pref_002',
          content: 'Prefers 2-space indentation',
          tier: 'core',
          scope: 'global',
          tags: ['preference', 'coding', 'formatting'],
          metadata: { category: 'formatting' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          importance_score: 0.7
        }
      ];

      mockUnifiedMemory.search.mockResolvedValue(mockPreferences);

      const result = await memoryTools.getUserPreferences({
        category: 'coding'
      }, mockContext);

      expect(mockUnifiedMemory.search).toHaveBeenCalledWith({
        tier: 'core',
        scope: 'global',
        tags: ['preference', 'coding'],
        limit: 50
      });

      expect(result.content[0].text).toContain('TypeScript over JavaScript');
      expect(result.content[0].text).toContain('2-space indentation');
      expect(result.isError).toBeUndefined();
    });

    it('should handle empty preference storage gracefully', async () => {
      mockUnifiedMemory.search.mockResolvedValue([]);

      const result = await memoryTools.getUserPreferences({
        category: 'ui'
      }, mockContext);

      expect(result.content[0].text).toContain('No preferences found');
      expect(result.content[0].text).toContain('category: ui');
      expect(result.isError).toBeUndefined();
    });

    it('should retrieve all preferences when no category specified', async () => {
      const allPreferences: UnifiedMemorySearchResult[] = [
        {
          id: 'pref_all_001',
          content: 'Dark theme preferred',
          tier: 'core',
          scope: 'global',
          tags: ['preference', 'ui'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          importance_score: 0.8
        }
      ];

      mockUnifiedMemory.search.mockResolvedValue(allPreferences);

      const result = await memoryTools.getUserPreferences({}, mockContext);

      expect(mockUnifiedMemory.search).toHaveBeenCalledWith({
        tier: 'core',
        scope: 'global',
        tags: ['preference'],
        limit: 50
      });

      expect(result.content[0].text).toContain('Dark theme preferred');
    });

    it('should handle malformed preference data', async () => {
      const malformedPreferences = [
        {
          id: 'bad_pref',
          content: null as any, // Malformed content
          tier: 'core' as MemoryTier,
          scope: 'global' as MemoryScope,
          tags: ['preference'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockUnifiedMemory.search.mockResolvedValue(malformedPreferences);

      const result = await memoryTools.getUserPreferences({
        category: 'coding'
      }, mockContext);

      expect(result.content[0].text).toContain('Warning: Skipped malformed preference');
      expect(result.isError).toBeUndefined();
    });

    it('should respect preference importance scores', async () => {
      const sortedPreferences: UnifiedMemorySearchResult[] = [
        {
          id: 'high_importance',
          content: 'Critical preference',
          tier: 'core',
          scope: 'global',
          tags: ['preference'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          importance_score: 1.0
        },
        {
          id: 'low_importance',
          content: 'Minor preference',
          tier: 'core',
          scope: 'global',
          tags: ['preference'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          importance_score: 0.3
        }
      ];

      mockUnifiedMemory.search.mockResolvedValue(sortedPreferences);

      const result = await memoryTools.getUserPreferences({
        sortByImportance: true
      }, mockContext);

      expect(result.content[0].text).toMatch(/Critical preference.*Minor preference/s);
    });
  });

  describe('extract_coding_preferences', () => {
    it('should extract TypeScript preferences from code patterns', async () => {
      const codeContent = `
        interface UserProfile {
          name: string;
          age: number;
        }

        const getUserData = async (): Promise<UserProfile> => {
          // Async arrow function with type annotations
          return { name: 'test', age: 25 };
        };
      `;

      const mockStoreResult = 'pref_ts_001';
      mockUnifiedMemory.store.mockResolvedValue(mockStoreResult);

      const result = await memoryTools.extractCodingPreferences({
        content: codeContent,
        language: 'typescript'
      }, mockContext);

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'core',
          scope: 'global',
          tags: expect.arrayContaining(['preference', 'coding', 'typescript'])
        })
      );

      expect(result.content[0].text).toContain('TypeScript preferences extracted');
      expect(result.content[0].text).toContain('interfaces');
      expect(result.content[0].text).toContain('async/await');
      expect(result.content[0].text).toContain('arrow functions');
    });

    it('should extract Python preferences from docstrings and typing', async () => {
      const pythonCode = `
        from typing import List, Optional

        def process_data(items: List[str], limit: Optional[int] = None) -> dict:
            """
            Process data items with optional limit.

            Args:
                items: List of items to process
                limit: Optional processing limit

            Returns:
                Processed results as dictionary
            """
            return {'count': len(items[:limit])}
      `;

      mockUnifiedMemory.store.mockResolvedValue('pref_py_001');

      const result = await memoryTools.extractCodingPreferences({
        content: pythonCode,
        language: 'python'
      }, mockContext);

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('type hints'),
          tags: expect.arrayContaining(['preference', 'coding', 'python'])
        })
      );

      expect(result.content[0].text).toContain('Python preferences extracted');
      expect(result.content[0].text).toContain('type hints');
      expect(result.content[0].text).toContain('docstrings');
    });

    it('should handle multi-language preference extraction', async () => {
      const mixedContent = `
        // JavaScript with JSDoc
        /**
         * @param {string} name
         * @returns {Promise<User>}
         */
        async function getUser(name) {
          return await db.findUser(name);
        }
      `;

      mockUnifiedMemory.store.mockResolvedValue('pref_js_001');

      const result = await memoryTools.extractCodingPreferences({
        content: mixedContent,
        language: 'javascript'
      }, mockContext);

      expect(result.content[0].text).toContain('JSDoc');
      expect(result.content[0].text).toContain('async/await');
    });

    it('should detect formatting preferences', async () => {
      const formattedCode = `
        const config = {
          indent: 2,
          useTabs: false,
          semicolons: true,
          quotes: 'single'
        };
      `;

      mockUnifiedMemory.store.mockResolvedValue('pref_fmt_001');

      const result = await memoryTools.extractCodingPreferences({
        content: formattedCode,
        detectFormatting: true
      }, mockContext);

      expect(mockUnifiedMemory.store).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            formatting: {
              indentSize: 2,
              useTabs: false,
              semicolons: true,
              quotes: 'single'
            }
          })
        })
      );

      expect(result.content[0].text).toContain('2-space indentation');
      expect(result.content[0].text).toContain('semicolons');
    });

    it('should handle large code files efficiently', async () => {
      const largeCode = 'function test() { return true; }\n'.repeat(1000);
      const startTime = Date.now();

      mockUnifiedMemory.store.mockResolvedValue('pref_perf_001');

      const result = await memoryTools.extractCodingPreferences({
        content: largeCode,
        language: 'javascript'
      }, mockContext);

      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(100); // Should process in <100ms
      expect(result.content[0].text).toContain('preferences extracted');
    });
  });

  describe('curate_context', () => {
    it('should assemble comprehensive context from multiple sources', async () => {
      const mockPreferences: UnifiedMemorySearchResult[] = [
        {
          id: 'pref_ctx_001',
          content: 'Prefers functional programming',
          tier: 'core',
          scope: 'global',
          tags: ['preference'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          importance_score: 0.9
        }
      ];

      const mockProjectMemory: UnifiedMemorySearchResult[] = [
        {
          id: 'proj_ctx_001',
          content: 'Project uses React with TypeScript',
          tier: 'long_term',
          scope: 'project',
          project_id: 'test-project',
          tags: ['project', 'context'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const mockPatterns: UnifiedMemorySearchResult[] = [
        {
          id: 'pattern_001',
          content: 'Common error: undefined is not a function',
          tier: 'long_term',
          scope: 'global',
          tags: ['pattern', 'error'],
          metadata: { frequency: 5 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockUnifiedMemory.search
        .mockResolvedValueOnce(mockPreferences)
        .mockResolvedValueOnce(mockProjectMemory)
        .mockResolvedValueOnce(mockPatterns);

      const result = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        includePatterns: true,
        maxTokens: 4000
      }, mockContext);

      expect(mockUnifiedMemory.search).toHaveBeenCalledTimes(3);

      expect(result.content[0].text).toContain('Curated Context');
      expect(result.content[0].text).toContain('functional programming');
      expect(result.content[0].text).toContain('React with TypeScript');
      expect(result.content[0].text).toContain('Common error');
      expect(result.metadata?.tokenCount).toBeLessThanOrEqual(4000);
    });

    it('should respect token limits when curating context', async () => {
      const largeMemories: UnifiedMemorySearchResult[] = Array.from({ length: 100 }, (_, i) => ({
        id: `mem_${i}`,
        content: `Memory content ${i}: ${'x'.repeat(100)}`,
        tier: 'long_term' as MemoryTier,
        scope: 'global' as MemoryScope,
        tags: ['test'],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        importance_score: Math.random()
      }));

      mockUnifiedMemory.search.mockResolvedValue(largeMemories);

      const result = await memoryTools.curateContext({
        maxTokens: 500
      }, mockContext);

      const resultText = result.content[0].text;
      const estimatedTokens = resultText.length / 4; // Rough token estimate

      expect(estimatedTokens).toBeLessThanOrEqual(600); // Allow small overflow
      expect(result.content[0].text).toContain('truncated');
    });

    it('should prioritize core memories over long-term', async () => {
      const coreMemories: UnifiedMemorySearchResult[] = [
        {
          id: 'core_priority',
          content: 'Critical core memory',
          tier: 'core',
          scope: 'global',
          tags: ['important'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          importance_score: 1.0
        }
      ];

      const longTermMemories: UnifiedMemorySearchResult[] = [
        {
          id: 'long_term_low',
          content: 'Less important long-term memory',
          tier: 'long_term',
          scope: 'global',
          tags: ['general'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          importance_score: 0.5
        }
      ];

      mockUnifiedMemory.search
        .mockResolvedValueOnce(coreMemories)
        .mockResolvedValueOnce(longTermMemories);

      const result = await memoryTools.curateContext({
        includePreferences: true,
        maxTokens: 100
      }, mockContext);

      const resultText = result.content[0].text;
      expect(resultText.indexOf('Critical core memory')).toBeLessThan(
        resultText.indexOf('Less important long-term memory')
      );
    });

    it('should handle empty memory scenarios gracefully', async () => {
      mockUnifiedMemory.search.mockResolvedValue([]);

      const result = await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true
      }, mockContext);

      expect(result.content[0].text).toContain('No relevant context found');
      expect(result.isError).toBeUndefined();
    });

    it('should include workspace-specific context when available', async () => {
      const workspaceMemories: UnifiedMemorySearchResult[] = [
        {
          id: 'workspace_001',
          content: 'Workspace uses monorepo structure',
          tier: 'long_term',
          scope: 'project',
          project_id: mockContext.workspacePath,
          tags: ['workspace', 'structure'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockUnifiedMemory.search.mockResolvedValue(workspaceMemories);

      const result = await memoryTools.curateContext({
        includeProjectContext: true,
        workspacePath: mockContext.workspacePath
      }, mockContext);

      expect(mockUnifiedMemory.search).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'project',
          project_id: mockContext.workspacePath
        })
      );

      expect(result.content[0].text).toContain('monorepo structure');
    });

    it('should handle concurrent curation requests', async () => {
      const mockSearchResult: UnifiedMemorySearchResult[] = [
        {
          id: 'concurrent_001',
          content: 'Test memory',
          tier: 'core',
          scope: 'global',
          tags: ['test'],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockUnifiedMemory.search.mockResolvedValue(mockSearchResult);

      // Simulate concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        memoryTools.curateContext({
          includePreferences: true
        }, mockContext)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Test memory');
      });
    });

    it('should format context for different output modes', async () => {
      const testMemories: UnifiedMemorySearchResult[] = [
        {
          id: 'format_001',
          content: 'Test preference',
          tier: 'core',
          scope: 'global',
          tags: ['preference'],
          metadata: { category: 'coding' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockUnifiedMemory.search.mockResolvedValue(testMemories);

      // Test markdown format
      const markdownResult = await memoryTools.curateContext({
        includePreferences: true,
        format: 'markdown'
      }, mockContext);

      expect(markdownResult.content[0].text).toContain('## User Preferences');
      expect(markdownResult.content[0].text).toContain('- Test preference');

      // Test JSON format
      const jsonResult = await memoryTools.curateContext({
        includePreferences: true,
        format: 'json'
      }, mockContext);

      const parsedJson = JSON.parse(jsonResult.content[0].text);
      expect(parsedJson.preferences).toBeDefined();
      expect(parsedJson.preferences[0].content).toBe('Test preference');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockUnifiedMemory.search.mockRejectedValue(new Error('Database connection failed'));

      const result = await memoryTools.getUserPreferences({
        category: 'coding'
      }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Database connection failed');
    });

    it('should handle memory corruption gracefully', async () => {
      const corruptedMemory = {
        id: undefined as any,
        content: 123 as any, // Wrong type
        tier: 'invalid' as any,
        scope: null as any,
        tags: 'not-an-array' as any,
        metadata: 'not-an-object' as any,
        created_at: 'invalid-date',
        updated_at: null as any
      };

      mockUnifiedMemory.search.mockResolvedValue([corruptedMemory]);

      const result = await memoryTools.getUserPreferences({}, mockContext);

      expect(result.content[0].text).toContain('Warning');
      expect(result.content[0].text).toContain('corrupted');
    });

    it('should handle rate limiting', async () => {
      let callCount = 0;
      mockUnifiedMemory.search.mockImplementation(async () => {
        callCount++;
        if (callCount > 3) {
          throw new Error('Rate limit exceeded');
        }
        return [];
      });

      const promises = Array.from({ length: 5 }, () =>
        memoryTools.getUserPreferences({}, mockContext)
      );

      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected');

      expect(failures.length).toBeGreaterThan(0);
    });

    it('should validate input parameters', async () => {
      // Test with invalid category
      const result1 = await memoryTools.getUserPreferences({
        category: '' // Empty category
      }, mockContext);

      expect(result1.content[0].text).toContain('Invalid category');

      // Test with invalid language
      const result2 = await memoryTools.extractCodingPreferences({
        content: 'test',
        language: 'invalid-lang'
      }, mockContext);

      expect(result2.content[0].text).toContain('Unsupported language');

      // Test with negative token limit
      const result3 = await memoryTools.curateContext({
        maxTokens: -100
      }, mockContext);

      expect(result3.content[0].text).toContain('Invalid token limit');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should load preferences within 50ms', async () => {
      const mockPrefs = Array.from({ length: 20 }, (_, i) => ({
        id: `perf_${i}`,
        content: `Preference ${i}`,
        tier: 'core' as MemoryTier,
        scope: 'global' as MemoryScope,
        tags: ['preference'],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      mockUnifiedMemory.search.mockResolvedValue(mockPrefs);

      const startTime = Date.now();
      await memoryTools.getUserPreferences({}, mockContext);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });

    it('should extract preferences from 1000-line file within 100ms', async () => {
      const largeFile = Array.from({ length: 1000 }, (_, i) =>
        `function test${i}() { return ${i}; }`
      ).join('\n');

      mockUnifiedMemory.store.mockResolvedValue('perf_extract');

      const startTime = Date.now();
      await memoryTools.extractCodingPreferences({
        content: largeFile,
        language: 'javascript'
      }, mockContext);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should curate large context within 200ms', async () => {
      const largeMemorySet = Array.from({ length: 100 }, (_, i) => ({
        id: `large_${i}`,
        content: `Memory content ${i}: ${'x'.repeat(50)}`,
        tier: 'long_term' as MemoryTier,
        scope: 'global' as MemoryScope,
        tags: ['test'],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      mockUnifiedMemory.search.mockResolvedValue(largeMemorySet);

      const startTime = Date.now();
      await memoryTools.curateContext({
        includePreferences: true,
        includeProjectContext: true,
        includePatterns: true,
        maxTokens: 4000
      }, mockContext);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });
});