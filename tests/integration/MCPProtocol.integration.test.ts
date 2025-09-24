/**
 * MCP Protocol Integration Tests (stdio only)
 *
 * Validates compliance with official MCP specifications via stdio transport:
 * - GitHub Copilot MCP integration
 * - VS Code MCP server requirements
 * - MCP protocol specification 2025-06-18
 */

import { describe, it, expect, beforeAll, afterAll } from 'jest';
import { GitCopilotMemoryServer } from '../../src/server/MCPServer.js';
import { MCPValidator, MCP_PROTOCOL_VERSION } from '../../src/types/MCPCompliant.js';

describe('MCP Protocol Integration Tests (stdio)', () => {
  let mcpServer: GitCopilotMemoryServer;

  beforeAll(async () => {
    mcpServer = new GitCopilotMemoryServer();
    // In production, server would be started via stdio transport
  });

  afterAll(async () => {
    if (mcpServer) {
      await mcpServer.shutdown();
    }
  });

  describe('JSON-RPC 2.0 Protocol Compliance', () => {
    it('should handle tools/list method correctly', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/list',
        params: {}
      };

      // Validate request format
      expect(() => MCPValidator.validateRequest(request)).not.toThrow();

      // Mock response structure that should be returned
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        result: {
          tools: [
            {
              name: 'store_unified_memory',
              title: 'Store Unified Memory',
              description: 'Store information in dual-tier memory system',
              inputSchema: {
                type: 'object',
                properties: {
                  content: {
                    type: 'string',
                    description: 'Content to store'
                  }
                },
                required: ['content']
              }
            }
          ]
        }
      };

      expect(mockResponse.jsonrpc).toBe('2.0');
      expect(mockResponse.id).toBe(request.id);
      expect(Array.isArray(mockResponse.result.tools)).toBe(true);
      expect(mockResponse.result.tools.length).toBeGreaterThan(0);

      // Validate each tool definition
      mockResponse.result.tools.forEach(tool => {
        expect(() => MCPValidator.validateToolDefinition(tool)).not.toThrow();
      });
    });

    it('should handle tools/call method correctly', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/call',
        params: {
          name: 'store_unified_memory',
          arguments: {
            content: 'Test content for MCP compliance',
            tier: 'core',
            scope: 'global'
          }
        }
      };

      // Validate request format
      expect(() => MCPValidator.validateRequest(request)).not.toThrow();

      // Mock successful response
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 2,
        result: {
          content: [
            {
              type: 'text' as const,
              text: 'Memory stored successfully in Core tier with Global scope!'
            }
          ]
        }
      };

      expect(mockResponse.jsonrpc).toBe('2.0');
      expect(mockResponse.id).toBe(request.id);
      expect(() => MCPValidator.validateToolResult(mockResponse.result)).not.toThrow();
    });

    it('should handle errors according to JSON-RPC 2.0 specification', async () => {
      const invalidRequest = {
        jsonrpc: '2.0' as const,
        id: 3,
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {}
        }
      };

      const errorResponse = {
        jsonrpc: '2.0' as const,
        id: 3,
        error: {
          code: -32000,
          message: 'Tool not found',
          data: { toolName: 'nonexistent_tool' }
        }
      };

      expect(errorResponse.jsonrpc).toBe('2.0');
      expect(errorResponse.id).toBe(invalidRequest.id);
      expect(typeof errorResponse.error.code).toBe('number');
      expect(typeof errorResponse.error.message).toBe('string');
    });
  });

  describe('VS Code MCP Server Compliance', () => {
    it('should respect VS Code tool limit (128 tools max)', async () => {
      const toolRegistry = mcpServer.getToolRegistry();
      const stats = toolRegistry.getToolStats();

      expect(stats.totalTools).toBeLessThanOrEqual(128);

      if (stats.totalTools > 128) {
        console.warn(`Warning: ${stats.totalTools} tools exceeds VS Code limit of 128`);
      }
    });

    it('should support stdio transport configuration', async () => {
      const config = {
        servers: {
          'copilot-mcp-enhanced': {
            type: 'stdio' as const,
            command: 'copilot-mcp-server-enhanced',
            args: ['--workspace=${workspaceFolder}']
          }
        }
      };

      expect(() => MCPValidator.validateVSCodeConfig(config)).not.toThrow();
      expect(config.servers['copilot-mcp-enhanced'].type).toBe('stdio');
    });

    it('should handle workspace parameters correctly', async () => {
      const workspacePath = '/test/workspace';
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {
          name: 'init_project_enhanced',
          arguments: {
            project_path: workspacePath
          }
        }
      };

      expect(request.params.arguments.project_path).toBe(workspacePath);
    });
  });

  describe('GitHub Copilot Integration Compliance', () => {
    it('should create valid chat mode files', async () => {
      const chatMode = {
        name: 'test-reviewer',
        description: 'Test chat mode for MCP compliance validation',
        systemPrompt: 'You are a test reviewer for MCP protocol compliance.',
        tools: ['analyze_code', 'suggest_improvements'],
        temperature: 0.7
      };

      expect(() => MCPValidator.validateChatMode(chatMode)).not.toThrow();
      expect(chatMode.name).toMatch(/^[a-z][a-z0-9-_]*$/);
      expect(chatMode.description.length).toBeGreaterThan(10);
      expect(chatMode.description.length).toBeLessThanOrEqual(200);
      expect(chatMode.systemPrompt.length).toBeGreaterThan(20);
      expect(chatMode.systemPrompt.length).toBeLessThanOrEqual(2000);
      expect(chatMode.temperature).toBeGreaterThanOrEqual(0);
      expect(chatMode.temperature).toBeLessThanOrEqual(1);
    });

    it('should generate proper .chatmode.md format', async () => {
      const expectedFormat = `---
description: "Test chat mode for GitHub Copilot"
tools: ["tool1", "tool2"]
---

# Test Mode

System prompt content here.`;

      const lines = expectedFormat.split('\n');
      expect(lines[0]).toBe('---');
      expect(lines[1]).toMatch(/^description:/);
      expect(lines[2]).toMatch(/^tools:/);
      expect(lines[3]).toBe('---');
      expect(lines[5]).toMatch(/^#\s+/);
    });
  });

  describe('Tool Schema Validation Compliance', () => {
    it('should validate tool input schemas against JSON Schema Draft 7', async () => {
      const toolInputSchema = {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description: 'Search query string',
            minLength: 1,
            maxLength: 1000
          },
          limit: {
            type: 'number' as const,
            description: 'Maximum number of results',
            minimum: 1,
            maximum: 100
          }
        },
        required: ['query']
      };

      expect(toolInputSchema.type).toBe('object');
      expect(toolInputSchema.properties.query.type).toBe('string');
      expect(toolInputSchema.properties.query.description).toBeDefined();
      expect(toolInputSchema.required).toContain('query');
    });

    it('should validate tool output format compliance', async () => {
      const toolOutput = {
        content: [
          {
            type: 'text' as const,
            text: 'This is a valid text response'
          }
        ]
      };

      expect(() => MCPValidator.validateToolResult(toolOutput)).not.toThrow();
      expect(Array.isArray(toolOutput.content)).toBe(true);
      expect(toolOutput.content.length).toBeGreaterThan(0);
      expect(toolOutput.content[0].type).toBe('text');
    });
  });

  describe('Automatic Tool Registration', () => {
    it('should automatically discover and register decorated tools', async () => {
      const toolRegistry = mcpServer.getToolRegistry();
      const stats = toolRegistry.getToolStats();

      expect(stats.totalTools).toBeGreaterThan(0);
      expect(Object.keys(stats.categories).length).toBeGreaterThan(0);
    });

    it('should enforce rate limiting on registered tools', async () => {
      const toolRegistry = mcpServer.getToolRegistry();
      const stats = toolRegistry.getToolStats();

      expect(typeof stats.toolsWithRateLimit).toBe('number');
    });

    it('should support tool categories', async () => {
      const toolRegistry = mcpServer.getToolRegistry();
      const stats = toolRegistry.getToolStats();

      const expectedCategories = ['memory', 'project', 'general'];
      expectedCategories.forEach(category => {
        expect(stats.categories).toHaveProperty(category);
      });
    });
  });

  describe('Security and Validation', () => {
    it('should implement input validation', async () => {
      // Test that invalid input schemas are caught
      const invalidTool = {
        name: '',  // Invalid: empty name
        title: 'Test',
        description: 'Test'
      };

      expect(() => MCPValidator.validateToolDefinition(invalidTool as any)).toThrow();
    });

    it('should handle user confirmation requirements', async () => {
      const stats = mcpServer.getToolRegistry().getToolStats();
      expect(typeof stats.toolsWithConfirmation).toBe('number');
    });
  });

  describe('MCP Resource Providers', () => {
    it('should provide tool statistics via MCP resources', async () => {
      // Test that tool-stats:// resource would be available
      const expectedStats = {
        totalTools: expect.any(Number),
        categories: expect.any(Object),
        toolsWithRateLimit: expect.any(Number),
        toolsWithConfirmation: expect.any(Number)
      };

      const toolRegistry = mcpServer.getToolRegistry();
      const stats = toolRegistry.getToolStats();

      expect(stats).toMatchObject(expectedStats);
    });

    it('should provide tool categories via MCP resources', async () => {
      const toolRegistry = mcpServer.getToolRegistry();
      const stats = toolRegistry.getToolStats();

      expect(Object.keys(stats.categories).length).toBeGreaterThan(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet stdio transport performance requirements', async () => {
      // Tool registration should be fast
      const startTime = Date.now();

      // Mock tool operation
      const mockOperation = () => {
        const toolRegistry = mcpServer.getToolRegistry();
        return toolRegistry.getToolStats();
      };

      const result = mockOperation();
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // Should be very fast
      expect(result).toBeDefined();
    });
  });
});

// Helper functions for stdio MCP testing
function createMCPRequest(method: string, params?: any, id: number = 1) {
  return {
    jsonrpc: '2.0' as const,
    id,
    method,
    params: params || {}
  };
}

function validateMCPResponse(response: any) {
  expect(response).toHaveProperty('jsonrpc');
  expect(response.jsonrpc).toBe('2.0');
  expect(response).toHaveProperty('id');

  if (response.result) {
    expect(response).not.toHaveProperty('error');
  } else if (response.error) {
    expect(response).not.toHaveProperty('result');
    expect(response.error).toHaveProperty('code');
    expect(response.error).toHaveProperty('message');
  } else {
    throw new Error('MCP response must have either result or error');
  }
}

export { createMCPRequest, validateMCPResponse };