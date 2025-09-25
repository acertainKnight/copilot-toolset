/**
 * Enhanced MCP Server with Automatic Tool Registration
 *
 * Implements official GitHub Copilot and VS Code MCP requirements:
 * - Automatic tool discovery and registration
 * - MCP protocol compliance (tools/list, tools/call)
 * - Security controls and rate limiting
 * - VS Code integration (max 128 tools)
 *
 * Based on official documentation:
 * - https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp
 * - https://code.visualstudio.com/docs/copilot/chat/mcp-servers
 * - https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { MCPToolRegistry } from './ToolRegistry.js';
import { ToolDiscovery, TOOL_CATEGORIES, TOOL_PERMISSIONS } from './MCPToolDecorator.js';

// Tool classes for automatic registration
import { MemoryTools } from '../tools/MemoryTools.js';
import { ProjectTools } from '../tools/ProjectTools.js';
import { ChatModeTools } from '../tools/ChatModeTools.js';

import type { Logger, StoragePaths } from '../types/index.js';
import * as os from 'os';
import * as path from 'path';

/**
 * GitCopilot Memory MCP Server with automatic tool registration
 * Provides memory management and GitHub Copilot integration
 */
export class GitCopilotMemoryServer {
  private server: McpServer;
  private toolRegistry: MCPToolRegistry;
  private logger: Logger;

  constructor() {
    this.server = new McpServer({
      name: 'gitcopilot-memory',
      version: '2.0.0',
    });

    // Initialize logger
    this.logger = {
      debug: (msg: string) => console.error(`[DEBUG] ${msg}`),
      info: (msg: string) => console.error(`[INFO] ${msg}`),
      warn: (msg: string) => console.error(`[WARN] ${msg}`),
      error: (msg: string, error?: Error) => console.error(`[ERROR] ${msg}`, error)
    };

    // Initialize tool registry
    this.toolRegistry = new MCPToolRegistry(this.server, this.logger);

    this.setupMCPProtocol();
  }

  /**
   * Setup MCP protocol handlers according to official specification
   */
  private setupMCPProtocol(): void {
    // The McpServer class handles capabilities internally
    // We just need to register tools, resources, and prompts

    // Setup automatic tool registration
    this.setupAutomaticToolRegistration();

    // Setup MCP resource providers
    this.setupResourceProviders();

    // Setup MCP prompt providers
    this.setupPromptProviders();
  }

  /**
   * Automatic tool registration following official patterns
   */
  private async setupAutomaticToolRegistration(): Promise<void> {
    try {
      this.logger.info('Starting automatic tool registration...');

      // Create tool instances
      const toolInstances = [
        new MemoryTools(),
        new ProjectTools(),
        new ChatModeTools()
      ];

      // Discover decorated tools
      const discoveredTools = ToolDiscovery.getAllTools(toolInstances);

      this.logger.info(`Discovered ${discoveredTools.length} decorated tools`);

      // Register all discovered tools
      for (const { definition, handler } of discoveredTools) {
        await this.toolRegistry.registerTool(definition, handler);
      }

      // Setup enhanced tools/list handler
      this.setupEnhancedToolsList();

      const stats = this.toolRegistry.getToolStats();
      this.logger.info(`Tool registration complete: ${stats.totalTools} tools in ${Object.keys(stats.categories).length} categories`);

      // Validate VS Code requirements
      if (stats.totalTools > 128) {
        this.logger.warn(`Warning: ${stats.totalTools} tools exceeds VS Code limit of 128 tools per request`);
      }

    } catch (error) {
      this.logger.error('Failed to setup automatic tool registration:', error as Error);
      throw error;
    }
  }

  /**
   * Enhanced tools/list handler for MCP protocol
   * Provides enhanced tool discovery via stdio transport
   */
  private setupEnhancedToolsList(): void {
    // The McpServer handles tools/list internally
    // Tools are registered through the tool registry
    // No need to override listTools
  }

