/**
 * Memory Migration System
 * Handles transition from legacy memory system to unified dual-tier, bifurcated architecture
 */

import Database from 'better-sqlite3';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MemoryManager } from './MemoryManager.js';
import { UnifiedMemoryManager } from './UnifiedMemoryManager.js';
import { Memory, MemoryLayer, MemoryTier, MemoryScope, UnifiedMemory } from '../types/index.js';

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
  details: {
    coreMemories: number;
    longtermMemories: number;
    globalMemories: number;
    projectMemories: number;
  };
}

export class MemoryMigration {
  private legacyDbPath: string;
  private unifiedDbPath: string;
  private backupPath: string;

  constructor() {
    const memoryDir = path.join(os.homedir(), '.copilot-mcp', 'memory');
    this.legacyDbPath = path.join(memoryDir, 'global.db');
    this.unifiedDbPath = path.join(memoryDir, 'unified.db');
    this.backupPath = path.join(memoryDir, 'backups', `migration_${Date.now()}`);
  }

  /**
   * Migrate from legacy system to unified dual-tier, bifurcated architecture
   */
  public async migrate(projectId?: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
      details: {
        coreMemories: 0,
        longtermMemories: 0,
        globalMemories: 0,
        projectMemories: 0
      }
    };

    try {
      // Check if legacy database exists
      if (!await this.legacyDatabaseExists()) {
        console.error('[INFO] No legacy database found, skipping migration');
        result.success = true;
        return result;
      }

      // Create backup
      await this.createBackup();

      // Initialize managers
      const legacyManager = new MemoryManager(projectId);
      const unifiedManager = new UnifiedMemoryManager(projectId);

      await legacyManager.initialize();
      await unifiedManager.initialize();

      // Read all memories from legacy system
      const legacyMemories = await this.readLegacyMemories();
      console.error(`[INFO] Found ${legacyMemories.length} memories to migrate`);

      // Migrate each memory
      for (const memory of legacyMemories) {
        try {
          const migrationMapping = this.mapLegacyToUnified(memory, projectId);

          await unifiedManager.store(
            migrationMapping.content,
            migrationMapping.tier,
            migrationMapping.scope,
            migrationMapping.projectId,
            migrationMapping.tags,
            {
              ...migrationMapping.metadata,
              migrated_from: memory.layer,
              migration_date: new Date().toISOString(),
              original_id: memory.id
            }
          );

          result.migratedCount++;

          // Update stats
          if (migrationMapping.tier === 'core') result.details.coreMemories++;
          if (migrationMapping.tier === 'longterm') result.details.longtermMemories++;
          if (migrationMapping.scope === 'global') result.details.globalMemories++;
          if (migrationMapping.scope === 'project') result.details.projectMemories++;

        } catch (error) {
          result.errorCount++;
          result.errors.push(`Failed to migrate memory ${memory.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`[ERROR] Migration failed for memory ${memory.id}:`, error);
        }
      }

      // Close managers
      await legacyManager.close();
      await unifiedManager.close();

      result.success = result.errorCount === 0 || result.migratedCount > 0;

      console.error(`[INFO] Migration completed: ${result.migratedCount} migrated, ${result.errorCount} errors`);
      return result;

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('[ERROR] Memory migration failed:', error);
      return result;
    }
  }

  /**
   * Check if migration is needed
   */
  public async needsMigration(): Promise<boolean> {
    const hasLegacy = await this.legacyDatabaseExists();
    const hasUnified = await this.unifiedDatabaseExists();

    // Migration needed if legacy exists and unified doesn't, or if unified has no memories
    if (hasLegacy && !hasUnified) return true;
    if (!hasLegacy) return false;

    // Check if unified database is empty
    try {
      const unifiedDb = new Database(this.unifiedDbPath);
      const count = unifiedDb.prepare('SELECT COUNT(*) as count FROM unified_memories').get() as { count: number };
      unifiedDb.close();
      return count.count === 0;
    } catch {
      return true;
    }
  }

  /**
   * Get migration status and recommendations
   */
  public async getMigrationStatus(): Promise<{
    needed: boolean;
    legacyCount: number;
    unifiedCount: number;
    recommendations: string[];
  }> {
    const needed = await this.needsMigration();
    let legacyCount = 0;
    let unifiedCount = 0;
    const recommendations: string[] = [];

    // Count legacy memories
    if (await this.legacyDatabaseExists()) {
      try {
        const legacyDb = new Database(this.legacyDbPath);
        const result = legacyDb.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number };
        legacyCount = result.count;
        legacyDb.close();
      } catch {
        legacyCount = 0;
      }
    }

    // Count unified memories
    if (await this.unifiedDatabaseExists()) {
      try {
        const unifiedDb = new Database(this.unifiedDbPath);
        const result = unifiedDb.prepare('SELECT COUNT(*) as count FROM unified_memories').get() as { count: number };
        unifiedCount = result.count;
        unifiedDb.close();
      } catch {
        unifiedCount = 0;
      }
    }

    // Generate recommendations
    if (needed && legacyCount > 0) {
      recommendations.push(`Migrate ${legacyCount} legacy memories to new unified system`);
      recommendations.push('Run migration during low-usage period to avoid data loss');
      recommendations.push('Backup will be created automatically before migration');
    }

    if (!needed && unifiedCount > 0) {
      recommendations.push('Migration already completed successfully');
      recommendations.push(`Currently using unified system with ${unifiedCount} memories`);
    }

    if (legacyCount === 0 && unifiedCount === 0) {
      recommendations.push('No memories found - system ready for new unified architecture');
    }

    return {
      needed,
      legacyCount,
      unifiedCount,
      recommendations
    };
  }

  // Private helper methods

  private async legacyDatabaseExists(): Promise<boolean> {
    try {
      await fs.access(this.legacyDbPath);
      return true;
    } catch {
      return false;
    }
  }

  private async unifiedDatabaseExists(): Promise<boolean> {
    try {
      await fs.access(this.unifiedDbPath);
      return true;
    } catch {
      return false;
    }
  }

  private async createBackup(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.backupPath), { recursive: true });
      await fs.copyFile(this.legacyDbPath, `${this.backupPath}_legacy.db`);

      if (await this.unifiedDatabaseExists()) {
        await fs.copyFile(this.unifiedDbPath, `${this.backupPath}_unified.db`);
      }

      console.error(`[INFO] Backup created at: ${this.backupPath}`);
    } catch (error) {
      console.error('[ERROR] Failed to create backup:', error);
      throw error;
    }
  }

  private async readLegacyMemories(): Promise<Memory[]> {
    const legacyDb = new Database(this.legacyDbPath);

    try {
      const rows = legacyDb.prepare('SELECT * FROM memories ORDER BY created_at').all() as any[];

      return rows.map(row => ({
        id: row.id,
        content: row.content,
        layer: row.layer as MemoryLayer,
        tags: JSON.parse(row.tags || '[]'),
        created_at: new Date(row.created_at),
        accessed_at: new Date(row.accessed_at),
        access_count: row.access_count || 0,
        metadata: JSON.parse(row.metadata || '{}')
      }));
    } finally {
      legacyDb.close();
    }
  }

  private mapLegacyToUnified(memory: Memory, projectId?: string): {
    content: string;
    tier: MemoryTier;
    scope: MemoryScope;
    projectId?: string;
    tags: string[];
    metadata: Record<string, any>;
  } {
    // Map legacy layers to new tier/scope architecture
    const mapping = this.getLegacyMapping(memory.layer);
    const contentSize = Buffer.byteLength(memory.content, 'utf8');

    // Determine tier based on content size and importance
    let tier: MemoryTier = mapping.tier;
    if (tier === 'core' && contentSize > 2048) {
      // If content is too large for core, move to longterm
      tier = 'longterm';
    }

    return {
      content: memory.content,
      tier,
      scope: mapping.scope,
      projectId: mapping.scope === 'project' ? (projectId || memory.metadata?.project_path) : undefined,
      tags: memory.tags || [],
      metadata: {
        ...memory.metadata,
        legacy_layer: memory.layer,
        original_created_at: memory.created_at?.toISOString(),
        original_access_count: memory.access_count,
        content_size: contentSize
      }
    };
  }

  private getLegacyMapping(layer: MemoryLayer): { tier: MemoryTier; scope: MemoryScope } {
    switch (layer) {
      case 'preference':
        return { tier: 'core', scope: 'global' }; // User preferences should be core and global
      case 'system':
        return { tier: 'core', scope: 'global' }; // System patterns should be core and global
      case 'project':
        return { tier: 'longterm', scope: 'project' }; // Project context is usually larger
      case 'prompt':
        return { tier: 'longterm', scope: 'project' }; // Session context, project-specific
      default:
        return { tier: 'longterm', scope: 'global' }; // Default fallback
    }
  }
}