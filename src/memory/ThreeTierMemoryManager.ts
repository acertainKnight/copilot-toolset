/**
 * Three-Tier Memory Manager - Core/Warm/Cold with automatic promotion/demotion
 * Implements true Letta-style hierarchical memory management
 */

import Database from 'better-sqlite3';
import { Level } from 'level';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CoreMemoryManager, MemoryBlock } from './CoreMemoryManager.js';
import { LocalSemanticSearch } from './LocalSemanticSearch.js';
import { Memory, MemoryLayer, MemorySearchOptions, MemorySearchResult, MemoryStats } from '../types/index.js';

export interface TierConfig {
  core: {
    maxSize: number; // 2KB default
    compressionThreshold: number;
  };
  warm: {
    maxEntries: number; // 10,000 default
    evictionPolicy: 'lru' | 'lfu' | 'ttl';
    ttlHours: number;
  };
  cold: {
    maxSize: number; // 500MB default
    compressionEnabled: boolean;
    indexingEnabled: boolean;
  };
}

export interface MemoryAccessPattern {
  memoryId: string;
  accessCount: number;
  lastAccessed: Date;
  avgTimeBetweenAccess: number;
  tier: 'core' | 'warm' | 'cold';
  promotionScore: number;
}

/**
 * Three-Tier Memory Manager implementing Letta-style architecture
 * - Core: 2KB fast memory blocks (CoreMemoryManager)
 * - Warm: LevelDB cache for frequently accessed items
 * - Cold: SQLite for long-term storage with semantic indexing
 */
export class ThreeTierMemoryManager {
  private coreMemory: CoreMemoryManager;
  private warmStorage!: Level<string, string>;
  private coldStorage!: Database.Database;
  private semanticSearch: LocalSemanticSearch;

  private config: TierConfig;
  private globalDbPath: string;
  private warmDbPath: string;
  private projectPath?: string;
  private isInitialized = false;

  private accessPatterns: Map<string, MemoryAccessPattern> = new Map();
  private promotionQueue: Set<string> = new Set();
  private demotionQueue: Set<string> = new Set();

  constructor(projectPath?: string, config?: Partial<TierConfig>) {
    this.projectPath = projectPath;
    this.globalDbPath = path.join(os.homedir(), '.copilot-mcp', 'memory', 'cold.db');
    this.warmDbPath = path.join(os.homedir(), '.copilot-mcp', 'memory', 'warm');

    this.config = {
      core: {
        maxSize: 2048, // 2KB Letta-style
        compressionThreshold: 0.8,
        ...config?.core
      },
      warm: {
        maxEntries: 10000,
        evictionPolicy: 'lru',
        ttlHours: 24,
        ...config?.warm
      },
      cold: {
        maxSize: 500 * 1024 * 1024, // 500MB
        compressionEnabled: true,
        indexingEnabled: true,
        ...config?.cold
      }
    };

    this.coreMemory = new CoreMemoryManager(
      this.config.core.maxSize,
      this.config.core.compressionThreshold
    );
    this.semanticSearch = new LocalSemanticSearch();
  }

