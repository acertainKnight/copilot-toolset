/**
 * Performance Impact Analysis and Bottleneck Detection System
 *
 * Advanced performance monitoring that:
 * - Real-time bottleneck detection across all memory operations
 * - Performance impact analysis for optimization decisions
 * - Resource utilization tracking and prediction
 * - Automated performance regression detection
 * - Comprehensive performance profiling and reporting
 */

import Database from 'better-sqlite3';
import { performance } from 'perf_hooks';
import * as os from 'os';

// Core performance types
export interface PerformanceMetrics {
  timestamp: Date;
  operation_type: OperationType;
  duration_ms: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  io_operations: number;
  cache_hits: number;
  cache_misses: number;
  concurrent_operations: number;
  error_count: number;
  warnings_count: number;
}

export type OperationType =
  | 'memory_store'
  | 'memory_search'
  | 'tier_migration'
  | 'behavioral_analysis'
  | 'aging_calculation'
  | 'optimization_generation'
  | 'database_query'
  | 'index_rebuild'
  | 'cache_operation'
  | 'cleanup_operation';

export interface BottleneckDetection {
  bottleneck_id: string;
  detected_at: Date;
  bottleneck_type: BottleneckType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_operations: OperationType[];
  root_cause: string;
  performance_impact: {
    latency_increase_percent: number;
    throughput_decrease_percent: number;
    resource_utilization_increase: number;
    user_experience_impact: number; // 0-1 scale
  };
  detection_confidence: number; // 0-1
  suggested_mitigations: string[];
  auto_mitigation_available: boolean;
  escalation_threshold_reached: boolean;
}

export type BottleneckType =
  | 'cpu_bound'
  | 'memory_bound'
  | 'io_bound'
  | 'database_lock'
  | 'cache_thrashing'
  | 'index_inefficiency'
  | 'tier_contention'
  | 'concurrent_access'
  | 'resource_exhaustion'
  | 'algorithmic_complexity';

export interface PerformanceBaseline {
  operation_type: OperationType;
  baseline_metrics: {
    p50_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    avg_throughput_ops_sec: number;
    avg_memory_usage_mb: number;
    avg_cpu_usage_percent: number;
    avg_cache_hit_rate: number;
  };
  last_updated: Date;
  sample_size: number;
  confidence_interval: number;
}

export interface PerformanceRegression {
  regression_id: string;
  detected_at: Date;
  operation_type: OperationType;
  metric_affected: string;
  baseline_value: number;
  current_value: number;
  regression_percent: number;
  statistical_significance: number;
  potential_causes: string[];
  impact_assessment: {
    user_facing: boolean;
    severity: number; // 0-1
    estimated_recovery_time: string;
  };
  rollback_recommendation: boolean;
}

export interface ResourceUtilization {
  timestamp: Date;
  system_metrics: {
    cpu_usage_percent: number;
    memory_usage_percent: number;
    memory_available_mb: number;
    disk_io_rate_mb_sec: number;
    disk_usage_percent: number;
    network_io_kb_sec: number;
  };
  memory_system_metrics: {
    core_tier_utilization: number;
    longterm_tier_size_gb: number;
    active_connections: number;
    cache_size_mb: number;
    cache_hit_rate: number;
    index_cache_usage_mb: number;
    query_queue_length: number;
    concurrent_operations: number;
  };
  performance_indicators: {
    avg_search_latency_ms: number;
    avg_store_latency_ms: number;
    error_rate_percent: number;
    operation_throughput_per_sec: number;
  };
}

export interface PerformanceReport {
  report_id: string;
  generated_at: Date;
  time_period: { start: Date; end: Date };
  summary: {
    total_operations: number;
    avg_latency_ms: number;
    error_rate_percent: number;
    bottlenecks_detected: number;
    regressions_detected: number;
    performance_score: number; // 0-100
  };
  detailed_metrics: Map<OperationType, PerformanceMetrics[]>;
  bottlenecks: BottleneckDetection[];
  regressions: PerformanceRegression[];
  resource_trends: ResourceUtilization[];
  recommendations: Array<{
    category: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high';
    estimated_impact: number;
    implementation_complexity: 'easy' | 'medium' | 'hard';
  }>;
  baseline_comparisons: PerformanceBaseline[];
}

/**
 * Advanced Performance Analyzer and Bottleneck Detector
 *
 * Features:
 * - Real-time performance monitoring
 * - Statistical anomaly detection
 * - Automated bottleneck identification
 * - Resource utilization prediction
 * - Performance regression detection
 * - Comprehensive reporting and alerting
 */
export class PerformanceAnalyzer {
  private database: Database.Database;
  private performanceHistory: PerformanceMetrics[] = [];
  private activeBottlenecks = new Map<string, BottleneckDetection>();
  private baselines = new Map<OperationType, PerformanceBaseline>();
  private monitoringEnabled = true;
  private alertThresholds: Map<string, number>;

  // Performance monitoring configuration
  private readonly HISTORY_RETENTION_HOURS = 72;
  private readonly BASELINE_UPDATE_INTERVAL_HOURS = 24;
  private readonly REGRESSION_DETECTION_THRESHOLD = 0.3; // 30% performance degradation
  private readonly BOTTLENECK_DETECTION_WINDOW_MINUTES = 15;
  private readonly STATISTICAL_SIGNIFICANCE_THRESHOLD = 0.95;

