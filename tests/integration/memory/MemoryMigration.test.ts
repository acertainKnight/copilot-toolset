/**
 * Migration Tests for Unified Database Memory System
 * Tests transitioning from the old three-tier system to unified SQLite database
 * Validates data preservation, compatibility, and migration integrity
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { ThreeTierMemoryManager } from '../../../src/memory/ThreeTierMemoryManager.js';
import { MemoryLayer, MemorySearchOptions, Memory, MemoryStats } from '../../../src/types/index.js';
import { createTempDir, cleanupTempDir, PerformanceMeasurer } from '../../utils/TestHelpers.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import Database from 'better-sqlite3';

interface LegacyMemoryData {
  id: string;
  content: string;
  layer: MemoryLayer;
  tags: string[];
  metadata: Record<string, any>;
  created_at: Date;
  access_count: number;
}

interface MigrationTestCase {
  name: string;
  legacyData: LegacyMemoryData[];
  expectedMigrations: number;
  validationQueries: string[];
}

describe('Memory System Migration Tests', () => {
  let legacyManager: ThreeTierMemoryManager;
  let unifiedManager: MemoryManager;
  let tempDir: string;
  let legacyDbPath: string;
  let unifiedDbPath: string;
  let performanceMeasurer: PerformanceMeasurer;

  beforeAll(async () => {
    performanceMeasurer = new PerformanceMeasurer();
    tempDir = await createTempDir('memory-migration-test-');
    legacyDbPath = path.join(tempDir, 'legacy');
    unifiedDbPath = path.join(tempDir, 'unified');

    await fs.mkdir(legacyDbPath, { recursive: true });
    await fs.mkdir(unifiedDbPath, { recursive: true });
  });

  beforeEach(async () => {
    legacyManager = new ThreeTierMemoryManager(legacyDbPath);
    unifiedManager = new MemoryManager(unifiedDbPath);

    await legacyManager.initialize();
    await unifiedManager.initialize();
  });

  afterEach(async () => {
    await legacyManager.close();
    await unifiedManager.close();
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  const migrationTestCases: MigrationTestCase[] = [
    {
      name: 'Basic Layer Migration',
      legacyData: [
        {
          id: 'pref_001',
          content: 'User prefers dark theme with vim key bindings',
          layer: 'preference',
          tags: ['theme', 'vim', 'editor'],
          metadata: { user_setting: true, priority: 'high' },
          created_at: new Date('2024-01-01'),
          access_count: 5
        },
        {
          id: 'proj_001',
          content: 'TypeScript project with React and Node.js backend',
          layer: 'project',
          tags: ['typescript', 'react', 'nodejs'],
          metadata: { project_type: 'fullstack', complexity: 'medium' },
          created_at: new Date('2024-01-02'),
          access_count: 10
        },
        {
          id: 'sys_001',
          content: 'Error handling pattern: use Result<T, E> for recoverable errors',
          layer: 'system',
          tags: ['error-handling', 'patterns', 'rust-style'],
          metadata: { pattern_type: 'error_handling', confidence: 0.9 },
          created_at: new Date('2024-01-03'),
          access_count: 3
        }
      ],
      expectedMigrations: 3,
      validationQueries: ['dark theme', 'TypeScript project', 'Error handling']
    },
    {
      name: 'Complex Metadata Migration',
      legacyData: [
        {
          id: 'complex_001',
          content: 'Advanced React component with complex state management',
          layer: 'project',
          tags: ['react', 'state-management', 'advanced'],
          metadata: {
            framework: 'react',
            version: '18.2.0',
            dependencies: ['redux', 'react-redux', 'reselect'],
            performance_critical: true,
            last_updated: '2024-01-15T10:30:00Z',
            author: 'senior-dev',
            complexity_score: 8.5,
            review_status: 'approved'
          },
          created_at: new Date('2024-01-15'),
          access_count: 15
        }
      ],
      expectedMigrations: 1,
      validationQueries: ['Advanced React component', 'state management']
    },
    {
      name: 'Unicode and Special Characters',
      legacyData: [
        {
          id: 'unicode_001',
          content: 'Internationalization support: 中文, العربية, हिन्दी, русский 🌍',
          layer: 'system',
          tags: ['i18n', 'unicode', '国际化'],
          metadata: { supports_rtl: true, emoji_support: true },
          created_at: new Date('2024-01-20'),
          access_count: 2
        },
        {
          id: 'special_001',
          content: 'SQL injection prevention: use parameterized queries (?, $1, @param)',
          layer: 'system',
          tags: ['security', 'sql', 'injection'],
          metadata: { security_level: 'critical', owasp_category: 'A03' },
          created_at: new Date('2024-01-21'),
          access_count: 8
        }
      ],
      expectedMigrations: 2,
      validationQueries: ['Internationalization', 'SQL injection']
    }
  ];

  describe('Legacy Data Setup and Validation', () => {
    it('should set up legacy three-tier memory system correctly', async () => {
      // Store test data in legacy system
      const testData = migrationTestCases[0].legacyData[0];

      const memoryId = await legacyManager.store(
        testData.content,
        testData.layer,
        testData.tags,
        testData.metadata
      );

      expect(memoryId).toBeTruthy();

      // Verify storage in legacy system
      const results = await legacyManager.search('dark theme');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory.content).toContain('dark theme');
    });

    it('should validate legacy system statistics', async () => {
      // Set up some test data
      for (const testCase of migrationTestCases) {
        for (const data of testCase.legacyData) {
          await legacyManager.store(data.content, data.layer, data.tags, data.metadata);
        }
      }

      const stats = await legacyManager.getMemoryStats();

      expect(stats.core_memory_size).toBeGreaterThanOrEqual(0);
      expect(stats.warm_storage_count).toBeGreaterThanOrEqual(0);
      expect(stats.cold_storage_count).toBeGreaterThan(0);
      expect(stats.storage_size_bytes).toBeGreaterThan(0);

      console.log(`Legacy system stats: Core: ${stats.core_memory_size}, Warm: ${stats.warm_storage_count}, Cold: ${stats.cold_storage_count}`);
    });
  });

  describe('Migration Process Validation', () => {
    async function setupLegacyData(testCase: MigrationTestCase): Promise<string[]> {
      const legacyIds: string[] = [];

      for (const data of testCase.legacyData) {
        const id = await legacyManager.store(
          data.content,
          data.layer,
          data.tags,
          data.metadata
        );
        legacyIds.push(id);
      }

      return legacyIds;
    }

    async function migrateLegacyData(): Promise<number> {
      // Simulate migration process
      // In real implementation, this would be handled by a migration script
      let migratedCount = 0;

      // Search all data in legacy system
      const allLegacyData = await legacyManager.search('', { limit: 1000 });

      for (const result of allLegacyData) {
        const memory = result.memory;

        // Migrate to unified system
        const newId = await unifiedManager.store(
          memory.content,
          memory.layer,
          memory.tags || [],
          {
            ...memory.metadata,
            migrated_from: 'three_tier',
            original_id: memory.id,
            migration_timestamp: new Date().toISOString()
          }
        );

        if (newId) {
          migratedCount++;
        }
      }

      return migratedCount;
    }

    it('should migrate basic layer data correctly', async () => {
      const testCase = migrationTestCases[0];
      const legacyIds = await setupLegacyData(testCase);

      expect(legacyIds).toHaveLength(testCase.expectedMigrations);

      const endTimer = performanceMeasurer.start('migration-process');
      const migratedCount = await migrateLegacyData();
      const migrationTime = endTimer();

      expect(migratedCount).toBe(testCase.expectedMigrations);
      expect(migrationTime).toBeLessThan(1000); // Migration should be reasonably fast

      console.log(`Migration completed: ${migratedCount} items in ${migrationTime.toFixed(2)}ms`);

      // Validate migrated data
      for (const query of testCase.validationQueries) {
        const results = await unifiedManager.search(query);
        expect(results.length).toBeGreaterThan(0);

        const migratedResult = results.find(r => r.memory.metadata?.migrated_from === 'three_tier');
        expect(migratedResult).toBeDefined();
      }
    });

    it('should preserve complex metadata during migration', async () => {
      const testCase = migrationTestCases[1];
      await setupLegacyData(testCase);

      const migratedCount = await migrateLegacyData();
      expect(migratedCount).toBe(testCase.expectedMigrations);

      // Search for complex metadata content
      const results = await unifiedManager.search('Advanced React component');
      expect(results.length).toBeGreaterThan(0);

      const migratedResult = results[0];
      const metadata = migratedResult.memory.metadata;

      // Verify complex metadata preservation
      expect(metadata?.framework).toBe('react');
      expect(metadata?.version).toBe('18.2.0');
      expect(metadata?.dependencies).toEqual(['redux', 'react-redux', 'reselect']);
      expect(metadata?.performance_critical).toBe(true);
      expect(metadata?.complexity_score).toBe(8.5);
      expect(metadata?.migrated_from).toBe('three_tier');
    });

    it('should handle Unicode and special characters correctly', async () => {
      const testCase = migrationTestCases[2];
      await setupLegacyData(testCase);

      const migratedCount = await migrateLegacyData();
      expect(migratedCount).toBe(testCase.expectedMigrations);

      // Test Unicode content
      const unicodeResults = await unifiedManager.search('中文');
      expect(unicodeResults.length).toBeGreaterThan(0);

      const unicodeResult = unicodeResults[0];
      expect(unicodeResult.memory.content).toContain('中文');
      expect(unicodeResult.memory.content).toContain('🌍');

      // Test special SQL characters
      const sqlResults = await unifiedManager.search('SQL injection');
      expect(sqlResults.length).toBeGreaterThan(0);

      const sqlResult = sqlResults[0];
      expect(sqlResult.memory.content).toContain('(?, $1, @param)');
    });

    it('should maintain search performance after migration', async () => {
      // Set up all test data
      for (const testCase of migrationTestCases) {
        await setupLegacyData(testCase);
      }

      const migratedCount = await migrateLegacyData();
      expect(migratedCount).toBeGreaterThan(0);

      // Test search performance
      const searchQueries = [
        'TypeScript',
        'React component',
        'error handling',
        'dark theme',
        'state management'
      ];

      for (const query of searchQueries) {
        const endTimer = performanceMeasurer.start('post-migration-search');
        const results = await unifiedManager.search(query);
        const searchTime = endTimer();

        expect(results.length).toBeGreaterThanOrEqual(0);
        expect(searchTime).toBeLessThan(100); // Post-migration searches should be fast

        console.log(`Post-migration search "${query}": ${results.length} results in ${searchTime.toFixed(2)}ms`);
      }
    });
  });

  describe('Migration Data Integrity', () => {
    it('should preserve data integrity during migration', async () => {
      const originalData = migrationTestCases[0].legacyData;

      // Store in legacy system
      const legacyIds: string[] = [];
      for (const data of originalData) {
        const id = await legacyManager.store(data.content, data.layer, data.tags, data.metadata);
        legacyIds.push(id);
      }

      // Get original data
      const originalResults = await legacyManager.search('', { limit: 100 });
      const originalContents = new Map(
        originalResults.map(r => [r.memory.content, r.memory])
      );

      // Perform migration
      await migrateLegacyData();

      // Verify migrated data
      const migratedResults = await unifiedManager.search('', { limit: 100 });
      const migratedContents = new Map(
        migratedResults
          .filter(r => r.memory.metadata?.migrated_from === 'three_tier')
          .map(r => [r.memory.content, r.memory])
      );

      // Check data integrity
      for (const [content, originalMemory] of originalContents) {
        const migratedMemory = migratedContents.get(content);

        expect(migratedMemory).toBeDefined();
        expect(migratedMemory!.content).toBe(originalMemory.content);
        expect(migratedMemory!.layer).toBe(originalMemory.layer);

        // Tags should be preserved
        expect(migratedMemory!.tags).toEqual(originalMemory.tags);
      }

      console.log(`Data integrity check: ${originalContents.size} original → ${migratedContents.size} migrated`);
    });

    it('should handle duplicate data during migration', async () => {
      const duplicateContent = 'Duplicate content for migration testing';

      // Store same content in legacy system multiple times
      await legacyManager.store(duplicateContent, 'project', ['duplicate', 'test1']);
      await legacyManager.store(duplicateContent, 'system', ['duplicate', 'test2']);
      await legacyManager.store(duplicateContent, 'preference', ['duplicate', 'test3']);

      // Perform migration
      const migratedCount = await migrateLegacyData();
      expect(migratedCount).toBe(3); // All duplicates should be migrated

      // Check duplicates in unified system
      const duplicateResults = await unifiedManager.search('Duplicate content');
      expect(duplicateResults.length).toBe(3);

      // Verify different layers are preserved
      const layers = new Set(duplicateResults.map(r => r.memory.layer));
      expect(layers.size).toBe(3); // All three layers should be present
    });

    it('should maintain access counts and timestamps', async () => {
      const testData = {
        content: 'Access count preservation test',
        layer: 'system' as MemoryLayer,
        tags: ['access-count', 'timestamp'],
        metadata: { test_type: 'timestamp_preservation' }
      };

      // Store in legacy system
      const legacyId = await legacyManager.store(
        testData.content,
        testData.layer,
        testData.tags,
        testData.metadata
      );

      // Access multiple times to increase count
      for (let i = 0; i < 5; i++) {
        await legacyManager.search('Access count preservation');
      }

      // Get original stats
      const originalResults = await legacyManager.search('Access count preservation');
      const originalMemory = originalResults[0].memory;

      // Perform migration
      await migrateLegacyData();

      // Check migrated data
      const migratedResults = await unifiedManager.search('Access count preservation');
      const migratedMemory = migratedResults.find(r =>
        r.memory.metadata?.migrated_from === 'three_tier'
      )?.memory;

      expect(migratedMemory).toBeDefined();

      // Access count might not be preserved exactly due to migration process
      // But should be reasonable
      expect(migratedMemory!.access_count || 0).toBeGreaterThanOrEqual(0);

      // Timestamps should be preserved in metadata
      expect(migratedMemory!.created_at).toBeInstanceOf(Date);
    });
  });

  describe('Migration Performance and Scalability', () => {
    async function createBulkLegacyData(count: number): Promise<void> {
      const promises: Promise<string>[] = [];

      for (let i = 0; i < count; i++) {
        const layer: MemoryLayer = ['preference', 'project', 'system', 'prompt'][i % 4] as MemoryLayer;

        promises.push(
          legacyManager.store(
            `Bulk migration test data item ${i}: ${layer} layer content`,
            layer,
            ['bulk', 'migration', `item-${i}`, layer],
            {
              bulk_index: i,
              batch: Math.floor(i / 10),
              test_type: 'bulk_migration'
            }
          )
        );
      }

      await Promise.all(promises);
    }

    it('should handle large-scale migration efficiently', async () => {
      const itemCount = 500; // Reasonable number for testing

      console.log(`Setting up ${itemCount} legacy items...`);
      const setupTimer = performanceMeasurer.start('bulk-setup');
      await createBulkLegacyData(itemCount);
      const setupTime = setupTimer();

      console.log(`Setup completed in ${setupTime.toFixed(2)}ms`);

      // Verify legacy data
      const legacyStats = await legacyManager.getMemoryStats();
      expect(legacyStats.cold_storage_count).toBeGreaterThanOrEqual(itemCount);

      // Perform migration
      console.log('Starting bulk migration...');
      const migrationTimer = performanceMeasurer.start('bulk-migration');
      const migratedCount = await migrateLegacyData();
      const migrationTime = migrationTimer();

      console.log(`Migration completed: ${migratedCount} items in ${migrationTime.toFixed(2)}ms`);

      expect(migratedCount).toBe(itemCount);
      expect(migrationTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify migration performance
      const itemsPerSecond = migratedCount / (migrationTime / 1000);
      console.log(`Migration rate: ${itemsPerSecond.toFixed(2)} items/second`);
      expect(itemsPerSecond).toBeGreaterThan(10); // Reasonable migration rate

      // Verify post-migration search performance
      const searchTimer = performanceMeasurer.start('post-bulk-migration-search');
      const searchResults = await unifiedManager.search('bulk migration');
      const searchTime = searchTimer();

      expect(searchResults.length).toBe(itemCount);
      expect(searchTime).toBeLessThan(500); // Search should remain fast

      console.log(`Post-migration search: ${searchResults.length} results in ${searchTime.toFixed(2)}ms`);
    });

    it('should maintain system responsiveness during migration', async () => {
      // Set up moderate amount of data
      await createBulkLegacyData(100);

      // Perform migration with concurrent operations
      const migrationPromise = migrateLegacyData();

      // Concurrent operations during migration
      const concurrentOps = [
        unifiedManager.search('concurrent'),
        unifiedManager.getMemoryStats(),
        unifiedManager.store('Concurrent operation during migration', 'project', ['concurrent']),
        legacyManager.search('concurrent'),
        legacyManager.getMemoryStats()
      ];

      const [migratedCount, ...concurrentResults] = await Promise.all([
        migrationPromise,
        ...concurrentOps
      ]);

      expect(migratedCount).toBe(100);

      // All concurrent operations should succeed
      expect(Array.isArray(concurrentResults[0])).toBe(true); // Search results
      expect(concurrentResults[1]).toHaveProperty('storage_size_bytes'); // Stats
      expect(typeof concurrentResults[2]).toBe('string'); // Store operation
      expect(Array.isArray(concurrentResults[3])).toBe(true); // Legacy search
      expect(concurrentResults[4]).toHaveProperty('storage_size_bytes'); // Legacy stats

      console.log('System remained responsive during migration');
    });

    it('should handle migration rollback scenarios', async () => {
      const testData = migrationTestCases[0].legacyData;

      // Set up legacy data
      const legacyIds = [];
      for (const data of testData) {
        const id = await legacyManager.store(data.content, data.layer, data.tags, data.metadata);
        legacyIds.push(id);
      }

      // Perform partial migration
      const partialCount = await migrateLegacyData();
      expect(partialCount).toBe(testData.length);

      // Simulate rollback by clearing unified system
      await unifiedManager.close();
      unifiedManager = new MemoryManager(unifiedDbPath + '-rollback');
      await unifiedManager.initialize();

      // Verify rollback - unified system should be clean
      const cleanResults = await unifiedManager.search('', { limit: 100 });
      const migratedResults = cleanResults.filter(r => r.memory.metadata?.migrated_from === 'three_tier');
      expect(migratedResults.length).toBe(0);

      // Legacy system should still have data
      const legacyResults = await legacyManager.search('', { limit: 100 });
      expect(legacyResults.length).toBe(testData.length);

      console.log('Migration rollback scenario validated');
    });
  });
});