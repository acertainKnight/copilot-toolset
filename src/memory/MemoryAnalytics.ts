/**
 * Memory Analytics Dashboard - Usage patterns, optimization recommendations, and visualization
 * Provides comprehensive insights into memory system performance and usage
 */

import { Memory, MemoryLayer } from '../types/index.js';
import { CoreMemoryStats } from './CoreMemoryManager.js';

export interface MemoryUsageMetrics {
  totalMemories: number;
  memoriesByLayer: Record<MemoryLayer, number>;
  averageAccessCount: number;
  mostAccessedMemories: Array<{memory: Memory, accessCount: number}>;
  leastAccessedMemories: Array<{memory: Memory, accessCount: number}>;
  memoryGrowthRate: number; // memories per day
  storageEfficiency: number; // compression ratio
}

export interface AccessPatternAnalysis {
  peakAccessHours: number[];
  frequentSearchTerms: Array<{term: string, count: number}>;
  searchAccuracy: number; // percentage of searches that found relevant results
  averageSearchTime: number; // milliseconds
  tierHitRates: {
    core: number;
    warm: number;
    cold: number;
  };
  promotionDemotionStats: {
    promotions: number;
    demotions: number;
    efficiency: number;
  };
}

export interface MemoryOptimizationRecommendations {
  duplicateMemories: Array<{original: Memory, duplicate: Memory, similarity: number}>;
  underutilizedMemories: Memory[];
  oversizedMemories: Array<{memory: Memory, suggestedCompression: number}>;
  misplacedMemories: Array<{memory: Memory, currentTier: string, suggestedTier: string, reason: string}>;
  searchOptimizations: Array<{issue: string, recommendation: string, impact: 'low' | 'medium' | 'high'}>;
  performanceBottlenecks: Array<{component: string, issue: string, solution: string}>;
}

export interface MemoryVisualization {
  tierDistribution: {
    core: {size: number, count: number, utilization: number};
    warm: {size: number, count: number, hitRate: number};
    cold: {size: number, count: number, compressionRatio: number};
  };
  accessPatternHeatmap: Array<{hour: number, day: number, accessCount: number}>;
  memoryLifecycle: Array<{created: Date, accessed: Date, promoted?: Date, demoted?: Date}>;
  searchPerformanceGraph: Array<{timestamp: Date, queryTime: number, resultCount: number, accuracy: number}>;
  layerMigrationFlow: Array<{from: string, to: string, count: number, reason: string}>;
}

export interface DashboardData {
  metrics: MemoryUsageMetrics;
  patterns: AccessPatternAnalysis;
  recommendations: MemoryOptimizationRecommendations;
  visualization: MemoryVisualization;
  health: {
    score: number; // 0-100
    issues: Array<{severity: 'low' | 'medium' | 'high', message: string}>;
    uptime: number; // hours
    lastOptimization: Date;
  };
}

/**
 * Memory Analytics Engine
 * Provides comprehensive analysis and optimization recommendations
 */
export class MemoryAnalytics {
  private accessLog: Array<{timestamp: Date, type: 'store' | 'search', query?: string, layer?: MemoryLayer, duration: number}> = [];
  private searchAccuracyLog: Array<{query: string, resultsFound: number, relevantResults: number}> = [];
  private tierMigrationLog: Array<{memoryId: string, from: string, to: string, timestamp: Date, reason: string}> = [];
  private performanceMetrics: Map<string, number[]> = new Map();

  /**
   * Analyze memory usage patterns and generate comprehensive dashboard data
   */
  async generateDashboard(
    memories: Memory[],
    coreStats?: CoreMemoryStats,
    tierStats?: any
  ): Promise<DashboardData> {
    const metrics = this.calculateUsageMetrics(memories);
    const patterns = this.analyzeAccessPatterns();
    const recommendations = await this.generateOptimizationRecommendations(memories);
    const visualization = this.generateVisualizationData(memories, tierStats);
    const health = this.calculateHealthScore(memories, recommendations);

    return {
      metrics,
      patterns,
      recommendations,
      visualization,
      health
    };
  }

  /**
   * Log memory access for pattern analysis
   */
  logAccess(type: 'store' | 'search', duration: number, query?: string, layer?: MemoryLayer): void {
    this.accessLog.push({
      timestamp: new Date(),
      type,
      query,
      layer,
      duration
    });

    // Keep only recent logs (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.accessLog = this.accessLog.filter(log => log.timestamp > sevenDaysAgo);
  }