  // Resource monitoring intervals
  private resourceMonitoringInterval?: NodeJS.Timeout;
  private readonly RESOURCE_MONITORING_INTERVAL_MS = 30000; // 30 seconds

  constructor(database: Database.Database) {
    this.database = database;
    this.alertThresholds = this.initializeAlertThresholds();
    this.initializePerformanceMonitoring();
    this.startResourceMonitoring();
  }

  /**
   * Start monitoring a performance-critical operation
   */
  public startOperation(operationType: OperationType, context?: any): PerformanceTracker {
    if (!this.monitoringEnabled) {
      return new PerformanceTracker(operationType, () => {}); // No-op tracker
    }

    const tracker = new PerformanceTracker(operationType, (metrics) => {
      this.recordMetrics(metrics);
      this.detectBottlenecks();
      this.checkForRegressions(metrics);
    });

    return tracker;
  }

  /**
   * Record performance metrics for analysis
   */
  public recordMetrics(metrics: PerformanceMetrics): void {
    // Add to in-memory history
    this.performanceHistory.push(metrics);

    // Clean old entries
    this.cleanOldPerformanceData();

    // Store in database for long-term analysis
    this.storeMetricsInDatabase(metrics);

    // Check for immediate performance issues
    this.checkImmediateAlerts(metrics);
  }

  /**
   * Detect performance bottlenecks using statistical analysis
   */
  public detectBottlenecks(): BottleneckDetection[] {
    const recentMetrics = this.getRecentMetrics(this.BOTTLENECK_DETECTION_WINDOW_MINUTES);
    const detectedBottlenecks: BottleneckDetection[] = [];

    // CPU bottleneck detection
    const avgCpuUsage = this.calculateAverage(recentMetrics, 'cpu_usage_percent');
    if (avgCpuUsage > 80) {
      detectedBottlenecks.push(this.createBottleneckDetection(
        'cpu_bound',
        'high',
        recentMetrics,
        'High CPU utilization detected across multiple operations',
        ['Scale CPU resources', 'Optimize algorithms', 'Implement operation queuing']
      ));
    }

    // Memory bottleneck detection
    const avgMemoryUsage = this.calculateAverage(recentMetrics, 'memory_usage_mb');
    const availableMemory = os.totalmem() / (1024 * 1024); // MB
    if (avgMemoryUsage > availableMemory * 0.85) {
      detectedBottlenecks.push(this.createBottleneckDetection(
        'memory_bound',
        'critical',
        recentMetrics,
        'Memory exhaustion approaching - system stability at risk',
        ['Implement memory cleanup', 'Increase system memory', 'Optimize memory usage patterns']
      ));
    }

    // I/O bottleneck detection
    const avgIoOps = this.calculateAverage(recentMetrics, 'io_operations');
    const ioLatency = this.calculatePercentile(recentMetrics.map(m => m.duration_ms), 95);
    if (avgIoOps > 1000 && ioLatency > 500) {
      detectedBottlenecks.push(this.createBottleneckDetection(
        'io_bound',
        'high',
        recentMetrics,
        'High I/O operations with elevated latency suggest storage bottleneck',
        ['Optimize database queries', 'Add database indexes', 'Implement read caching']
      ));
    }

    // Cache thrashing detection
    const recentCacheMetrics = recentMetrics.filter(m => m.cache_hits + m.cache_misses > 0);
    if (recentCacheMetrics.length > 0) {
      const avgHitRate = recentCacheMetrics.reduce((sum, m) =>
        sum + (m.cache_hits / (m.cache_hits + m.cache_misses)), 0) / recentCacheMetrics.length;

      if (avgHitRate < 0.3) {
        detectedBottlenecks.push(this.createBottleneckDetection(
          'cache_thrashing',
          'medium',
          recentMetrics,
          'Low cache hit rate indicates inefficient caching strategy',
          ['Tune cache size', 'Optimize cache eviction policy', 'Review access patterns']
        ));
      }
    }

    // Concurrent access bottleneck
    const maxConcurrentOps = Math.max(...recentMetrics.map(m => m.concurrent_operations));
    if (maxConcurrentOps > 50) {
      detectedBottlenecks.push(this.createBottleneckDetection(
        'concurrent_access',
        'medium',
        recentMetrics,
        'High concurrency may be causing resource contention',
        ['Implement operation throttling', 'Optimize locking strategy', 'Scale concurrent capacity']
      ));
    }

    // Update active bottlenecks
    for (const bottleneck of detectedBottlenecks) {
      this.activeBottlenecks.set(bottleneck.bottleneck_id, bottleneck);
    }

    return detectedBottlenecks;
  }