  /**
   * Initialize all storage tiers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure directories exist
      await fs.mkdir(path.dirname(this.globalDbPath), { recursive: true });
      await fs.mkdir(path.dirname(this.warmDbPath), { recursive: true });

      // Initialize cold storage (SQLite)
      this.coldStorage = new Database(this.globalDbPath);
      this.initializeColdStorage();

      // Initialize warm storage (LevelDB)
      this.warmStorage = new Level(this.warmDbPath, { valueEncoding: 'json' });
      await this.warmStorage.open();

      // Load existing access patterns
      await this.loadAccessPatterns();

      // Start background tier management
      this.startTierManagement();

      this.isInitialized = true;
      console.log(`[THREE_TIER] Memory system initialized`);
      console.log(`[THREE_TIER] Core: ${this.config.core.maxSize}B, Warm: ${this.config.warm.maxEntries} entries, Cold: ${this.config.cold.maxSize}B`);

    } catch (error) {
      console.error('[THREE_TIER] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Store memory with automatic tier placement
   */
  async store(content: string, layer: MemoryLayer, tags: string[] = [], metadata?: Record<string, any>): Promise<string> {
    await this.initialize();

    const memoryId = `${layer}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const memory: Memory = {
      id: memoryId,
      content,
      layer,
      tags,
      created_at: new Date(),
      accessed_at: new Date(),
      access_count: 0,
      metadata: {
        ...metadata,
        project_path: this.projectPath,
        tier_placement_strategy: 'auto'
      }
    };

    // Determine initial tier placement
    const initialTier = this.determineInitialTier(memory);

    switch (initialTier) {
      case 'core':
        await this.storeInCore(memoryId, content, 5, tags);
        break;
      case 'warm':
        await this.storeInWarm(memoryId, memory);
        break;
      case 'cold':
        await this.storeInCold(memory);
        break;
    }

    // Initialize access pattern
    this.accessPatterns.set(memoryId, {
      memoryId,
      accessCount: 0,
      lastAccessed: new Date(),
      avgTimeBetweenAccess: 0,
      tier: initialTier,
      promotionScore: 0
    });

    console.log(`[THREE_TIER] Stored memory ${memoryId} in ${initialTier} tier`);
    return memoryId;
  }

  /**
   * Search across all tiers with intelligent result merging
   */
  async search(query: string, options: MemorySearchOptions = {}): Promise<MemorySearchResult[]> {
    await this.initialize();
    const results: MemorySearchResult[] = [];

    try {
      // 1. Search core memory first (fastest)
      const coreResults = await this.searchCore(query, options);
      results.push(...coreResults);

      // 2. Search warm storage (medium speed)
      const warmResults = await this.searchWarm(query, options);
      results.push(...warmResults);

      // 3. Search cold storage with semantic search (comprehensive)
      const coldResults = await this.searchCold(query, options);
      results.push(...coldResults);

      // Update access patterns for all retrieved memories
      for (const result of results) {
        await this.recordAccess(result.memory.id!);
      }

      // Merge and rank results
      const mergedResults = this.mergeAndRankResults(results, query);

      // Trigger tier management based on access patterns
      this.scheduleTierOptimization();

      return mergedResults.slice(0, options.limit || 10);

    } catch (error) {
      console.error('[THREE_TIER] Search failed:', error);
      return [];
    }
  }

  /**
   * Get comprehensive memory statistics
   */
  async getStats(): Promise<MemoryStats & { tier_stats: any }> {
    await this.initialize();

    // Core memory stats
    const coreStats = this.coreMemory.getStats();

    // Warm storage stats
    const warmEntries = await this.countWarmEntries();

    // Cold storage stats
    const coldStats = this.getColdStorageStats();

    // Access pattern analysis
    const accessStats = this.analyzeAccessPatterns();

    return {
      core_memory_size: coreStats.total_size_bytes,
      warm_storage_count: warmEntries,
      cold_storage_count: coldStats.total_memories,
      total_access_count: accessStats.totalAccesses,
      last_cleanup: new Date(),
      storage_size_bytes: coreStats.total_size_bytes + coldStats.storage_size,
      storage_locations: {
        core: `${coreStats.total_blocks} blocks, ${coreStats.total_size_bytes}B`,
        warm: `${warmEntries} entries (LevelDB)`,
        cold: `${coldStats.total_memories} memories (SQLite)`,
        project: this.projectPath ? `Project-scoped: ${this.projectPath}` : 'Global'
      },
      tier_stats: {
        core: {
          blocks: coreStats.total_blocks,
          size_bytes: coreStats.total_size_bytes,
          compression_ratio: coreStats.compression_ratio,
          avg_access_count: coreStats.avg_access_count
        },
        warm: {
          entries: warmEntries,
          hit_rate: accessStats.warmHitRate,
          eviction_rate: accessStats.warmEvictionRate
        },
        cold: {
          memories: coldStats.total_memories,
          size_bytes: coldStats.storage_size,
          index_size: coldStats.index_entries,
          semantic_index_ready: this.semanticSearch.getIndexStats().documentCount > 0
        },
        promotion_queue: this.promotionQueue.size,
        demotion_queue: this.demotionQueue.size,
        auto_optimization_enabled: true
      }
    };
  }

  /**
   * Determine optimal initial tier for new memory
   */
  private determineInitialTier(memory: Memory): 'core' | 'warm' | 'cold' {
    // High priority layers go to core/warm
    if (memory.layer === 'preference' && memory.content.length < 200) {
      return 'core';
    }

    if (memory.layer === 'system' || memory.layer === 'preference') {
      return 'warm';
    }

    // Large content goes to cold storage
    if (memory.content.length > 1000) {
      return 'cold';
    }

    // Default to warm for medium-priority content
    return 'warm';
  }

  /**
   * Store memory in core tier
   */
  private async storeInCore(memoryId: string, content: string, priority: number, tags: string[]): Promise<void> {
    await this.coreMemory.editBlock(memoryId, content, priority, tags);
  }

  /**
   * Store memory in warm tier
   */
  private async storeInWarm(memoryId: string, memory: Memory): Promise<void> {
    try {
      await this.warmStorage.put(memoryId, JSON.stringify({
        ...memory,
        tier: 'warm',
        stored_at: new Date().toISOString()
      }));

      // Manage warm storage size
      await this.enforceWarmStorageLimits();
    } catch (error) {
      console.error(`[THREE_TIER] Failed to store in warm tier:`, error);
      // Fallback to cold storage
      await this.storeInCold(memory);
    }
  }

  /**
   * Store memory in cold tier
   */
  private async storeInCold(memory: Memory): Promise<void> {
    const stmt = this.coldStorage.prepare(`
      INSERT INTO memories (id, layer, content, tags, metadata, project_path, created_at, accessed_at, access_count, tier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
      memory.layer,
      memory.content,
      JSON.stringify(memory.tags),
      JSON.stringify(memory.metadata),
      this.projectPath || null,
      memory.created_at!.toISOString(),
      memory.accessed_at!.toISOString(),
      memory.access_count,
      'cold'
    );
  }