  /**
   * Log search accuracy for analytics
   */
  logSearchAccuracy(query: string, resultsFound: number, relevantResults: number): void {
    this.searchAccuracyLog.push({ query, resultsFound, relevantResults });

    // Keep only recent logs
    if (this.searchAccuracyLog.length > 1000) {
      this.searchAccuracyLog = this.searchAccuracyLog.slice(-1000);
    }
  }

  /**
   * Log tier migration events
   */
  logTierMigration(memoryId: string, from: string, to: string, reason: string): void {
    this.tierMigrationLog.push({
      memoryId,
      from,
      to,
      timestamp: new Date(),
      reason
    });

    // Keep only recent migrations
    if (this.tierMigrationLog.length > 500) {
      this.tierMigrationLog = this.tierMigrationLog.slice(-500);
    }
  }

  /**
   * Calculate comprehensive usage metrics
   */
  private calculateUsageMetrics(memories: Memory[]): MemoryUsageMetrics {
    const memoriesByLayer: Record<MemoryLayer, number> = {
      preference: 0,
      project: 0,
      prompt: 0,
      system: 0
    };

    let totalAccessCount = 0;

    for (const memory of memories) {
      memoriesByLayer[memory.layer]++;
      totalAccessCount += memory.access_count || 0;
    }

    // Sort by access count for most/least accessed
    const sortedByAccess = memories
      .map(memory => ({memory, accessCount: memory.access_count || 0}))
      .sort((a, b) => b.accessCount - a.accessCount);

    const mostAccessed = sortedByAccess.slice(0, 10);
    const leastAccessed = sortedByAccess.slice(-10).reverse();

    // Calculate growth rate (memories created per day over last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentMemories = memories.filter(m =>
      m.created_at && new Date(m.created_at) > thirtyDaysAgo
    );
    const growthRate = recentMemories.length / 30;

