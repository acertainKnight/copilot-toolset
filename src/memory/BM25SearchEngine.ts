/**
 * BM25 Search Engine for SQLite Full-Text Search
 * High-performance keyword search with advanced ranking using BM25 algorithm
 * Designed for sub-10ms search response times
 */

import Database from 'better-sqlite3';
import { Memory, MemorySearchResult, MemoryLayer } from '../types/index.js';

export interface BM25SearchOptions {
  layer?: MemoryLayer;
  projectPath?: string;
  limit?: number;
  minScore?: number;
  k1?: number; // Term frequency saturation parameter (default: 1.2)
  b?: number;  // Field length normalization parameter (default: 0.75)
  weights?: {
    content: number;
    tags: number;
    metadata: number;
  };
}

export interface BM25SearchResult extends MemorySearchResult {
  bm25_score: number;
  term_frequencies: Record<string, number>;
  field_scores: {
    content: number;
    tags: number;
    metadata: number;
  };
}

/**
 * BM25 Search Engine using SQLite FTS5
 * - Full-Text Search with BM25 ranking
 * - Multi-field search with weighted scoring
 * - Sub-10ms search performance
 * - Advanced query operators and phrase matching
 */
export class BM25SearchEngine {
  private database: Database.Database;
  private isInitialized = false;

  // BM25 parameters
  private readonly DEFAULT_K1 = 1.2;  // Controls term frequency saturation
  private readonly DEFAULT_B = 0.75;  // Controls length normalization
  private readonly DEFAULT_WEIGHTS = {
    content: 1.0,
    tags: 0.8,
    metadata: 0.3
  };

  constructor(database: Database.Database) {
    this.database = database;
  }

  /**
   * Initialize FTS5 virtual tables for BM25 search
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create FTS5 virtual table for full-text search
      this.database.exec(`
        -- Drop existing FTS table if it exists
        DROP TABLE IF EXISTS memories_fts;

        -- Create FTS5 table with multi-field indexing
        CREATE VIRTUAL TABLE memories_fts USING fts5(
          memory_id UNINDEXED,
          content,
          tags,
          metadata,
          layer UNINDEXED,
          project_path UNINDEXED,
          created_at UNINDEXED,
          accessed_at UNINDEXED,
          access_count UNINDEXED,
          tokenize='unicode61 remove_diacritics 1'
        );

        -- Create trigger to keep FTS table in sync
        CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories BEGIN
          INSERT INTO memories_fts(
            memory_id, content, tags, metadata, layer,
            project_path, created_at, accessed_at, access_count
          ) VALUES (
            new.id, new.content, new.tags, new.metadata, new.layer,
            new.project_path, new.created_at, new.accessed_at, new.access_count
          );
        END;

        CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories BEGIN
          UPDATE memories_fts SET
            content = new.content,
            tags = new.tags,
            metadata = new.metadata,
            accessed_at = new.accessed_at,
            access_count = new.access_count
          WHERE memory_id = new.id;
        END;

        CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories BEGIN
          DELETE FROM memories_fts WHERE memory_id = old.id;
        END;
      `);

      // Rebuild FTS index from existing memories
      await this.rebuildIndex();

      this.isInitialized = true;
      console.error('[INFO] BM25 Search Engine initialized with FTS5');
    } catch (error) {
      console.error('[ERROR] Failed to initialize BM25 search engine:', error);
      throw error;
    }
  }

  /**
   * Rebuild FTS index from memories table
   */
  public async rebuildIndex(): Promise<void> {
    const stmt = this.database.prepare(`
      INSERT INTO memories_fts(
        memory_id, content, tags, metadata, layer,
        project_path, created_at, accessed_at, access_count
      )
      SELECT
        id, content, tags, metadata, layer,
        project_path, created_at, accessed_at, access_count
      FROM memories
    `);

    // Clear existing FTS data
    this.database.prepare('DELETE FROM memories_fts').run();

    // Rebuild from memories table
    stmt.run();

    console.error('[INFO] BM25 FTS index rebuilt');
  }