  /**
   * Check for performance regressions against baselines
   */
  public checkForRegressions(metrics: PerformanceMetrics): PerformanceRegression[] {
    const regressions: PerformanceRegression[] = [];
    const baseline = this.baselines.get(metrics.operation_type);

    if (!baseline) {
      return regressions; // No baseline to compare against
    }

    // Check latency regression
    const currentLatency = metrics.duration_ms;
    const baselineLatency = baseline.baseline_metrics.p95_latency_ms;
    const latencyIncrease = (currentLatency - baselineLatency) / baselineLatency;

    if (latencyIncrease > this.REGRESSION_DETECTION_THRESHOLD) {
      regressions.push({
        regression_id: `latency_regression_${Date.now()}`,
        detected_at: new Date(),
        operation_type: metrics.operation_type,
        metric_affected: 'latency_p95',
        baseline_value: baselineLatency,
        current_value: currentLatency,
        regression_percent: latencyIncrease * 100,
        statistical_significance: this.calculateStatisticalSignificance(metrics, baseline),
        potential_causes: this.identifyPotentialCauses(metrics, baseline),
        impact_assessment: {
          user_facing: this.isUserFacingOperation(metrics.operation_type),
          severity: Math.min(1.0, latencyIncrease),
          estimated_recovery_time: this.estimateRecoveryTime(latencyIncrease)
        },
        rollback_recommendation: latencyIncrease > 0.5 // Recommend rollback for >50% regression
      });
    }

    // Check memory usage regression
    const currentMemory = metrics.memory_usage_mb;
    const baselineMemory = baseline.baseline_metrics.avg_memory_usage_mb;
    const memoryIncrease = (currentMemory - baselineMemory) / baselineMemory;

    if (memoryIncrease > this.REGRESSION_DETECTION_THRESHOLD) {
      regressions.push({
        regression_id: `memory_regression_${Date.now()}`,
        detected_at: new Date(),
        operation_type: metrics.operation_type,
        metric_affected: 'memory_usage',
        baseline_value: baselineMemory,
        current_value: currentMemory,
        regression_percent: memoryIncrease * 100,
        statistical_significance: 0.8, // Simplified calculation
        potential_causes: ['Memory leak', 'Inefficient algorithm', 'Data structure bloat'],
        impact_assessment: {
          user_facing: false,
          severity: Math.min(1.0, memoryIncrease * 0.5),
          estimated_recovery_time: 'hours'
        },
        rollback_recommendation: memoryIncrease > 1.0 // Recommend rollback for >100% increase
      });
    }

    // Store regressions in database
    for (const regression of regressions) {
      this.storeRegressionInDatabase(regression);
    }

    return regressions;
  }

  /**
   * Generate comprehensive performance report
   */
  public async generatePerformanceReport(
    startTime?: Date,
    endTime?: Date
  ): Promise<PerformanceReport> {
    const reportId = `perf_report_${Date.now()}`;
    const start = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = endTime || new Date();

    // Get metrics for time period
    const periodMetrics = this.getMetricsForPeriod(start, end);
    const metricsGrouped = this.groupMetricsByOperation(periodMetrics);

    // Calculate summary statistics
    const summary = {
      total_operations: periodMetrics.length,
      avg_latency_ms: this.calculateAverage(periodMetrics, 'duration_ms'),
      error_rate_percent: this.calculateErrorRate(periodMetrics),
      bottlenecks_detected: this.activeBottlenecks.size,
      regressions_detected: await this.getRegressionsCount(start, end),
      performance_score: this.calculatePerformanceScore(periodMetrics)
    };

    // Get bottlenecks and regressions
    const bottlenecks = Array.from(this.activeBottlenecks.values());
    const regressions = await this.getRegressionsForPeriod(start, end);

    // Get resource utilization trends
    const resourceTrends = await this.getResourceUtilizationTrends(start, end);

    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations(
      periodMetrics,
      bottlenecks,
      regressions
    );

    const report: PerformanceReport = {
      report_id: reportId,
      generated_at: new Date(),
      time_period: { start, end },
      summary,
      detailed_metrics: metricsGrouped,
      bottlenecks,
      regressions,
      resource_trends: resourceTrends,
      recommendations,
      baseline_comparisons: Array.from(this.baselines.values())
    };

    // Store report in database
    await this.storePerformanceReport(report);

    return report;
  }

  /**
   * Update performance baselines based on recent stable performance
   */
  public updateBaselines(): void {
    const stableMetrics = this.getStableMetrics(); // Metrics without anomalies

    // Define operation types as an array instead of using Object.values on the type
    const operationTypes: OperationType[] = [
      'memory_store',
      'memory_search',
      'tier_migration',
      'behavioral_analysis',
      'aging_calculation',
      'optimization_generation',
      'database_query',
      'index_rebuild',
      'cache_operation',
      'cleanup_operation'
    ];

    for (const operationType of operationTypes) {
      const opMetrics = stableMetrics.filter(m => m.operation_type === operationType);

      if (opMetrics.length >= 100) { // Minimum sample size
        const latencies = opMetrics.map(m => m.duration_ms).sort((a, b) => a - b);
        const memoryUsages = opMetrics.map(m => m.memory_usage_mb);
        const cpuUsages = opMetrics.map(m => m.cpu_usage_percent);
        const cacheHitRates = opMetrics
          .filter(m => m.cache_hits + m.cache_misses > 0)
          .map(m => m.cache_hits / (m.cache_hits + m.cache_misses));

        const baseline: PerformanceBaseline = {
          operation_type: operationType,
          baseline_metrics: {
            p50_latency_ms: this.calculatePercentile(latencies, 50),
            p95_latency_ms: this.calculatePercentile(latencies, 95),
            p99_latency_ms: this.calculatePercentile(latencies, 99),
            avg_throughput_ops_sec: opMetrics.length / ((Date.now() - opMetrics[0].timestamp.getTime()) / 1000),
            avg_memory_usage_mb: this.calculateAverage(opMetrics, 'memory_usage_mb'),
            avg_cpu_usage_percent: this.calculateAverage(opMetrics, 'cpu_usage_percent'),
            avg_cache_hit_rate: cacheHitRates.length > 0 ?
              cacheHitRates.reduce((sum, rate) => sum + rate, 0) / cacheHitRates.length : 0
          },
          last_updated: new Date(),
          sample_size: opMetrics.length,
          confidence_interval: 0.95
        };

        this.baselines.set(operationType, baseline);
        this.storeBaselineInDatabase(baseline);
      }
    }
  }

