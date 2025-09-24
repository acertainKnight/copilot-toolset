/**
 * Unified SQLite Memory Manager with Dual-Tier, Bifurcated Memory Architecture
 *
 * Architecture:
 * - Tiers: Core Memory (2KB limit, always accessible) | Long-term Memory (unlimited)
 * - Scopes: Global (cross-project) | Project-specific
 * - Single Database: All memories in one SQLite database for optimal search and management
 */

import Database from 'better-sqlite3';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  UnifiedMemory,
  MemoryTier,
  MemoryScope,
  MemorySearchResult,
  MemoryStats,
  MemorySearchOptions
} from '../types/index.js';

// Core Memory limit: 2KB per item
const CORE_MEMORY_SIZE_LIMIT = 2048; // 2KB in bytes

export interface UnifiedMemorySearchOptions extends MemorySearchOptions {
  tier?: MemoryTier;
  scope?: MemoryScope;
  project_id?: string;
}

export interface UnifiedMemorySearchResult {
  memory: UnifiedMemory;
  similarity_score?: number;
  match_type: 'exact' | 'fuzzy' | 'semantic';
  context?: string;
}

export class UnifiedMemoryManager {
  private database!: Database.Database;
  private dbPath: string;
  private currentProjectId?: string;
  private isInitialized = false;

