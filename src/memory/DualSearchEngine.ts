/**
 * Dual Search Engine - Unified BM25 + TF-IDF Search Interface
 * Combines keyword search (BM25) with semantic search (TF-IDF) for optimal results
 * Implements advanced result fusion and ranking algorithms
 */

import Database from 'better-sqlite3';
import { Memory, MemorySearchResult, MemoryLayer, MemorySearchOptions } from '../types/index.js';
import { BM25SearchEngine } from './BM25SearchEngine.js';
import { LocalSemanticSearch } from './LocalSemanticSearch.js';

export interface DualSearchOptions extends MemorySearchOptions {
  // Search strategy
  searchMode?: 'hybrid' | 'bm25_only' | 'tfidf_only' | 'parallel';

  // Fusion parameters
  bm25Weight?: number;        // Weight for BM25 results (default: 0.6)
  tfidfWeight?: number;       // Weight for TF-IDF results (default: 0.4)
  fusionMethod?: 'weighted' | 'rank_fusion' | 'score_fusion' | 'reciprocal_rank';

  // Performance options
  maxCandidates?: number;     // Max candidates from each engine before fusion
  enableCache?: boolean;      // Enable result caching
  fastMode?: boolean;         // Enable fast mode for sub-5ms searches

  // Quality thresholds
  minBM25Score?: number;      // Minimum BM25 score threshold
  minTFIDFScore?: number;     // Minimum TF-IDF score threshold
  diversityBoost?: number;    // Boost diverse results (0-1)

  // Advanced options
  queryExpansion?: boolean;   // Enable automatic query expansion
  contextualBoost?: boolean;  // Boost results from same project/layer
  temporalDecay?: boolean;    // Apply temporal decay to older results
}

export interface DualSearchResult extends MemorySearchResult {
  bm25_score?: number;
  tfidf_score?: number;
  fusion_score: number;
  search_method: 'bm25' | 'tfidf' | 'fusion';
  rank_position: number;
  confidence_score: number;
}

/**
 * Advanced Dual Search Engine
 * - Combines BM25 keyword search with TF-IDF semantic search
 * - Multiple fusion algorithms for optimal result ranking
 * - Sub-10ms performance with intelligent caching
 * - Context-aware scoring with temporal and spatial boosts
 */
export class DualSearchEngine {
  private database: Database.Database;
  private bm25Engine: BM25SearchEngine;
  private tfidfEngine: LocalSemanticSearch;

  // Performance tracking
  private searchStats = {
    totalSearches: 0,
    averageTime: 0,
    cacheHits: 0,
    bm25Queries: 0,
    tfidfQueries: 0,
    fusionQueries: 0
  };

  // Result caching
  private resultCache = new Map<string, DualSearchResult[]>();
  private readonly MAX_CACHE_SIZE = 500;

  constructor(database: Database.Database) {
    this.database = database;
    this.bm25Engine = new BM25SearchEngine(database);
    this.tfidfEngine = new LocalSemanticSearch();
  }

  /**
   * Initialize both search engines
   */
  public async initialize(): Promise<void> {
    await this.bm25Engine.initialize();
    console.error('[INFO] Dual Search Engine initialized');
  }