  /**
   * Setup MCP resource providers for tool metadata
   * Accessible via MCP protocol: mcp://tool-stats and mcp://tool-categories
   */
  private setupResourceProviders(): void {
    // Register resource for tool statistics
    this.server.resource(
      'tool-stats',
      'tool-stats://',
      {
        description: 'Statistics about registered MCP tools',
        mimeType: 'application/json'
      },
      async () => {
        const stats = this.toolRegistry.getToolStats();
        return {
          contents: [{
            uri: 'tool-stats://',
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2)
          }]
        };
      }
    );

    // Register resource for tool categories
    this.server.resource(
      'tool-categories',
      'tool-categories://',
      {
        description: 'List of tool categories with descriptions',
        mimeType: 'application/json'
      },
      async () => {
        const stats = this.toolRegistry.getToolStats();
        return {
          contents: [{
            uri: 'tool-categories://',
            mimeType: 'application/json',
            text: JSON.stringify({
              categories: Object.entries(stats.categories).map(([name, count]) => ({
                name,
                count,
                description: this.getCategoryDescription(name)
              }))
            }, null, 2)
          }]
        };
      }
    );
  }

  /**
   * Setup MCP prompt providers for tool usage guidance
   */
  private setupPromptProviders(): void {
    // Register a prompt for tool usage guidance
    this.server.prompt(
      'tool-usage',
      'Get usage guidance for MCP tools',
      {
        toolName: z.string().optional().describe('Name of the tool to get guidance for')
      },
      async ({ toolName }) => {
        const stats = this.toolRegistry.getToolStats();

        if (toolName && typeof toolName === 'string') {
          return {
            description: `Usage guidance for ${toolName}`,
            messages: [{
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `How should I use the ${toolName} tool effectively? Available categories: ${Object.keys(stats.categories).join(', ')}`
              }
            }]
          };
        }

        return {
          description: 'General tool usage guidance',
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: 'Show me how to use the available MCP tools effectively for development tasks.'
            }
          }]
        };
      }
    );
  }

  /**
   * Start the enhanced MCP server
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting GitCopilot Memory Server...');

      // Use stdio transport for VS Code integration
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('GitCopilot Memory Server started successfully');

      // Log tool registration summary
      const stats = this.toolRegistry.getToolStats();
      this.logger.info(`Server ready with ${stats.totalTools} tools across ${Object.keys(stats.categories).length} categories`);

    } catch (error) {
      this.logger.error('Failed to start Enhanced MCP Server:', error as Error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down GitCopilot Memory Server...');
    await this.server.close();
    this.logger.info('GitCopilot Memory Server shut down successfully');
  }

  /**
   * Get category description for documentation
   */
  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      [TOOL_CATEGORIES.MEMORY]: 'Tools for storing and retrieving information from the three-tier memory system',
      [TOOL_CATEGORIES.PROJECT]: 'Tools for project initialization and context generation',
      [TOOL_CATEGORIES.FILE]: 'Tools for file system operations and content management',
      [TOOL_CATEGORIES.SEARCH]: 'Tools for searching code, files, and project content',
      [TOOL_CATEGORIES.ANALYSIS]: 'Tools for code analysis and quality assessment',
      [TOOL_CATEGORIES.GENERATION]: 'Tools for generating code, documentation, and project artifacts',
      [TOOL_CATEGORIES.DEBUGGING]: 'Tools for debugging and troubleshooting issues',
      [TOOL_CATEGORIES.TESTING]: 'Tools for test creation and validation',
      [TOOL_CATEGORIES.MIGRATION]: 'Tools for migrating between different systems or versions',
      [TOOL_CATEGORIES.HEALING]: 'Tools for self-healing and optimization',
      [TOOL_CATEGORIES.GENERAL]: 'General purpose tools and utilities'
    };

    return descriptions[category] || 'Specialized tools for development tasks';
  }

  /**
   * Get tool registry for testing and monitoring
   */
  getToolRegistry(): MCPToolRegistry {
    return this.toolRegistry;
  }
}

/**
 * Create and start the GitCopilot Memory MCP server
 */
async function main(): Promise<void> {
  const server = new GitCopilotMemoryServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  await server.start();
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default GitCopilotMemoryServer;
export { main };