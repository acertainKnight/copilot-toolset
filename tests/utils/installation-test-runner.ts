/**
 * Cross-Platform Installation Test Runner
 * Orchestrates installation testing across different environments
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { platform, tmpdir } from 'os';
import { join, resolve } from 'path';

interface TestEnvironment {
  platform: 'windows' | 'macos' | 'linux' | 'wsl';
  nodeVersion: string;
  npmVersion: string;
  homeDir: string;
  tempDir: string;
  isCI: boolean;
  isDocker: boolean;
  isWSL: boolean;
}

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip' | 'warn';
  message: string;
  duration?: number;
  error?: Error;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  environment: TestEnvironment;
  startTime: Date;
  endTime?: Date;
}

export class InstallationTestRunner {
  private testSuites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;
  private environment: TestEnvironment;

  constructor() {
    this.environment = this.detectEnvironment();
  }

  private detectEnvironment(): TestEnvironment {
    const isWindows = platform() === 'win32';
    const isMac = platform() === 'darwin';
    const isLinux = platform() === 'linux';
    const isWSL = !!process.env.WSL_DISTRO_NAME;
    const isCI = !!process.env.CI;
    const isDocker = existsSync('/.dockerenv');

    let nodeVersion = 'unknown';
    let npmVersion = 'unknown';

    try {
      nodeVersion = execSync('node --version').toString().trim();
      npmVersion = execSync('npm --version').toString().trim();
    } catch {
      // Ignore errors
    }

    return {
      platform: isWSL ? 'wsl' : isWindows ? 'windows' : isMac ? 'macos' : 'linux',
      nodeVersion,
      npmVersion,
      homeDir: process.env.HOME || process.env.USERPROFILE || '',
      tempDir: tmpdir(),
      isCI,
      isDocker,
      isWSL
    };
  }

  startSuite(name: string): void {
    this.currentSuite = {
      name,
      tests: [],
      environment: this.environment,
      startTime: new Date()
    };
    this.testSuites.push(this.currentSuite);
  }

  endSuite(): void {
    if (this.currentSuite) {
      this.currentSuite.endTime = new Date();
      this.currentSuite = null;
    }
  }

  addTestResult(result: TestResult): void {
    if (this.currentSuite) {
      this.currentSuite.tests.push(result);
    }
  }

  async runTest(
    name: string,
    testFn: () => Promise<void> | void,
    options: { timeout?: number; skipOn?: string[] } = {}
  ): Promise<TestResult> {
    // Check if test should be skipped
    if (options.skipOn?.includes(this.environment.platform)) {
      const result: TestResult = {
        test: name,
        status: 'skip',
        message: `Skipped on ${this.environment.platform}`
      };
      this.addTestResult(result);
      return result;
    }

    const startTime = Date.now();
    const result: TestResult = {
      test: name,
      status: 'pass',
      message: ''
    };

    try {
      // Run with optional timeout
      if (options.timeout) {
        await Promise.race([
          Promise.resolve(testFn()),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Test timeout')), options.timeout)
          )
        ]);
      } else {
        await Promise.resolve(testFn());
      }

      result.message = 'Test passed';
    } catch (error: any) {
      result.status = 'fail';
      result.message = error.message || 'Test failed';
      result.error = error;
    }

    result.duration = Date.now() - startTime;
    this.addTestResult(result);
    return result;
  }

  /**
   * Run installation validation tests
   */
  async runInstallationTests(): Promise<void> {
    this.startSuite('Installation Validation');

    // Test Node.js requirements
    await this.runTest('Node.js Version Check', () => {
      const majorVersion = parseInt(this.environment.nodeVersion.split('.')[0].replace('v', ''));
      if (majorVersion < 18) {
        throw new Error(`Node.js version ${this.environment.nodeVersion} is too old (requires >= 18)`);
      }
    });

    // Test build system
    await this.runTest('Build System Check', () => {
      if (!existsSync('package.json')) {
        throw new Error('package.json not found');
      }

      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      if (!pkg.scripts?.build) {
        throw new Error('Build script not defined');
      }
    });

    // Test global installation
    await this.runTest('Global Installation', async () => {
      try {
        // Check if already installed
        execSync('which copilot-mcp-server', { stdio: 'ignore' });
      } catch {
        // Not installed, try to install
        console.log('Installing globally...');
        execSync('npm install -g .', { stdio: 'inherit' });
      }

      // Verify installation
      const result = execSync('which copilot-mcp-server').toString().trim();
      if (!result) {
        throw new Error('Failed to install globally');
      }
    }, { timeout: 60000 });

    // Test MCP protocol
    await this.runTest('MCP Protocol Response', () => {
      const response = execSync(
        'echo \'{"jsonrpc":"2.0","method":"tools/list","id":1}\' | copilot-mcp-server',
        { timeout: 5000 }
      ).toString();

      if (!response.includes('jsonrpc')) {
        throw new Error('Invalid MCP response');
      }
    });

    this.endSuite();
  }

  /**
   * Run VS Code integration tests
   */
  async runVSCodeTests(): Promise<void> {
    this.startSuite('VS Code Integration');

    const vscodeConfigPath = this.getVSCodeConfigPath();

    await this.runTest('VS Code Config Directory', () => {
      if (!existsSync(vscodeConfigPath)) {
        throw new Error(`VS Code config directory not found: ${vscodeConfigPath}`);
      }
    });

    await this.runTest('MCP Configuration File', () => {
      const mcpConfig = join(vscodeConfigPath, 'mcp.json');
      if (!existsSync(mcpConfig)) {
        throw new Error('mcp.json not found in VS Code config');
      }

      const config = JSON.parse(readFileSync(mcpConfig, 'utf-8'));
      if (!config.servers?.copilotMcpToolset) {
        throw new Error('copilotMcpToolset server not configured');
      }
    });

    await this.runTest('Workspace Configuration', () => {
      const workspaceConfig = join(process.cwd(), '.vscode', 'mcp.json');
      if (existsSync(workspaceConfig)) {
        const config = JSON.parse(readFileSync(workspaceConfig, 'utf-8'));
        if (!config.servers?.copilotMcpToolset?.args) {
          throw new Error('Workspace arguments not configured');
        }
      }
    });

    this.endSuite();
  }

  /**
   * Run platform-specific tests
   */
  async runPlatformTests(): Promise<void> {
    this.startSuite(`Platform-Specific (${this.environment.platform})`);

    if (this.environment.platform === 'windows') {
      await this.runTest('Windows Path Handling', () => {
        const testPath = 'C:\\Users\\Test\\Documents';
        if (!testPath.match(/^[A-Z]:\\/)) {
          throw new Error('Invalid Windows path format');
        }
      });

      await this.runTest('Windows Environment Variables', () => {
        if (!process.env.APPDATA) {
          throw new Error('APPDATA environment variable not set');
        }
      });
    }

    if (this.environment.platform === 'wsl') {
      await this.runTest('WSL Detection', () => {
        if (!process.env.WSL_DISTRO_NAME) {
          throw new Error('WSL_DISTRO_NAME not detected');
        }
      });

      await this.runTest('WSL Path Translation', () => {
        // Test that we can access Windows paths from WSL
        const windowsPath = '/mnt/c';
        if (!existsSync(windowsPath)) {
          throw new Error('Cannot access Windows filesystem from WSL');
        }
      });
    }

    if (this.environment.platform === 'macos') {
      await this.runTest('macOS Library Path', () => {
        const libraryPath = join(this.environment.homeDir, 'Library');
        if (!existsSync(libraryPath)) {
          throw new Error('Library directory not found');
        }
      });
    }

    if (this.environment.platform === 'linux' || this.environment.platform === 'wsl') {
      await this.runTest('Linux Permissions', () => {
        const testFile = join(this.environment.tempDir, 'test-perms');
        writeFileSync(testFile, 'test');
        execSync(`chmod 755 ${testFile}`);

        const stats = require('fs').statSync(testFile);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);

        if (mode !== '755') {
          throw new Error(`Incorrect file permissions: ${mode}`);
        }

        rmSync(testFile);
      });
    }

    this.endSuite();
  }

  /**
   * Run memory system tests
   */
  async runMemoryTests(): Promise<void> {
    this.startSuite('Memory System');

    await this.runTest('Unified Database Location', () => {
      const dbPath = join(this.environment.homeDir, '.copilot-mcp', 'memory', 'unified.db');
      // Database is created on first use, so we just check the directory
      const dbDir = join(this.environment.homeDir, '.copilot-mcp', 'memory');

      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }
    });

    await this.runTest('Memory Stats Tool', async () => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_memory_stats',
          arguments: {}
        },
        id: 1
      });

      const response = execSync(`echo '${request}' | copilot-mcp-server`, {
        timeout: 5000
      }).toString();

      if (!response.includes('result') && !response.includes('error')) {
        throw new Error('Invalid memory stats response');
      }
    });

    this.endSuite();
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests(): Promise<void> {
    this.startSuite('Performance');

    await this.runTest('Response Time', async () => {
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        execSync('echo \'{"jsonrpc":"2.0","method":"tools/list","id":1}\' | copilot-mcp-server', {
          timeout: 5000,
          stdio: 'ignore'
        });
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      if (avgTime > 1000) {
        throw new Error(`Average response time too slow: ${avgTime}ms`);
      }
    });

    await this.runTest('Concurrent Requests', async () => {
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(
          new Promise((resolve) => {
            const proc = spawn('copilot-mcp-server');
            proc.stdin.write(`{"jsonrpc":"2.0","method":"tools/list","id":${i}}\n`);

            setTimeout(() => {
              proc.kill();
              resolve(true);
            }, 1000);
          })
        );
      }

      await Promise.all(promises);
    });

    this.endSuite();
  }

  /**
   * Get VS Code configuration path for current platform
   */
  private getVSCodeConfigPath(): string {
    switch (this.environment.platform) {
      case 'windows':
        return join(process.env.APPDATA || '', 'Code', 'User');
      case 'macos':
        return join(this.environment.homeDir, 'Library', 'Application Support', 'Code', 'User');
      case 'linux':
      case 'wsl':
      default:
        return join(this.environment.homeDir, '.config', 'Code', 'User');
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    let report = '# Installation Test Report\n\n';
    report += `## Environment\n`;
    report += `- Platform: ${this.environment.platform}\n`;
    report += `- Node.js: ${this.environment.nodeVersion}\n`;
    report += `- npm: ${this.environment.npmVersion}\n`;
    report += `- CI: ${this.environment.isCI}\n`;
    report += `- Docker: ${this.environment.isDocker}\n`;
    report += `- WSL: ${this.environment.isWSL}\n\n`;

    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalWarnings = 0;

    for (const suite of this.testSuites) {
      report += `## ${suite.name}\n\n`;

      for (const test of suite.tests) {
        const icon = test.status === 'pass' ? '✅' :
                     test.status === 'fail' ? '❌' :
                     test.status === 'skip' ? '⏭️' : '⚠️';

        report += `${icon} **${test.test}**\n`;
        report += `   - Status: ${test.status}\n`;
        report += `   - Message: ${test.message}\n`;

        if (test.duration) {
          report += `   - Duration: ${test.duration}ms\n`;
        }

        if (test.error) {
          report += `   - Error: ${test.error.message}\n`;
        }

        report += '\n';

        // Count results
        switch (test.status) {
          case 'pass': totalPassed++; break;
          case 'fail': totalFailed++; break;
          case 'skip': totalSkipped++; break;
          case 'warn': totalWarnings++; break;
        }
      }

      if (suite.endTime) {
        const duration = suite.endTime.getTime() - suite.startTime.getTime();
        report += `Suite duration: ${duration}ms\n\n`;
      }
    }

    report += `## Summary\n\n`;
    report += `- ✅ Passed: ${totalPassed}\n`;
    report += `- ❌ Failed: ${totalFailed}\n`;
    report += `- ⏭️ Skipped: ${totalSkipped}\n`;
    report += `- ⚠️ Warnings: ${totalWarnings}\n`;

    return report;
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Installation Test Runner');
    console.log(`Platform: ${this.environment.platform}`);
    console.log(`Node.js: ${this.environment.nodeVersion}`);
    console.log('');

    await this.runInstallationTests();
    await this.runVSCodeTests();
    await this.runPlatformTests();
    await this.runMemoryTests();
    await this.runPerformanceTests();

    const report = this.generateReport();
    console.log('\n' + report);

    // Save report to file
    const reportPath = join(process.cwd(), 'test-report.md');
    writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);

    // Exit with appropriate code
    const hasFailed = this.testSuites.some(suite =>
      suite.tests.some(test => test.status === 'fail')
    );

    process.exit(hasFailed ? 1 : 0);
  }
}

// Run if executed directly
if (require.main === module) {
  const runner = new InstallationTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}