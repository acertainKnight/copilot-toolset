/**
 * MCP Protocol Compliance Tests for Memory Tools
 * Tests integration with GitHub Copilot via Model Context Protocol
 * Validates JSON-RPC 2.0 compliance and tool registration
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { CopilotMCPServer } from '../../../src/server/index.js';
import { MemoryManager } from '../../../src/memory/MemoryManager.js';
import { MemoryLayer, MemorySearchOptions } from '../../../src/types/index.js';
import { createTempDir, cleanupTempDir, MCPTestHelper, PerformanceMeasurer } from '../../utils/TestHelpers.js';
import * as path from 'path';

interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

describe('MCP Protocol Compliance Tests', () => {
  let server: CopilotMCPServer;
  let memoryManager: MemoryManager;
  let tempDir: string;
  let performanceMeasurer: PerformanceMeasurer;

  const memoryTools = [
    'store_memory',
    'search_memory',
    'get_memory_stats',
    'init_project',
    'create_mode'
  ];

  beforeAll(async () => {
    performanceMeasurer = new PerformanceMeasurer();
    tempDir = await createTempDir('mcp-protocol-test-');

    // Initialize server with memory system
    server = new CopilotMCPServer();
    memoryManager = new MemoryManager(tempDir);

    await memoryManager.initialize();
    await server.initialize();

    console.log('🚀 MCP Server initialized for protocol compliance testing');
  });

  afterAll(async () => {
    await server.close();
    await memoryManager.close();
    await cleanupTempDir(tempDir);

    console.log('🔄 MCP Protocol test cleanup completed');
  });

  describe('JSON-RPC 2.0 Protocol Compliance', () => {
    it('should respond to tools/list with valid JSON-RPC format', async () => {
      const request = MCPTestHelper.createRequest('tools/list', {});

      const endTimer = performanceMeasurer.start('tools-list');
      const response = await server.handleRequest(request);
      const responseTime = endTimer();

      expect(responseTime).toBeLessThan(100); // Fast response expected
      expect(MCPTestHelper.validateResponse(response)).toBe(true);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.id).toBe(request.id);

      // Should include memory-related tools
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      memoryTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });

      console.log(`✅ tools/list response: ${toolNames.length} tools in ${responseTime.toFixed(2)}ms`);
    });

    it('should handle invalid JSON-RPC requests gracefully', async () => {
      const invalidRequests = [
        // Missing jsonrpc field
        { method: 'tools/list', id: 1 },
        // Wrong jsonrpc version
        { jsonrpc: '1.0', method: 'tools/list', id: 2 },
        // Missing method
        { jsonrpc: '2.0', id: 3 },
        // Invalid id
        { jsonrpc: '2.0', method: 'tools/list', id: null }
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await server.handleRequest(invalidRequest as any);

        expect(response.jsonrpc).toBe('2.0');
        expect(response.error).toBeDefined();
        expect(response.error.code).toBeGreaterThan(0);
        expect(typeof response.error.message).toBe('string');

        console.log(`❌ Invalid request handled: ${response.error.message}`);
      }
    });

    it('should handle non-existent methods with proper error codes', async () => {
      const request = MCPTestHelper.createRequest('non_existent_method', {}, 'test-123');

      const response = await server.handleRequest(request);

      expect(MCPTestHelper.validateResponse(response)).toBe(true);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601); // Method not found
      expect(response.error.message).toContain('Method not found');
      expect(response.id).toBe('test-123');

      console.log('✅ Non-existent method properly handled with -32601 error');
    });

    it('should maintain request-response id correlation', async () => {
      const testIds = ['string-id', 42, 'test-correlation-123', 999];

      for (const id of testIds) {
        const request = MCPTestHelper.createRequest('tools/list', {}, id);
        const response = await server.handleRequest(request);

        expect(response.id).toBe(id);
        expect(response.jsonrpc).toBe('2.0');

        console.log(`✅ ID correlation maintained for: ${id}`);
      }
    });
  });

  describe('Memory Tool Integration', () => {
    beforeEach(async () => {
      // Set up test memory data
      await memoryManager.store(
        'Test memory for MCP protocol validation',
        'system',
        ['mcp', 'protocol', 'test'],
        { test_type: 'mcp_integration' }
      );
    });

    it('should execute store_memory tool correctly', async () => {
      const toolCall: MCPToolCall = {
        name: 'store_memory',
        arguments: {
          content: 'MCP protocol test memory content',
          layer: 'project',
          tags: ['mcp', 'test', 'protocol'],
          metadata: {
            source: 'mcp_test',
            timestamp: new Date().toISOString()
          }
        }
      };

      const request = MCPTestHelper.createRequest('tools/call', {
        name: toolCall.name,
        arguments: toolCall.arguments
      });

      const endTimer = performanceMeasurer.start('store-memory-tool');
      const response = await server.handleRequest(request);
      const executionTime = endTimer();

      expect(executionTime).toBeLessThan(50); // Tool execution should be fast
      expect(MCPTestHelper.validateResponse(response)).toBe(true);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeTruthy();
      expect(typeof response.result.content).toBe('string');
      expect(response.result.content.length).toBeGreaterThan(0);

      // Verify the memory was actually stored
      const verificationResults = await memoryManager.search('MCP protocol test memory');
      expect(verificationResults.length).toBeGreaterThan(0);

      console.log(`✅ store_memory executed in ${executionTime.toFixed(2)}ms, result length: ${response.result.content.length}`);
    });

    it('should execute search_memory tool correctly', async () => {
      const toolCall: MCPToolCall = {
        name: 'search_memory',
        arguments: {
          query: 'protocol validation',
          options: {
            limit: 5,
            layer: 'system'
          }
        }
      };

      const request = MCPTestHelper.createRequest('tools/call', {
        name: toolCall.name,
        arguments: toolCall.arguments
      });

      const endTimer = performanceMeasurer.start('search-memory-tool');
      const response = await server.handleRequest(request);
      const executionTime = endTimer();

      expect(executionTime).toBeLessThan(100); // Search should be reasonably fast
      expect(MCPTestHelper.validateResponse(response)).toBe(true);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeTruthy();
      expect(typeof response.result.content).toBe('string');

      // Response should contain search results information
      expect(response.result.content).toContain('search results');

      console.log(`✅ search_memory executed in ${executionTime.toFixed(2)}ms`);
    });

    it('should execute get_memory_stats tool correctly', async () => {
      const toolCall: MCPToolCall = {
        name: 'get_memory_stats',
        arguments: {}
      };

      const request = MCPTestHelper.createRequest('tools/call', {
        name: toolCall.name,
        arguments: toolCall.arguments
      });

      const endTimer = performanceMeasurer.start('memory-stats-tool');
      const response = await server.handleRequest(request);
      const executionTime = endTimer();

      expect(executionTime).toBeLessThan(20); // Stats should be very fast
      expect(MCPTestHelper.validateResponse(response)).toBe(true);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeTruthy();

      // Response should contain statistics information
      expect(response.result.content).toContain('Memory Statistics');
      expect(response.result.content).toContain('storage');

      console.log(`✅ get_memory_stats executed in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle invalid tool arguments gracefully', async () => {
      const invalidToolCalls = [
        {
          name: 'store_memory',
          arguments: {
            // Missing required content
            layer: 'project'
          }
        },
        {
          name: 'search_memory',
          arguments: {
            // Missing query
            options: { limit: 5 }
          }
        },
        {
          name: 'store_memory',
          arguments: {
            content: 'test',
            layer: 'invalid_layer' // Invalid layer
          }
        }
      ];

      for (const toolCall of invalidToolCalls) {
        const request = MCPTestHelper.createRequest('tools/call', toolCall);
        const response = await server.handleRequest(request);

        expect(MCPTestHelper.validateResponse(response)).toBe(true);

        // Should return error or handle gracefully
        if (response.error) {
          expect(response.error.code).toBeGreaterThan(0);
          expect(response.error.message).toBeTruthy();
        } else {
          // If not error, should have valid result
          expect(response.result).toBeDefined();
        }

        console.log(`⚠️ Invalid arguments handled: ${toolCall.name}`);
      }
    });
  });

  describe('Tool Schema Validation', () => {
    it('should provide valid tool schemas for all memory tools', async () => {
      const request = MCPTestHelper.createRequest('tools/list', {});
      const response = await server.handleRequest(request);

      expect(response.result.tools).toBeInstanceOf(Array);

      for (const tool of response.result.tools) {
        if (memoryTools.includes(tool.name)) {
          // Validate tool structure
          expect(tool.name).toBeTruthy();
          expect(typeof tool.name).toBe('string');
          expect(tool.description).toBeTruthy();
          expect(typeof tool.description).toBe('string');
          expect(tool.inputSchema).toBeDefined();
          expect(typeof tool.inputSchema).toBe('object');

          // Validate input schema structure
          const schema = tool.inputSchema;
          expect(schema.type).toBe('object');

          if (schema.properties) {
            expect(typeof schema.properties).toBe('object');
          }

          if (schema.required) {
            expect(Array.isArray(schema.required)).toBe(true);
          }

          console.log(`✅ Tool schema valid: ${tool.name}`);
        }
      }
    });

    it('should validate specific memory tool schemas', async () => {
      const request = MCPTestHelper.createRequest('tools/list', {});
      const response = await server.handleRequest(request);

      const storeMemoryTool = response.result.tools.find((t: any) => t.name === 'store_memory');
      const searchMemoryTool = response.result.tools.find((t: any) => t.name === 'search_memory');
      const getStatsTool = response.result.tools.find((t: any) => t.name === 'get_memory_stats');

      // Validate store_memory schema
      expect(storeMemoryTool).toBeDefined();
      expect(storeMemoryTool.inputSchema.properties.content).toBeDefined();
      expect(storeMemoryTool.inputSchema.properties.layer).toBeDefined();
      expect(storeMemoryTool.inputSchema.required).toContain('content');
      expect(storeMemoryTool.inputSchema.required).toContain('layer');

      // Validate search_memory schema
      expect(searchMemoryTool).toBeDefined();
      expect(searchMemoryTool.inputSchema.properties.query).toBeDefined();
      expect(searchMemoryTool.inputSchema.required).toContain('query');

      // Validate get_memory_stats schema
      expect(getStatsTool).toBeDefined();
      expect(getStatsTool.inputSchema.type).toBe('object');

      console.log('✅ Memory tool schemas validated');
    });
  });

  describe('GitHub Copilot Integration', () => {
    it('should provide Copilot-compatible responses', async () => {
      // Test a typical GitHub Copilot workflow
      const storeRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'GitHub Copilot integration: React component patterns',
          layer: 'system',
          tags: ['copilot', 'react', 'patterns'],
          metadata: {
            source: 'github_copilot',
            integration_test: true
          }
        }
      });

      const storeResponse = await server.handleRequest(storeRequest);
      expect(MCPTestHelper.validateResponse(storeResponse)).toBe(true);
      expect(storeResponse.result.content).toBeTruthy();

      // Follow up with a search
      const searchRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'search_memory',
        arguments: {
          query: 'React component patterns',
          options: { limit: 3 }
        }
      });

      const searchResponse = await server.handleRequest(searchRequest);
      expect(MCPTestHelper.validateResponse(searchResponse)).toBe(true);
      expect(searchResponse.result.content).toContain('React component patterns');

      console.log('✅ GitHub Copilot integration workflow validated');
    });

    it('should handle concurrent requests from Copilot', async () => {
      const concurrentRequests = [
        MCPTestHelper.createRequest('tools/call', {
          name: 'search_memory',
          arguments: { query: 'concurrent test 1' }
        }, 'req-1'),
        MCPTestHelper.createRequest('tools/call', {
          name: 'search_memory',
          arguments: { query: 'concurrent test 2' }
        }, 'req-2'),
        MCPTestHelper.createRequest('tools/call', {
          name: 'get_memory_stats',
          arguments: {}
        }, 'req-3'),
        MCPTestHelper.createRequest('tools/call', {
          name: 'store_memory',
          arguments: {
            content: 'Concurrent storage test',
            layer: 'project',
            tags: ['concurrent']
          }
        }, 'req-4')
      ];

      const startTime = Date.now();
      const responses = await Promise.all(
        concurrentRequests.map(req => server.handleRequest(req))
      );
      const totalTime = Date.now() - startTime;

      // All responses should be valid
      responses.forEach((response, index) => {
        expect(MCPTestHelper.validateResponse(response)).toBe(true);
        expect(response.id).toBe(concurrentRequests[index].id);
      });

      expect(totalTime).toBeLessThan(500); // Concurrent requests should complete quickly

      console.log(`✅ ${responses.length} concurrent requests handled in ${totalTime}ms`);
    });

    it('should maintain session state across requests', async () => {
      // Store memory in one request
      const storeRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'Session state test memory',
          layer: 'prompt',
          tags: ['session', 'state', 'test'],
          metadata: { session_id: 'test-session-123' }
        }
      });

      const storeResponse = await server.handleRequest(storeRequest);
      expect(storeResponse.result).toBeDefined();

      // Retrieve it in another request
      const searchRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'search_memory',
        arguments: {
          query: 'Session state test',
          options: { layer: 'prompt' }
        }
      });

      const searchResponse = await server.handleRequest(searchRequest);
      expect(searchResponse.result.content).toContain('Session state test');

      console.log('✅ Session state maintained across requests');
    });
  });

  describe('Error Handling and Robustness', () => {
    it('should handle malformed tool calls', async () => {
      const malformedRequests = [
        // Missing tool name
        MCPTestHelper.createRequest('tools/call', {
          arguments: { content: 'test' }
        }),
        // Invalid tool name
        MCPTestHelper.createRequest('tools/call', {
          name: 'non_existent_tool',
          arguments: {}
        }),
        // Malformed arguments
        MCPTestHelper.createRequest('tools/call', {
          name: 'store_memory',
          arguments: 'invalid arguments format'
        })
      ];

      for (const request of malformedRequests) {
        const response = await server.handleRequest(request);

        expect(MCPTestHelper.validateResponse(response)).toBe(true);
        expect(response.error || response.result).toBeDefined();

        if (response.error) {
          expect(response.error.code).toBeGreaterThan(0);
          expect(response.error.message).toBeTruthy();
        }

        console.log(`⚠️ Malformed request handled gracefully`);
      }
    });

    it('should handle system errors gracefully', async () => {
      // Simulate system error by attempting invalid operations
      const problemRequests = [
        MCPTestHelper.createRequest('tools/call', {
          name: 'store_memory',
          arguments: {
            content: 'x'.repeat(1000000), // Very large content
            layer: 'project'
          }
        }),
        MCPTestHelper.createRequest('tools/call', {
          name: 'search_memory',
          arguments: {
            query: 'SELECT * FROM memories; DROP TABLE memories;', // SQL injection attempt
            options: { limit: -1 } // Invalid limit
          }
        })
      ];

      for (const request of problemRequests) {
        const response = await server.handleRequest(request);

        expect(MCPTestHelper.validateResponse(response)).toBe(true);

        // Should either succeed with sanitized input or fail gracefully
        if (response.error) {
          expect(response.error.code).toBeGreaterThan(0);
          expect(response.error.message).toBeTruthy();
          console.log(`⚠️ System error handled: ${response.error.message}`);
        } else {
          expect(response.result).toBeDefined();
          console.log(`✅ Potentially problematic request handled safely`);
        }
      }
    });

    it('should provide helpful error messages', async () => {
      const request = MCPTestHelper.createRequest('tools/call', {
        name: 'store_memory',
        arguments: {
          // Missing required content field
          layer: 'project',
          tags: ['test']
        }
      });

      const response = await server.handleRequest(request);

      if (response.error) {
        expect(response.error.message).toBeTruthy();
        expect(response.error.message.length).toBeGreaterThan(10);
        expect(response.error.message).toMatch(/content|required|missing|invalid/i);

        console.log(`✅ Helpful error message: "${response.error.message}"`);
      } else {
        // If no error, the system handled the missing field gracefully
        expect(response.result).toBeDefined();
        console.log('✅ Missing field handled gracefully');
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should maintain performance under MCP load', async () => {
      const loadTestRequests = [];

      // Generate multiple concurrent MCP requests
      for (let i = 0; i < 20; i++) {
        loadTestRequests.push(
          MCPTestHelper.createRequest('tools/call', {
            name: 'store_memory',
            arguments: {
              content: `Load test memory ${i}`,
              layer: 'project',
              tags: ['load-test', `batch-${Math.floor(i / 5)}`]
            }
          }, `load-${i}`)
        );
      }

      for (let i = 0; i < 15; i++) {
        loadTestRequests.push(
          MCPTestHelper.createRequest('tools/call', {
            name: 'search_memory',
            arguments: {
              query: `test ${i % 5}`,
              options: { limit: 5 }
            }
          }, `search-${i}`)
        );
      }

      const endTimer = performanceMeasurer.start('mcp-load-test');
      const responses = await Promise.all(
        loadTestRequests.map(req => server.handleRequest(req))
      );
      const loadTestTime = endTimer();

      // All responses should be valid
      responses.forEach(response => {
        expect(MCPTestHelper.validateResponse(response)).toBe(true);
        expect(response.result || response.error).toBeDefined();
      });

      const avgResponseTime = loadTestTime / responses.length;
      expect(avgResponseTime).toBeLessThan(100); // Average response time should be reasonable

      console.log(`✅ Load test: ${responses.length} requests in ${loadTestTime.toFixed(2)}ms (avg: ${avgResponseTime.toFixed(2)}ms)`);
    });

    it('should handle memory-intensive MCP operations', async () => {
      // Test with larger payloads
      const largeContentRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'store_memory',
        arguments: {
          content: 'Large memory content: ' + 'x'.repeat(10000),
          layer: 'system',
          tags: ['large-content', 'performance'],
          metadata: {
            size: 'large',
            test: 'memory-intensive',
            data: Array.from({ length: 100 }, (_, i) => `item-${i}`)
          }
        }
      });

      const endTimer = performanceMeasurer.start('large-content-store');
      const response = await server.handleRequest(largeContentRequest);
      const processingTime = endTimer();

      expect(MCPTestHelper.validateResponse(response)).toBe(true);
      expect(processingTime).toBeLessThan(200); // Should handle large content efficiently

      // Follow up with search
      const searchRequest = MCPTestHelper.createRequest('tools/call', {
        name: 'search_memory',
        arguments: { query: 'Large memory content' }
      });

      const searchEndTimer = performanceMeasurer.start('large-content-search');
      const searchResponse = await server.handleRequest(searchRequest);
      const searchTime = searchEndTimer();

      expect(MCPTestHelper.validateResponse(searchResponse)).toBe(true);
      expect(searchTime).toBeLessThan(100);

      console.log(`✅ Large content: store ${processingTime.toFixed(2)}ms, search ${searchTime.toFixed(2)}ms`);
    });
  });
});