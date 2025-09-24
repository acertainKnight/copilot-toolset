/**
 * Unit tests for UnifiedMemoryManager
 * Tests the new dual-tier, bifurcated memory architecture
 */

import { jest } from '@jest/globals';
import { UnifiedMemoryManager } from '../../../src/memory/UnifiedMemoryManager.js';
import { MemoryTier, MemoryScope } from '../../../src/types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('UnifiedMemoryManager', () => {
  let memoryManager: UnifiedMemoryManager;
  let testDbPath: string;
  const testProjectId = '/test/project';

  beforeEach(async () => {
    // Create test database in temp directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unified-memory-test-'));
    testDbPath = path.join(tempDir, 'test.db');

    // Mock the db path for testing
    memoryManager = new UnifiedMemoryManager(testProjectId);
    // @ts-ignore - Access private property for testing
    memoryManager.dbPath = testDbPath;

    await memoryManager.initialize();
  });

  afterEach(async () => {
    await memoryManager.close();

    // Clean up test database
    try {
      await fs.unlink(testDbPath);
      await fs.rmdir(path.dirname(testDbPath));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Core Memory Tier', () => {
    it('should store core memory within size limits', async () => {
      const content = 'Important user preference for global use';

      const memoryId = await memoryManager.store(
        content,
        'core',
        'global',
        undefined,
        ['preference', 'global']
      );

      expect(memoryId).toBeDefined();
      expect(memoryId).toMatch(/^core_global_\d+_\w+$/);
    });

    it('should reject core memory exceeding 2KB limit', async () => {
      const content = 'x'.repeat(2100); // Exceed 2KB limit

      await expect(
        memoryManager.store(content, 'core', 'global')
      ).rejects.toThrow('Core memory exceeds 2KB limit');
    });

    it('should track core memory size limits', async () => {
      const content1 = 'x'.repeat(1000); // 1KB
      const content2 = 'y'.repeat(1000); // 1KB

      await memoryManager.store(content1, 'core', 'global');
      await memoryManager.store(content2, 'core', 'global');

      const totalSize = await memoryManager.getCoreMemoryTotalSize('global');
      expect(totalSize).toBeGreaterThan(1900); // Account for UTF-8 overhead
    });
  });

  describe('Long-term Memory Tier', () => {
    it('should store long-term memory without size limits', async () => {
      const content = 'x'.repeat(5000); // Larger than core limit

      const memoryId = await memoryManager.store(
        content,
        'longterm',
        'project',
        testProjectId,
        ['large-data']
      );

      expect(memoryId).toBeDefined();
      expect(memoryId).toMatch(/^longterm_project_\d+_\w+$/);
    });

    it('should store very large content in long-term', async () => {
      const content = JSON.stringify({ data: 'x'.repeat(10000) });

      const memoryId = await memoryManager.store(
        content,
        'longterm',
        'project',
        testProjectId
      );

      expect(memoryId).toBeDefined();
    });
  });

  describe('Memory Scopes', () => {
    it('should store global-scoped memories without project_id', async () => {
      const memoryId = await memoryManager.store(
        'Global system pattern',
        'core',
        'global',
        undefined,
        ['system', 'global']
      );

      const results = await memoryManager.search('Global system');
      expect(results).toHaveLength(1);
      expect(results[0].memory.scope).toBe('global');
      expect(results[0].memory.project_id).toBeUndefined();
    });

    it('should require project_id for project-scoped memories', async () => {
      await expect(
        memoryManager.store('Project context', 'core', 'project')
      ).rejects.toThrow('Project-scoped memories require a project_id');
    });

    it('should store project-scoped memories with project_id', async () => {
      const memoryId = await memoryManager.store(
        'Project-specific context',
        'longterm',
        'project',
        testProjectId,
        ['project-context']
      );

      const results = await memoryManager.search('Project-specific');
      expect(results).toHaveLength(1);
      expect(results[0].memory.scope).toBe('project');
      expect(results[0].memory.project_id).toBe(testProjectId);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Populate test data
      await memoryManager.store('Core global preference', 'core', 'global', undefined, ['preference']);
      await memoryManager.store('Long-term global knowledge', 'longterm', 'global', undefined, ['knowledge']);
      await memoryManager.store('Core project setting', 'core', 'project', testProjectId, ['setting']);
      await memoryManager.store('Long-term project data', 'longterm', 'project', testProjectId, ['data']);
    });

    it('should search all memories without filters', async () => {
      const results = await memoryManager.search('global');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by tier', async () => {
      const coreResults = await memoryManager.search('preference', { tier: 'core' });
      const longtermResults = await memoryManager.search('knowledge', { tier: 'longterm' });

      expect(coreResults).toHaveLength(1);
      expect(coreResults[0].memory.tier).toBe('core');
      expect(longtermResults).toHaveLength(1);
      expect(longtermResults[0].memory.tier).toBe('longterm');
    });

    it('should filter by scope', async () => {
      const globalResults = await memoryManager.search('global', { scope: 'global' });
      const projectResults = await memoryManager.search('setting', { scope: 'project' });

      expect(globalResults.length).toBe(2);
      globalResults.forEach(result => {
        expect(result.memory.scope).toBe('global');
      });

      expect(projectResults).toHaveLength(1);
      expect(projectResults[0].memory.scope).toBe('project');
    });

    it('should prioritize core memories in search results', async () => {
      await memoryManager.store('Important core info', 'core', 'global');
      await memoryManager.store('Important longterm info', 'longterm', 'global');

      const results = await memoryManager.search('Important');
      expect(results).toHaveLength(2);
      // Core memory should come first due to higher priority
      expect(results[0].memory.tier).toBe('core');
    });

    it('should calculate relevance scores correctly', async () => {
      const results = await memoryManager.search('preference');
      expect(results).toHaveLength(1);
      expect(results[0].similarity_score).toBeGreaterThan(0);
      expect(results[0].match_type).toMatch(/exact|fuzzy|semantic/);
    });

    it('should update access counts on search', async () => {
      const results1 = await memoryManager.search('preference');
      const results2 = await memoryManager.search('preference');

      expect(results2[0].memory.access_count).toBeGreaterThan(results1[0].memory.access_count);
    });
  });

  describe('Memory Statistics', () => {
    beforeEach(async () => {
      await memoryManager.store('Core memory 1', 'core', 'global');
      await memoryManager.store('Core memory 2', 'core', 'project', testProjectId);
      await memoryManager.store('Longterm memory 1', 'longterm', 'global');
      await memoryManager.store('Longterm memory 2', 'longterm', 'project', testProjectId);
    });

    it('should return comprehensive memory statistics', async () => {
      const stats = await memoryManager.getMemoryStats();

      expect(stats.cold_storage_count).toBe(4); // Total memories
      expect(stats.storage_size_bytes).toBeGreaterThan(0);
      expect(stats.core_memory_size).toBeGreaterThan(0);

      // Enhanced stats for unified system
      // @ts-ignore - Check extended stats
      expect(stats.byTier?.core).toBe(2);
      // @ts-ignore
      expect(stats.byTier?.longterm).toBe(2);
      // @ts-ignore
      expect(stats.byScope?.global).toBe(2);
      // @ts-ignore
      expect(stats.byScope?.project).toBe(2);
    });

    it('should track core memory utilization', async () => {
      const stats = await memoryManager.getMemoryStats();

      // @ts-ignore - Check extended stats
      expect(stats.coreUtilization).toBeGreaterThan(0);
      // @ts-ignore
      expect(stats.coreSizeLimit).toBe(2048);
    });
  });

  describe('Memory Metadata', () => {
    it('should store and retrieve metadata correctly', async () => {
      const metadata = {
        source: 'user-input',
        importance: 'high',
        category: 'preferences'
      };

      await memoryManager.store(
        'Memory with metadata',
        'core',
        'global',
        undefined,
        ['metadata-test'],
        metadata
      );

      const results = await memoryManager.search('metadata');
      expect(results).toHaveLength(1);
      expect(results[0].memory.metadata?.source).toBe('user-input');
      expect(results[0].memory.metadata?.importance).toBe('high');
    });

    it('should add system metadata automatically', async () => {
      await memoryManager.store(
        'Test memory',
        'core',
        'project',
        testProjectId,
        ['test']
      );

      const results = await memoryManager.search('Test memory');
      expect(results).toHaveLength(1);

      const metadata = results[0].memory.metadata;
      expect(metadata?.tier_description).toContain('Core Memory');
      expect(metadata?.scope_description).toContain('Project-specific');
      expect(metadata?.project_name).toBe('project'); // basename of testProjectId
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      await memoryManager.close();

      // Try to use after close
      await expect(
        memoryManager.store('test', 'core', 'global')
      ).rejects.toThrow();
    });

    it('should validate tier values', async () => {
      // @ts-ignore - Test invalid tier
      await expect(
        memoryManager.store('test', 'invalid-tier' as any, 'global')
      ).rejects.toThrow();
    });

    it('should validate scope values', async () => {
      // @ts-ignore - Test invalid scope
      await expect(
        memoryManager.store('test', 'core', 'invalid-scope' as any)
      ).rejects.toThrow();
    });
  });

  describe('Database Schema', () => {
    it('should create proper database schema', async () => {
      // Verify table exists and has correct structure
      // @ts-ignore - Access private database for testing
      const db = memoryManager.database;

      const tableInfo = db.prepare("PRAGMA table_info(unified_memories)").all();
      const columns = tableInfo.map((col: any) => col.name);

      expect(columns).toContain('id');
      expect(columns).toContain('tier');
      expect(columns).toContain('scope');
      expect(columns).toContain('project_id');
      expect(columns).toContain('content_size');
    });

    it('should have proper indexes for performance', async () => {
      // @ts-ignore - Access private database
      const db = memoryManager.database;

      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
      const indexNames = indexes.map((idx: any) => idx.name);

      expect(indexNames).toContain('idx_tier_scope');
      expect(indexNames).toContain('idx_project_id');
      expect(indexNames).toContain('idx_content_search');
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent stores correctly', async () => {
      const promises: Promise<string>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          memoryManager.store(
            `Concurrent memory ${i}`,
            'longterm',
            'global',
            undefined,
            [`concurrent-${i}`]
          )
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(id => expect(id).toBeDefined());
    });

    it('should handle concurrent searches correctly', async () => {
      await memoryManager.store('Searchable content', 'core', 'global');

      const promises: Promise<any>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(memoryManager.search('Searchable'));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result).toHaveLength(1);
      });
    });
  });
});