  /**
   * Perform unified dual search with multiple strategies
   */
  public async search(
    query: string,
    memories: Memory[],
    options: DualSearchOptions = {}
  ): Promise<DualSearchResult[]> {
    const startTime = performance.now();

    const {
      searchMode = 'hybrid',
      bm25Weight = 0.6,
      tfidfWeight = 0.4,
      fusionMethod = 'weighted',
      maxCandidates = 20,
      enableCache = true,
      fastMode = false,
      minBM25Score = 0.1,
      minTFIDFScore = 0.1,
      diversityBoost = 0.1,
      queryExpansion = false,
      contextualBoost = true,
      temporalDecay = true,
      limit = 10
    } = options;

    // Generate cache key
    const cacheKey = this.generateCacheKey(query, options, memories.length);

    // Check cache first
    if (enableCache && this.resultCache.has(cacheKey)) {
      this.searchStats.cacheHits++;
      const cached = this.resultCache.get(cacheKey)!;
      this.updateSearchStats(performance.now() - startTime, 'cache');
      return cached.slice(0, limit);
    }

    let results: DualSearchResult[] = [];

    try {
      switch (searchMode) {
        case 'bm25_only':
          results = await this.performBM25Search(query, memories, options);
          break;

        case 'tfidf_only':
          results = await this.performTFIDFSearch(query, memories, options);
          break;

        case 'parallel':
          results = await this.performParallelSearch(query, memories, options);
          break;

        case 'hybrid':
        default:
          results = await this.performHybridSearch(query, memories, options);
          break;
      }

      // Apply post-processing enhancements
      if (contextualBoost) {
        results = this.applyContextualBoost(results, options);
      }

      if (temporalDecay) {
        results = this.applyTemporalDecay(results);
      }

      if (diversityBoost > 0) {
        results = this.enhanceDiversity(results, diversityBoost);
      }

      // Final ranking and limiting
      results = results
        .sort((a, b) => b.fusion_score - a.fusion_score)
        .slice(0, limit)
        .map((result, index) => ({
          ...result,
          rank_position: index + 1
        }));

      // Cache results
      if (enableCache) {
        this.manageCacheSize();
        this.resultCache.set(cacheKey, results);
      }

    } catch (error) {
      console.error('[ERROR] Dual search failed:', error);
      // Fallback to basic search
      results = await this.fallbackSearch(query, memories, options);
    }

    this.updateSearchStats(performance.now() - startTime, searchMode);

    return results;
  }

  /**
   * Perform BM25-only search
   */
  private async performBM25Search(
    query: string,
    memories: Memory[],
    options: DualSearchOptions
  ): Promise<DualSearchResult[]> {
    const bm25Results = await this.bm25Engine.search(query, {
      layer: options.layer,
      limit: options.maxCandidates || 20,
      minScore: options.minBM25Score || 0.1
    });

    this.searchStats.bm25Queries++;

    return bm25Results.map((result, index) => ({
      ...result,
      bm25_score: result.bm25_score || result.similarity_score || 0,
      tfidf_score: 0,
      fusion_score: result.bm25_score || result.similarity_score || 0,
      search_method: 'bm25' as const,
      rank_position: index + 1,
      confidence_score: this.calculateConfidenceScore(result.bm25_score || 0, 0, 'bm25')
    }));
  }

  /**
   * Perform TF-IDF-only search
   */
  private async performTFIDFSearch(
    query: string,
    memories: Memory[],
    options: DualSearchOptions
  ): Promise<DualSearchResult[]> {
    const tfidfResults = this.tfidfEngine.search(query, memories, {
      minScore: options.minTFIDFScore || 0.1,
      maxResults: options.maxCandidates || 20,
      useFastMode: options.fastMode,
      layerWeights: this.getLayerWeights(options.layer)
    });

    this.searchStats.tfidfQueries++;

    return tfidfResults.map((result, index) => ({
      ...result,
      bm25_score: 0,
      tfidf_score: result.similarity_score || 0,
      fusion_score: result.similarity_score || 0,
      search_method: 'tfidf' as const,
      rank_position: index + 1,
      confidence_score: this.calculateConfidenceScore(0, result.similarity_score || 0, 'tfidf')
    }));
  }

  /**
   * Perform parallel search (both engines simultaneously)
   */
  private async performParallelSearch(
    query: string,
    memories: Memory[],
    options: DualSearchOptions
  ): Promise<DualSearchResult[]> {
    // Execute both searches in parallel
    const [bm25Results, tfidfResults] = await Promise.all([
      this.performBM25Search(query, memories, options),
      this.performTFIDFSearch(query, memories, options)
    ]);

    // Fusion step
    return this.fuseResults(bm25Results, tfidfResults, options);
  }