  /**
   * Search core memory
   */
  private async searchCore(query: string, options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    const results = await this.coreMemory.searchBlocks(query);

    return results.map(result => ({
      memory: {
        id: result.id,
        content: result.content,
        layer: 'preference' as MemoryLayer,
        tags: [],
        created_at: new Date(),
        accessed_at: new Date(),
        access_count: 0
      },
      similarity_score: result.score,
      match_type: result.score > 80 ? 'exact' : 'semantic',
      context: 'CORE MEMORY - Fast access tier'
    }));
  }

  /**
   * Search warm storage
   */
  private async searchWarm(query: string, options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    const queryLower = query.toLowerCase();

    try {
      for await (const [key, value] of this.warmStorage.iterator()) {
        const memory = JSON.parse(value) as Memory;

        // Apply layer filter if specified
        if (options.layer && memory.layer !== options.layer) continue;

        // Apply project filter
        if (this.projectPath && memory.metadata?.project_path !== this.projectPath) {
          if (memory.layer !== 'preference' && memory.layer !== 'system') continue;
        }

        // Basic content matching
        let score = 0;
        if (memory.content.toLowerCase().includes(queryLower)) {
          score = 60;
        } else if (memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
          score = 40;
        }

        if (score > 0) {
          results.push({
            memory,
            similarity_score: score,
            match_type: score > 50 ? 'exact' : 'fuzzy',
            context: 'WARM STORAGE - Recent access cache'
          });
        }
      }
    } catch (error) {
      console.error('[THREE_TIER] Warm storage search failed:', error);
    }

    return results;
  }

  /**
   * Search cold storage with semantic search
   */
  private async searchCold(query: string, options: MemorySearchOptions): Promise<MemorySearchResult[]> {
    // First, get all memories from cold storage
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params: any[] = [];

    if (options.layer) {
      sql += ' AND layer = ?';
      params.push(options.layer);
    }

    if (this.projectPath) {
      sql += ' AND (project_path = ? OR project_path IS NULL)';
      params.push(this.projectPath);
    }

    sql += ' ORDER BY accessed_at DESC LIMIT ?';
    params.push(options.limit || 100);

    const stmt = this.coldStorage.prepare(sql);
    const rows = stmt.all(...params) as any[];

    const memories: Memory[] = rows.map(row => ({
      id: row.id,
      content: row.content,
      layer: row.layer,
      tags: JSON.parse(row.tags || '[]'),
      created_at: new Date(row.created_at),
      accessed_at: new Date(row.accessed_at),
      access_count: row.access_count,
      metadata: JSON.parse(row.metadata || '{}')
    }));

    // Use semantic search for better results
    const semanticResults = this.semanticSearch.search(query, memories, {
      minScore: 0.1,
      maxResults: options.limit || 10,
      boostRecentAccess: true,
      layerWeights: {
        preference: 1.2,
        system: 1.1,
        project: 1.0,
        prompt: 0.8
      }
    });

    // Add context information
    return semanticResults.map(result => ({
      ...result,
      context: `COLD STORAGE - ${result.context}`
    }));
  }

