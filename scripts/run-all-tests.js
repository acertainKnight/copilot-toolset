#!/usr/bin/env node

/**
 * Comprehensive test runner script for Copilot MCP Toolset
 * Runs all test suites and generates consolidated reports
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null
    };
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Starting Copilot MCP Toolset Test Suite');
    console.log('==========================================\n');

    try {
      // Ensure build is up to date
      console.log('📦 Building project...');
      await this.runCommand('npm', ['run', 'build']);
      console.log('✅ Build completed\n');

      // Run test suites
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runE2ETests();
      await this.runPerformanceTests();

      // Generate consolidated report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async runUnitTests() {
    console.log('🧪 Running Unit Tests...');
    try {
      const result = await this.runCommand('npm', ['run', 'test:unit', '--', '--coverage']);
      this.results.unit = { success: true, output: result };
      console.log('✅ Unit tests passed\n');
    } catch (error) {
      this.results.unit = { success: false, error: error.message };
      console.log('❌ Unit tests failed\n');
    }
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');
    try {
      const result = await this.runCommand('npm', ['run', 'test:integration']);
      this.results.integration = { success: true, output: result };
      console.log('✅ Integration tests passed\n');
    } catch (error) {
      this.results.integration = { success: false, error: error.message };
      console.log('❌ Integration tests failed\n');
    }
  }

  async runE2ETests() {
    console.log('🌐 Running End-to-End Tests...');
    try {
      const result = await this.runCommand('npm', ['run', 'test:e2e']);
      this.results.e2e = { success: true, output: result };
      console.log('✅ E2E tests passed\n');
    } catch (error) {
      this.results.e2e = { success: false, error: error.message };
      console.log('❌ E2E tests failed\n');
    }
  }

  async runPerformanceTests() {
    console.log('⚡ Running Performance Tests...');
    try {
      const result = await this.runCommand('npm', ['run', 'test:performance']);
      this.results.performance = { success: true, output: result };
      console.log('✅ Performance tests completed\n');
    } catch (error) {
      this.results.performance = { success: false, error: error.message };
      console.log('⚠️  Performance tests encountered issues\n');
    }
  }

  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: rootDir,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        // Show real-time output for better UX
        if (process.env.VERBOSE) {
          console.log(data.toString());
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        if (process.env.VERBOSE) {
          console.error(data.toString());
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}:\n${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async generateReport() {
    const totalTime = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalTime,
      results: this.results,
      summary: this.generateSummary()
    };

    // Generate console report
    this.printSummary(report);

    // Generate JSON report
    const reportsDir = path.join(rootDir, 'test-reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const jsonReportPath = path.join(reportsDir, 'test-results.json');
    await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(reportsDir, 'test-results.html');
    await fs.writeFile(htmlReportPath, htmlReport);

    console.log(`📊 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  generateSummary() {
    const suites = Object.keys(this.results);
    const passed = suites.filter(suite => this.results[suite]?.success).length;
    const failed = suites.filter(suite => this.results[suite] && !this.results[suite].success).length;
    const skipped = suites.filter(suite => !this.results[suite]).length;

    return {
      total: suites.length,
      passed,
      failed,
      skipped,
      success: failed === 0
    };
  }

  printSummary(report) {
    const { summary, duration } = report;

    console.log('\n📋 Test Suite Summary');
    console.log('====================');
    console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Test Suites: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️  Skipped: ${summary.skipped}`);

    console.log('\nDetailed Results:');
    Object.entries(this.results).forEach(([suite, result]) => {
      const status = result?.success ? '✅' : result ? '❌' : '⏭️';
      console.log(`  ${status} ${suite.padEnd(12)} - ${result?.success ? 'PASSED' : result ? 'FAILED' : 'SKIPPED'}`);
    });

    if (summary.success) {
      console.log('\n🎉 All test suites completed successfully!');
    } else {
      console.log('\n⚠️  Some test suites failed. Check the detailed reports.');
    }

    // Coverage summary if available
    this.printCoverageSummary();
  }

  async printCoverageSummary() {
    try {
      const coveragePath = path.join(rootDir, 'coverage', 'coverage-summary.json');
      const coverage = JSON.parse(await fs.readFile(coveragePath, 'utf-8'));

      console.log('\n📊 Coverage Summary:');
      console.log(`Lines: ${coverage.total.lines.pct}%`);
      console.log(`Functions: ${coverage.total.functions.pct}%`);
      console.log(`Branches: ${coverage.total.branches.pct}%`);
      console.log(`Statements: ${coverage.total.statements.pct}%`);
    } catch (error) {
      // Coverage summary not available
    }
  }

  generateHTMLReport(report) {
    const { summary, duration, results } = report;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Copilot MCP Test Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            line-height: 1.6;
        }
        .header {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .test-suite {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        .suite-header {
            padding: 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            font-weight: bold;
        }
        .suite-content {
            padding: 15px;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.875em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.passed {
            background: #d4edda;
            color: #155724;
        }
        .status.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .status.skipped {
            background: #fff3cd;
            color: #856404;
        }
        .error-details {
            margin-top: 10px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.875em;
            white-space: pre-wrap;
        }
        .timestamp {
            color: #6c757d;
            font-size: 0.875em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Copilot MCP Test Results</h1>
        <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        <p>Duration: ${(duration / 1000).toFixed(2)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value ${summary.success ? 'success' : 'failure'}">${summary.total}</div>
            <div>Total Suites</div>
        </div>
        <div class="metric">
            <div class="metric-value success">${summary.passed}</div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value failure">${summary.failed}</div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value warning">${summary.skipped}</div>
            <div>Skipped</div>
        </div>
    </div>

    <div class="results-grid">
        ${Object.entries(results).map(([suite, result]) => `
            <div class="test-suite">
                <div class="suite-header">
                    ${suite.charAt(0).toUpperCase() + suite.slice(1)} Tests
                    <span class="status ${result?.success ? 'passed' : result ? 'failed' : 'skipped'}">
                        ${result?.success ? 'PASSED' : result ? 'FAILED' : 'SKIPPED'}
                    </span>
                </div>
                <div class="suite-content">
                    ${result?.success ?
                        '<p>✅ All tests passed successfully</p>' :
                        result ?
                            `<p>❌ Tests failed</p><div class="error-details">${result.error}</div>` :
                            '<p>⏭️ Suite was skipped</p>'
                    }
                </div>
            </div>
        `).join('')}
    </div>

    <script>
        // Add any interactive JavaScript here if needed
        console.log('Test results loaded:', ${JSON.stringify(summary)});
    </script>
</body>
</html>`;
  }
}

// Run the test suite
const runner = new TestRunner();
runner.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});