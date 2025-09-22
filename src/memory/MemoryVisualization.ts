/**
 * Memory Visualization - Generate visual representations of memory usage and patterns
 * Creates ASCII charts, graphs, and visual dashboards for terminal/CLI display
 */

import { DashboardData, MemoryUsageMetrics, AccessPatternAnalysis } from './MemoryAnalytics.js';
import { Memory } from '../types/index.js';

export interface VisualChart {
  title: string;
  chart: string;
  width: number;
  height: number;
}

export interface TerminalDashboard {
  header: string;
  charts: VisualChart[];
  summary: string;
  width: number;
}

/**
 * Memory Visualization Engine
 * Creates terminal-friendly visual representations of memory data
 */
export class MemoryVisualization {
  private readonly CHART_WIDTH = 60;
  private readonly CHART_HEIGHT = 15;

  /**
   * Generate complete terminal dashboard
   */
  generateTerminalDashboard(data: DashboardData): TerminalDashboard {
    const charts: VisualChart[] = [
      this.createTierDistributionChart(data.visualization.tierDistribution),
      this.createMemoryGrowthChart(data.metrics),
      this.createAccessPatternHeatmap(data.patterns),
      this.createHealthScoreGauge(data.health.score),
      this.createLayerDistributionPieChart(data.metrics.memoriesByLayer)
    ];

    const header = this.generateDashboardHeader(data);
    const summary = this.generateSummary(data);

    return {
      header,
      charts,
      summary,
      width: this.CHART_WIDTH + 4
    };
  }

  /**
   * Render terminal dashboard as string
   */
  renderTerminalDashboard(dashboard: TerminalDashboard): string {
    const border = '═'.repeat(dashboard.width);
    let output = `╔${border}╗\n`;

    // Header
    output += this.boxText(dashboard.header, dashboard.width);
    output += `╠${border}╣\n`;

    // Charts
    for (const chart of dashboard.charts) {
      output += this.boxText(`📊 ${chart.title}`, dashboard.width);
      output += '║' + ' '.repeat(dashboard.width) + '║\n';

      const chartLines = chart.chart.split('\n');
      for (const line of chartLines) {
        output += '║ ' + line.padEnd(dashboard.width - 2) + ' ║\n';
      }
      output += '║' + ' '.repeat(dashboard.width) + '║\n';
    }

    // Summary
    output += `╠${border}╣\n`;
    output += this.boxText(dashboard.summary, dashboard.width);
    output += `╚${border}╝\n`;

    return output;
  }

  /**
   * Create tier distribution bar chart
   */
  private createTierDistributionChart(tierData: any): VisualChart {
    const maxCount = Math.max(tierData.core.count, tierData.warm.count, tierData.cold.count);
    const scale = (this.CHART_WIDTH - 20) / Math.max(maxCount, 1);

    let chart = '';
    chart += `Core Memory │${'█'.repeat(Math.floor(tierData.core.count * scale)).padEnd(this.CHART_WIDTH - 20)} ${tierData.core.count}\n`;
    chart += `Warm Storage │${'▓'.repeat(Math.floor(tierData.warm.count * scale)).padEnd(this.CHART_WIDTH - 20)} ${tierData.warm.count}\n`;
    chart += `Cold Storage │${'░'.repeat(Math.floor(tierData.cold.count * scale)).padEnd(this.CHART_WIDTH - 20)} ${tierData.cold.count}\n`;
    chart += `             └${'─'.repeat(this.CHART_WIDTH - 20)}`;

    return {
      title: 'Memory Tier Distribution',
      chart,
      width: this.CHART_WIDTH,
      height: 5
    };
  }

  /**
   * Create memory growth line chart
   */
  private createMemoryGrowthChart(metrics: MemoryUsageMetrics): VisualChart {
    // Simulate growth data (in real implementation, would use historical data)
    const days = 30;
    const growthData: number[] = [];
    let total = Math.max(0, metrics.totalMemories - days * metrics.memoryGrowthRate);

    for (let i = 0; i < days; i++) {
      total += metrics.memoryGrowthRate * (0.8 + Math.random() * 0.4); // Add some variance
      growthData.push(Math.floor(total));
    }

    const maxValue = Math.max(...growthData);
    const minValue = Math.min(...growthData);
    const range = maxValue - minValue || 1;

    let chart = '';
    const chartHeight = this.CHART_HEIGHT - 3;

    // Create line chart
    for (let row = chartHeight - 1; row >= 0; row--) {
      const threshold = minValue + (range * (row + 0.5)) / chartHeight;
      let line = threshold.toString().padStart(6) + ' │';

      for (let col = 0; col < Math.min(days, this.CHART_WIDTH - 10); col++) {
        const value = growthData[Math.floor(col * days / (this.CHART_WIDTH - 10))];
        if (value >= threshold - range / (chartHeight * 2) && value < threshold + range / (chartHeight * 2)) {
          line += '●';
        } else if (value > threshold) {
          line += '│';
        } else {
          line += ' ';
        }
      }
      chart += line + '\n';
    }

    chart += '       └' + '─'.repeat(Math.min(days, this.CHART_WIDTH - 10)) + '\n';
    chart += '        ' + '30 days ago'.padEnd(this.CHART_WIDTH - 20) + 'Today';

    return {
      title: `Memory Growth (+${metrics.memoryGrowthRate.toFixed(1)}/day)`,
      chart,
      width: this.CHART_WIDTH,
      height: this.CHART_HEIGHT
    };
  }

