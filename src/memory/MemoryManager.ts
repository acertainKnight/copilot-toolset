/**
 * Three-Tier Memory Manager for GitHub Copilot MCP
 * Implements core memory (Map) + warm storage (LevelDB) + cold storage (SQLite)
 * All accessible through clear MCP tools for GitHub Copilot
 */

import Database from 'better-sqlite3';
import { Level } from 'level';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Memory, MemoryLayer, MemorySearchOptions, MemorySearchResult, MemoryStats } from '../types/index.js';

export class MemoryManager {
  private coreMemory: Map<string, Memory>;
  private warmStorage!: Level<string, Memory>;
  private coldStorage!: Database.Database;
  private basePath: string;
  private projectPath?: string;
  private isInitialized = false;

  constructor(projectPath?: string) {
    this.projectPath = projectPath;
    this.basePath = path.join(os.homedir(), '.copilot-mcp');
    this.coreMemory = new Map();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure storage directories exist
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'memory'), { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'cache'), { recursive: true });

      // Initialize core memory (always in context)
      this.initializeCoreMemory();

      // Initialize warm storage (LevelDB for recent/active data)
      const levelPath = path.join(this.basePath, 'cache');
      this.warmStorage = new Level<string, Memory>(levelPath, {
        valueEncoding: 'json'
      });

      // Initialize cold storage (SQLite for long-term knowledge)
      const dbPath = path.join(this.basePath, 'memory', 'memories.db');
      this.coldStorage = new Database(dbPath);
      this.initializeDatabase();

      // Load existing memories into core
      await this.loadCoreMemories();

      this.isInitialized = true;
      console.error(`[INFO] Memory system initialized: Core=${this.coreMemory.size}, Storage=${dbPath}`);
    } catch (error) {
      console.error('[ERROR] Failed to initialize memory system:', error);
      throw error;
    }
  }

  /**
   * Store memory in appropriate tier based on layer and access patterns
   * GitHub Copilot will call this when it needs to remember user preferences or project context
   */
  public async store(content: string, layer: MemoryLayer, tags: string[] = [], metadata?: Record<string, any>): Promise<string> {
    await this.initialize();

    const memory: Memory = {
      id: `${layer}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      content,
      layer,
      tags,
      created_at: new Date(),
      accessed_at: new Date(),
      access_count: 0,
      metadata: {
        ...metadata,
        project_path: this.projectPath,
        storage_location: this.getStorageLocationDescription(layer)
      }
    };

    // Store in appropriate tier
    if (layer === 'preference' || layer === 'system') {
      // Global user preferences and system patterns go to core memory
      this.coreMemory.set(memory.id!, memory);
      console.error(`[INFO] Stored in CORE memory: ${layer} - ${content.substring(0, 50)}...`);
    }

    // Always store in warm storage for recent access
    await this.warmStorage.put(memory.id!, memory);

    // Store in cold storage for long-term persistence
    const stmt = this.coldStorage.prepare(`
      INSERT INTO memories (id, layer, content, tags, metadata, project_path, created_at, accessed_at, access_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      memory.access_count
    );

    return memory.id!;
  }

  /**
   * Search across all memory tiers with intelligent tier selection
   * GitHub Copilot uses this to find relevant context and preferences
   */
  public async search(query: string, options: MemorySearchOptions = {}): Promise<MemorySearchResult[]> {
    await this.initialize();
    const results: MemorySearchResult[] = [];
    const queryLower = query.toLowerCase();

    // 1. Search core memory first (fastest, always relevant)
    for (const [id, memory] of this.coreMemory.entries()) {
      if (this.matchesQuery(memory, queryLower, options)) {
        results.push({
          memory: { ...memory, id },
          similarity_score: this.calculateScore(memory, queryLower),
          match_type: 'exact',
          context: `CORE MEMORY - Always available: ${this.getStorageLocationDescription(memory.layer)}`
        });
      }
    }

    // 2. Search warm storage (recent/active data)
    try {
      for await (const [id, memory] of this.warmStorage.iterator()) {
        if (this.matchesQuery(memory, queryLower, options)) {
          results.push({
            memory: { ...memory, id },
            similarity_score: this.calculateScore(memory, queryLower),
            match_type: 'fuzzy',
            context: `WARM STORAGE - Recent data: ${this.getStorageLocationDescription(memory.layer)}`
          });
        }
      }
    } catch (error) {
      console.error('[WARN] Warm storage search failed:', error);
    }

    // 3. Search cold storage (comprehensive search)
    const stmt = this.coldStorage.prepare(`
      SELECT * FROM memories
      WHERE (content LIKE ? OR tags LIKE ?)
      ${options.layer ? 'AND layer = ?' : ''}
      ${this.projectPath ? 'AND (project_path = ? OR project_path IS NULL)' : ''}
      ORDER BY accessed_at DESC
      LIMIT ?
    `);

    const params = [`%${queryLower}%`, `%${queryLower}%`];
    if (options.layer) params.push(options.layer);
    if (this.projectPath) params.push(this.projectPath);
    params.push((options.limit || 10).toString());

    const coldResults = stmt.all(...params) as any[];
    for (const row of coldResults) {
      results.push({
        memory: {
          id: row.id,
          content: row.content,
          layer: row.layer,
          tags: JSON.parse(row.tags || '[]'),
          created_at: new Date(row.created_at),
          accessed_at: new Date(row.accessed_at),
          access_count: row.access_count,
          metadata: JSON.parse(row.metadata || '{}')
        },
        similarity_score: this.calculateScore({ content: row.content }, queryLower),
        match_type: 'semantic',
        context: `COLD STORAGE - Persistent data: ${this.getStorageLocationDescription(row.layer)}`
      });
    }

    // Update access counts for retrieved memories
    for (const result of results) {
      await this.updateAccessCount(result.memory.id!);
    }

    return results
      .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
      .slice(0, options.limit || 10);
  }

  /**
   * Get memory statistics across all tiers
   * Shows GitHub Copilot exactly where information is stored
   */
  public async getMemoryStats(): Promise<MemoryStats> {
    await this.initialize();

    // Count warm storage
    let warmCount = 0;
    try {
      for await (const [id] of this.warmStorage.iterator()) {
        warmCount++;
      }
    } catch (error) {
      console.error('[WARN] Could not count warm storage:', error);
    }

    // Count cold storage
    const coldStmt = this.coldStorage.prepare('SELECT COUNT(*) as count FROM memories');
    const coldResult = coldStmt.get() as { count: number };

    // Calculate storage sizes
    const coreSize = JSON.stringify(Array.from(this.coreMemory.values())).length;
    const dbStats = this.coldStorage.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number };

    return {
      core_memory_size: this.coreMemory.size,
      warm_storage_count: warmCount,
      cold_storage_count: coldResult.count,
      total_access_count: this.getTotalAccessCount(),
      last_cleanup: new Date(),
      storage_size_bytes: coreSize + (dbStats?.size || 0),
      storage_locations: {
        core: 'In-memory Map (always available)',
        warm: `LevelDB cache: ${path.join(this.basePath, 'cache')}`,
        cold: `SQLite database: ${path.join(this.basePath, 'memory', 'memories.db')}`,
        project: this.projectPath ? `Project-specific: ${path.join(this.projectPath, '.copilot', 'memory')}` : 'No project loaded'
      }
    };
  }

  /**
   * Promote frequently accessed memories to faster tiers
   * Automatic memory management like Letta/MemGPT
   */
  public async promoteMemories(): Promise<number> {
    await this.initialize();

    // Find frequently accessed memories in cold storage
    const stmt = this.coldStorage.prepare(`
      SELECT * FROM memories
      WHERE access_count > 5
      AND layer IN ('preference', 'system')
      ORDER BY access_count DESC, accessed_at DESC
      LIMIT 10
    `);

    const hotMemories = stmt.all() as any[];
    let promotedCount = 0;

    for (const row of hotMemories) {
      const memory: Memory = {
        id: row.id,
        content: row.content,
        layer: row.layer,
        tags: JSON.parse(row.tags || '[]'),
        created_at: new Date(row.created_at),
        accessed_at: new Date(row.accessed_at),
        access_count: row.access_count,
        metadata: JSON.parse(row.metadata || '{}')
      };

      // Promote to core memory if it's a preference or system pattern
      if (memory.layer === 'preference' || memory.layer === 'system') {
        this.coreMemory.set(memory.id!, memory);
        promotedCount++;
      }

      // Always promote to warm storage
      await this.warmStorage.put(memory.id!, memory);
    }

    console.error(`[INFO] Promoted ${promotedCount} memories to faster tiers`);
    return promotedCount;
  }

  public async close(): Promise<void> {
    try {
      if (this.warmStorage) {
        await this.warmStorage.close();
      }
      if (this.coldStorage) {
        this.coldStorage.close();
      }
      this.coreMemory.clear();
      this.isInitialized = false;
    } catch (error) {
      console.error('[ERROR] Error closing memory system:', error);
    }
  }

  // Private helper methods
  private initializeCoreMemory(): void {
    // Core memory holds the most important user preferences and patterns
    this.coreMemory.set('user_preferences', {
      id: 'core_user_preferences',
      content: JSON.stringify({
        coding_style: 'functional',
        preferred_languages: ['typescript', 'python'],
        architecture_patterns: ['clean_architecture'],
        testing_preferences: ['jest'],
        documentation_style: 'detailed'
      }),
      layer: 'preference',
      tags: ['preferences', 'core'],
      created_at: new Date(),
      accessed_at: new Date(),
      access_count: 0,
      metadata: { storage_location: 'Core memory - always available across all projects' }
    });
  }

  private initializeDatabase(): void {
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
        access_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_layer ON memories(layer);
      CREATE INDEX IF NOT EXISTS idx_project ON memories(project_path);
      CREATE INDEX IF NOT EXISTS idx_accessed ON memories(accessed_at);
      CREATE INDEX IF NOT EXISTS idx_access_count ON memories(access_count);
    `);
  }

  private async loadCoreMemories(): Promise<void> {
    // Load frequently accessed preferences and system patterns into core memory
    const stmt = this.coldStorage.prepare(`
      SELECT * FROM memories
      WHERE layer IN ('preference', 'system')
      AND access_count > 3
      ORDER BY access_count DESC
      LIMIT 20
    `);

    const coreMemories = stmt.all() as any[];
    for (const row of coreMemories) {
      const memory: Memory = {
        id: row.id,
        content: row.content,
        layer: row.layer,
        tags: JSON.parse(row.tags || '[]'),
        created_at: new Date(row.created_at),
        accessed_at: new Date(row.accessed_at),
        access_count: row.access_count,
        metadata: JSON.parse(row.metadata || '{}')
      };

      this.coreMemory.set(memory.id!, memory);
    }
  }

  private matchesQuery(memory: Memory, queryLower: string, options: MemorySearchOptions): boolean {
    if (options.layer && memory.layer !== options.layer) return false;

    const contentMatch = memory.content.toLowerCase().includes(queryLower);
    const tagMatch = memory.tags?.some(tag => tag.toLowerCase().includes(queryLower)) || false;

    return contentMatch || tagMatch;
  }

  private calculateScore(memory: { content: string }, queryLower: string): number {
    const content = memory.content.toLowerCase();
    const exactMatch = content.includes(queryLower);
    const wordBoundaryMatch = new RegExp(`\\b${queryLower}\\b`).test(content);

    if (exactMatch && wordBoundaryMatch) return 1.0;
    if (exactMatch) return 0.8;
    if (wordBoundaryMatch) return 0.6;

    // Fuzzy scoring based on word distance
    const words = content.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    let matches = 0;

    for (const queryWord of queryWords) {
      if (words.some(word => word.includes(queryWord))) {
        matches++;
      }
    }

    return matches / queryWords.length * 0.4;
  }

  private async updateAccessCount(memoryId: string): Promise<void> {
    // Update in core memory if present
    const coreMemory = this.coreMemory.get(memoryId);
    if (coreMemory) {
      coreMemory.access_count = (coreMemory.access_count || 0) + 1;
      coreMemory.accessed_at = new Date();
    }

    // Update in cold storage
    const stmt = this.coldStorage.prepare(`
      UPDATE memories
      SET access_count = access_count + 1, accessed_at = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), memoryId);
  }

  private getTotalAccessCount(): number {
    const stmt = this.coldStorage.prepare('SELECT SUM(access_count) as total FROM memories');
    const result = stmt.get() as { total: number };
    return result.total || 0;
  }

  private getStorageLocationDescription(layer: MemoryLayer): string {
    const descriptions = {
      'preference': 'Global user preferences - shared across all projects',
      'project': 'Project-specific context - isolated to this project',
      'prompt': 'Session-specific context - temporary for current conversation',
      'system': 'System patterns and error fixes - shared across all projects'
    };

    return descriptions[layer] || 'General storage';
  }
}