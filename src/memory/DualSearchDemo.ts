/**
 * Dual Search Engine Demo and Testing
 * Demonstrates the BM25 + TF-IDF dual search system capabilities
 */

import { MemoryManager } from './MemoryManager.js';
import { DualSearchEngine } from './DualSearchEngine.js';
import { SearchPerformanceBenchmark } from './SearchPerformanceBenchmark.js';
import { Memory, MemoryLayer } from '../types/index.js';

export class DualSearchDemo {
  private memoryManager: MemoryManager;

  constructor() {
    this.memoryManager = new MemoryManager('/demo/project');
  }

  /**
   * Run complete dual search demonstration
   */
  public async runDemo(): Promise<void> {
    console.log('🔍 DUAL SEARCH ENGINE DEMONSTRATION');
    console.log('===================================\n');

    try {
      // Initialize system
      await this.memoryManager.initialize();
      console.log('✅ Memory system initialized\n');

      // Add sample memories
      await this.addSampleMemories();
      console.log('✅ Sample memories added\n');

      // Demonstrate different search types
      await this.demonstrateSearchTypes();

      // Show performance statistics
      await this.showPerformanceStats();

      // Run quick benchmark
      await this.runQuickBenchmark();

    } catch (error) {
      console.error('❌ Demo failed:', error);
    } finally {
      await this.memoryManager.close();
    }
  }

  /**
   * Add sample memories for demonstration
   */
  private async addSampleMemories(): Promise<void> {
    const sampleMemories = [
      {
        content: 'Implement user authentication with JWT tokens and secure password hashing using bcrypt',
        layer: 'system' as MemoryLayer,
        tags: ['auth', 'security', 'jwt', 'password']
      },
      {
        content: 'Create REST API endpoints for user management with proper error handling and validation',
        layer: 'project' as MemoryLayer,
        tags: ['api', 'rest', 'validation', 'error-handling']
      },
      {
        content: 'Set up database migrations for PostgreSQL with user and session tables',
        layer: 'project' as MemoryLayer,
        tags: ['database', 'postgresql', 'migration', 'schema']
      },
      {
        content: 'Add React components for login form with TypeScript and proper state management',
        layer: 'project' as MemoryLayer,
        tags: ['react', 'typescript', 'forms', 'state']
      },
      {
        content: 'Configure CI/CD pipeline with GitHub Actions for automated testing and deployment',
        layer: 'system' as MemoryLayer,
        tags: ['cicd', 'github-actions', 'testing', 'deployment']
      },
      {
        content: 'Optimize database queries for user search with proper indexing and query planning',
        layer: 'project' as MemoryLayer,
        tags: ['database', 'optimization', 'indexing', 'performance']
      },
      {
        content: 'Implement caching layer with Redis for session storage and API response caching',
        layer: 'system' as MemoryLayer,
        tags: ['caching', 'redis', 'session', 'performance']
      },
      {
        content: 'User prefers dark mode themes and minimal UI design with clean typography',
        layer: 'preference' as MemoryLayer,
        tags: ['ui', 'theme', 'design', 'preference']
      }
    ];

    for (const memory of sampleMemories) {
      await this.memoryManager.store(memory.content, memory.layer, memory.tags);
    }

    console.log(`Added ${sampleMemories.length} sample memories`);
  }

  /**
   * Demonstrate different search types and their results
   */
  private async demonstrateSearchTypes(): Promise<void> {
    console.log('🔍 SEARCH TYPE DEMONSTRATIONS');
    console.log('-----------------------------');

    const testQueries = [
      { query: 'user authentication', type: 'Semantic Search' },
      { query: 'JWT tokens', type: 'Exact Match' },
      { query: 'database optimization performance', type: 'Multi-term Semantic' },
      { query: 'React TypeScript', type: 'Technology Stack' },
      { query: 'CI/CD deployment', type: 'Process/Workflow' }
    ];

    for (const test of testQueries) {
      console.log(`\n📋 ${test.type}: "${test.query}"`);
      console.log('   ' + '-'.repeat(50));

      const startTime = performance.now();

      const results = await this.memoryManager.search(test.query, {
        limit: 3,
        search_type: 'hybrid'
      });

      const endTime = performance.now();
      const responseTime = (endTime - startTime).toFixed(2);

      console.log(`   Response time: ${responseTime}ms`);
      console.log(`   Results found: ${results.length}`);

      results.forEach((result, index) => {
        console.log(`   ${index + 1}. [${result.match_type.toUpperCase()}] ${result.memory.content.substring(0, 60)}...`);
        console.log(`      Score: ${result.similarity_score?.toFixed(2)}, Layer: ${result.memory.layer}`);
        if (result.context) {
          console.log(`      Context: ${result.context}`);
        }
      });
    }
  }

  /**
   * Show performance and system statistics
   */
  private async showPerformanceStats(): Promise<void> {
    console.log('\n📊 SYSTEM PERFORMANCE STATISTICS');
    console.log('--------------------------------');

    try {
      const stats = await this.memoryManager.getMemoryStats();
      console.log('Memory System:');
      console.log(`  Total memories: ${stats.cold_storage_count}`);
      console.log(`  Database size: ${(stats.storage_size_bytes / 1024).toFixed(2)} KB`);
      console.log(`  Storage location: ${stats.storage_locations.cold}`);

      const advancedStats = await this.memoryManager.getAdvancedSearchStats();
      if (advancedStats.dualSearch) {
        console.log('\nDual Search Engine:');
        console.log(`  Total searches: ${advancedStats.dualSearch.performance.totalSearches}`);
        console.log(`  Average response time: ${advancedStats.dualSearch.performance.averageTime.toFixed(2)}ms`);
        console.log(`  Cache hit rate: ${(advancedStats.dualSearch.cacheStats.hitRate * 100).toFixed(1)}%`);
      }

    } catch (error) {
      console.log('Advanced statistics not available:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Run a quick performance benchmark
   */
  private async runQuickBenchmark(): Promise<void> {
    console.log('\n🏃 QUICK PERFORMANCE BENCHMARK');
    console.log('-----------------------------');

    try {
      const benchmark = new SearchPerformanceBenchmark(':memory:');

      const report = await benchmark.runBenchmarkSuite({
        memoryCount: 100,
        queryCount: 20,
        iterations: 2,
        targetResponseTime: 10,
        outputFormat: 'console'
      });

      console.log('Benchmark Results Summary:');
      console.log(`  Best engine: ${report.summary.bestEngine}`);
      console.log(`  Total queries: ${report.summary.totalQueries}`);
      console.log(`  Total time: ${(report.summary.totalTime / 1000).toFixed(2)}s`);

      console.log('\nResponse Time Comparison:');
      Object.entries(report.comparisons.responseTime).forEach(([engine, time]) => {
        console.log(`  ${engine}: ${time.toFixed(2)}ms`);
      });

      console.log('\nTop Recommendations:');
      report.summary.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });

      benchmark.cleanup();

    } catch (error) {
      console.log('Benchmark not available:', error instanceof Error ? error.message : String(error));
    }
  }
}

/**
 * Run the demo if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new DualSearchDemo();
  demo.runDemo()
    .then(() => {
      console.log('\n✅ Demo completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}