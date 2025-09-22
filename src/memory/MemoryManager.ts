/**
 * Unified SQLite Memory Manager for GitHub Copilot MCP
 * Single global SQLite database for all memory storage with advanced search capabilities
 * Designed for clear integration with GitHub Copilot workflows
 */

import Database from 'better-sqlite3';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Memory, MemoryLayer, MemorySearchOptions, MemorySearchResult, MemoryStats } from '../types/index.js';

export class MemoryManager {
  private database!: Database.Database;
  private globalDbPath: string;
  private projectPath?: string;
  private isInitialized = false;

  constructor(projectPath?: string) {
    this.projectPath = projectPath;
    this.globalDbPath = path.join(os.homedir(), '.copilot-mcp', 'memory', 'global.db');
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure global storage directory exists
      const globalDir = path.dirname(this.globalDbPath);
      await fs.mkdir(globalDir, { recursive: true });

      // Initialize single global database for all memories
      this.database = new Database(this.globalDbPath);
      this.initializeDatabase();

      this.isInitialized = true;
      console.error(`[INFO] Memory system initialized: Global=${this.globalDbPath}`);
    } catch (error) {
      console.error('[ERROR] Failed to initialize memory system:', error);
      throw error;
    }
  }

  /**
   * Store memory in global SQLite database
   * All memories stored in single global location for easy access and searching
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

    // Store in global SQLite database with advanced indexing for search
    const stmt = this.database.prepare(`
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

    console.error(`[INFO] Stored memory in ${layer} layer: ${content.substring(0, 50)}...`);
    return memory.id!;
  }

  /**
   * Advanced search across global SQLite database with grep-style pattern matching
   * GitHub Copilot should use this BEFORE any coding actions or implementation planning
   */
  public async search(query: string, options: MemorySearchOptions = {}): Promise<MemorySearchResult[]> {
    await this.initialize();
    const results: MemorySearchResult[] = [];

    // Search single global database for all memories
    const searchResults = await this.searchDatabase(this.database, query, options, 'GLOBAL');
    results.push(...searchResults);

    // Update access counts for retrieved memories
    for (const result of results) {
      await this.updateAccessCount(result.memory.id!);
    }

    // Sort by relevance and deduplicate
    const uniqueResults = this.deduplicateResults(results);
    return uniqueResults
      .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
      .slice(0, options.limit || 10);
  }

  /**
   * Search within a specific SQLite database with advanced pattern matching
   */
  private async searchDatabase(db: Database.Database, query: string, options: MemorySearchOptions, context: string): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Build dynamic SQL query with multiple search strategies
    let sql = `
      SELECT * FROM memories 
      WHERE (
        -- Exact content match (highest priority)
        LOWER(content) LIKE ? OR 
        -- Tag match
        LOWER(tags) LIKE ? OR
        -- Grep-style pattern matching
        content GLOB ?
      )
    `;
    
    const params: any[] = [
      `%${queryLower}%`,  // Exact content match
      `%${queryLower}%`,  // Tag match  
      `*${query}*`        // Glob pattern
    ];

    // Add layer filter if specified
    if (options.layer) {
      sql += ' AND layer = ?';
      params.push(options.layer);
    }

    // Add project path filter for project-specific searches
    if (this.projectPath && (options.layer === 'project' || options.layer === 'prompt')) {
      sql += ' AND (project_path = ? OR project_path IS NULL)';
      params.push(this.projectPath);
    }

    sql += ' ORDER BY accessed_at DESC, access_count DESC LIMIT ?';
    params.push(options.limit || 10);

    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      for (const row of rows) {
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

        results.push({
          memory,
          similarity_score: this.calculateAdvancedScore(memory, queryLower),
          match_type: this.determineMatchType(memory, query),
          context: `${context} STORAGE - ${this.getStorageLocationDescription(memory.layer)}`
        });
      }
    } catch (error) {
      // Fallback to simpler search if advanced features fail
      console.error(`[WARN] Advanced search failed, falling back to simple search:`, error);
      const fallbackSql = `
        SELECT * FROM memories 
        WHERE LOWER(content) LIKE ? OR LOWER(tags) LIKE ?
        ${options.layer ? 'AND layer = ?' : ''}
        ORDER BY accessed_at DESC 
        LIMIT ?
      `;
      
      const fallbackParams = [`%${queryLower}%`, `%${queryLower}%`];
      if (options.layer) fallbackParams.push(options.layer);
      fallbackParams.push((options.limit || 10).toString());

      const stmt = db.prepare(fallbackSql);
      const rows = stmt.all(...fallbackParams) as any[];
      
      for (const row of rows) {
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

        results.push({
          memory,
          similarity_score: this.calculateAdvancedScore(memory, queryLower),
          match_type: 'fuzzy',
          context: `${context} STORAGE - ${this.getStorageLocationDescription(memory.layer)}`
        });
      }
    }

    return results;
  }

  /**
   * Remove duplicate results based on content similarity
   */
  private deduplicateResults(results: MemorySearchResult[]): MemorySearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.memory.layer}-${result.memory.content.substring(0, 100)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Determine the type of match for better scoring
   */
  private determineMatchType(memory: Memory, query: string): 'exact' | 'fuzzy' | 'semantic' {
    const content = memory.content.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (content.includes(queryLower)) return 'exact';
    if (memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))) return 'exact';
    
    // Check for semantic similarity (word overlap)
    const contentWords = content.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    const overlap = queryWords.filter(word => contentWords.some(cWord => cWord.includes(word)));
    
    if (overlap.length > queryWords.length * 0.6) return 'semantic';
    return 'fuzzy';
  }

  /**
   * Calculate relevance score with multiple factors
   */
  private calculateAdvancedScore(memory: Memory, queryLower: string): number {
    let score = 0;
    const content = memory.content.toLowerCase();
    
    // Exact matches get highest score
    if (content.includes(queryLower)) score += 100;
    
    // Tag matches
    if (memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))) score += 80;
    
    // Word overlap scoring
    const contentWords = content.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    const overlap = queryWords.filter(word => 
      contentWords.some(cWord => cWord.includes(word))
    );
    score += (overlap.length / queryWords.length) * 60;
    
    // Recency boost
    const daysSinceAccess = (Date.now() - memory.accessed_at!.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 20 - daysSinceAccess);
    
    // Access frequency boost
    score += Math.min(memory.access_count || 0, 10);
    
    // Layer priority (preferences and system patterns are important)
    if (memory.layer === 'preference') score += 15;
    if (memory.layer === 'system') score += 10;
    
    return score;
  }

    /**
   * Get comprehensive memory statistics from global database
   * Shows GitHub Copilot exactly where information is stored and accessible
   */
  public async getMemoryStats(): Promise<MemoryStats> {
    await this.initialize();

    // Count memories by layer in global database
    const stmt = this.database.prepare('SELECT COUNT(*) as count, layer FROM memories GROUP BY layer');
    const counts = stmt.all() as { count: number; layer: string }[];

    // Get database size information
    const dbStats = this.database.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number };

    const totalMemories = counts.reduce((sum, { count }) => sum + count, 0);

    return {
      core_memory_size: 0, // Legacy compatibility
      warm_storage_count: 0, // Legacy compatibility  
      cold_storage_count: totalMemories,
      total_access_count: 0,
      last_cleanup: new Date(),
      storage_size_bytes: dbStats.size,
      storage_locations: {
        core: 'Global SQLite Database - all memories accessible globally',
        warm: 'Global SQLite Database - single unified storage',
        cold: `Global: ${this.globalDbPath}`,
        project: 'All stored in global database for easy access'
      }
    };
  }

  /**
   * Update access count for a memory to track usage patterns
   */
  private async updateAccessCount(memoryId: string): Promise<void> {
    await this.initialize();
    
    try {
      const stmt = this.database.prepare(`
        UPDATE memories 
        SET access_count = access_count + 1, accessed_at = ? 
        WHERE id = ?
      `);
      stmt.run(new Date().toISOString(), memoryId);
    } catch (error) {
      console.error('[WARN] Failed to update access count:', error);
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.database) {
        this.database.close();
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('[ERROR] Failed to close memory system:', error);
    }
  }

  /**
   * Initialize database schema with advanced indexing for search performance
   */
  private initializeDatabase(db?: Database.Database): void {
    const dbToUse = db || this.database;
    
    dbToUse.exec(`
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

      -- Create indexes for fast searching
      CREATE INDEX IF NOT EXISTS idx_layer ON memories(layer);
      CREATE INDEX IF NOT EXISTS idx_project ON memories(project_path);
      CREATE INDEX IF NOT EXISTS idx_accessed ON memories(accessed_at);
      CREATE INDEX IF NOT EXISTS idx_access_count ON memories(access_count);
      CREATE INDEX IF NOT EXISTS idx_content_lower ON memories(LOWER(content));
      CREATE INDEX IF NOT EXISTS idx_tags_lower ON memories(LOWER(tags));
      
      -- Enable case-insensitive LIKE
      PRAGMA case_sensitive_like = OFF;
    `);
  }

  /**
   * Get storage location description for a memory layer
   */
  private getStorageLocationDescription(layer: MemoryLayer): string {
    switch (layer) {
      case 'preference':
        return 'Global user preferences - shared across all projects';
      case 'system':
        return 'Global system patterns - shared across all projects';
      case 'project':
        return 'Global project context - all projects stored together for easy cross-project access';
      case 'prompt':
        return 'Global session context - all sessions stored together for easy access';
      default:
        return 'Global unified storage in SQLite database';
    }
  }
}