  /**
   * Perform hybrid search (sequential with early termination)
   */
  private async performHybridSearch(
    query: string,
    memories: Memory[],
    options: DualSearchOptions
  ): Promise<DualSearchResult[]> {
    // Start with BM25 for fast keyword matching
    const bm25Results = await this.performBM25Search(query, memories, {
      ...options,
      maxCandidates: Math.min(options.maxCandidates || 20, 50)
    });

    // If BM25 gives good results, supplement with TF-IDF
    let tfidfResults: DualSearchResult[] = [];

    if (bm25Results.length < (options.limit || 10) ||
        bm25Results.some(r => r.bm25_score! < 2.0)) {

      // Get TF-IDF results for semantic enhancement
      tfidfResults = await this.performTFIDFSearch(query, memories, {
        ...options,
        maxCandidates: Math.min(options.maxCandidates || 20, 30)
      });
    }

    this.searchStats.fusionQueries++;

    // Fuse results using specified method
    return this.fuseResults(bm25Results, tfidfResults, options);
  }

  /**
   * Fuse results from BM25 and TF-IDF engines
   */
  private fuseResults(
    bm25Results: DualSearchResult[],
    tfidfResults: DualSearchResult[],
    options: DualSearchOptions
  ): DualSearchResult[] {
    const {
      fusionMethod = 'weighted',
      bm25Weight = 0.6,
      tfidfWeight = 0.4
    } = options;

    // Create lookup maps
    const bm25Map = new Map<string, DualSearchResult>();
    const tfidfMap = new Map<string, DualSearchResult>();

    bm25Results.forEach(result => {
      if (result.memory.id) {
        bm25Map.set(result.memory.id, result);
      }
    });

    tfidfResults.forEach(result => {
      if (result.memory.id) {
        tfidfMap.set(result.memory.id, result);
      }
    });

    // Get all unique memory IDs
    const allIds = new Set([...bm25Map.keys(), ...tfidfMap.keys()]);
    const fusedResults: DualSearchResult[] = [];

    for (const memoryId of allIds) {
      const bm25Result = bm25Map.get(memoryId);
      const tfidfResult = tfidfMap.get(memoryId);

      const bm25Score = bm25Result?.bm25_score || 0;
      const tfidfScore = tfidfResult?.tfidf_score || 0;

      // Select base result (prefer one with higher score)
      const baseResult = (bm25Score >= tfidfScore) ? bm25Result : tfidfResult;
      if (!baseResult) continue;

      let fusionScore = 0;

      // Apply fusion method
      switch (fusionMethod) {
        case 'weighted':
          fusionScore = (bm25Score * bm25Weight) + (tfidfScore * tfidfWeight);
          break;

        case 'rank_fusion':
          const bm25Rank = bm25Result?.rank_position || 999;
          const tfidfRank = tfidfResult?.rank_position || 999;
          fusionScore = 1000 - ((bm25Rank * bm25Weight) + (tfidfRank * tfidfWeight));
          break;

        case 'reciprocal_rank':
          const bm25RR = bm25Result ? (1 / bm25Result.rank_position) : 0;
          const tfidfRR = tfidfResult ? (1 / tfidfResult.rank_position) : 0;
          fusionScore = (bm25RR * bm25Weight) + (tfidfRR * tfidfWeight);
          break;

        case 'score_fusion':
        default:
          fusionScore = Math.max(bm25Score, tfidfScore) +
                       (Math.min(bm25Score, tfidfScore) * 0.3);
          break;
      }

      fusedResults.push({
        ...baseResult,
        bm25_score: bm25Score,
        tfidf_score: tfidfScore,
        fusion_score: fusionScore,
        search_method: 'fusion' as const,
        rank_position: 0, // Will be set after sorting
        confidence_score: this.calculateConfidenceScore(bm25Score, tfidfScore, 'fusion'),
        context: `Dual search (BM25: ${bm25Score.toFixed(2)}, TF-IDF: ${tfidfScore.toFixed(2)}, Fusion: ${fusionScore.toFixed(2)})`
      });
    }

    return fusedResults;
  }

