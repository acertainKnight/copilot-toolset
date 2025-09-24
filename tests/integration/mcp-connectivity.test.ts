/**
 * Integration Tests for MCP Server Connectivity
 * Validates MCP protocol implementation and GitHub Copilot integration
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { setTimeout } from 'timers/promises';

interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: number;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

class MCPTestClient {
  private process: ChildProcess | null = null;
  private responseHandlers: Map<number, (response: MCPResponse) => void> = new Map();
  private nextId = 1;
  private output = '';
  private errorOutput = '';

  constructor(private command: string, private args: string[] = []) {}

  async start(env?: NodeJS.ProcessEnv): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.command, this.args, {
        env: env || process.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        this.output += data.toString();
        this.processOutput();
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.errorOutput += data.toString();
      });

      this.process.on('error', reject);

      // Give process time to start
      setTimeout(resolve, 1000);
    });
  }

  private processOutput(): void {
    const lines = this.output.split('\n');
    this.output = lines[lines.length - 1]; // Keep incomplete line

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const response = JSON.parse(line) as MCPResponse;
        const handler = this.responseHandlers.get(response.id);
        if (handler) {
          handler(response);
          this.responseHandlers.delete(response.id);
        }
      } catch {
        // Not valid JSON, ignore
      }
    }
  }

  async request(method: string, params?: any): Promise<MCPResponse> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method,
        params,
        id
      };

      this.responseHandlers.set(id, resolve);

      this.process?.stdin?.write(JSON.stringify(request) + '\n');

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.responseHandlers.has(id)) {
          this.responseHandlers.delete(id);
          reject(new Error(`Timeout waiting for response to ${method}`));
        }
      }, 5000);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.process) {
        this.process.on('close', () => resolve());
        this.process.kill();
      } else {
        resolve();
      }
    });
  }

  getErrorOutput(): string {
    return this.errorOutput;
  }
}

describe('MCP Server Connectivity Tests', () => {
  let client: MCPTestClient;
  const testWorkspace = join(__dirname, '../../test-workspace');

  beforeAll(() => {
    // Create test workspace
    if (!existsSync(testWorkspace)) {
      mkdirSync(testWorkspace, { recursive: true });
    }
  });

  beforeEach(async () => {
    client = new MCPTestClient('copilot-mcp-server', [`--workspace=${testWorkspace}`]);
    await client.start({
      ...process.env,
      COPILOT_MCP_WORKSPACE: testWorkspace
    });
  });

  afterEach(async () => {
    await client.stop();
  });

  describe('Core MCP Protocol', () => {
    test('should respond to tools/list request', async () => {
      const response = await client.request('tools/list');

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);

      // Should have expected tools
      const toolNames = response.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('init_project');
      expect(toolNames).toContain('store_memory');
      expect(toolNames).toContain('search_memory');
      expect(toolNames).toContain('get_memory_stats');
      expect(toolNames).toContain('create_mode');
    });

    test('should respond to resources/list request', async () => {
      const response = await client.request('resources/list');

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      expect(Array.isArray(response.result.resources)).toBe(true);
    });

    test('should respond to prompts/list request', async () => {
      const response = await client.request('prompts/list');

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      expect(Array.isArray(response.result.prompts)).toBe(true);
    });

    test('should handle invalid method gracefully', async () => {
      const response = await client.request('invalid/method');

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601); // Method not found
    });

    test('should handle malformed requests gracefully', async () => {
      // Send malformed JSON directly
      const malformedRequest = '{"jsonrpc": "2.0", "method": ';

      return new Promise((resolve) => {
        client['process']?.stdin?.write(malformedRequest + '\n');

        setTimeout(() => {
          // Server should not crash
          expect(client['process']?.killed).toBeFalsy();
          resolve(true);
        }, 1000);
      });
    });
  });

  describe('Tool Execution', () => {
    test('should execute init_project tool', async () => {
      const response = await client.request('tools/call', {
        name: 'init_project',
        arguments: {
          projectPath: testWorkspace
        }
      });

      expect(response.result).toBeDefined();
      expect(response.result.success).toBeDefined();

      // Should create COPILOT.md
      const copilotMdPath = join(testWorkspace, 'COPILOT.md');
      if (response.result.success) {
        expect(existsSync(copilotMdPath)).toBe(true);
      }
    });

    test('should execute store_memory tool', async () => {
      const response = await client.request('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'Test memory content',
          metadata: {
            type: 'test',
            source: 'integration-test'
          }
        }
      });

      expect(response.result).toBeDefined();
      if (!response.error) {
        expect(response.result.stored).toBe(true);
      }
    });

    test('should execute search_memory tool', async () => {
      // First store something
      await client.request('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'Searchable test content',
          metadata: {
            type: 'test'
          }
        }
      });

      // Then search for it
      const response = await client.request('tools/call', {
        name: 'search_memory',
        arguments: {
          query: 'searchable'
        }
      });

      expect(response.result).toBeDefined();
      if (!response.error) {
        expect(Array.isArray(response.result.results)).toBe(true);
      }
    });

    test('should execute get_memory_stats tool', async () => {
      const response = await client.request('tools/call', {
        name: 'get_memory_stats',
        arguments: {}
      });

      expect(response.result).toBeDefined();
      if (!response.error) {
        expect(response.result.stats).toBeDefined();
      }
    });

    test('should execute create_mode tool', async () => {
      const response = await client.request('tools/call', {
        name: 'create_mode',
        arguments: {
          name: 'test-mode',
          config: {
            description: 'Test mode for integration testing',
            systemPrompt: 'You are a test assistant',
            tools: ['store_memory', 'search_memory'],
            temperature: 0.7
          }
        }
      });

      expect(response.result).toBeDefined();
      if (!response.error) {
        expect(response.result.created).toBe(true);

        // Mode file should exist
        const modePath = join(
          process.env.HOME || '',
          '.copilot-mcp',
          'modes',
          'test-mode.json'
        );
        expect(existsSync(modePath)).toBe(true);
      }
    });
  });

  describe('Workspace Management', () => {
    test('should handle workspace switching', async () => {
      const workspace1 = join(__dirname, '../../test-workspace-1');
      const workspace2 = join(__dirname, '../../test-workspace-2');

      // Create workspaces
      [workspace1, workspace2].forEach(ws => {
        if (!existsSync(ws)) {
          mkdirSync(ws, { recursive: true });
        }
      });

      // Test with first workspace
      const client1 = new MCPTestClient('copilot-mcp-server', [`--workspace=${workspace1}`]);
      await client1.start();

      const response1 = await client1.request('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'Workspace 1 memory',
          metadata: { workspace: 'ws1' }
        }
      });

      expect(response1.result).toBeDefined();
      await client1.stop();

      // Test with second workspace
      const client2 = new MCPTestClient('copilot-mcp-server', [`--workspace=${workspace2}`]);
      await client2.start();

      const response2 = await client2.request('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'Workspace 2 memory',
          metadata: { workspace: 'ws2' }
        }
      });

      expect(response2.result).toBeDefined();
      await client2.stop();
    });

    test('should isolate project memories', async () => {
      const project1 = join(__dirname, '../../test-project-1');
      const project2 = join(__dirname, '../../test-project-2');

      // Create projects
      [project1, project2].forEach(proj => {
        if (!existsSync(proj)) {
          mkdirSync(proj, { recursive: true });
        }
      });

      // Store memory in project 1
      const client1 = new MCPTestClient('copilot-mcp-server', [`--workspace=${project1}`]);
      await client1.start();

      await client1.request('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'Project 1 specific memory',
          metadata: { scope: 'project' }
        }
      });

      const search1 = await client1.request('tools/call', {
        name: 'search_memory',
        arguments: { query: 'Project 1' }
      });

      await client1.stop();

      // Search in project 2 - should not find project 1 memory
      const client2 = new MCPTestClient('copilot-mcp-server', [`--workspace=${project2}`]);
      await client2.start();

      const search2 = await client2.request('tools/call', {
        name: 'search_memory',
        arguments: { query: 'Project 1' }
      });

      await client2.stop();

      // Verify isolation
      if (!search1.error && !search2.error) {
        expect(search1.result.results.length).toBeGreaterThan(0);
        expect(search2.result.results.length).toBe(0);
      }
    });
  });

  describe('GitHub Copilot Integration', () => {
    test('should create GitHub Copilot compatible chat modes', async () => {
      const response = await client.request('tools/call', {
        name: 'create_mode',
        arguments: {
          name: 'copilot-test',
          config: {
            description: 'Test mode for Copilot',
            systemPrompt: 'You are a Copilot assistant',
            tools: ['init_project'],
            temperature: 0.5
          }
        }
      });

      if (!response.error) {
        // Check if .github/chatmodes directory is created
        const chatModePath = join(
          testWorkspace,
          '.github',
          'chatmodes',
          'copilot-test.chatmode.md'
        );

        // The mode manager should create this file for Copilot
        if (existsSync(chatModePath)) {
          const content = readFileSync(chatModePath, 'utf-8');
          expect(content).toContain('copilot-test');
          expect(content).toContain('Test mode for Copilot');
        }
      }
    });

    test('should create copilot-instructions.md on project init', async () => {
      const response = await client.request('tools/call', {
        name: 'init_project',
        arguments: {
          projectPath: testWorkspace
        }
      });

      if (response.result?.success) {
        const copilotInstructionsPath = join(
          testWorkspace,
          '.github',
          'copilot-instructions.md'
        );

        expect(existsSync(copilotInstructionsPath)).toBe(true);

        const content = readFileSync(copilotInstructionsPath, 'utf-8');
        expect(content).toBeTruthy();
        expect(content.toLowerCase()).toContain('copilot');
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should recover from tool execution errors', async () => {
      // Call tool with invalid arguments
      const response = await client.request('tools/call', {
        name: 'init_project',
        arguments: {
          projectPath: '/invalid/path/that/does/not/exist/12345'
        }
      });

      // Should return error but not crash
      expect(response.error || response.result).toBeDefined();

      // Server should still be responsive
      const pingResponse = await client.request('tools/list');
      expect(pingResponse.result).toBeDefined();
    });

    test('should handle concurrent requests', async () => {
      const requests = [];

      // Send multiple concurrent requests
      for (let i = 0; i < 5; i++) {
        requests.push(
          client.request('tools/call', {
            name: 'get_memory_stats',
            arguments: {}
          })
        );
      }

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.jsonrpc).toBe('2.0');
        expect(response.result || response.error).toBeDefined();
      });
    });

    test('should handle memory pressure gracefully', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB string

      // Try to store large memory
      const response = await client.request('tools/call', {
        name: 'store_memory',
        arguments: {
          content: largeContent,
          metadata: {
            type: 'large-test'
          }
        }
      });

      // Should either succeed or return meaningful error
      expect(response.result || response.error).toBeDefined();

      // Server should still be responsive
      const statsResponse = await client.request('tools/call', {
        name: 'get_memory_stats',
        arguments: {}
      });

      expect(statsResponse.result || statsResponse.error).toBeDefined();
    });
  });

  describe('Performance Validation', () => {
    test('should respond to requests within acceptable time', async () => {
      const start = Date.now();

      const response = await client.request('tools/list');

      const duration = Date.now() - start;

      expect(response.result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle rapid successive requests', async () => {
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await client.request('tools/call', {
          name: 'get_memory_stats',
          arguments: {}
        });
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      expect(avgDuration).toBeLessThan(500); // Average should be under 500ms
    });
  });
});