  /**
   * Start automated resource monitoring
   */
  private startResourceMonitoring(): void {
    this.resourceMonitoringInterval = setInterval(() => {
      this.collectResourceMetrics();
    }, this.RESOURCE_MONITORING_INTERVAL_MS);
  }

  /**
   * Stop all monitoring activities
   */
  public stopMonitoring(): void {
    this.monitoringEnabled = false;
    if (this.resourceMonitoringInterval) {
      clearInterval(this.resourceMonitoringInterval);
    }
  }

  // Private helper methods

  private createBottleneckDetection(
    type: BottleneckType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metrics: PerformanceMetrics[],
    rootCause: string,
    mitigations: string[]
  ): BottleneckDetection {
    const affectedOps = [...new Set(metrics.map(m => m.operation_type))];
    const avgLatency = this.calculateAverage(metrics, 'duration_ms');
    const baselineLatency = 100; // Simplified baseline

    return {
      bottleneck_id: `${type}_${Date.now()}`,
      detected_at: new Date(),
      bottleneck_type: type,
      severity,
      affected_operations: affectedOps,
      root_cause: rootCause,
      performance_impact: {
        latency_increase_percent: ((avgLatency - baselineLatency) / baselineLatency) * 100,
        throughput_decrease_percent: 20, // Estimated
        resource_utilization_increase: 30, // Estimated
        user_experience_impact: severity === 'critical' ? 0.9 : severity === 'high' ? 0.7 : 0.4
      },
      detection_confidence: 0.85,
      suggested_mitigations: mitigations,
      auto_mitigation_available: type === 'cache_thrashing',
      escalation_threshold_reached: severity === 'critical'
    };
  }

  private calculateAverage(metrics: PerformanceMetrics[], field: keyof PerformanceMetrics): number {
    const values = metrics.map(m => m[field] as number).filter(v => typeof v === 'number');
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  private getRecentMetrics(minutes: number): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.performanceHistory.filter(m => m.timestamp > cutoff);
  }

  private cleanOldPerformanceData(): void {
    const cutoff = new Date(Date.now() - this.HISTORY_RETENTION_HOURS * 60 * 60 * 1000);
    this.performanceHistory = this.performanceHistory.filter(m => m.timestamp > cutoff);
  }

  private async collectResourceMetrics(): Promise<void> {
    const resourceMetrics: ResourceUtilization = {
      timestamp: new Date(),
      system_metrics: {
        cpu_usage_percent: await this.getCpuUsage(),
        memory_usage_percent: this.getMemoryUsage(),
        memory_available_mb: os.freemem() / (1024 * 1024),
        disk_io_rate_mb_sec: 0, // Would implement actual disk I/O monitoring
        disk_usage_percent: 0, // Would implement actual disk usage monitoring
        network_io_kb_sec: 0 // Would implement actual network I/O monitoring
      },
      memory_system_metrics: {
        core_tier_utilization: await this.getCoreMemoryUtilization(),
        longterm_tier_size_gb: await this.getLongtermStorageSize(),
        active_connections: 1, // Single database connection
        cache_size_mb: 0, // Would implement cache size monitoring
        cache_hit_rate: 0.8, // Would calculate from actual cache metrics
        index_cache_usage_mb: 0, // Would implement index cache monitoring
        query_queue_length: 0, // Would implement query queue monitoring
        concurrent_operations: this.getCurrentConcurrentOperations()
      },
      performance_indicators: {
        avg_search_latency_ms: this.getRecentAverageLatency('memory_search'),
        avg_store_latency_ms: this.getRecentAverageLatency('memory_store'),
        error_rate_percent: this.calculateRecentErrorRate(),
        operation_throughput_per_sec: this.calculateRecentThroughput()
      }
    };

    await this.storeResourceMetrics(resourceMetrics);
  }

  // Additional helper methods would be implemented here...
  private initializeAlertThresholds(): Map<string, number> {
    return new Map([
      ['latency_p95_ms', 1000],
      ['error_rate_percent', 5.0],
      ['memory_usage_mb', 1000],
      ['cpu_usage_percent', 80.0],
      ['cache_hit_rate', 0.5]
    ]);
  }