  /**
   * Apply contextual boost based on project and layer
   */
  private applyContextualBoost(
    results: DualSearchResult[],
    options: DualSearchOptions
  ): DualSearchResult[] {
    const targetLayer = options.layer;

    return results.map(result => {
      let boost = 1.0;

      // Layer-specific boost
      if (targetLayer && result.memory.layer === targetLayer) {
        boost += 0.15;
      }

      // Same-context memories boost
      const contextSimilarity = this.calculateContextSimilarity(result.memory, options);
      boost += contextSimilarity * 0.05;

      return {
        ...result,
        fusion_score: result.fusion_score * boost
      };
    });
  }

  /**
   * Apply temporal decay to older memories
   */
  private applyTemporalDecay(results: DualSearchResult[]): DualSearchResult[] {
    const now = Date.now();

    return results.map(result => {
      if (!result.memory.accessed_at) return result;

      const daysSinceAccess = (now - result.memory.accessed_at.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay over 90 days
      const decayFactor = Math.exp(-daysSinceAccess / 90);
      const decayMultiplier = 0.5 + (decayFactor * 0.5); // Range: 0.5 to 1.0

      return {
        ...result,
        fusion_score: result.fusion_score * decayMultiplier
      };
    });
  }

  /**
   * Enhance result diversity to avoid similar results
   */
  private enhanceDiversity(
    results: DualSearchResult[],
    diversityBoost: number
  ): DualSearchResult[] {
    const diversifiedResults: DualSearchResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      let diversityPenalty = 0;

      // Check similarity with already selected results
      for (const selected of diversifiedResults) {
        const similarity = this.calculateContentSimilarity(
          result.memory.content,
          selected.memory.content
        );

        if (similarity > 0.8) {
          diversityPenalty += diversityBoost * similarity;
        }
      }

      const adjustedScore = result.fusion_score * (1 - diversityPenalty);
      diversifiedResults.push({
        ...result,
        fusion_score: adjustedScore
      });
    }

    return diversifiedResults;
  }

  /**
   * Fallback search when main engines fail
   */
  private async fallbackSearch(
    query: string,
    memories: Memory[],
    options: DualSearchOptions
  ): Promise<DualSearchResult[]> {
    // Simple content matching fallback
    const queryLower = query.toLowerCase();
    const results: DualSearchResult[] = [];

    for (const memory of memories.slice(0, 50)) { // Limit for performance
      const content = memory.content.toLowerCase();
      let score = 0;

      if (content.includes(queryLower)) {
        score = 10;

        // Boost for exact matches
        const exactMatches = (content.match(new RegExp(queryLower, 'g')) || []).length;
        score += exactMatches * 5;
      }

      if (score > 0) {
        results.push({
          memory,
          similarity_score: score,
          match_type: 'exact' as const,
          context: 'Fallback search',
          bm25_score: 0,
          tfidf_score: 0,
          fusion_score: score,
          search_method: 'bm25' as const,
          rank_position: 0,
          confidence_score: 0.5
        });
      }
    }

    return results
      .sort((a, b) => b.fusion_score - a.fusion_score)
      .slice(0, options.limit || 10);
  }

  /**
   * Calculate confidence score based on individual engine scores
   */
  private calculateConfidenceScore(
    bm25Score: number,
    tfidfScore: number,
    method: string
  ): number {
    switch (method) {
      case 'bm25':
        return Math.min(bm25Score / 10, 1.0);
      case 'tfidf':
        return Math.min(tfidfScore / 100, 1.0);
      case 'fusion':
        const agreement = Math.abs(bm25Score - tfidfScore) < 5 ? 0.2 : 0;
        const strength = Math.min((bm25Score + tfidfScore) / 150, 0.8);
        return strength + agreement;
      default:
        return 0.5;
    }
  }