  /**
   * Perform BM25 search with advanced ranking
   */
  public async search(query: string, options: BM25SearchOptions = {}): Promise<BM25SearchResult[]> {
    await this.initialize();

    const {
      layer,
      projectPath,
      limit = 10,
      minScore = 0.1,
      k1 = this.DEFAULT_K1,
      b = this.DEFAULT_B,
      weights = this.DEFAULT_WEIGHTS
    } = options;

    const results: BM25SearchResult[] = [];
    const processedQuery = this.preprocessQuery(query);

    try {
      // Build FTS5 query with filters
      let ftsQuery = `content:${processedQuery} OR tags:${processedQuery}`;
      if (options.weights?.metadata && options.weights.metadata > 0) {
        ftsQuery += ` OR metadata:${processedQuery}`;
      }

      let sql = `
        SELECT
          m.*,
          fts.bm25(memories_fts) as bm25_score,
          snippet(memories_fts, 0, '<mark>', '</mark>', '...', 50) as content_snippet,
          highlight(memories_fts, 1, '<mark>', '</mark>') as tags_highlight
        FROM memories_fts fts
        JOIN memories m ON fts.memory_id = m.id
        WHERE memories_fts MATCH ?
      `;

      const params: any[] = [ftsQuery];

      // Add layer filter
      if (layer) {
        sql += ' AND m.layer = ?';
        params.push(layer);
      }

      // Add project path filter
      if (projectPath) {
        sql += ' AND (m.project_path = ? OR m.project_path IS NULL)';
        params.push(projectPath);
      }

      sql += ' ORDER BY bm25_score DESC LIMIT ?';
      params.push(limit);

      const stmt = this.database.prepare(sql);
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

        // Calculate enhanced BM25 score with field weights
        const enhancedScore = this.calculateEnhancedBM25Score(
          row.bm25_score,
          memory,
          query,
          { k1, b, weights }
        );

        // Only include results above minimum score
        if (enhancedScore >= minScore) {
          const termFreqs = this.extractTermFrequencies(query, memory);
          const fieldScores = this.calculateFieldScores(query, memory, weights);

          results.push({
            memory,
            similarity_score: enhancedScore,
            match_type: this.determineMatchType(enhancedScore, query, memory),
            context: `BM25 Search (score: ${enhancedScore.toFixed(3)})`,
            bm25_score: row.bm25_score,
            term_frequencies: termFreqs,
            field_scores: fieldScores
          });
        }
      }

    } catch (error) {
      console.error('[WARN] FTS5 search failed, falling back to LIKE search:', error);
      // Fallback to basic LIKE search
      return this.fallbackSearch(query, options);
    }