  /**
   * Create access pattern heatmap
   */
  private createAccessPatternHeatmap(patterns: AccessPatternAnalysis): VisualChart {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = 24;
    const maxAccess = 100; // Placeholder max value

    let chart = '';

    // Header with hours
    chart += '     │';
    for (let h = 0; h < hours; h += 4) {
      chart += h.toString().padStart(4);
    }
    chart += '\n';

    chart += '─────┼' + '─'.repeat(hours) + '\n';

    // Generate heatmap data (placeholder - would use real access log data)
    for (let day = 0; day < 7; day++) {
      chart += `${days[day]}  │`;
      for (let hour = 0; hour < hours; hour++) {
        // Peak hours get more activity
        const isPeak = patterns.peakAccessHours.includes(hour);
        const baseActivity = isPeak ? 60 : 20;
        const activity = baseActivity + Math.random() * 40;

        if (activity > 80) chart += '█';
        else if (activity > 60) chart += '▓';
        else if (activity > 40) chart += '▒';
        else if (activity > 20) chart += '░';
        else chart += ' ';
      }
      chart += '\n';
    }

    chart += '\nLegend: █ High ▓ Med ▒ Low ░ Min';

    return {
      title: 'Access Pattern Heatmap (7 days)',
      chart,
      width: this.CHART_WIDTH,
      height: 12
    };
  }

  /**
   * Create health score gauge
   */
  private createHealthScoreGauge(score: number): VisualChart {
    const radius = 8;
    const centerX = radius;
    const centerY = radius;

    let chart = '';

    for (let y = 0; y < radius * 2; y++) {
      let line = '';
      for (let x = 0; x < radius * 2; x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const angle = Math.atan2(y - centerY, x - centerX);
        const normalizedAngle = (angle + Math.PI) / Math.PI; // 0 to 2
        const scoreAngle = (score / 100) * Math.PI; // 0 to π (semicircle)

        if (distance <= radius - 2 && distance >= radius - 4) {
          if (angle >= 0 && angle <= scoreAngle) {
            if (score >= 80) line += '█';
            else if (score >= 60) line += '▓';
            else line += '▒';
          } else if (angle >= 0 && angle <= Math.PI) {
            line += '░';
          } else {
            line += ' ';
          }
        } else if (Math.abs(distance - radius + 1) < 0.5) {
          line += '·';
        } else {
          line += ' ';
        }
      }
      chart += line + '\n';
    }

    chart += `\n       ${score.toFixed(0)}/100`;
    chart += `\n    ${this.getHealthStatus(score)}`;

    return {
      title: 'System Health Score',
      chart,
      width: radius * 2,
      height: radius * 2 + 3
    };
  }

  /**
   * Create layer distribution pie chart (ASCII)
   */
  private createLayerDistributionPieChart(layerData: Record<string, number>): VisualChart {
    const total = Object.values(layerData).reduce((sum, count) => sum + count, 0);
    if (total === 0) {
      return {
        title: 'Memory Layer Distribution',
        chart: 'No data available',
        width: this.CHART_WIDTH,
        height: 5
      };
    }

    const layers = Object.entries(layerData).filter(([_, count]) => count > 0);
    const symbols = ['█', '▓', '▒', '░'];

    let chart = '';

    // Create a simple bar representation
    for (let i = 0; i < layers.length; i++) {
      const [layer, count] = layers[i];
      const percentage = (count / total) * 100;
      const barLength = Math.floor((percentage / 100) * (this.CHART_WIDTH - 20));

      chart += `${layer.padEnd(10)} │${symbols[i % symbols.length].repeat(barLength).padEnd(this.CHART_WIDTH - 20)} ${percentage.toFixed(1)}%\n`;
    }

    chart += '           └' + '─'.repeat(this.CHART_WIDTH - 20);

    return {
      title: `Memory Layer Distribution (${total} total)`,
      chart,
      width: this.CHART_WIDTH,
      height: layers.length + 2
    };
  }