  private initializePerformanceMonitoring(): void {
    // Initialize database tables for performance monitoring
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS performance_metrics_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        operation_type TEXT NOT NULL,
        duration_ms REAL NOT NULL,
        memory_usage_mb REAL,
        cpu_usage_percent REAL,
        io_operations INTEGER,
        cache_hits INTEGER,
        cache_misses INTEGER,
        concurrent_operations INTEGER,
        error_count INTEGER DEFAULT 0,
        warnings_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_perf_timestamp ON performance_metrics_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_perf_operation ON performance_metrics_log(operation_type, timestamp);
    `);
  }

  // Placeholder implementations for system metrics
  private async getCpuUsage(): Promise<number> {
    return Math.random() * 100; // Would implement actual CPU monitoring
  }

  private getMemoryUsage(): number {
    const used = os.totalmem() - os.freemem();
    return (used / os.totalmem()) * 100;
  }

  private async getCoreMemoryUtilization(): Promise<number> {
    const result = this.database.prepare(`
      SELECT SUM(content_size) as total_size FROM unified_memories WHERE tier = 'core'
    `).get() as {total_size: number};
    return (result.total_size || 0) / (2048 * 10); // Assuming 20KB total limit
  }

  private async getLongtermStorageSize(): Promise<number> {
    const result = this.database.prepare(`
      SELECT SUM(content_size) as total_size FROM unified_memories WHERE tier = 'longterm'
    `).get() as {total_size: number};
    return (result.total_size || 0) / (1024 * 1024 * 1024); // Convert to GB
  }

  private getCurrentConcurrentOperations(): number {
    return this.performanceHistory.filter(m =>
      Date.now() - m.timestamp.getTime() < 5000
    ).length; // Operations in last 5 seconds
  }

  // Additional methods implementation
  private storeMetricsInDatabase(metrics: PerformanceMetrics): void {
    try {
      const stmt = this.database.prepare(`
        INSERT INTO performance_metrics_log
        (timestamp, operation_type, duration_ms, memory_usage_mb, cpu_usage_percent,
         io_operations, cache_hits, cache_misses, concurrent_operations, error_count, warnings_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        metrics.timestamp.getTime(),
        metrics.operation_type,
        metrics.duration_ms,
        metrics.memory_usage_mb,
        metrics.cpu_usage_percent,
        metrics.io_operations,
        metrics.cache_hits,
        metrics.cache_misses,
        metrics.concurrent_operations,
        metrics.error_count,
        metrics.warnings_count
      );
    } catch (error) {
      console.error('Failed to store metrics in database:', error);
    }
  }

  private checkImmediateAlerts(metrics: PerformanceMetrics): void {
    // Check for immediate alert conditions
    if (metrics.duration_ms > (this.alertThresholds.get('latency_p95_ms') || 1000)) {
      console.warn(`High latency detected: ${metrics.duration_ms}ms for ${metrics.operation_type}`);
    }
    if (metrics.error_count > 0) {
      console.error(`Errors detected in operation ${metrics.operation_type}: ${metrics.error_count} errors`);
    }
  }

  private getStableMetrics(): PerformanceMetrics[] {
    // Return metrics without anomalies (simplified - excludes top 5% outliers)
    const sorted = [...this.performanceHistory].sort((a, b) => a.duration_ms - b.duration_ms);
    const cutoffIndex = Math.floor(sorted.length * 0.95);
    return sorted.slice(0, cutoffIndex);
  }

  private calculateStatisticalSignificance(metrics: PerformanceMetrics, baseline: PerformanceBaseline): number {
    // Simplified statistical significance calculation
    const deviation = Math.abs(metrics.duration_ms - baseline.baseline_metrics.p95_latency_ms);
    const stdDev = baseline.baseline_metrics.p95_latency_ms * 0.1; // Assume 10% std deviation
    const zScore = deviation / stdDev;
    // Convert z-score to confidence level (simplified)
    return Math.min(1.0, Math.max(0, 1 - Math.exp(-zScore / 2)));
  }

  private identifyPotentialCauses(metrics: PerformanceMetrics, baseline: PerformanceBaseline): string[] {
    const causes: string[] = [];

    if (metrics.memory_usage_mb > baseline.baseline_metrics.avg_memory_usage_mb * 1.5) {
      causes.push('Increased memory usage');
    }
    if (metrics.cpu_usage_percent > baseline.baseline_metrics.avg_cpu_usage_percent * 1.5) {
      causes.push('Increased CPU usage');
    }
    if (metrics.cache_hits + metrics.cache_misses > 0) {
      const hitRate = metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses);
      if (hitRate < baseline.baseline_metrics.avg_cache_hit_rate * 0.8) {
        causes.push('Degraded cache performance');
      }
    }
    if (metrics.concurrent_operations > 10) {
      causes.push('High concurrency');
    }
    if (metrics.error_count > 0) {
      causes.push('Error conditions');
    }

    if (causes.length === 0) {
      causes.push('Unknown - requires deeper analysis');
    }

    return causes;
  }

  private isUserFacingOperation(operationType: OperationType): boolean {
    // Determine if operation is user-facing
    const userFacingOps: OperationType[] = ['memory_search', 'memory_store', 'tier_migration'];
    return userFacingOps.includes(operationType);
  }

  private estimateRecoveryTime(regressionPercent: number): string {
    if (regressionPercent < 0.5) return 'minutes';
    if (regressionPercent < 1.0) return 'hours';
    return 'days';
  }

  private storeRegressionInDatabase(regression: PerformanceRegression): void {
    try {
      // Create table if it doesn't exist
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS performance_regressions (
          regression_id TEXT PRIMARY KEY,
          detected_at INTEGER NOT NULL,
          operation_type TEXT NOT NULL,
          metric_affected TEXT NOT NULL,
          baseline_value REAL,
          current_value REAL,
          regression_percent REAL,
          statistical_significance REAL,
          potential_causes TEXT,
          user_facing INTEGER,
          severity REAL,
          estimated_recovery_time TEXT,
          rollback_recommendation INTEGER
        )
      `);

      const stmt = this.database.prepare(`
        INSERT INTO performance_regressions
        (regression_id, detected_at, operation_type, metric_affected, baseline_value,
         current_value, regression_percent, statistical_significance, potential_causes,
         user_facing, severity, estimated_recovery_time, rollback_recommendation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        regression.regression_id,
        regression.detected_at.getTime(),
        regression.operation_type,
        regression.metric_affected,
        regression.baseline_value,
        regression.current_value,
        regression.regression_percent,
        regression.statistical_significance,
        JSON.stringify(regression.potential_causes),
        regression.impact_assessment.user_facing ? 1 : 0,
        regression.impact_assessment.severity,
        regression.impact_assessment.estimated_recovery_time,
        regression.rollback_recommendation ? 1 : 0
      );
    } catch (error) {
      console.error('Failed to store regression in database:', error);
    }
  }

  private getMetricsForPeriod(start: Date, end: Date): PerformanceMetrics[] {
    try {
      const rows = this.database.prepare(`
        SELECT * FROM performance_metrics_log
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
      `).all(start.getTime(), end.getTime()) as any[];

      return rows.map(row => ({
        timestamp: new Date(row.timestamp),
        operation_type: row.operation_type as OperationType,
        duration_ms: row.duration_ms,
        memory_usage_mb: row.memory_usage_mb,
        cpu_usage_percent: row.cpu_usage_percent,
        io_operations: row.io_operations,
        cache_hits: row.cache_hits,
        cache_misses: row.cache_misses,
        concurrent_operations: row.concurrent_operations,
        error_count: row.error_count,
        warnings_count: row.warnings_count
      }));
    } catch (error) {
      console.error('Failed to get metrics for period:', error);
      return [];
    }
  }

  private groupMetricsByOperation(metrics: PerformanceMetrics[]): Map<OperationType, PerformanceMetrics[]> {
    const grouped = new Map<OperationType, PerformanceMetrics[]>();

    for (const metric of metrics) {
      const existing = grouped.get(metric.operation_type) || [];
      existing.push(metric);
      grouped.set(metric.operation_type, existing);
    }

    return grouped;
  }

  private calculateErrorRate(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;

    const totalErrors = metrics.reduce((sum, m) => sum + m.error_count, 0);
    return (totalErrors / metrics.length) * 100;
  }

  private async getRegressionsCount(start: Date, end: Date): Promise<number> {
    try {
      const result = this.database.prepare(`
        SELECT COUNT(*) as count FROM performance_regressions
        WHERE detected_at >= ? AND detected_at <= ?
      `).get(start.getTime(), end.getTime()) as { count: number };

      return result.count || 0;
    } catch (error) {
      console.error('Failed to get regressions count:', error);
      return 0;
    }
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 100;

    let score = 100;

    // Deduct points for high latency
    const avgLatency = this.calculateAverage(metrics, 'duration_ms');
    if (avgLatency > 100) score -= Math.min(20, (avgLatency - 100) / 10);
    if (avgLatency > 500) score -= 20;

    // Deduct points for errors
    const errorRate = this.calculateErrorRate(metrics);
    score -= Math.min(30, errorRate * 3);

    // Deduct points for low cache hit rate
    const cacheMetrics = metrics.filter(m => m.cache_hits + m.cache_misses > 0);
    if (cacheMetrics.length > 0) {
      const avgHitRate = cacheMetrics.reduce((sum, m) =>
        sum + (m.cache_hits / (m.cache_hits + m.cache_misses)), 0) / cacheMetrics.length;
      if (avgHitRate < 0.8) score -= (0.8 - avgHitRate) * 20;
    }

    // Deduct points for high resource usage
    const avgCpu = this.calculateAverage(metrics, 'cpu_usage_percent');
    if (avgCpu > 70) score -= Math.min(10, (avgCpu - 70) / 3);

    return Math.max(0, score);
  }

  private async getRegressionsForPeriod(start: Date, end: Date): Promise<PerformanceRegression[]> {
    try {
      const rows = this.database.prepare(`
        SELECT * FROM performance_regressions
        WHERE detected_at >= ? AND detected_at <= ?
        ORDER BY detected_at DESC
      `).all(start.getTime(), end.getTime()) as any[];

      return rows.map(row => ({
        regression_id: row.regression_id,
        detected_at: new Date(row.detected_at),
        operation_type: row.operation_type as OperationType,
        metric_affected: row.metric_affected,
        baseline_value: row.baseline_value,
        current_value: row.current_value,
        regression_percent: row.regression_percent,
        statistical_significance: row.statistical_significance,
        potential_causes: JSON.parse(row.potential_causes),
        impact_assessment: {
          user_facing: row.user_facing === 1,
          severity: row.severity,
          estimated_recovery_time: row.estimated_recovery_time
        },
        rollback_recommendation: row.rollback_recommendation === 1
      }));
    } catch (error) {
      console.error('Failed to get regressions for period:', error);
      return [];
    }
  }

  private async getResourceUtilizationTrends(start: Date, end: Date): Promise<ResourceUtilization[]> {
    try {
      // For now, return current resource utilization as a single data point
      // In production, this would query historical resource data
      const current: ResourceUtilization = {
        timestamp: new Date(),
        system_metrics: {
          cpu_usage_percent: await this.getCpuUsage(),
          memory_usage_percent: this.getMemoryUsage(),
          memory_available_mb: os.freemem() / (1024 * 1024),
          disk_io_rate_mb_sec: 0,
          disk_usage_percent: 0,
          network_io_kb_sec: 0
        },
        memory_system_metrics: {
          core_tier_utilization: await this.getCoreMemoryUtilization(),
          longterm_tier_size_gb: await this.getLongtermStorageSize(),
          active_connections: 1,
          cache_size_mb: 0,
          cache_hit_rate: 0.8,
          index_cache_usage_mb: 0,
          query_queue_length: 0,
          concurrent_operations: this.getCurrentConcurrentOperations()
        },
        performance_indicators: {
          avg_search_latency_ms: this.getRecentAverageLatency('memory_search'),
          avg_store_latency_ms: this.getRecentAverageLatency('memory_store'),
          error_rate_percent: this.calculateRecentErrorRate(),
          operation_throughput_per_sec: this.calculateRecentThroughput()
        }
      };

      return [current];
    } catch (error) {
      console.error('Failed to get resource utilization trends:', error);
      return [];
    }
  }

  private generatePerformanceRecommendations(
    metrics: PerformanceMetrics[],
    bottlenecks: BottleneckDetection[],
    regressions: PerformanceRegression[]
  ): Array<{
    category: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high';
    estimated_impact: number;
    implementation_complexity: 'easy' | 'medium' | 'hard';
  }> {
    const recommendations: Array<{
      category: string;
      recommendation: string;
      priority: 'low' | 'medium' | 'high';
      estimated_impact: number;
      implementation_complexity: 'easy' | 'medium' | 'hard';
    }> = [];

    // Analyze bottlenecks for recommendations
    for (const bottleneck of bottlenecks) {
      if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
        recommendations.push({
          category: 'Performance',
          recommendation: bottleneck.suggested_mitigations[0] || 'Address bottleneck',
          priority: bottleneck.severity === 'critical' ? 'high' as const : 'medium' as const,
          estimated_impact: bottleneck.performance_impact.user_experience_impact,
          implementation_complexity: 'medium' as const
        });
      }
    }

    // Analyze regressions for recommendations
    for (const regression of regressions) {
      if (regression.rollback_recommendation) {
        recommendations.push({
          category: 'Regression',
          recommendation: `Consider rolling back changes that affected ${regression.metric_affected}`,
          priority: 'high' as const,
          estimated_impact: regression.impact_assessment.severity,
          implementation_complexity: 'easy' as const
        });
      }
    }

    // General performance recommendations based on metrics
    const avgLatency = this.calculateAverage(metrics, 'duration_ms');
    if (avgLatency > 500) {
      recommendations.push({
        category: 'Latency',
        recommendation: 'Optimize slow operations or implement caching',
        priority: 'high' as const,
        estimated_impact: 0.7,
        implementation_complexity: 'medium' as const
      });
    }

    const errorRate = this.calculateErrorRate(metrics);
    if (errorRate > 5) {
      recommendations.push({
        category: 'Reliability',
        recommendation: 'Investigate and fix error conditions',
        priority: 'high' as const,
        estimated_impact: 0.8,
        implementation_complexity: 'medium' as const
      });
    }

    return recommendations;
  }

  private async storePerformanceReport(report: PerformanceReport): Promise<void> {
    try {
      // Create table if it doesn't exist
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS performance_reports (
          report_id TEXT PRIMARY KEY,
          generated_at INTEGER NOT NULL,
          time_period_start INTEGER,
          time_period_end INTEGER,
          summary TEXT,
          recommendations TEXT,
          performance_score REAL
        )
      `);

      const stmt = this.database.prepare(`
        INSERT INTO performance_reports
        (report_id, generated_at, time_period_start, time_period_end, summary, recommendations, performance_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        report.report_id,
        report.generated_at.getTime(),
        report.time_period.start.getTime(),
        report.time_period.end.getTime(),
        JSON.stringify(report.summary),
        JSON.stringify(report.recommendations),
        report.summary.performance_score
      );
    } catch (error) {
      console.error('Failed to store performance report:', error);
    }
  }

  private storeBaselineInDatabase(baseline: PerformanceBaseline): void {
    try {
      // Create table if it doesn't exist
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS performance_baselines (
          operation_type TEXT PRIMARY KEY,
          p50_latency_ms REAL,
          p95_latency_ms REAL,
          p99_latency_ms REAL,
          avg_throughput_ops_sec REAL,
          avg_memory_usage_mb REAL,
          avg_cpu_usage_percent REAL,
          avg_cache_hit_rate REAL,
          last_updated INTEGER,
          sample_size INTEGER,
          confidence_interval REAL
        )
      `);

      const stmt = this.database.prepare(`
        INSERT OR REPLACE INTO performance_baselines
        (operation_type, p50_latency_ms, p95_latency_ms, p99_latency_ms,
         avg_throughput_ops_sec, avg_memory_usage_mb, avg_cpu_usage_percent,
         avg_cache_hit_rate, last_updated, sample_size, confidence_interval)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        baseline.operation_type,
        baseline.baseline_metrics.p50_latency_ms,
        baseline.baseline_metrics.p95_latency_ms,
        baseline.baseline_metrics.p99_latency_ms,
        baseline.baseline_metrics.avg_throughput_ops_sec,
        baseline.baseline_metrics.avg_memory_usage_mb,
        baseline.baseline_metrics.avg_cpu_usage_percent,
        baseline.baseline_metrics.avg_cache_hit_rate,
        baseline.last_updated.getTime(),
        baseline.sample_size,
        baseline.confidence_interval
      );
    } catch (error) {
      console.error('Failed to store baseline in database:', error);
    }
  }

  private getRecentAverageLatency(operationType: OperationType): number {
    const recentMetrics = this.getRecentMetrics(5); // Last 5 minutes
    const opMetrics = recentMetrics.filter(m => m.operation_type === operationType);

    if (opMetrics.length === 0) return 0;

    return opMetrics.reduce((sum, m) => sum + m.duration_ms, 0) / opMetrics.length;
  }

  private calculateRecentErrorRate(): number {
    const recentMetrics = this.getRecentMetrics(15); // Last 15 minutes
    return this.calculateErrorRate(recentMetrics);
  }

  private calculateRecentThroughput(): number {
    const recentMetrics = this.getRecentMetrics(60); // Last hour
    if (recentMetrics.length === 0) return 0;

    const timeSpanSeconds = (Date.now() - recentMetrics[0].timestamp.getTime()) / 1000;
    return recentMetrics.length / timeSpanSeconds;
  }

  private async storeResourceMetrics(metrics: ResourceUtilization): Promise<void> {
    try {
      // Create table if it doesn't exist
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS resource_utilization (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          cpu_usage_percent REAL,
          memory_usage_percent REAL,
          memory_available_mb REAL,
          disk_io_rate_mb_sec REAL,
          core_tier_utilization REAL,
          longterm_tier_size_gb REAL,
          avg_search_latency_ms REAL,
          avg_store_latency_ms REAL,
          error_rate_percent REAL,
          operation_throughput_per_sec REAL
        )
      `);

      const stmt = this.database.prepare(`
        INSERT INTO resource_utilization
        (timestamp, cpu_usage_percent, memory_usage_percent, memory_available_mb,
         disk_io_rate_mb_sec, core_tier_utilization, longterm_tier_size_gb,
         avg_search_latency_ms, avg_store_latency_ms, error_rate_percent,
         operation_throughput_per_sec)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        metrics.timestamp.getTime(),
        metrics.system_metrics.cpu_usage_percent,
        metrics.system_metrics.memory_usage_percent,
        metrics.system_metrics.memory_available_mb,
        metrics.system_metrics.disk_io_rate_mb_sec,
        metrics.memory_system_metrics.core_tier_utilization,
        metrics.memory_system_metrics.longterm_tier_size_gb,
        metrics.performance_indicators.avg_search_latency_ms,
        metrics.performance_indicators.avg_store_latency_ms,
        metrics.performance_indicators.error_rate_percent,
        metrics.performance_indicators.operation_throughput_per_sec
      );
    } catch (error) {
      console.error('Failed to store resource metrics:', error);
    }
  }
}

/**
 * Performance tracker for individual operations
 */
export class PerformanceTracker {
  private startTime: number;
  private startMemory: number;
  private operationType: OperationType;
  private onComplete: (metrics: PerformanceMetrics) => void;

  constructor(operationType: OperationType, onComplete: (metrics: PerformanceMetrics) => void) {
    this.operationType = operationType;
    this.onComplete = onComplete;
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed / (1024 * 1024); // MB
  }

  public complete(additionalData?: Partial<PerformanceMetrics>): void {
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed / (1024 * 1024); // MB

    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      operation_type: this.operationType,
      duration_ms: endTime - this.startTime,
      memory_usage_mb: endMemory - this.startMemory,
      cpu_usage_percent: 0, // Would implement actual CPU monitoring
      io_operations: 0,
      cache_hits: 0,
      cache_misses: 0,
      concurrent_operations: 1,
      error_count: 0,
      warnings_count: 0,
      ...additionalData
    };

    this.onComplete(metrics);
  }
}

// Additional helper functions and type definitions would continue here...