    return results.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
  }

  /**
   * Preprocess query for FTS5 compatibility
   */
  private preprocessQuery(query: string): string {
    // Remove special FTS5 characters and prepare for search
    let processed = query
      .replace(/['"*]/g, '') // Remove quotes and wildcards
      .replace(/\s+/g, ' ')   // Normalize whitespace
      .trim();

    // Add phrase matching for multi-word queries
    if (processed.includes(' ')) {
      const words = processed.split(' ');
      const phrases = words.map(word => `"${word}"`).join(' OR ');
      const exact = `"${processed}"`;
      return `(${exact}) OR (${phrases})`;
    }

    return `"${processed}"`;
  }

  /**
   * Calculate enhanced BM25 score with field weights and additional factors
   */
  private calculateEnhancedBM25Score(
    baseBM25: number,
    memory: Memory,
    query: string,
    params: { k1: number; b: number; weights: any }
  ): number {
    let score = Math.abs(baseBM25); // SQLite FTS5 returns negative BM25 scores

    // Field-weighted scoring
    const contentScore = this.calculateFieldBM25(query, memory.content, params) * params.weights.content;
    const tagsScore = this.calculateFieldBM25(query, memory.tags?.join(' ') || '', params) * params.weights.tags;
    const metaScore = this.calculateFieldBM25(query, JSON.stringify(memory.metadata || {}), params) * params.weights.metadata;

    score = contentScore + tagsScore + metaScore;

    // Recency boost (exponential decay over 30 days)
    if (memory.accessed_at) {
      const daysSinceAccess = (Date.now() - memory.accessed_at.getTime()) / (1000 * 60 * 60 * 24);
      const recencyMultiplier = Math.exp(-daysSinceAccess / 30);
      score *= (1 + recencyMultiplier * 0.2);
    }

    // Access frequency boost (logarithmic)
    if (memory.access_count && memory.access_count > 0) {
      score *= (1 + Math.log10(memory.access_count + 1) * 0.1);
    }

    // Layer priority
    const layerMultipliers = {
      preference: 1.3,
      system: 1.2,
      project: 1.0,
      prompt: 0.9
    };
    score *= layerMultipliers[memory.layer] || 1.0;

    return score;
  }

  /**
   * Calculate BM25 score for a specific field
   */
  private calculateFieldBM25(
    query: string,
    field: string,
    { k1, b }: { k1: number; b: number }
  ): number {
    if (!field) return 0;

    const queryTerms = query.toLowerCase().split(/\s+/);
    const fieldTerms = field.toLowerCase().split(/\s+/);
    const fieldLength = fieldTerms.length;

    if (fieldLength === 0) return 0;

    // Estimate average field length (could be pre-calculated)
    const avgFieldLength = 50;

    let score = 0;
    for (const term of queryTerms) {
      const termFreq = fieldTerms.filter(t => t.includes(term)).length;
      if (termFreq === 0) continue;

      // BM25 formula
      const idf = Math.log((1000) / (1 + termFreq)); // Simplified IDF
      const tf = (termFreq * (k1 + 1)) /
                 (termFreq + k1 * (1 - b + b * (fieldLength / avgFieldLength)));

      score += idf * tf;
    }

    return score;
  }

  /**
   * Extract term frequencies for analysis
   */
  private extractTermFrequencies(query: string, memory: Memory): Record<string, number> {
    const terms = query.toLowerCase().split(/\s+/);
    const content = memory.content.toLowerCase();
    const frequencies: Record<string, number> = {};

    for (const term of terms) {
      const matches = content.match(new RegExp(term, 'gi')) || [];
      frequencies[term] = matches.length;
    }

    return frequencies;
  }

  /**
   * Calculate individual field scores
   */
  private calculateFieldScores(
    query: string,
    memory: Memory,
    weights: any
  ): { content: number; tags: number; metadata: number } {
    const params = { k1: this.DEFAULT_K1, b: this.DEFAULT_B };

    return {
      content: this.calculateFieldBM25(query, memory.content, params) * weights.content,
      tags: this.calculateFieldBM25(query, memory.tags?.join(' ') || '', params) * weights.tags,
      metadata: this.calculateFieldBM25(query, JSON.stringify(memory.metadata || {}), params) * weights.metadata
    };
  }

  /**
   * Determine match type based on BM25 score
   */
  private determineMatchType(score: number, query: string, memory: Memory): 'exact' | 'semantic' | 'fuzzy' {
    const content = memory.content.toLowerCase();
    const queryLower = query.toLowerCase();

    if (content.includes(queryLower)) return 'exact';
    if (score > 5.0) return 'semantic';
    return 'fuzzy';
  }

  /**
   * Fallback search using basic LIKE queries
   */
  private fallbackSearch(query: string, options: BM25SearchOptions): BM25SearchResult[] {
    const { layer, projectPath, limit = 10 } = options;

    let sql = `
      SELECT * FROM memories
      WHERE LOWER(content) LIKE ? OR LOWER(tags) LIKE ?
    `;

    const params = [`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`];

    if (layer) {
      sql += ' AND layer = ?';
      params.push(layer);
    }

    if (projectPath) {
      sql += ' AND (project_path = ? OR project_path IS NULL)';
      params.push(projectPath);
    }

    sql += ' ORDER BY accessed_at DESC LIMIT ?';
    params.push(limit.toString());

    const stmt = this.database.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
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
      similarity_score: 1.0,
      match_type: 'fuzzy' as const,
      context: 'Fallback LIKE search',
      bm25_score: 1.0,
      term_frequencies: this.extractTermFrequencies(query, {
        id: row.id,
        content: row.content,
        layer: row.layer,
        tags: JSON.parse(row.tags || '[]'),
        created_at: new Date(row.created_at),
        accessed_at: new Date(row.accessed_at),
        access_count: row.access_count,
        metadata: JSON.parse(row.metadata || '{}')
      }),
      field_scores: { content: 1.0, tags: 0.5, metadata: 0.2 }
    }));
  }

  /**
   * Get search performance statistics
   */
  public getSearchStats(): {
    ftsEnabled: boolean;
    indexSize: number;
    totalDocuments: number;
    averageDocumentLength: number;
  } {
    try {
      const sizeResult = this.database.prepare(
        "SELECT COUNT(*) as count FROM memories_fts"
      ).get() as { count: number };

      const avgLengthResult = this.database.prepare(`
        SELECT AVG(LENGTH(content)) as avg_length FROM memories
      `).get() as { avg_length: number };

      return {
        ftsEnabled: true,
        indexSize: sizeResult.count,
        totalDocuments: sizeResult.count,
        averageDocumentLength: avgLengthResult.avg_length || 0
      };
    } catch (error) {
      return {
        ftsEnabled: false,
        indexSize: 0,
        totalDocuments: 0,
        averageDocumentLength: 0
      };
    }
  }

  /**
   * Optimize FTS index for better performance
   */
  public async optimizeIndex(): Promise<void> {
    try {
      this.database.prepare('INSERT INTO memories_fts(memories_fts) VALUES("optimize")').run();
      console.error('[INFO] BM25 FTS index optimized');
    } catch (error) {
      console.error('[WARN] Failed to optimize FTS index:', error);
    }
  }
}