  /**
   * Generate dashboard header
   */
  private generateDashboardHeader(data: DashboardData): string {
    const timestamp = new Date().toLocaleString();
    const uptime = data.health.uptime > 0 ? `${data.health.uptime.toFixed(1)}h uptime` : 'Just started';

    return `🧠 Memory Analytics Dashboard                    ${timestamp}\n` +
           `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
           `Total Memories: ${data.metrics.totalMemories.toLocaleString()}  •  ` +
           `Health Score: ${data.health.score}/100  •  ${uptime}\n` +
           `Search Accuracy: ${data.patterns.searchAccuracy.toFixed(1)}%  •  ` +
           `Growth: +${data.metrics.memoryGrowthRate.toFixed(1)}/day  •  ` +
           `Issues: ${data.health.issues.length}`;
  }

  /**
   * Generate summary section
   */
  private generateSummary(data: DashboardData): string {
    let summary = '📋 EXECUTIVE SUMMARY\n';
    summary += '━━━━━━━━━━━━━━━━━━━\n';

    // Health assessment
    const healthStatus = this.getHealthStatus(data.health.score);
    summary += `🏥 System Health: ${healthStatus} (${data.health.score}/100)\n`;

    // Top issues
    if (data.health.issues.length > 0) {
      const criticalIssues = data.health.issues.filter(issue => issue.severity === 'high');
      if (criticalIssues.length > 0) {
        summary += `⚠️  Critical Issues: ${criticalIssues.length}\n`;
      }
    }

    // Performance highlights
    summary += `⚡ Avg Search Time: ${data.patterns.averageSearchTime.toFixed(0)}ms\n`;
    summary += `🎯 Search Accuracy: ${data.patterns.searchAccuracy.toFixed(1)}%\n`;

    // Storage efficiency
    const efficiency = data.metrics.storageEfficiency * 100;
    summary += `💾 Storage Efficiency: ${efficiency.toFixed(1)}%\n`;

    // Recommendations count
    const totalRecommendations = data.recommendations.duplicateMemories.length +
                                 data.recommendations.underutilizedMemories.length +
                                 data.recommendations.performanceBottlenecks.length;

    if (totalRecommendations > 0) {
      summary += `🎯 Optimization Opportunities: ${totalRecommendations}\n`;
    }

    // Top search terms
    if (data.patterns.frequentSearchTerms.length > 0) {
      const topTerm = data.patterns.frequentSearchTerms[0];
      summary += `🔍 Most Searched: "${topTerm.term}" (${topTerm.count}x)\n`;
    }

    summary += '\n💡 Run optimization tools regularly for best performance';

    return summary;
  }

  /**
   * Helper method to wrap text in box
   */
  private boxText(text: string, width: number): string {
    const lines = text.split('\n');
    let result = '';

    for (const line of lines) {
      result += '║ ' + line.padEnd(width - 2) + ' ║\n';
    }

    return result;
  }

  /**
   * Get health status description
   */
  private getHealthStatus(score: number): string {
    if (score >= 90) return 'Excellent 🟢';
    if (score >= 80) return 'Good 🟡';
    if (score >= 60) return 'Fair 🟠';
    if (score >= 40) return 'Poor 🔴';
    return 'Critical 🚨';
  }

  /**
   * Generate simple ASCII bar chart
   */
  generateBarChart(data: Array<{label: string, value: number}>, title: string): string {
    const maxValue = Math.max(...data.map(item => item.value));
    const maxLabelLength = Math.max(...data.map(item => item.label.length));
    const barWidth = this.CHART_WIDTH - maxLabelLength - 10;

    let chart = `📊 ${title}\n`;
    chart += '─'.repeat(this.CHART_WIDTH) + '\n';

    for (const item of data) {
      const barLength = Math.floor((item.value / maxValue) * barWidth);
      const bar = '█'.repeat(barLength);
      chart += `${item.label.padEnd(maxLabelLength)} │${bar.padEnd(barWidth)} ${item.value}\n`;
    }

    return chart;
  }

  /**
   * Generate simple ASCII line chart
   */
  generateLineChart(data: number[], title: string, labels: string[] = []): string {
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    const height = 10;
    const width = Math.min(data.length, this.CHART_WIDTH - 10);

    let chart = `📈 ${title}\n`;
    chart += '─'.repeat(this.CHART_WIDTH) + '\n';

    // Draw chart
    for (let row = height - 1; row >= 0; row--) {
      const threshold = minValue + (range * (row + 0.5)) / height;
      let line = threshold.toFixed(0).padStart(6) + ' │';

      for (let col = 0; col < width; col++) {
        const dataIndex = Math.floor(col * data.length / width);
        const value = data[dataIndex];

        if (Math.abs(value - threshold) < range / (height * 2)) {
          line += '●';
        } else if (value > threshold) {
          line += '│';
        } else {
          line += ' ';
        }
      }
      chart += line + '\n';
    }

    chart += '       └' + '─'.repeat(width) + '\n';

    // Add labels if provided
    if (labels.length > 0) {
      chart += '        ';
      const labelStep = Math.max(1, Math.floor(labels.length / 5));
      for (let i = 0; i < Math.min(labels.length, width); i += labelStep) {
        chart += labels[i].substring(0, 8).padEnd(10);
      }
      chart += '\n';
    }

    return chart;
  }

  /**
   * Create memory usage sparkline
   */
  generateSparkline(values: number[], width: number = 20): string {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

    let sparkline = '';
    for (let i = 0; i < Math.min(values.length, width); i++) {
      const value = values[Math.floor(i * values.length / width)];
      const normalized = (value - min) / range;
      const charIndex = Math.floor(normalized * (sparkChars.length - 1));
      sparkline += sparkChars[charIndex];
    }

    return sparkline;
  }
}