  constructor(projectId?: string) {
    this.currentProjectId = projectId;
    // Single global database for all memories
    this.dbPath = path.join(os.homedir(), '.copilot-mcp', 'memory', 'unified.db');
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure storage directory exists
      const storageDir = path.dirname(this.dbPath);
      await fs.mkdir(storageDir, { recursive: true });

      // Initialize single unified database
      this.database = new Database(this.dbPath);
      this.initializeDatabase();

      this.isInitialized = true;
      console.error(`[INFO] Unified Memory System initialized: ${this.dbPath}`);
    } catch (error) {
      console.error('[ERROR] Failed to initialize unified memory system:', error);
      throw error;
    }
  }

  /**
   * Store memory with dual-tier, bifurcated architecture
   */
  public async store(
    content: string,
    tier: MemoryTier,
    scope: MemoryScope,
    projectId?: string,
    tags: string[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    await this.initialize();

    // Validate content size for core tier
    const contentSize = Buffer.byteLength(content, 'utf8');
    if (tier === 'core' && contentSize > CORE_MEMORY_SIZE_LIMIT) {
      throw new Error(`Core memory exceeds 2KB limit (${contentSize} bytes). Use 'longterm' tier instead.`);
    }

    // Validate project_id for project-scoped memories
    if (scope === 'project') {
      const finalProjectId = projectId || this.currentProjectId;
      if (!finalProjectId) {
        throw new Error('Project-scoped memories require a project_id');
      }
      projectId = finalProjectId;
    }

    // For core tier, check if we're approaching total limit
    if (tier === 'core') {
      const currentCoreSize = await this.getCoreMemoryTotalSize(scope, projectId);
      if (currentCoreSize + contentSize > CORE_MEMORY_SIZE_LIMIT * 10) { // Allow up to 20KB total core memory
        console.error('[WARN] Core memory approaching size limits. Consider moving to long-term tier.');
      }
    }

    const memory: UnifiedMemory = {
      id: this.generateMemoryId(tier, scope),
      content,
      tier,
      scope,
      project_id: projectId,
      tags,
      created_at: new Date(),
      accessed_at: new Date(),
      access_count: 0,
      content_size: contentSize,
      metadata: {
        ...metadata,
        tier_description: this.getTierDescription(tier),
        scope_description: this.getScopeDescription(scope),
        project_name: projectId ? path.basename(projectId) : undefined
      }
    };

    // Store in unified database
    const stmt = this.database.prepare(`
      INSERT INTO unified_memories (
        id, content, tier, scope, project_id, tags, metadata,
        content_size, created_at, accessed_at, access_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
      memory.content,
      memory.tier,
      memory.scope,
      memory.project_id || null,
      JSON.stringify(memory.tags),
      JSON.stringify(memory.metadata),
      memory.content_size,
      memory.created_at.toISOString(),
      memory.accessed_at.toISOString(),
      memory.access_count
    );

    console.error(`[INFO] Stored ${tier}/${scope} memory (${contentSize} bytes): ${content.substring(0, 50)}...`);
    return memory.id;
  }

  /**
   * Search across unified memory database with tier/scope filtering
   */
  public async search(
    query: string,
    options: UnifiedMemorySearchOptions = {}
  ): Promise<UnifiedMemorySearchResult[]> {
    await this.initialize();

    // Build dynamic SQL with tier/scope filtering
    let sql = `
      SELECT * FROM unified_memories
      WHERE (
        LOWER(content) LIKE ? OR
        LOWER(tags) LIKE ? OR
        content GLOB ?
      )
    `;

    const params: any[] = [
      `%${query.toLowerCase()}%`,
      `%${query.toLowerCase()}%`,
      `*${query}*`
    ];

    // Add tier filter
    if (options.tier) {
      sql += ' AND tier = ?';
      params.push(options.tier);
    }

    // Add scope filter
    if (options.scope) {
      sql += ' AND scope = ?';
      params.push(options.scope);
    }

    // Add project filter for project-scoped searches
    if (options.project_id || (options.scope === 'project' && this.currentProjectId)) {
      sql += ' AND project_id = ?';
      params.push(options.project_id || this.currentProjectId);
    }

    // Prioritize core memories and recent access
    sql += `
      ORDER BY
        CASE WHEN tier = 'core' THEN 0 ELSE 1 END,
        access_count DESC,
        accessed_at DESC
      LIMIT ?
    `;
    params.push(options.limit || 10);

    try {
      const stmt = this.database.prepare(sql);
      const rows = stmt.all(...params) as any[];

      const results: UnifiedMemorySearchResult[] = [];

      for (const row of rows) {
        const memory = this.rowToUnifiedMemory(row);

        // Update access count
        await this.updateAccessCount(memory.id);

        results.push({
          memory,
          similarity_score: this.calculateRelevanceScore(memory, query),
          match_type: this.determineMatchType(memory, query),
          context: `${memory.tier.toUpperCase()}/${memory.scope.toUpperCase()}${memory.project_id ? ` (${path.basename(memory.project_id)})` : ''}`
        });
      }

      return results.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    } catch (error) {
      console.error('[ERROR] Search failed:', error);
      return [];
    }
  }

  /**
   * Get comprehensive memory statistics
   */
  public async getMemoryStats(): Promise<MemoryStats> {
    await this.initialize();

    // Count by tier and scope
    const tierCounts = this.database.prepare(`
      SELECT tier, scope, COUNT(*) as count, SUM(content_size) as total_size
      FROM unified_memories
      GROUP BY tier, scope
    `).all() as Array<{ tier: string; scope: string; count: number; total_size: number }>;

    // Get database size
    const dbStats = this.database.prepare(`
      SELECT page_count * page_size as size
      FROM pragma_page_count(), pragma_page_size()
    `).get() as { size: number };

    const totalMemories = tierCounts.reduce((sum, { count }) => sum + count, 0);
    const coreMemories = tierCounts.filter(t => t.tier === 'core').reduce((sum, { count }) => sum + count, 0);
    const longtermMemories = tierCounts.filter(t => t.tier === 'longterm').reduce((sum, { count }) => sum + count, 0);
    const coreSizeBytes = tierCounts.filter(t => t.tier === 'core').reduce((sum, { total_size }) => sum + (total_size || 0), 0);

    return {
      core_memory_size: coreSizeBytes,
      warm_storage_count: 0, // Legacy compatibility
      cold_storage_count: totalMemories,
      total_access_count: 0, // Could be calculated if needed
      last_cleanup: new Date(),
      storage_size_bytes: dbStats.size,
      storage_locations: {
        core: `Unified Database (Core: ${coreMemories} items, ${coreSizeBytes} bytes)`,
        warm: 'Unified Database - Single storage location',
        cold: `Database: ${this.dbPath}`,
        project: `Project memories: ${tierCounts.filter(t => t.scope === 'project').reduce((sum, { count }) => sum + count, 0)} items`
      },
      // Enhanced stats for new architecture
      totalMemories,
      byTier: {
        core: coreMemories,
        longterm: longtermMemories
      },
      byScope: {
        global: tierCounts.filter(t => t.scope === 'global').reduce((sum, { count }) => sum + count, 0),
        project: tierCounts.filter(t => t.scope === 'project').reduce((sum, { count }) => sum + count, 0)
      },
      coreSizeLimit: CORE_MEMORY_SIZE_LIMIT,
      coreUtilization: coreSizeBytes / CORE_MEMORY_SIZE_LIMIT
    } as any; // Type assertion for enhanced fields
  }

  /**
   * Get current core memory size for a given scope/project
   */
  public async getCoreMemoryTotalSize(scope?: MemoryScope, projectId?: string): Promise<number> {
    await this.initialize();

    let sql = `SELECT SUM(content_size) as total_size FROM unified_memories WHERE tier = 'core'`;
    const params: any[] = [];

    if (scope) {
      sql += ' AND scope = ?';
      params.push(scope);
    }

    if (projectId) {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }

    const result = this.database.prepare(sql).get(...params) as { total_size: number | null };
    return result.total_size || 0;
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    try {
      if (this.database) {
        this.database.close();
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('[ERROR] Failed to close unified memory system:', error);
    }
  }

  // Private helper methods

  private initializeDatabase(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS unified_memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        tier TEXT NOT NULL CHECK (tier IN ('core', 'longterm')),
        scope TEXT NOT NULL CHECK (scope IN ('global', 'project')),
        project_id TEXT,
        tags TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        content_size INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        accessed_at TEXT NOT NULL,
        access_count INTEGER DEFAULT 0,

        -- Constraints
        CONSTRAINT valid_project_scope CHECK (
          (scope = 'project' AND project_id IS NOT NULL) OR
          (scope = 'global')
        )
      );

      -- Indexes for optimal search performance
      CREATE INDEX IF NOT EXISTS idx_tier_scope ON unified_memories(tier, scope);
      CREATE INDEX IF NOT EXISTS idx_project_id ON unified_memories(project_id);
      CREATE INDEX IF NOT EXISTS idx_content_search ON unified_memories(LOWER(content));
      CREATE INDEX IF NOT EXISTS idx_tags_search ON unified_memories(LOWER(tags));
      CREATE INDEX IF NOT EXISTS idx_access_patterns ON unified_memories(tier, access_count, accessed_at);
      CREATE INDEX IF NOT EXISTS idx_size_tracking ON unified_memories(tier, content_size);

      PRAGMA case_sensitive_like = OFF;
    `);
  }

  private generateMemoryId(tier: MemoryTier, scope: MemoryScope): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `${tier}_${scope}_${timestamp}_${random}`;
  }

  private rowToUnifiedMemory(row: any): UnifiedMemory {
    return {
      id: row.id,
      content: row.content,
      tier: row.tier as MemoryTier,
      scope: row.scope as MemoryScope,
      project_id: row.project_id,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      content_size: row.content_size,
      created_at: new Date(row.created_at),
      accessed_at: new Date(row.accessed_at),
      access_count: row.access_count
    };
  }

  private async updateAccessCount(memoryId: string): Promise<void> {
    try {
      const stmt = this.database.prepare(`
        UPDATE unified_memories
        SET access_count = access_count + 1, accessed_at = ?
        WHERE id = ?
      `);
      stmt.run(new Date().toISOString(), memoryId);
    } catch (error) {
      console.error('[WARN] Failed to update access count:', error);
    }
  }

  private calculateRelevanceScore(memory: UnifiedMemory, query: string): number {
    let score = 0;
    const content = memory.content.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact matches get highest score
    if (content.includes(queryLower)) score += 100;

    // Tag matches
    if (memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))) score += 80;

    // Core memory gets priority boost
    if (memory.tier === 'core') score += 50;

    // Recent access boost
    const daysSinceAccess = (Date.now() - memory.accessed_at.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysSinceAccess);

    // Access frequency boost
    score += Math.min(memory.access_count, 20);

    return score;
  }

  private determineMatchType(memory: UnifiedMemory, query: string): 'exact' | 'fuzzy' | 'semantic' {
    const content = memory.content.toLowerCase();
    const queryLower = query.toLowerCase();

    if (content.includes(queryLower)) return 'exact';
    if (memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))) return 'exact';

    // Word overlap analysis
    const contentWords = content.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    const overlap = queryWords.filter(word => contentWords.some(cWord => cWord.includes(word)));

    if (overlap.length > queryWords.length * 0.6) return 'semantic';
    return 'fuzzy';
  }

  private getTierDescription(tier: MemoryTier): string {
    switch (tier) {
      case 'core':
        return 'Core Memory - Always accessible, 2KB limit per item, high priority in search';
      case 'longterm':
        return 'Long-term Memory - Unlimited storage, archived when not accessed';
      default:
        return 'Unknown tier';
    }
  }

  private getScopeDescription(scope: MemoryScope): string {
    switch (scope) {
      case 'global':
        return 'Global - Available across all projects and contexts';
      case 'project':
        return 'Project-specific - Only available within this project context';
      default:
        return 'Unknown scope';
    }
  }
}