  /**
   * Calculate context similarity between memories
   */
  private calculateContextSimilarity(memory: Memory, options: DualSearchOptions): number {
    let similarity = 0;

    // Layer similarity
    if (options.layer === memory.layer) {
      similarity += 0.3;
    }

    // Tag overlap (if available)
    if (memory.tags && memory.tags.length > 0) {
      similarity += 0.2; // Basic tag presence boost
    }

    // Recent access similarity
    if (memory.accessed_at && (Date.now() - memory.accessed_at.getTime()) < 86400000) {
      similarity += 0.1; // Recent access boost
    }

    return Math.min(similarity, 1.0);
  }

  /**
   * Calculate content similarity between two strings
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Generate cache key for search results
   */
  private generateCacheKey(
    query: string,
    options: DualSearchOptions,
    memoryCount: number
  ): string {
    const optionsHash = JSON.stringify({
      searchMode: options.searchMode,
      layer: options.layer,
      limit: options.limit,
      fusionMethod: options.fusionMethod
    });

    return `${query}_${optionsHash}_${memoryCount}`;
  }

  /**
   * Get layer weights for TF-IDF search
   */
  private getLayerWeights(targetLayer?: MemoryLayer): Record<string, number> {
    const weights: Record<string, number> = { preference: 1.2, system: 1.1, project: 1.0, prompt: 0.9 };

    if (targetLayer) {
      weights[targetLayer] *= 1.3; // Boost target layer
    }

    return weights;
  }

  /**
   * Manage cache size to prevent memory bloat
   */
  private manageCacheSize(): void {
    if (this.resultCache.size > this.MAX_CACHE_SIZE) {
      // Simple LRU: remove oldest 20% of entries
      const entries = Array.from(this.resultCache.entries());
      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2));

      for (const [key] of toRemove) {
        this.resultCache.delete(key);
      }
    }
  }

  /**
   * Update search performance statistics
   */
  private updateSearchStats(duration: number, method: string): void {
    this.searchStats.totalSearches++;
    this.searchStats.averageTime =
      (this.searchStats.averageTime * (this.searchStats.totalSearches - 1) + duration) /
      this.searchStats.totalSearches;

    switch (method) {
      case 'bm25_only':
        this.searchStats.bm25Queries++;
        break;
      case 'tfidf_only':
        this.searchStats.tfidfQueries++;
        break;
      case 'hybrid':
      case 'parallel':
        this.searchStats.fusionQueries++;
        break;
    }
  }

  /**
   * Get comprehensive search engine statistics
   */
  public getSearchStatistics(): {
    performance: {
      totalSearches: number;
      averageTime: number;
      cacheHits: number;
      bm25Queries: number;
      tfidfQueries: number;
      fusionQueries: number;
    };
    engines: {
      bm25: any;
      tfidf: any;
    };
    cacheStats: {
      size: number;
      hitRate: number;
    };
  } {
    return {
      performance: { ...this.searchStats },
      engines: {
        bm25: this.bm25Engine.getSearchStats(),
        tfidf: this.tfidfEngine.getPerformanceMetrics()
      },
      cacheStats: {
        size: this.resultCache.size,
        hitRate: this.searchStats.totalSearches > 0 ?
          this.searchStats.cacheHits / this.searchStats.totalSearches : 0
      }
    };
  }

  /**
   * Optimize all search engines
   */
  public async optimize(): Promise<void> {
    await this.bm25Engine.optimizeIndex();
    this.tfidfEngine.optimizeIndex();

    // Clear result cache to free memory
    this.resultCache.clear();

    console.error('[INFO] Dual Search Engine optimized');
  }

  /**
   * Clear all caches and reset engines
   */
  public async reset(): Promise<void> {
    this.resultCache.clear();
    this.tfidfEngine.clearIndex();

    // Reset statistics
    this.searchStats = {
      totalSearches: 0,
      averageTime: 0,
      cacheHits: 0,
      bm25Queries: 0,
      tfidfQueries: 0,
      fusionQueries: 0
    };

    console.error('[INFO] Dual Search Engine reset');
  }
}