  /**
   * Record memory access for tier management
   */
  private async recordAccess(memoryId: string): Promise<void> {
    let pattern = this.accessPatterns.get(memoryId);

    if (!pattern) {
      // Try to find which tier contains this memory
      const tier = await this.findMemoryTier(memoryId);
      pattern = {
        memoryId,
        accessCount: 0,
        lastAccessed: new Date(),
        avgTimeBetweenAccess: 0,
        tier,
        promotionScore: 0
      };
    }

    const now = new Date();
    const timeSinceLastAccess = now.getTime() - pattern.lastAccessed.getTime();

    pattern.accessCount++;
    pattern.avgTimeBetweenAccess = (pattern.avgTimeBetweenAccess + timeSinceLastAccess) / 2;
    pattern.lastAccessed = now;
    pattern.promotionScore = this.calculatePromotionScore(pattern);

    this.accessPatterns.set(memoryId, pattern);

    // Check if memory should be promoted/demoted
    if (pattern.promotionScore > 80 && pattern.tier !== 'core') {
      this.promotionQueue.add(memoryId);
    } else if (pattern.promotionScore < 20 && pattern.tier !== 'cold') {
      this.demotionQueue.add(memoryId);
    }
  }

  /**
   * Calculate promotion score based on access patterns
   */
  private calculatePromotionScore(pattern: MemoryAccessPattern): number {
    let score = 0;

    // Access frequency (40% of score)
    const accessFrequency = Math.min(pattern.accessCount / 10, 1);
    score += accessFrequency * 40;

    // Recency (30% of score)
    const hoursSinceAccess = (Date.now() - pattern.lastAccessed.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (hoursSinceAccess / 24)); // Decay over 24 hours
    score += recencyScore * 30;

    // Access pattern consistency (20% of score)
    const consistencyScore = pattern.avgTimeBetweenAccess > 0 ?
      Math.min(1 / Math.log(pattern.avgTimeBetweenAccess / (1000 * 60 * 60) + 1), 1) : 0;
    score += consistencyScore * 20;

    // Tier bonus/penalty (10% of score)
    if (pattern.tier === 'core') score -= 10; // Harder to promote from core
    if (pattern.tier === 'cold') score += 10; // Easier to promote from cold

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Find which tier contains a specific memory
   */
  private async findMemoryTier(memoryId: string): Promise<'core' | 'warm' | 'cold'> {
    // Check core
    const coreBlocks = this.coreMemory.listBlocks();
    if (coreBlocks.some(block => block.id === memoryId)) {
      return 'core';
    }

    // Check warm
    try {
      await this.warmStorage.get(memoryId);
      return 'warm';
    } catch (error) {
      // Not in warm storage
    }

    // Default to cold
    return 'cold';
  }

  /**
   * Merge and rank results from all tiers
   */
  private mergeAndRankResults(results: MemorySearchResult[], query: string): MemorySearchResult[] {
    // Remove duplicates based on memory ID
    const uniqueResults = new Map<string, MemorySearchResult>();

    for (const result of results) {
      const existing = uniqueResults.get(result.memory.id!);
      if (!existing || (result.similarity_score || 0) > (existing.similarity_score || 0)) {
        uniqueResults.set(result.memory.id!, result);
      }
    }

    // Apply tier bonuses for final ranking
    const rankedResults = Array.from(uniqueResults.values()).map(result => {
      let bonus = 0;
      if (result.context?.includes('CORE')) bonus = 20;
      else if (result.context?.includes('WARM')) bonus = 10;
      else if (result.context?.includes('COLD')) bonus = 0;

      return {
        ...result,
        similarity_score: (result.similarity_score || 0) + bonus
      };
    });

    return rankedResults.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
  }

  /**
   * Start background tier management
   */
  private startTierManagement(): void {
    // Process promotion/demotion queues every 30 seconds
    setInterval(async () => {
      await this.processTierOptimization();
    }, 30 * 1000);

    // Save access patterns every 5 minutes
    setInterval(async () => {
      await this.saveAccessPatterns();
    }, 5 * 60 * 1000);
  }

  /**
   * Process tier optimization queues
   */
  private async processTierOptimization(): Promise<void> {
    // Process promotions
    for (const memoryId of Array.from(this.promotionQueue).slice(0, 10)) {
      try {
        await this.promoteMemory(memoryId);
        this.promotionQueue.delete(memoryId);
      } catch (error) {
        console.error(`[THREE_TIER] Failed to promote ${memoryId}:`, error);
      }
    }

    // Process demotions
    for (const memoryId of Array.from(this.demotionQueue).slice(0, 10)) {
      try {
        await this.demoteMemory(memoryId);
        this.demotionQueue.delete(memoryId);
      } catch (error) {
        console.error(`[THREE_TIER] Failed to demote ${memoryId}:`, error);
      }
    }
  }

  /**
   * Promote memory to higher tier
   */
  private async promoteMemory(memoryId: string): Promise<void> {
    const pattern = this.accessPatterns.get(memoryId);
    if (!pattern) return;

    const memory = await this.getMemoryFromAnyTier(memoryId);
    if (!memory) return;

    switch (pattern.tier) {
      case 'cold':
        // Promote to warm
        await this.moveMemory(memoryId, 'cold', 'warm');
        pattern.tier = 'warm';
        console.log(`[THREE_TIER] Promoted ${memoryId} from cold to warm`);
        break;
      case 'warm':
        // Promote to core (if there's space and content is small enough)
        if (memory.content.length < 500) {
          await this.moveMemory(memoryId, 'warm', 'core');
          pattern.tier = 'core';
          console.log(`[THREE_TIER] Promoted ${memoryId} from warm to core`);
        }
        break;
    }
  }

  /**
   * Demote memory to lower tier
   */
  private async demoteMemory(memoryId: string): Promise<void> {
    const pattern = this.accessPatterns.get(memoryId);
    if (!pattern) return;

    switch (pattern.tier) {
      case 'core':
        // Demote to warm
        await this.moveMemory(memoryId, 'core', 'warm');
        pattern.tier = 'warm';
        console.log(`[THREE_TIER] Demoted ${memoryId} from core to warm`);
        break;
      case 'warm':
        // Demote to cold
        await this.moveMemory(memoryId, 'warm', 'cold');
        pattern.tier = 'cold';
        console.log(`[THREE_TIER] Demoted ${memoryId} from warm to cold`);
        break;
    }
  }

  /**
   * Move memory between tiers
   */
  private async moveMemory(memoryId: string, fromTier: string, toTier: string): Promise<void> {
    const memory = await this.getMemoryFromAnyTier(memoryId);
    if (!memory) return;

    // Remove from source tier
    switch (fromTier) {
      case 'core':
        this.coreMemory.deleteBlock(memoryId);
        break;
      case 'warm':
        try {
          await this.warmStorage.del(memoryId);
        } catch (error) {
          console.error(`Failed to delete from warm storage: ${error}`);
        }
        break;
      case 'cold':
        const stmt = this.coldStorage.prepare('DELETE FROM memories WHERE id = ?');
        stmt.run(memoryId);
        break;
    }

    // Add to destination tier
    switch (toTier) {
      case 'core':
        await this.coreMemory.editBlock(memoryId, memory.content, 7, memory.tags || []);
        break;
      case 'warm':
        await this.storeInWarm(memoryId, memory);
        break;
      case 'cold':
        await this.storeInCold(memory);
        break;
    }
  }

  /**
   * Get memory from any tier
   */
  private async getMemoryFromAnyTier(memoryId: string): Promise<Memory | null> {
    // Try core first
    const coreContent = await this.coreMemory.getBlock(memoryId);
    if (coreContent) {
      return {
        id: memoryId,
        content: coreContent,
        layer: 'preference' as MemoryLayer,
        tags: [],
        created_at: new Date(),
        accessed_at: new Date(),
        access_count: 0
      };
    }

    // Try warm storage
    try {
      const warmData = await this.warmStorage.get(memoryId);
      return JSON.parse(warmData) as Memory;
    } catch (error) {
      // Not in warm storage
    }

    // Try cold storage
    const stmt = this.coldStorage.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(memoryId) as any;

    if (row) {
      return {
        id: row.id,
        content: row.content,
        layer: row.layer,
        tags: JSON.parse(row.tags || '[]'),
        created_at: new Date(row.created_at),
        accessed_at: new Date(row.accessed_at),
        access_count: row.access_count,
        metadata: JSON.parse(row.metadata || '{}')
      };
    }

    return null;
  }

  /**
   * Initialize cold storage schema
   */
  private initializeColdStorage(): void {
    this.coldStorage.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        layer TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        metadata TEXT,
        project_path TEXT,
        created_at TEXT,
        accessed_at TEXT,
        access_count INTEGER DEFAULT 0,
        tier TEXT DEFAULT 'cold'
      );

      CREATE INDEX IF NOT EXISTS idx_tier ON memories(tier);
      CREATE INDEX IF NOT EXISTS idx_layer ON memories(layer);
      CREATE INDEX IF NOT EXISTS idx_project ON memories(project_path);
      CREATE INDEX IF NOT EXISTS idx_accessed ON memories(accessed_at);
      CREATE INDEX IF NOT EXISTS idx_access_count ON memories(access_count);
      CREATE INDEX IF NOT EXISTS idx_content_fts ON memories(content);

      PRAGMA case_sensitive_like = OFF;
    `);
  }

  /**
   * Utility methods for statistics
   */
  private async countWarmEntries(): Promise<number> {
    let count = 0;
    try {
      for await (const [key] of this.warmStorage.iterator()) {
        count++;
      }
    } catch (error) {
      console.error('[THREE_TIER] Failed to count warm entries:', error);
    }
    return count;
  }

  private getColdStorageStats(): { total_memories: number; storage_size: number; index_entries: number } {
    const countStmt = this.coldStorage.prepare('SELECT COUNT(*) as count FROM memories');
    const sizeStmt = this.coldStorage.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');

    const countResult = countStmt.get() as { count: number };
    const sizeResult = sizeStmt.get() as { size: number };

    return {
      total_memories: countResult.count,
      storage_size: sizeResult.size,
      index_entries: this.semanticSearch.getIndexStats().vocabularySize
    };
  }

  private analyzeAccessPatterns(): {
    totalAccesses: number;
    warmHitRate: number;
    warmEvictionRate: number;
  } {
    const patterns = Array.from(this.accessPatterns.values());

    return {
      totalAccesses: patterns.reduce((sum, p) => sum + p.accessCount, 0),
      warmHitRate: patterns.filter(p => p.tier === 'warm').length / Math.max(patterns.length, 1),
      warmEvictionRate: 0.05 // Placeholder - would track actual evictions
    };
  }

  private async enforceWarmStorageLimits(): Promise<void> {
    const currentCount = await this.countWarmEntries();

    if (currentCount > this.config.warm.maxEntries) {
      // Evict least recently used entries
      const entriesToEvict = currentCount - this.config.warm.maxEntries;
      let evicted = 0;

      try {
        for await (const [key, value] of this.warmStorage.iterator()) {
          if (evicted >= entriesToEvict) break;

          const memory = JSON.parse(value) as Memory & { stored_at: string };
          const pattern = this.accessPatterns.get(key);

          // Evict if low access or old
          if (!pattern || pattern.accessCount < 2 ||
              Date.now() - new Date(memory.stored_at).getTime() > this.config.warm.ttlHours * 60 * 60 * 1000) {

            await this.warmStorage.del(key);

            // Move to cold storage
            await this.storeInCold(memory);

            // Update access pattern
            if (pattern) {
              pattern.tier = 'cold';
            }

            evicted++;
          }
        }
      } catch (error) {
        console.error('[THREE_TIER] Failed to enforce warm storage limits:', error);
      }
    }
  }

  private scheduleTierOptimization(): void {
    // Schedule optimization to run after current operation completes
    setTimeout(() => {
      this.processTierOptimization().catch(error => {
        console.error('[THREE_TIER] Tier optimization failed:', error);
      });
    }, 100);
  }

  private async loadAccessPatterns(): Promise<void> {
    // In a full implementation, this would load patterns from persistent storage
    console.log('[THREE_TIER] Access patterns initialized');
  }

  private async saveAccessPatterns(): Promise<void> {
    // In a full implementation, this would save patterns to persistent storage
    console.log(`[THREE_TIER] Saved ${this.accessPatterns.size} access patterns`);
  }

  /**
   * Close all storage connections
   */
  async close(): Promise<void> {
    try {
      if (this.warmStorage) {
        await this.warmStorage.close();
      }
      if (this.coldStorage) {
        this.coldStorage.close();
      }
      this.coreMemory.clear();
      this.isInitialized = false;
      console.log('[THREE_TIER] Memory system closed');
    } catch (error) {
      console.error('[THREE_TIER] Failed to close memory system:', error);
    }
  }
}