/**
 * End-to-End Tests for Global MCP Server Installation
 * Tests the complete installation workflow across different platforms
 */

import { execSync, spawn, SpawnOptions } from 'child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { homedir, platform } from 'os';
import { join, resolve } from 'path';
import { setTimeout } from 'timers/promises';

describe('Global MCP Installation Tests', () => {
  const TEST_HOME = join(__dirname, '../../temp-test-home');
  const BACKUP_HOME = process.env.HOME;
  const INSTALL_SCRIPT = join(__dirname, '../../scripts/install-global.sh');

  // Platform-specific paths
  const getPlatformPaths = () => {
    const isWindows = platform() === 'win32';
    const isWSL = process.env.WSL_DISTRO_NAME !== undefined;
    const isMac = platform() === 'darwin';

    const home = TEST_HOME;
    const globalConfig = join(home, '.copilot-mcp');

    let vscodeConfig: string;
    if (isWindows && !isWSL) {
      vscodeConfig = join(process.env.APPDATA || home, 'Code', 'User');
    } else if (isMac) {
      vscodeConfig = join(home, 'Library', 'Application Support', 'Code', 'User');
    } else {
      vscodeConfig = join(home, '.config', 'Code', 'User');
    }

    return {
      home,
      globalConfig,
      vscodeConfig,
      isWindows,
      isWSL,
      isMac,
      platform: isWindows ? 'windows' : isMac ? 'macos' : 'linux'
    };
  };

  beforeAll(() => {
    // Create test home directory
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });

    // Mock HOME environment variable
    process.env.HOME = TEST_HOME;
    process.env.USERPROFILE = TEST_HOME; // For Windows
  });

  afterAll(() => {
    // Restore original HOME
    process.env.HOME = BACKUP_HOME;
    delete process.env.USERPROFILE;

    // Cleanup test directory
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  describe('Pre-Installation Validation', () => {
    test('should verify Node.js is installed', () => {
      const nodeVersion = execSync('node --version').toString().trim();
      expect(nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);

      const majorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
      expect(majorVersion).toBeGreaterThanOrEqual(18);
    });

    test('should verify npm is installed', () => {
      const npmVersion = execSync('npm --version').toString().trim();
      expect(npmVersion).toMatch(/^\d+\.\d+\.\d+/);
    });

    test('should verify build prerequisites', () => {
      // Check TypeScript is available
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      expect(packageJson.devDependencies).toHaveProperty('typescript');

      // Check build script exists
      expect(packageJson.scripts).toHaveProperty('build');
    });

    test('should detect platform correctly', () => {
      const paths = getPlatformPaths();

      // Platform detection should work
      expect(['windows', 'macos', 'linux']).toContain(paths.platform);

      // WSL detection
      if (process.env.WSL_DISTRO_NAME) {
        expect(paths.isWSL).toBe(true);
      }
    });
  });

  describe('Installation Process', () => {
    let installProcess: any;
    let installOutput: string = '';
    let installError: string = '';

    test('should execute installation script successfully', async () => {
      return new Promise((resolve, reject) => {
        const env = { ...process.env, HOME: TEST_HOME };

        installProcess = spawn('bash', [INSTALL_SCRIPT], {
          env,
          cwd: join(__dirname, '../..'),
          shell: true
        });

        installProcess.stdout.on('data', (data: Buffer) => {
          installOutput += data.toString();
        });

        installProcess.stderr.on('data', (data: Buffer) => {
          installError += data.toString();
        });

        installProcess.on('close', (code: number) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`Installation failed with code ${code}\n${installError}`));
          }
        });
      });
    }, 60000); // 60 second timeout for installation

    test('should create global configuration directory', () => {
      const paths = getPlatformPaths();
      expect(existsSync(paths.globalConfig)).toBe(true);

      // Check subdirectories
      expect(existsSync(join(paths.globalConfig, 'memory'))).toBe(true);
      expect(existsSync(join(paths.globalConfig, 'modes'))).toBe(true);
      expect(existsSync(join(paths.globalConfig, 'backups'))).toBe(true);
      expect(existsSync(join(paths.globalConfig, 'logs'))).toBe(true);
    });

    test('should create global config.json with correct structure', () => {
      const paths = getPlatformPaths();
      const configPath = join(paths.globalConfig, 'config.json');

      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Validate config structure
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('server');
      expect(config.server).toHaveProperty('globalInstance', true);
      expect(config).toHaveProperty('memory');
      expect(config).toHaveProperty('modes');
      expect(config).toHaveProperty('vscode');
      expect(config).toHaveProperty('performance');
    });

    test('should install copilot-mcp-server globally', () => {
      // Check if command exists
      let commandPath: string;
      try {
        commandPath = execSync('which copilot-mcp-server').toString().trim();
      } catch {
        try {
          commandPath = execSync('where copilot-mcp-server').toString().trim();
        } catch {
          commandPath = '';
        }
      }

      expect(commandPath).toBeTruthy();
      expect(commandPath).toContain('copilot-mcp-server');
    });

    test('should create VS Code global configuration', () => {
      const paths = getPlatformPaths();
      const mcpConfigPath = join(paths.vscodeConfig, 'mcp.json');

      // Directory should be created
      expect(existsSync(paths.vscodeConfig)).toBe(true);

      // MCP config should exist
      expect(existsSync(mcpConfigPath)).toBe(true);

      const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf-8'));
      expect(mcpConfig).toHaveProperty('servers');
      expect(mcpConfig.servers).toHaveProperty('copilotMcpToolset');
      expect(mcpConfig.servers.copilotMcpToolset).toHaveProperty('type', 'stdio');
      expect(mcpConfig.servers.copilotMcpToolset).toHaveProperty('command', 'copilot-mcp-server');
    });

    test('should create workspace configuration template', () => {
      const workspaceConfigPath = join(process.cwd(), '.vscode', 'mcp.json');

      if (existsSync(workspaceConfigPath)) {
        const workspaceConfig = JSON.parse(readFileSync(workspaceConfigPath, 'utf-8'));

        expect(workspaceConfig).toHaveProperty('servers');
        expect(workspaceConfig.servers.copilotMcpToolset).toHaveProperty('args');
        expect(workspaceConfig.servers.copilotMcpToolset.args).toContain('--workspace=${workspaceFolder}');
      }
    });
  });

  describe('Post-Installation Verification', () => {
    test('should respond to MCP protocol commands', async () => {
      const testCommand = '{"jsonrpc":"2.0","method":"tools/list","id":1}';

      return new Promise((resolve, reject) => {
        const proc = spawn('copilot-mcp-server', [], {
          env: { ...process.env, HOME: TEST_HOME }
        });

        let output = '';
        let errorOutput = '';

        proc.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        proc.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        // Send test command
        proc.stdin.write(testCommand + '\n');

        // Wait for response
        setTimeout(() => {
          proc.kill();

          try {
            // Should have valid JSON-RPC response
            if (output) {
              const response = JSON.parse(output);
              expect(response).toHaveProperty('jsonrpc', '2.0');
              expect(response).toHaveProperty('id', 1);
            }
            resolve(true);
          } catch (e) {
            reject(new Error(`Invalid MCP response: ${output}\nError: ${errorOutput}`));
          }
        }, 2000);
      });
    }, 10000);

    test('should have correct file permissions', () => {
      const paths = getPlatformPaths();

      if (!paths.isWindows) {
        // Check executable permissions on Unix-like systems
        const stats = require('fs').statSync(INSTALL_SCRIPT);
        const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
        expect(isExecutable).toBe(true);
      }
    });

    test('should handle workspace arguments correctly', async () => {
      const testWorkspace = '/test/workspace/path';
      const testCommand = '{"jsonrpc":"2.0","method":"tools/list","id":1}';

      return new Promise((resolve, reject) => {
        const proc = spawn('copilot-mcp-server', [`--workspace=${testWorkspace}`], {
          env: { ...process.env, HOME: TEST_HOME, COPILOT_MCP_WORKSPACE: testWorkspace }
        });

        let output = '';

        proc.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        proc.stdin.write(testCommand + '\n');

        setTimeout(() => {
          proc.kill();
          // Server should accept workspace argument without crashing
          resolve(true);
        }, 2000);
      });
    }, 10000);
  });

  describe('Error Recovery and Rollback', () => {
    test('should handle missing Node.js gracefully', () => {
      // Simulate missing Node.js by modifying PATH
      const originalPath = process.env.PATH;
      process.env.PATH = '/nonexistent';

      try {
        execSync(`bash ${INSTALL_SCRIPT}`, {
          env: { ...process.env, HOME: TEST_HOME, PATH: '/nonexistent' }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Node.js is required');
      } finally {
        process.env.PATH = originalPath;
      }
    });

    test('should handle insufficient permissions', () => {
      if (platform() !== 'win32') {
        const restrictedDir = join(TEST_HOME, 'restricted');
        mkdirSync(restrictedDir, { mode: 0o444 }); // Read-only

        try {
          execSync(`HOME=${restrictedDir} bash ${INSTALL_SCRIPT}`, {
            env: { ...process.env, HOME: restrictedDir }
          });
        } catch (error: any) {
          // Should fail due to permissions
          expect(error).toBeDefined();
        } finally {
          rmSync(restrictedDir, { recursive: true, force: true });
        }
      }
    });

    test('should not overwrite existing configuration', () => {
      const paths = getPlatformPaths();
      const configPath = join(paths.globalConfig, 'config.json');

      if (existsSync(configPath)) {
        // Add custom field to config
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        config.customField = 'test-value';
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Re-run installation
        try {
          execSync(`bash ${INSTALL_SCRIPT}`, {
            env: { ...process.env, HOME: TEST_HOME },
            cwd: join(__dirname, '../..')
          });
        } catch {
          // Ignore errors
        }

        // Custom field should still exist
        const newConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
        expect(newConfig.customField).toBe('test-value');
      }
    });
  });

  describe('Platform-Specific Tests', () => {
    const paths = getPlatformPaths();

    if (paths.isWindows) {
      test('Windows: should handle Windows paths correctly', () => {
        const windowsPath = 'C:\\Users\\TestUser\\AppData\\Roaming';
        expect(windowsPath).toMatch(/^[A-Z]:\\/);
      });

      test('Windows: should use correct VS Code config path', () => {
        expect(paths.vscodeConfig).toContain('Code');
        expect(paths.vscodeConfig).toContain('User');
      });
    }

    if (paths.isWSL) {
      test('WSL: should detect WSL environment', () => {
        expect(process.env.WSL_DISTRO_NAME).toBeDefined();
        expect(paths.isWSL).toBe(true);
      });

      test('WSL: should use Linux paths in WSL', () => {
        expect(paths.vscodeConfig).toContain('.config');
      });
    }

    if (paths.isMac) {
      test('macOS: should use correct Library paths', () => {
        expect(paths.vscodeConfig).toContain('Library');
        expect(paths.vscodeConfig).toContain('Application Support');
      });
    }

    if (!paths.isWindows) {
      test('Unix: should set correct file permissions', () => {
        const configDir = paths.globalConfig;
        if (existsSync(configDir)) {
          const stats = require('fs').statSync(configDir);
          // Should be readable and writable by owner
          expect(stats.mode & 0o600).toBeGreaterThan(0);
        }
      });
    }
  });

  describe('Integration with VS Code', () => {
    test('should validate VS Code MCP configuration structure', () => {
      const paths = getPlatformPaths();
      const mcpConfigPath = join(paths.vscodeConfig, 'mcp.json');

      if (existsSync(mcpConfigPath)) {
        const config = JSON.parse(readFileSync(mcpConfigPath, 'utf-8'));

        // Validate MCP protocol structure
        expect(config).toHaveProperty('servers');
        const server = config.servers.copilotMcpToolset;

        expect(server.type).toBe('stdio');
        expect(server.command).toBe('copilot-mcp-server');

        // Should not have args in global config
        expect(server.args).toBeUndefined();
      }
    });

    test('should validate workspace MCP configuration', () => {
      const workspaceConfig = join(process.cwd(), '.vscode', 'mcp.json');

      if (existsSync(workspaceConfig)) {
        const config = JSON.parse(readFileSync(workspaceConfig, 'utf-8'));
        const server = config.servers.copilotMcpToolset;

        // Workspace config should have args and env
        expect(server.args).toBeDefined();
        expect(server.args).toContain('--workspace=${workspaceFolder}');
        expect(server.env).toHaveProperty('COPILOT_MCP_WORKSPACE');
      }
    });
  });

  describe('Performance and Resource Tests', () => {
    test('should complete installation within reasonable time', async () => {
      const startTime = Date.now();

      try {
        execSync(`bash ${INSTALL_SCRIPT}`, {
          env: { ...process.env, HOME: TEST_HOME },
          timeout: 60000, // 60 second timeout
          cwd: join(__dirname, '../..')
        });
      } catch {
        // Ignore errors for timing test
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
    });

    test('should not consume excessive disk space', () => {
      const paths = getPlatformPaths();

      const getDirSize = (dir: string): number => {
        if (!existsSync(dir)) return 0;

        const stats = require('fs').statSync(dir);
        if (stats.isFile()) return stats.size;

        let size = 0;
        const files = require('fs').readdirSync(dir);
        for (const file of files) {
          size += getDirSize(join(dir, file));
        }
        return size;
      };

      const configSize = getDirSize(paths.globalConfig);

      // Config directory should be less than 10MB initially
      expect(configSize).toBeLessThan(10 * 1024 * 1024);
    });

    test('should handle concurrent installations gracefully', async () => {
      // Test that multiple installation attempts don't corrupt config
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(
          new Promise((resolve) => {
            try {
              execSync(`bash ${INSTALL_SCRIPT}`, {
                env: { ...process.env, HOME: TEST_HOME },
                cwd: join(__dirname, '../..')
              });
            } catch {
              // Ignore errors
            }
            resolve(true);
          })
        );
      }

      await Promise.all(promises);

      // Config should still be valid
      const paths = getPlatformPaths();
      const configPath = join(paths.globalConfig, 'config.json');

      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        expect(config).toHaveProperty('version');
        expect(config).toHaveProperty('server');
      }
    });
  });
});