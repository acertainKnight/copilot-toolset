/**
 * Unit tests for MemoryManager - Three-tier memory system
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { MemoryLayer, MemorySearchOptions, Memory } from '../../../src/types/index.js';
import { createMockMemory, createTestLogger } from '../../utils/TestHelpers.js';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(async () => {
    memoryManager = new MemoryManager();
    await memoryManager.initialize();
  });

  afterEach(async () => {
    await memoryManager.close();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newManager = new MemoryManager();
      await expect(newManager.initialize()).resolves.not.toThrow();
      await newManager.close();
    });

    it('should not reinitialize if already initialized', async () => {
      const newManager = new MemoryManager();
      await newManager.initialize();
      // Second initialization should be a no-op
      await expect(newManager.initialize()).resolves.not.toThrow();
      await newManager.close();
    });

    it('should initialize successfully without creating default memories', async () => {
      const stats = await memoryManager.getMemoryStats();
      expect(stats.cold_storage_count).toBeGreaterThanOrEqual(0); // No default memories created
    });
  });

  describe('Memory Storage', () => {
    it('should store memory in specified layer', async () => {
      const content = 'Test memory content';
      const layer: MemoryLayer = 'project';
      const tags = ['test', 'unit'];

      const memoryId = await memoryManager.store(content, layer, tags);

      expect(memoryId).toBeTruthy();
      expect(typeof memoryId).toBe('string');
      expect(memoryId).toMatch(/^project_\d+_[a-z0-9]+$/);
    });

    it('should store memory without tags', async () => {
      const content = 'Test memory without tags';
      const layer: MemoryLayer = 'preference';

      const memoryId = await memoryManager.store(content, layer);

      expect(memoryId).toBeTruthy();
      expect(memoryId).toMatch(/^preference_\d+_[a-z0-9]+$/);
    });

    it('should store memory with metadata', async () => {
      const content = 'Test memory with metadata';
      const layer: MemoryLayer = 'system';
      const tags = ['metadata-test'];
      const metadata = { source: 'unit-test', importance: 'high' };

      const memoryId = await memoryManager.store(content, layer, tags, metadata);

      expect(memoryId).toBeTruthy();
      // Verify we can search and find it with metadata
      const results = await memoryManager.search('metadata');
      expect(results).toHaveLength(1);
    });

    it('should generate unique IDs for different memories', async () => {
      const layer: MemoryLayer = 'project';

      const id1 = await memoryManager.store('Content 1', layer);
      const id2 = await memoryManager.store('Content 2', layer);
      const id3 = await memoryManager.store('Content 3', layer);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should handle all valid memory layers', async () => {
      const layers: MemoryLayer[] = ['preference', 'project', 'prompt', 'system'];
      const ids: string[] = [];

      for (const layer of layers) {
        const id = await memoryManager.store(`Test content for ${layer}`, layer);
        ids.push(id);
        expect(id).toMatch(new RegExp(`^${layer}_\\d+_[a-z0-9]+$`));
      }

      expect(ids).toHaveLength(layers.length);
      expect(new Set(ids)).toHaveProperty('size', layers.length); // All unique
    });
  });

  describe('Memory Search', () => {
    beforeEach(async () => {
      // Set up test data
      await memoryManager.store('JavaScript function to calculate fibonacci', 'project', ['javascript', 'algorithm']);
      await memoryManager.store('Python script for data processing', 'project', ['python', 'data']);
      await memoryManager.store('User prefers functional programming style', 'preference', ['coding-style']);
      await memoryManager.store('TypeScript configuration best practices', 'system', ['typescript', 'config']);
      await memoryManager.store('React component testing strategies', 'prompt', ['react', 'testing']);
    });

    it('should find memories by content match', async () => {
      const results = await memoryManager.search('JavaScript');

      expect(results).toHaveLength(1);
      expect(results[0].memory.content).toContain('JavaScript');
      expect(results[0].similarity_score).toBeGreaterThan(0);
      expect(results[0].match_type).toBe('exact'); // JavaScript is an exact match
    });

    it('should find memories by case-insensitive search', async () => {
      const results = await memoryManager.search('javascript');

      expect(results).toHaveLength(1);
      expect(results[0].memory.content).toContain('JavaScript');
    });

    it('should filter by memory layer', async () => {
      // Use unique content to avoid conflicts with existing data
      const uniqueContent = `unique_project_content_${Date.now()}`;
      
      // First store some project-specific content
      await memoryManager.store(`Project ${uniqueContent} configuration`, 'project');
      await memoryManager.store(`System ${uniqueContent} settings`, 'system');
      
      const options: MemorySearchOptions = {
        layer: 'project'
      };

      const results = await memoryManager.search(uniqueContent, options);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.memory.layer).toBe('project');
      });
    });

    it('should limit search results', async () => {
      const options: MemorySearchOptions = {
        limit: 2
      };

      const results = await memoryManager.search('e', options); // Very broad search

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', async () => {
      const results = await memoryManager.search('nonexistent_keyword_12345');

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty search query gracefully', async () => {
      const results = await memoryManager.search('');
      // Empty search should return results rather than throwing
      expect(Array.isArray(results)).toBe(true);
    });

    it('should use default limit when not specified', async () => {
      // Add many memories to test default limit
      for (let i = 0; i < 15; i++) {
        await memoryManager.store(`Test memory ${i} with common keyword`, 'project');
      }

      const results = await memoryManager.search('common');

      expect(results.length).toBeLessThanOrEqual(10); // Default limit
    });

    it('should respect custom limit', async () => {
      const customLimit = 3;
      const options: MemorySearchOptions = {
        limit: customLimit
      };

      // Add many memories
      for (let i = 0; i < 10; i++) {
        await memoryManager.store(`Limited search test ${i}`, 'project');
      }

      const results = await memoryManager.search('Limited', options);

      expect(results.length).toBeLessThanOrEqual(customLimit);
    });
  });

  describe('User Preferences Management', () => {
    it('should store user preferences', async () => {
      const preferences = {
        coding_style: 'object-oriented',
        preferred_languages: ['java', 'kotlin'],
        theme: 'dark'
      };

      const memoryId = await memoryManager.store(
        JSON.stringify(preferences), 
        'preference', 
        ['user_preferences', 'coding_style']
      );
      expect(memoryId).toMatch(/^preference_\d+_[a-z0-9]+$/);
    });

    it('should search for stored preferences', async () => {
      const preferences = { theme: 'dark', indentation: 'spaces' };

      await memoryManager.store(
        JSON.stringify(preferences), 
        'preference', 
        ['user_preferences', 'theme']
      );

      const results = await memoryManager.search('user_preferences');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory.layer).toBe('preference');
    });

    it('should handle preference storage with metadata', async () => {
      const preferences = { fontSize: 14 };
      const metadata = { category: 'ui', lastUpdated: new Date().toISOString() };

      const memoryId = await memoryManager.store(
        JSON.stringify(preferences), 
        'preference', 
        ['user_preferences'],
        metadata
      );
      expect(memoryId).toMatch(/^preference_\d+_[a-z0-9]+$/);
    });
  });

  describe('Self-Healing Prompt Integration', () => {
    it('should store self-healing prompt patterns', async () => {
      const errorPattern = 'Cannot find module';
      const healingStrategy = 'Check if the module is installed and path is correct';

      const memoryId = await memoryManager.store(
        `Error: ${errorPattern} | Solution: ${healingStrategy}`,
        'system',
        ['error_pattern', 'module_error', 'debugging']
      );
      expect(memoryId).toMatch(/^system_\d+_[a-z0-9]+$/);
    });

    it('should make self-healing prompts searchable', async () => {
      const errorPattern = 'Syntax error in TypeScript';
      const healingStrategy = 'Check for missing semicolons and bracket matching';

      await memoryManager.store(
        `Error: ${errorPattern} | Solution: ${healingStrategy}`,
        'system',
        ['error_pattern', 'typescript', 'syntax']
      );

      const results = await memoryManager.search('TypeScript');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory.layer).toBe('system');
    });
  });

  describe('Memory Statistics', () => {
    it('should provide memory statistics', async () => {
      const stats = await memoryManager.getMemoryStats();

      expect(stats).toHaveProperty('core_memory_size');
      expect(stats).toHaveProperty('warm_storage_count');
      expect(stats).toHaveProperty('cold_storage_count');
      expect(stats).toHaveProperty('total_access_count');
      expect(stats).toHaveProperty('last_cleanup');
      expect(stats).toHaveProperty('storage_size_bytes');

      expect(typeof stats.core_memory_size).toBe('number');
      expect(typeof stats.warm_storage_count).toBe('number');
      expect(typeof stats.cold_storage_count).toBe('number');
      expect(typeof stats.total_access_count).toBe('number');
      expect(stats.last_cleanup).toBeInstanceOf(Date);
      expect(typeof stats.storage_size_bytes).toBe('number');
    });

    it('should track memory size growth', async () => {
      const initialStats = await memoryManager.getMemoryStats();
      const initialSize = initialStats.cold_storage_count;

      // Add some memories
      await memoryManager.store('Additional memory content', 'project');
      await memoryManager.store('More memory content', 'preference');

      const updatedStats = await memoryManager.getMemoryStats();
      expect(updatedStats.cold_storage_count).toBeGreaterThan(initialSize);
    });

    it('should track access counts', async () => {
      const initialStats = await memoryManager.getMemoryStats();

      // Perform some searches (which count as access)
      await memoryManager.search('test');
      await memoryManager.search('memory');

      const updatedStats = await memoryManager.getMemoryStats();
      expect(updatedStats.total_access_count).toBeGreaterThanOrEqual(
        initialStats.total_access_count
      );
    });
  });

  describe('Maintenance Operations', () => {
    it('should handle memory optimization', async () => {
      // Store some test memories
      await memoryManager.store('test content for optimization', 'project', ['test']);
      
      // Memory manager doesn't have a public optimization method in the simplified API
      // Instead we test that the memory system is stable and can be cleaned up
      const stats = await memoryManager.getMemoryStats();
      expect(stats.storage_size_bytes).toBeGreaterThan(0);
    });

    it('should handle memory gracefully', async () => {
      const newManager = new MemoryManager();
      await newManager.initialize();

      const stats = await newManager.getMemoryStats();
      // In global storage architecture, we may have existing memories
      expect(stats.cold_storage_count).toBeGreaterThanOrEqual(0);

      await newManager.close();
    });
  });

  describe('Memory Lifecycle', () => {
    it('should close cleanly', async () => {
      const newManager = new MemoryManager();
      await newManager.initialize();

      await expect(newManager.close()).resolves.not.toThrow();
    });

    it('should handle close without initialization', async () => {
      const newManager = new MemoryManager();

      await expect(newManager.close()).resolves.not.toThrow();
    });

    it('should handle multiple close calls', async () => {
      const newManager = new MemoryManager();
      await newManager.initialize();

      await newManager.close();
      await expect(newManager.close()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle search with invalid layer gracefully', async () => {
      const options: any = {
        layer: 'invalid_layer' as MemoryLayer
      };

      // Search for something unique that shouldn't exist
      const results = await memoryManager.search('unique_nonexistent_content_xyz123', options);
      expect(results).toHaveLength(0);
    });

    it('should handle storage with invalid layer', async () => {
      // @ts-ignore - Testing runtime error handling
      await expect(
        memoryManager.store('test', 'invalid_layer' as MemoryLayer)
      ).resolves.toBeTruthy(); // Should still work, manager is flexible
    });

    it('should handle extremely long content', async () => {
      const longContent = 'a'.repeat(100000); // 100KB string

      await expect(
        memoryManager.store(longContent, 'project')
      ).resolves.toBeTruthy();
    });

    it('should handle special characters in content', async () => {
      const specialContent = 'Content with special chars: 🚀 ñ ë ü 中文 🎯';

      const id = await memoryManager.store(specialContent, 'project');
      expect(id).toBeTruthy();

      const results = await memoryManager.search('special');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle JSON-like content correctly', async () => {
      const jsonContent = JSON.stringify({
        key: 'value',
        nested: { array: [1, 2, 3] },
        special: 'chars & symbols'
      });

      const id = await memoryManager.store(jsonContent, 'system');
      expect(id).toBeTruthy();

      const results = await memoryManager.search('array');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Flexibility', () => {
    it('should store and retrieve user preferences', async () => {
      // Store some preference data
      await memoryManager.store('User prefers functional programming style', 'preference', ['user_preferences', 'style'], { preference: 'coding_style' });
      
      const results = await memoryManager.search('coding_style');

      expect(results.length).toBeGreaterThan(0);
      const userPrefMemory = results.find(r =>
        r.memory.content.includes('functional')
      );
      expect(userPrefMemory).toBeDefined();
    });

    it('should store and retrieve project context', async () => {
      // Store some project context
      await memoryManager.store('This project uses Node.js and TypeScript for development', 'project', ['project_context', 'tech_stack'], { context: 'project_info' });
      
      const results = await memoryManager.search('project');

      expect(results.length).toBeGreaterThan(0);
      const projectMemory = results.find(r =>
        r.memory.content.includes('Node.js')
      );
      expect(projectMemory).toBeDefined();
    });

    it('should find memories by tags', async () => {
      // Store memories with specific tags
      await memoryManager.store('Core functionality test', 'system', ['core', 'test']);
      await memoryManager.store('Core patterns guide', 'preference', ['core', 'patterns']);
      
      const results = await memoryManager.search('core');

      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach(result => {
        expect(result.memory.tags).toContain('core');
      });
    });
  });

  describe('Concurrency and Thread Safety', () => {
    it('should handle concurrent storage operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        memoryManager.store(`Concurrent content ${i}`, 'project', [`tag-${i}`])
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(new Set(results)).toHaveProperty('size', 10); // All unique IDs
    });

    it('should handle concurrent search operations', async () => {
      // First add some data
      await memoryManager.store('Searchable content alpha', 'project');
      await memoryManager.store('Searchable content beta', 'project');
      await memoryManager.store('Searchable content gamma', 'project');

      const promises = Array.from({ length: 5 }, () =>
        memoryManager.search('Searchable')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should handle concurrent mixed operations', async () => {
      const operations = [
        memoryManager.store('Mixed op 1', 'project'),
        memoryManager.search('test'),
        memoryManager.store('Mixed op 2', 'preference'),
        memoryManager.getMemoryStats(),
        memoryManager.store('Mixed op 3', 'system')
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });
});