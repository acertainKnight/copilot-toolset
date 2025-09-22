/**
 * Custom Jest Reporter for Performance Tests
 */

import { AggregatedResult, TestResult } from '@jest/test-result';
import { Config } from '@jest/types';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PerformanceMetric {
  testName: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  category: string;
  threshold: number;
  passed: boolean;
}

export default class PerformanceReporter {
  private metrics: PerformanceMetric[] = [];
  private outputDir: string;

  constructor(
    globalConfig: Config.GlobalConfig,
    options: Record<string, any> = {}
  ) {
    this.outputDir = options.outputDir || path.join(process.cwd(), 'performance-reports');
  }

  async onRunStart() {
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true }).catch(() => {});
  }

  onTestResult(test: any, testResult: TestResult) {
    // Extract performance metrics from test results
    testResult.testResults.forEach((result) => {
      if (result.title.includes('performance') || result.title.includes('benchmark')) {
        const metric: PerformanceMetric = {
          testName: result.fullName,
          duration: result.duration || 0,
          memoryUsage: process.memoryUsage(),
          category: this.extractCategory(result.title),
          threshold: this.getThreshold(result.title),
          passed: result.status === 'passed'
        };

        this.metrics.push(metric);
      }
    });
  }

  async onRunComplete(contexts: any, results: AggregatedResult) {
    if (this.metrics.length === 0) {
      return;
    }

    await this.generatePerformanceReport();
    await this.generateMetricsJson();
    this.logPerformanceSummary();
  }

  private extractCategory(title: string): string {
    if (title.toLowerCase().includes('memory')) return 'Memory';
    if (title.toLowerCase().includes('storage')) return 'Storage';
    if (title.toLowerCase().includes('search')) return 'Search';
    if (title.toLowerCase().includes('concurrent')) return 'Concurrency';
    if (title.toLowerCase().includes('initialization')) return 'Initialization';
    return 'General';
  }

  private getThreshold(title: string): number {
    // Define performance thresholds in milliseconds
    const thresholds: Record<string, number> = {
      memory: 1000,
      storage: 500,
      search: 200,
      initialization: 2000,
      concurrent: 3000,
      general: 1000
    };

    const category = this.extractCategory(title).toLowerCase();
    return thresholds[category] || thresholds.general;
  }

  private async generatePerformanceReport() {
    const reportPath = path.join(this.outputDir, 'performance-report.html');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Copilot MCP Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .passed { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
        .warning { background-color: #fff3cd; }
        .summary { margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .chart-container { margin: 30px 0; }
    </style>
</head>
<body>
    <h1>Copilot MCP Performance Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> ${this.metrics.length}</p>
        <p><strong>Passed:</strong> ${this.metrics.filter(m => m.passed).length}</p>
        <p><strong>Failed:</strong> ${this.metrics.filter(m => !m.passed).length}</p>
        <p><strong>Average Duration:</strong> ${this.getAverageDuration().toFixed(2)}ms</p>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    </div>

    <h2>Performance Metrics by Category</h2>
    ${this.generateCategoryTables()}

    <h2>All Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Category</th>
                <th>Duration (ms)</th>
                <th>Threshold (ms)</th>
                <th>Memory (MB)</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${this.metrics.map(metric => `
                <tr class="${metric.passed ? 'passed' : 'failed'}">
                    <td>${metric.testName}</td>
                    <td>${metric.category}</td>
                    <td>${metric.duration.toFixed(2)}</td>
                    <td>${metric.threshold}</td>
                    <td>${(metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}</td>
                    <td>${metric.passed ? '✓' : '✗'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <h2>Performance Trends</h2>
    <div class="chart-container">
        <p>Performance metrics over time would be displayed here in a production system.</p>
        <p>Consider integrating with tools like Chart.js for visual representations.</p>
    </div>

    <script>
        // Add any interactive JavaScript here
        console.log('Performance report loaded');
    </script>
</body>
</html>`;

    await fs.writeFile(reportPath, html);
  }

  private generateCategoryTables(): string {
    const categories = [...new Set(this.metrics.map(m => m.category))];

    return categories.map(category => {
      const categoryMetrics = this.metrics.filter(m => m.category === category);
      const avgDuration = categoryMetrics.reduce((sum, m) => sum + m.duration, 0) / categoryMetrics.length;

      return `
        <h3>${category} (Avg: ${avgDuration.toFixed(2)}ms)</h3>
        <table>
            <thead>
                <tr>
                    <th>Test</th>
                    <th>Duration (ms)</th>
                    <th>vs Threshold</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${categoryMetrics.map(metric => `
                    <tr class="${metric.passed ? 'passed' : 'failed'}">
                        <td>${metric.testName.split(' ').slice(-3).join(' ')}</td>
                        <td>${metric.duration.toFixed(2)}</td>
                        <td>${(metric.duration / metric.threshold * 100).toFixed(1)}%</td>
                        <td>${metric.passed ? '✓' : '✗'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
      `;
    }).join('');
  }

  private async generateMetricsJson() {
    const jsonPath = path.join(this.outputDir, 'performance-metrics.json');

    const data = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.metrics.length,
        passed: this.metrics.filter(m => m.passed).length,
        failed: this.metrics.filter(m => !m.passed).length,
        averageDuration: this.getAverageDuration(),
        totalMemoryUsed: this.getTotalMemoryUsed()
      },
      metrics: this.metrics.map(metric => ({
        testName: metric.testName,
        category: metric.category,
        duration: metric.duration,
        threshold: metric.threshold,
        thresholdRatio: metric.duration / metric.threshold,
        memoryUsed: metric.memoryUsage.heapUsed,
        passed: metric.passed
      })),
      categories: this.getCategoryStats()
    };

    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
  }

  private logPerformanceSummary() {
    console.log('\n📊 Performance Test Summary');
    console.log('═══════════════════════════════');
    console.log(`Total Tests: ${this.metrics.length}`);
    console.log(`Passed: ${this.metrics.filter(m => m.passed).length}`);
    console.log(`Failed: ${this.metrics.filter(m => !m.passed).length}`);
    console.log(`Average Duration: ${this.getAverageDuration().toFixed(2)}ms`);

    // Show slowest tests
    const slowestTests = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    console.log('\n🐌 Slowest Tests:');
    slowestTests.forEach((metric, index) => {
      console.log(`${index + 1}. ${metric.testName.split(' ').slice(-2).join(' ')}: ${metric.duration.toFixed(2)}ms`);
    });

    // Show category performance
    console.log('\n📈 Category Performance:');
    const categoryStats = this.getCategoryStats();
    Object.entries(categoryStats).forEach(([category, stats]) => {
      console.log(`${category}: ${stats.averageDuration.toFixed(2)}ms (${stats.count} tests)`);
    });

    // Show threshold violations
    const violations = this.metrics.filter(m => m.duration > m.threshold);
    if (violations.length > 0) {
      console.log(`\n⚠️  ${violations.length} tests exceeded performance thresholds`);
    }

    console.log(`\n📁 Reports generated in: ${this.outputDir}`);
  }

  private getAverageDuration(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length;
  }

  private getTotalMemoryUsed(): number {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(m => m.memoryUsage.heapUsed));
  }

  private getCategoryStats(): Record<string, any> {
    const categories = [...new Set(this.metrics.map(m => m.category))];

    return categories.reduce((stats, category) => {
      const categoryMetrics = this.metrics.filter(m => m.category === category);
      stats[category] = {
        count: categoryMetrics.length,
        averageDuration: categoryMetrics.reduce((sum, m) => sum + m.duration, 0) / categoryMetrics.length,
        maxDuration: Math.max(...categoryMetrics.map(m => m.duration)),
        minDuration: Math.min(...categoryMetrics.map(m => m.duration)),
        passed: categoryMetrics.filter(m => m.passed).length,
        failed: categoryMetrics.filter(m => !m.passed).length
      };
      return stats;
    }, {} as Record<string, any>);
  }
}