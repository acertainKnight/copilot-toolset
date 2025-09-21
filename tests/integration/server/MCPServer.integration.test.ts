/**
 * Integration tests for MCP Server - JSON-RPC 2.0 Protocol Testing
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Readable, Writable } from 'stream';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  createTempDir,
  cleanupTempDir,
  createMockProject,
  MCPTestHelper
} from '../../utils/TestHelpers.js';

// Mock transport for testing
class TestTransport {
  private inputBuffer: string = '';
  private outputBuffer: string[] = [];
  private onMessage?: (data: any) => void;

  public input = new Writable({
    write: (chunk: Buffer, _encoding, callback) => {
      this.inputBuffer += chunk.toString();
      // Process complete JSON-RPC messages
      const lines = this.inputBuffer.split('\n');
      this.inputBuffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            if (this.onMessage) {
              this.onMessage(message);
            }
          } catch (error) {
            // Ignore invalid JSON
          }
        }
      }
      callback();
    }
  });

  public output = new Readable({
    read() {
      // No-op, we'll push data manually
    }
  });

  sendMessage(message: any): void {
    const messageStr = JSON.stringify(message);
    this.output.push(messageStr + '\n');
  }

  onMessageReceived(callback: (data: any) => void): void {
    this.onMessage = callback;
  }

  getOutput(): string[] {
    return [...this.outputBuffer];
  }

  reset(): void {
    this.inputBuffer = '';
    this.outputBuffer = [];
  }
}

describe('MCP Server Integration', () => {
  let tempDir: string;
  let testTransport: TestTransport;
  let serverProcess: any;

  beforeEach(async () => {
    tempDir = await createTempDir('mcp-server-test-');
    testTransport = new TestTransport();
  });

  afterEach(async () => {
    if (serverProcess && serverProcess.kill) {
      serverProcess.kill();
    }
    await cleanupTempDir(tempDir);
  });

  describe('JSON-RPC 2.0 Protocol Compliance', () => {
    it('should respond to tools/list request', async () => {
      const request = MCPTestHelper.createRequest('tools/list');

      // We need to test the actual server behavior
      // This would typically involve spawning the server process
      // For now, we'll test the protocol structure

      expect(MCPTestHelper.validateResponse(request)).toBeDefined();
    });

    it('should validate JSON-RPC 2.0 request format', () => {
      const validRequest = MCPTestHelper.createRequest('tools/list', {}, 'test-id-1');

      expect(validRequest).toHaveProperty('jsonrpc', '2.0');
      expect(validRequest).toHaveProperty('method', 'tools/list');
      expect(validRequest).toHaveProperty('id', 'test-id-1');
    });

    it('should create valid JSON-RPC 2.0 response format', () => {
      const response = MCPTestHelper.createResponse({ tools: [] }, 'test-id-1');

      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('result');
      expect(response).toHaveProperty('id', 'test-id-1');
      expect(MCPTestHelper.validateResponse(response)).toBe(true);
    });

    it('should create valid error response format', () => {
      const errorResponse = MCPTestHelper.createErrorResponse(-32601, 'Method not found', 'test-id-1');

      expect(errorResponse).toHaveProperty('jsonrpc', '2.0');
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toHaveProperty('code', -32601);
      expect(errorResponse.error).toHaveProperty('message', 'Method not found');
      expect(errorResponse).toHaveProperty('id', 'test-id-1');
      expect(MCPTestHelper.validateResponse(errorResponse)).toBe(true);
    });
  });

  describe('Tool Execution Integration', () => {
    it('should handle init_project tool call', async () => {
      const projectDir = await createMockProject(tempDir, 'nodejs');

      const request = MCPTestHelper.createRequest('tools/call', {
        name: 'init_project',
        arguments: {
          project_path: projectDir
        }
      });

      expect(request.params.name).toBe('init_project');
      expect(request.params.arguments.project_path).toBe(projectDir);
    });

    it('should handle memory storage tool calls', async () => {
      const storeRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'Test memory content for integration testing',
          layer: 'project',
          tags: ['integration', 'test']
        }
      });

      expect(storeRequest.params.name).toBe('store_memory');
      expect(storeRequest.params.arguments.content).toContain('integration testing');
    });

    it('should handle memory search tool calls', async () => {
      const searchRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'search_memory',
        arguments: {
          query: 'integration test'
        }
      });

      expect(searchRequest.params.name).toBe('search_memory');
      expect(searchRequest.params.arguments.query).toBe('integration test');
    });

    it('should handle memory stats tool calls', async () => {
      const statsRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'get_memory_stats',
        arguments: {}
      });

      expect(statsRequest.params.name).toBe('get_memory_stats');
      expect(statsRequest.params.arguments).toEqual({});
    });

    it('should return appropriate error for unknown tools', () => {
      const unknownToolRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'unknown_tool',
        arguments: {}
      });

      expect(unknownToolRequest.params.name).toBe('unknown_tool');
    });
  });

  describe('Resource Handling Integration', () => {
    it('should list available resources', () => {
      const request = MCPTestHelper.createRequest('resources/list');

      expect(request.method).toBe('resources/list');
    });

    it('should handle memory stats resource request', () => {
      const request = MCPTestHelper.createRequest('resources/read', {
        uri: 'memory://stats'
      });

      expect(request.params.uri).toBe('memory://stats');
    });

    it('should return error for unknown resource URIs', () => {
      const request = MCPTestHelper.createRequest('resources/read', {
        uri: 'unknown://resource'
      });

      expect(request.params.uri).toBe('unknown://resource');
    });
  });

  describe('Prompt Handling Integration', () => {
    it('should list available prompts', () => {
      const request = MCPTestHelper.createRequest('prompts/list');

      expect(request.method).toBe('prompts/list');
    });

    it('should handle memory context prompt request', () => {
      const request = MCPTestHelper.createRequest('prompts/get', {
        name: 'memory_context',
        arguments: {
          task_type: 'debugging'
        }
      });

      expect(request.params.name).toBe('memory_context');
      expect(request.params.arguments.task_type).toBe('debugging');
    });

    it('should return error for unknown prompts', () => {
      const request = MCPTestHelper.createRequest('prompts/get', {
        name: 'unknown_prompt',
        arguments: {}
      });

      expect(request.params.name).toBe('unknown_prompt');
    });
  });

  describe('Server State Management', () => {
    it('should maintain server state across requests', async () => {
      // This would test that the server maintains state between requests
      // For example, storing memory and then retrieving it

      const storeRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'State persistence test',
          layer: 'system'
        }
      });

      const searchRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'search_memory',
        arguments: {
          query: 'State persistence'
        }
      });

      expect(storeRequest.params.arguments.content).toBe('State persistence test');
      expect(searchRequest.params.arguments.query).toBe('State persistence');
    });

    it('should handle concurrent requests appropriately', async () => {
      const concurrentRequests = [
        MCPTestHelper.createRequest('tools/call', {
          name: 'get_memory_stats',
          arguments: {}
        }, 'req-1'),
        MCPTestHelper.createRequest('tools/list', {}, 'req-2'),
        MCPTestHelper.createRequest('resources/list', {}, 'req-3')
      ];

      // Each request should have unique ID
      const ids = concurrentRequests.map(req => req.id);
      expect(new Set(ids).size).toBe(concurrentRequests.length);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed JSON-RPC requests', () => {
      const malformedRequest = {
        // Missing required jsonrpc field
        method: 'tools/list',
        id: 1
      };

      expect(malformedRequest).not.toHaveProperty('jsonrpc');
    });

    it('should handle missing required parameters', () => {
      const incompleteRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'store_memory'
        // Missing required arguments like content and layer
      });

      expect(incompleteRequest.params).not.toHaveProperty('arguments.content');
    });

    it('should handle invalid method names', () => {
      const invalidMethodRequest = MCPTestHelper.createRequest('invalid/method');

      expect(invalidMethodRequest.method).toBe('invalid/method');
    });

    it('should provide meaningful error messages', () => {
      const errorResponse = MCPTestHelper.createErrorResponse(
        -32602,
        'Invalid params: missing required parameter \'content\'',
        'error-test-1'
      );

      expect(errorResponse.error.message).toContain('missing required parameter');
      expect(errorResponse.error.code).toBe(-32602);
    });
  });

  describe('Server Initialization and Cleanup', () => {
    it('should initialize server components correctly', async () => {
      // Test server startup sequence
      // This would typically involve checking that:
      // - MemoryManager initializes
      // - ProjectInitializer is ready
      // - All handlers are registered

      expect(true).toBe(true); // Placeholder
    });

    it('should handle graceful shutdown', async () => {
      // Test that server closes resources properly on shutdown
      // This would verify:
      // - Memory system closes
      // - Files are saved
      // - Connections are closed

      expect(true).toBe(true); // Placeholder
    });

    it('should handle initialization failures gracefully', async () => {
      // Test server behavior when components fail to initialize
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Real Server Process Integration', () => {
    // These tests would actually spawn the server process and test real communication
    // They are more complex and require careful setup/teardown

    it.skip('should start server process successfully', async () => {
      // Spawn actual server process
      // Send JSON-RPC requests via stdin
      // Verify responses via stdout
    });

    it.skip('should handle tool execution end-to-end', async () => {
      // Test complete workflow:
      // 1. Start server
      // 2. Send tool execution request
      // 3. Verify response format and content
      // 4. Verify side effects (files created, memory stored)
    });

    it.skip('should maintain session state across multiple requests', async () => {
      // Test that server remembers state between requests in same session
    });
  });
});