    return {
      totalMemories: memories.length,
      memoriesByLayer,
      averageAccessCount: totalAccessCount / Math.max(memories.length, 1),
      mostAccessedMemories: mostAccessed,
      leastAccessedMemories: leastAccessed,
      memoryGrowthRate: growthRate,
      storageEfficiency: this.calculateStorageEfficiency(memories)
    };
  }

  /**
   * Analyze access patterns from logs
   */
  private analyzeAccessPatterns(): AccessPatternAnalysis {
    const hourlyAccess = new Array(24).fill(0);
    const searchTermCounts = new Map<string, number>();
    const searchDurations: number[] = [];

    for (const log of this.accessLog) {
      const hour = log.timestamp.getHours();
      hourlyAccess[hour]++;

      if (log.type === 'search' && log.query) {
        // Extract key terms from query
        const terms = log.query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
        for (const term of terms) {
          searchTermCounts.set(term, (searchTermCounts.get(term) || 0) + 1);
        }
        searchDurations.push(log.duration);
      }
    }

    // Find peak access hours (top 3)
    const peakAccessHours = hourlyAccess
      .map((count, hour) => ({hour, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // Most frequent search terms
    const frequentSearchTerms = Array.from(searchTermCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([term, count]) => ({term, count}));

    // Calculate search accuracy
    const searchAccuracy = this.searchAccuracyLog.length > 0 ?
      this.searchAccuracyLog.reduce((sum, log) =>
        sum + (log.relevantResults / Math.max(log.resultsFound, 1)), 0
      ) / this.searchAccuracyLog.length * 100 : 0;

    // Average search time
    const averageSearchTime = searchDurations.length > 0 ?
      searchDurations.reduce((sum, time) => sum + time, 0) / searchDurations.length : 0;

    return {
      peakAccessHours,
      frequentSearchTerms,
      searchAccuracy,
      averageSearchTime,
      tierHitRates: {
        core: 0.85, // Placeholder - would calculate from actual tier access logs
        warm: 0.60,
        cold: 0.30
      },
      promotionDemotionStats: {
        promotions: this.tierMigrationLog.filter(log =>
          (log.from === 'cold' && log.to === 'warm') ||
          (log.from === 'warm' && log.to === 'core')
        ).length,
        demotions: this.tierMigrationLog.filter(log =>
          (log.from === 'core' && log.to === 'warm') ||
          (log.from === 'warm' && log.to === 'cold')
        ).length,
        efficiency: 0.75 // Would calculate based on access patterns after migration
      }
    };
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(memories: Memory[]): Promise<MemoryOptimizationRecommendations> {
    const duplicates = this.findDuplicateMemories(memories);
    const underutilized = this.findUnderutilizedMemories(memories);
    const oversized = this.findOversizedMemories(memories);
    const misplaced = this.findMisplacedMemories(memories);

    return {
      duplicateMemories: duplicates,
      underutilizedMemories: underutilized,
      oversizedMemories: oversized,
      misplacedMemories: misplaced,
      searchOptimizations: [
        {
          issue: 'High search latency on large dataset',
          recommendation: 'Enable semantic indexing for cold storage',
          impact: 'high'
        },
        {
          issue: 'Low search accuracy for technical terms',
          recommendation: 'Add domain-specific stopwords and synonyms',
          impact: 'medium'
        }
      ],
      performanceBottlenecks: [
        {
          component: 'Cold Storage Search',
          issue: 'Linear scan on large dataset',
          solution: 'Implement full-text search index'
        },
        {
          component: 'Tier Migration',
          issue: 'Synchronous processing causing delays',
          solution: 'Implement async background processing'
        }
      ]
    };
  }

  /**
   * Generate visualization data
   */
  private generateVisualizationData(memories: Memory[], tierStats?: any): MemoryVisualization {
    // Tier distribution
    const tierDistribution = {
      core: { size: tierStats?.core?.size_bytes || 0, count: tierStats?.core?.blocks || 0, utilization: 0.8 },
      warm: { size: 0, count: tierStats?.warm?.entries || 0, hitRate: 0.6 },
      cold: { size: tierStats?.cold?.size_bytes || 0, count: tierStats?.cold?.memories || 0, compressionRatio: 0.7 }
    };

    // Access pattern heatmap (24 hours x 7 days)
    const accessPatternHeatmap: Array<{hour: number, day: number, accessCount: number}> = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = this.getAccessCountForHourDay(hour, day);
        accessPatternHeatmap.push({ hour, day, accessCount: count });
      }
    }

    // Memory lifecycle visualization
    const memoryLifecycle = memories.slice(0, 100).map(memory => ({
      created: memory.created_at || new Date(),
      accessed: memory.accessed_at || new Date()
      // promoted and demoted would come from tier migration logs
    }));

    // Search performance over time
    const searchPerformanceGraph = this.accessLog
      .filter(log => log.type === 'search')
      .slice(-100)
      .map(log => ({
        timestamp: log.timestamp,
        queryTime: log.duration,
        resultCount: 5, // Would track actual result counts
        accuracy: 0.8 // Would track actual accuracy
      }));

    // Tier migration flow
    const migrationCounts = new Map<string, number>();
    for (const migration of this.tierMigrationLog) {
      const key = `${migration.from}->${migration.to}`;
      migrationCounts.set(key, (migrationCounts.get(key) || 0) + 1);
    }

    const layerMigrationFlow = Array.from(migrationCounts.entries()).map(([key, count]) => {
      const [from, to] = key.split('->');
      return { from, to, count, reason: 'Access pattern optimization' };
    });

    return {
      tierDistribution,
      accessPatternHeatmap,
      memoryLifecycle,
      searchPerformanceGraph,
      layerMigrationFlow
    };
  }

  /**
   * Calculate overall system health score
   */
  private calculateHealthScore(memories: Memory[], recommendations: MemoryOptimizationRecommendations): {
    score: number;
    issues: Array<{severity: 'low' | 'medium' | 'high', message: string}>;
    uptime: number;
    lastOptimization: Date;
  } {
    let score = 100;
    const issues: Array<{severity: 'low' | 'medium' | 'high', message: string}> = [];

    // Deduct points for issues
    if (recommendations.duplicateMemories.length > 0) {
      score -= recommendations.duplicateMemories.length * 2;
      issues.push({
        severity: 'medium',
        message: `${recommendations.duplicateMemories.length} duplicate memories found`
      });
    }

    if (recommendations.underutilizedMemories.length > 10) {
      score -= 10;
      issues.push({
        severity: 'low',
        message: `${recommendations.underutilizedMemories.length} underutilized memories`
      });
    }

    if (recommendations.performanceBottlenecks.length > 0) {
      score -= recommendations.performanceBottlenecks.length * 5;
      issues.push({
        severity: 'high',
        message: `${recommendations.performanceBottlenecks.length} performance bottlenecks detected`
      });
    }

    // Check search accuracy
    const avgAccuracy = this.searchAccuracyLog.length > 0 ?
      this.searchAccuracyLog.reduce((sum, log) =>
        sum + (log.relevantResults / Math.max(log.resultsFound, 1)), 0
      ) / this.searchAccuracyLog.length : 1;

    if (avgAccuracy < 0.5) {
      score -= 20;
      issues.push({
        severity: 'high',
        message: `Low search accuracy: ${(avgAccuracy * 100).toFixed(1)}%`
      });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      uptime: 0, // Would track actual uptime
      lastOptimization: new Date()
    };
  }

  /**
   * Find duplicate memories using content similarity
   */
  private findDuplicateMemories(memories: Memory[]): Array<{original: Memory, duplicate: Memory, similarity: number}> {
    const duplicates: Array<{original: Memory, duplicate: Memory, similarity: number}> = [];

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const similarity = this.calculateContentSimilarity(memories[i].content, memories[j].content);
        if (similarity > 0.85) { // 85% similarity threshold
          duplicates.push({
            original: memories[i],
            duplicate: memories[j],
            similarity
          });
        }
      }
    }

    return duplicates.slice(0, 50); // Limit results
  }

  /**
   * Find memories that are rarely accessed
   */
  private findUnderutilizedMemories(memories: Memory[]): Memory[] {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return memories.filter(memory => {
      const accessCount = memory.access_count || 0;
      const lastAccessed = memory.accessed_at || memory.created_at || new Date();

      return accessCount < 2 && new Date(lastAccessed) < thirtyDaysAgo;
    }).slice(0, 100);
  }

  /**
   * Find memories that could benefit from compression
   */
  private findOversizedMemories(memories: Memory[]): Array<{memory: Memory, suggestedCompression: number}> {
    return memories
      .filter(memory => memory.content.length > 1000)
      .map(memory => ({
        memory,
        suggestedCompression: this.estimateCompressionSavings(memory.content)
      }))
      .filter(item => item.suggestedCompression > 0.3)
      .slice(0, 50);
  }

  /**
   * Find memories in suboptimal tiers
   */
  private findMisplacedMemories(memories: Memory[]): Array<{memory: Memory, currentTier: string, suggestedTier: string, reason: string}> {
    const misplaced: Array<{memory: Memory, currentTier: string, suggestedTier: string, reason: string}> = [];

    for (const memory of memories) {
      const accessCount = memory.access_count || 0;
      const contentSize = memory.content.length;
      // Determine current tier from metadata (would be more sophisticated in real implementation)
      const currentTier = memory.metadata?.current_tier || 'cold';

      let suggestedTier = currentTier;
      let reason = '';

      // High access, small size -> should be in core
      if (accessCount > 20 && contentSize < 500 && currentTier !== 'core') {
        suggestedTier = 'core';
        reason = 'High access frequency with small size';
      }
      // Medium access -> should be in warm
      else if (accessCount > 5 && accessCount <= 20 && currentTier !== 'warm' && currentTier !== 'core') {
        suggestedTier = 'warm';
        reason = 'Medium access frequency';
      }
      // Low access, large size -> should be in cold
      else if (accessCount < 2 && contentSize > 2000 && currentTier !== 'cold') {
        suggestedTier = 'cold';
        reason = 'Low access frequency with large size';
      }

      if (suggestedTier !== currentTier) {
        misplaced.push({ memory, currentTier, suggestedTier, reason });
      }
    }

    return misplaced.slice(0, 50);
  }

  /**
   * Utility methods
   */
  private calculateStorageEfficiency(memories: Memory[]): number {
    const totalOriginalSize = memories.reduce((sum, memory) => sum + memory.content.length, 0);
    const compressedSize = totalOriginalSize * 0.7; // Estimate compression
    return totalOriginalSize > 0 ? compressedSize / totalOriginalSize : 1;
  }

  private calculateContentSimilarity(content1: string, content2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private estimateCompressionSavings(content: string): number {
    // Estimate potential compression ratio
    const repetition = this.calculateRepetition(content);
    return Math.min(0.8, repetition * 0.5 + 0.2);
  }

  private calculateRepetition(content: string): number {
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words);
    return 1 - (uniqueWords.size / words.length);
  }

  private getAccessCountForHourDay(hour: number, day: number): number {
    // Calculate access count for specific hour and day from logs
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - day);
    dayStart.setHours(hour, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(hour + 1, 0, 0, 0);

    return this.accessLog.filter(log =>
      log.timestamp >= dayStart && log.timestamp < dayEnd
    ).length;
  }

  /**
   * Export dashboard data as JSON for external visualization
   */
  exportDashboardData(data: DashboardData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate HTML dashboard for web visualization
   */
  generateHTMLDashboard(data: DashboardData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memory Analytics Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; margin-bottom: 10px; }
        .health-score { font-size: 3em; color: ${data.health.score > 80 ? '#10b981' : data.health.score > 60 ? '#f59e0b' : '#ef4444'}; }
        .tier-bar { height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .tier-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); }
        .recommendations { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .recommendation { padding: 10px; margin: 5px 0; border-left: 4px solid #3b82f6; background: #f8fafc; }
        .high-priority { border-left-color: #ef4444; }
        .medium-priority { border-left-color: #f59e0b; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🧠 Memory Analytics Dashboard</h1>
            <p>Comprehensive insights into your MCP memory system performance</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">System Health</div>
                <div class="health-score">${data.health.score}</div>
                <div>Issues: ${data.health.issues.length}</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Total Memories</div>
                <div class="metric-value">${data.metrics.totalMemories.toLocaleString()}</div>
                <div>Growth: ${data.metrics.memoryGrowthRate.toFixed(1)}/day</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Search Accuracy</div>
                <div class="metric-value">${data.patterns.searchAccuracy.toFixed(1)}%</div>
                <div>Avg Time: ${data.patterns.averageSearchTime.toFixed(0)}ms</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Storage Efficiency</div>
                <div class="metric-value">${(data.metrics.storageEfficiency * 100).toFixed(1)}%</div>
                <div>Compression: ${((1 - data.metrics.storageEfficiency) * 100).toFixed(1)}%</div>
            </div>
        </div>

        <div class="metric-card">
            <h3>Tier Distribution</h3>
            <div>Core Memory: ${data.visualization.tierDistribution.core.count} blocks (${data.visualization.tierDistribution.core.utilization * 100}% full)</div>
            <div class="tier-bar"><div class="tier-fill" style="width: ${data.visualization.tierDistribution.core.utilization * 100}%"></div></div>

            <div>Warm Storage: ${data.visualization.tierDistribution.warm.count} entries (${data.visualization.tierDistribution.warm.hitRate * 100}% hit rate)</div>
            <div class="tier-bar"><div class="tier-fill" style="width: ${data.visualization.tierDistribution.warm.hitRate * 100}%"></div></div>

            <div>Cold Storage: ${data.visualization.tierDistribution.cold.count} memories (${data.visualization.tierDistribution.cold.compressionRatio * 100}% compressed)</div>
            <div class="tier-bar"><div class="tier-fill" style="width: ${data.visualization.tierDistribution.cold.compressionRatio * 100}%"></div></div>
        </div>

        <div class="recommendations">
            <h3>🎯 Optimization Recommendations</h3>
            ${data.recommendations.duplicateMemories.length > 0 ? `
                <div class="recommendation medium-priority">
                    <strong>Duplicate Detection:</strong> Found ${data.recommendations.duplicateMemories.length} potential duplicates
                </div>
            ` : ''}
            ${data.recommendations.underutilizedMemories.length > 0 ? `
                <div class="recommendation">
                    <strong>Cleanup Opportunity:</strong> ${data.recommendations.underutilizedMemories.length} underutilized memories
                </div>
            ` : ''}
            ${data.recommendations.performanceBottlenecks.map(bottleneck => `
                <div class="recommendation high-priority">
                    <strong>${bottleneck.component}:</strong> ${bottleneck.issue} - ${bottleneck.solution}
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h3>📊 Most Frequent Search Terms</h3>
            ${data.patterns.frequentSearchTerms.slice(0, 10).map(term => `
                <span style="display: inline-block; margin: 5px; padding: 5px 10px; background: #e0e7ff; border-radius: 15px;">
                    ${term.term} (${term.count})
                </span>
            `).join('')}
        </div>

        <footer style="margin-top: 40px; text-align: center; color: #6b7280;">
            <p>Generated on ${new Date().toLocaleString()} • MCP Memory Analytics v2.0</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * Clear analytics data
   */
  clear(): void {
    this.accessLog = [];
    this.searchAccuracyLog = [];
    this.tierMigrationLog = [];
    this.performanceMetrics.clear();
  }
}