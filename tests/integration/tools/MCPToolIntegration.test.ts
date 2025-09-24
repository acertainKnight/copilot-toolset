/**
 * Integration Tests for MCP Tool Registration and Execution
 * Tests the complete flow from decoration to registration to execution
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryTools } from '../../../src/tools/MemoryTools.js';
import { ChatModeTools } from '../../../src/tools/ChatModeTools.js';
import { ProjectTools } from '../../../src/tools/ProjectTools.js';
import { ToolDiscovery, TOOL_CATEGORIES, TOOL_PERMISSIONS } from '../../../src/server/MCPToolDecorator.js';
import { MCPToolRegistry } from '../../../src/server/ToolRegistry.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolExecutionContext } from '../../../src/types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MCP Tool Integration', () => {
  let tempDir: string;
  let mockServer: any;
  let toolRegistry: MCPToolRegistry;
  let logger: any;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-tool-test-'));

    // Setup mock logger
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Setup mock MCP server
    mockServer = {
      name: 'test-server',
      version: '1.0.0',
      setToolHandler: jest.fn(),
      listTools: jest.fn()
    };

    // Create tool registry
    toolRegistry = new MCPToolRegistry(mockServer as any, logger);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Tool Discovery and Registration', () => {
    it('should discover all decorated memory tools', () => {
      const memoryTools = new MemoryTools();
      const discoveredTools = ToolDiscovery.getAllTools([memoryTools]);

      // Memory tools should have at least these decorated methods
      const expectedTools = [
        'store_unified_memory',
        'search_unified_memory',
        'get_unified_memory_stats',
        'store_memory' // Legacy
      ];

      const toolNames = discoveredTools.map(t => t.definition.name);
      expectedTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });

      // Verify all tools have proper structure
      discoveredTools.forEach(({ definition, handler }) => {
        expect(definition.name).toBeDefined();
        expect(definition.title).toBeDefined();
        expect(definition.description).toBeDefined();
        expect(definition.inputSchema).toBeDefined();
        expect(definition.category).toBeDefined();
        expect(definition.permissions).toBeDefined();
        expect(typeof handler).toBe('function');
      });
    });

    it('should register discovered tools with the registry', async () => {
      const memoryTools = new MemoryTools();
      const discoveredTools = ToolDiscovery.getAllTools([memoryTools]);

      for (const { definition, handler } of discoveredTools) {
        await toolRegistry.registerTool(definition, handler);
      }

      const stats = toolRegistry.getToolStats();
      expect(stats.totalTools).toBeGreaterThanOrEqual(4); // At least 4 memory tools
      expect(stats.categories[TOOL_CATEGORIES.MEMORY]).toBeGreaterThanOrEqual(4);
    });

    it('should handle tool registration with rate limiting', async () => {
      const memoryTools = new MemoryTools();
      const discoveredTools = ToolDiscovery.getAllTools([memoryTools]);

      // Find a tool with rate limiting
      const rateLimitedTool = discoveredTools.find(t =>
        t.definition.name === 'store_unified_memory'
      );

      expect(rateLimitedTool).toBeDefined();
      expect(rateLimitedTool!.definition.rateLimit).toBe(10); // 10 calls per second
    });

    it('should categorize tools correctly', async () => {
      const toolInstances = [
        new MemoryTools(),
        new ChatModeTools(),
        new ProjectTools()
      ];

      const allTools = ToolDiscovery.getAllTools(toolInstances);

      // Register all tools
      for (const { definition, handler } of allTools) {
        await toolRegistry.registerTool(definition, handler);
      }

      const stats = toolRegistry.getToolStats();

      // Should have multiple categories
      expect(Object.keys(stats.categories).length).toBeGreaterThan(1);

      // Memory category should exist
      expect(stats.categories[TOOL_CATEGORIES.MEMORY]).toBeDefined();
      expect(stats.categories[TOOL_CATEGORIES.MEMORY]).toBeGreaterThan(0);
    });
  });

  describe('Tool Execution via Registry', () => {
    it('should execute memory tool through registry', async () => {
      const memoryTools = new MemoryTools();

      // Mock the unified memory manager
      const mockStore = jest.fn().mockResolvedValue('test_memory_id');
      // @ts-ignore
      memoryTools.unifiedMemoryManager = {
        store: mockStore
      };

      const discoveredTools = ToolDiscovery.getAllTools([memoryTools]);

      // Register the store tool
      const storeTool = discoveredTools.find(t => t.definition.name === 'store_unified_memory');
      expect(storeTool).toBeDefined();

      await toolRegistry.registerTool(storeTool!.definition, storeTool!.handler);

      // Execute through registry
      const context: ToolExecutionContext = {
        workspacePath: '/test/workspace'
      };

      const result = await toolRegistry.executeTool('store_unified_memory', {
        content: 'Test content',
        tier: 'core',
        scope: 'global'
      }, context);

      expect(result).toBeDefined();
      expect(mockStore).toHaveBeenCalled();
    });

    it('should validate input schema before execution', async () => {
      const memoryTools = new MemoryTools();
      const discoveredTools = ToolDiscovery.getAllTools([memoryTools]);

      const storeTool = discoveredTools.find(t => t.definition.name === 'store_unified_memory');
      await toolRegistry.registerTool(storeTool!.definition, storeTool!.handler);

      // Try to execute with invalid input
      const context: ToolExecutionContext = {};

      await expect(
        toolRegistry.executeTool('store_unified_memory', {
          // Missing required fields: content, tier, scope
        }, context)
      ).rejects.toThrow();
    });

    it('should handle tool execution errors gracefully', async () => {
      const memoryTools = new MemoryTools();

      // Mock to throw error
      // @ts-ignore
      memoryTools.unifiedMemoryManager = {
        store: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      const discoveredTools = ToolDiscovery.getAllTools([memoryTools]);
      const storeTool = discoveredTools.find(t => t.definition.name === 'store_unified_memory');

      await toolRegistry.registerTool(storeTool!.definition, storeTool!.handler);

      const context: ToolExecutionContext = {};
      const result = await toolRegistry.executeTool('store_unified_memory', {
        content: 'Test',
        tier: 'core',
        scope: 'global'
      }, context);

      // Tool should handle error and return error response
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to store memory');
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should provide tools/list response in MCP format', async () => {
      // Register multiple tools
      const toolInstances = [
        new MemoryTools(),
        new ChatModeTools()
      ];

      for (const instance of toolInstances) {
        const tools = ToolDiscovery.getAllTools([instance]);
        for (const { definition, handler } of tools) {
          await toolRegistry.registerTool(definition, handler);
        }
      }

      // Call tools/list
      const listResult = await toolRegistry.handleToolsList({});

      expect(listResult).toBeDefined();
      expect(Array.isArray(listResult.tools)).toBe(true);
      expect(listResult.tools.length).toBeGreaterThan(0);

      // Verify MCP format
      listResult.tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.additionalProperties).toBe(false);
      });
    });

    it('should support pagination in tools/list', async () => {
      // Register many tools to test pagination
      const memoryTools = new MemoryTools();
      const tools = ToolDiscovery.getAllTools([memoryTools]);

      for (const { definition, handler } of tools) {
        await toolRegistry.registerTool(definition, handler);
      }

      // Request with limit
      const firstPage = await toolRegistry.handleToolsList({
        cursor: undefined,
        limit: 2
      });

      expect(firstPage.tools.length).toBeLessThanOrEqual(2);

      if (tools.length > 2) {
        expect(firstPage.nextCursor).toBeDefined();

        // Get next page
        const secondPage = await toolRegistry.handleToolsList({
          cursor: firstPage.nextCursor,
          limit: 2
        });

        expect(secondPage.tools.length).toBeGreaterThan(0);

        // Tools should be different
        const firstPageNames = firstPage.tools.map(t => t.name);
        const secondPageNames = secondPage.tools.map(t => t.name);
        expect(firstPageNames).not.toEqual(secondPageNames);
      }
    });

    it('should enforce VS Code 128 tool limit', async () => {
      // This is a warning test - registry should warn but not fail
      const mockTools = Array.from({ length: 150 }, (_, i) => ({
        name: `tool_${i}`,
        title: `Tool ${i}`,
        description: `Description ${i}`,
        category: TOOL_CATEGORIES.MEMORY,
        permissions: [TOOL_PERMISSIONS.DATABASE_READ],
        inputSchema: {}
      }));

      let registeredCount = 0;
      for (const tool of mockTools) {
        await toolRegistry.registerTool(tool, async () => ({
          content: [{ type: 'text' as const, text: 'test' }]
        }));
        registeredCount++;
      }

      expect(registeredCount).toBe(150);

      // Logger should have warned about exceeding limit
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('exceeds VS Code limit')
      );
    });
  });

  describe('Tool Permissions and Security', () => {
    it('should track tool permissions correctly', async () => {
      const memoryTools = new MemoryTools();
      const tools = ToolDiscovery.getAllTools([memoryTools]);

      const writeTools = tools.filter(t =>
        t.definition.permissions.includes(TOOL_PERMISSIONS.DATABASE_WRITE)
      );

      const readTools = tools.filter(t =>
        t.definition.permissions.includes(TOOL_PERMISSIONS.DATABASE_READ)
      );

      expect(writeTools.length).toBeGreaterThan(0);
      expect(readTools.length).toBeGreaterThan(0);

      // Store operations should have write permission
      const storeTool = tools.find(t => t.definition.name === 'store_unified_memory');
      expect(storeTool!.definition.permissions).toContain(TOOL_PERMISSIONS.DATABASE_WRITE);

      // Search operations should have read permission
      const searchTool = tools.find(t => t.definition.name === 'search_unified_memory');
      expect(searchTool!.definition.permissions).toContain(TOOL_PERMISSIONS.DATABASE_READ);
    });

    it('should validate context before tool execution', async () => {
      const memoryTools = new MemoryTools();
      const tools = ToolDiscovery.getAllTools([memoryTools]);

      const storeTool = tools.find(t => t.definition.name === 'store_unified_memory');
      await toolRegistry.registerTool(storeTool!.definition, storeTool!.handler);

      // Execute with minimal context
      const minimalContext: ToolExecutionContext = {};

      // Should not throw - tools should handle missing context
      await expect(
        toolRegistry.executeTool('store_unified_memory', {
          content: 'Test',
          tier: 'core',
          scope: 'global'
        }, minimalContext)
      ).resolves.toBeDefined();
    });
  });

  describe('Cross-Tool Integration', () => {
    it('should handle memory and chat mode tools together', async () => {
      const memoryTools = new MemoryTools();
      const chatModeTools = new ChatModeTools();

      // Mock dependencies
      // @ts-ignore
      memoryTools.unifiedMemoryManager = {
        store: jest.fn().mockResolvedValue('memory_id'),
        search: jest.fn().mockResolvedValue([]),
        getStats: jest.fn().mockResolvedValue({
          total_memories: 10,
          core_memories: 5,
          longterm_memories: 5,
          global_memories: 6,
          project_memories: 4,
          total_size: 10000,
          core_size: 2000,
          longterm_size: 8000,
          average_size: 1000,
          database_size: 15000
        })
      };

      // @ts-ignore
      chatModeTools.modeManager = {
        createMode: jest.fn().mockResolvedValue({ success: true })
      };

      // Register both tool sets
      const allTools = ToolDiscovery.getAllTools([memoryTools, chatModeTools]);

      for (const { definition, handler } of allTools) {
        await toolRegistry.registerTool(definition, handler);
      }

      const stats = toolRegistry.getToolStats();

      // Should have tools from both categories
      expect(stats.categories[TOOL_CATEGORIES.MEMORY]).toBeGreaterThan(0);
      // Note: ChatModeTools might use different categories
      expect(stats.totalTools).toBeGreaterThan(4); // At least memory tools
    });

    it('should maintain tool isolation between instances', async () => {
      const memoryTools1 = new MemoryTools();
      const memoryTools2 = new MemoryTools();

      const mockStore1 = jest.fn().mockResolvedValue('id_1');
      const mockStore2 = jest.fn().mockResolvedValue('id_2');

      // @ts-ignore
      memoryTools1.unifiedMemoryManager = { store: mockStore1 };
      // @ts-ignore
      memoryTools2.unifiedMemoryManager = { store: mockStore2 };

      const tools1 = ToolDiscovery.getAllTools([memoryTools1]);
      const tools2 = ToolDiscovery.getAllTools([memoryTools2]);

      // Both should discover the same tool definitions
      expect(tools1.length).toBe(tools2.length);

      // But handlers should be different instances
      const storeTool1 = tools1.find(t => t.definition.name === 'store_unified_memory');
      const storeTool2 = tools2.find(t => t.definition.name === 'store_unified_memory');

      // Execute both
      const context: ToolExecutionContext = {};

      await storeTool1!.handler({
        content: 'Test1',
        tier: 'core',
        scope: 'global'
      }, context);

      await storeTool2!.handler({
        content: 'Test2',
        tier: 'core',
        scope: 'global'
      }, context);

      // Each should use its own mock
      expect(mockStore1).toHaveBeenCalledTimes(1);
      expect(mockStore2).toHaveBeenCalledTimes(1);
    });
  });
});