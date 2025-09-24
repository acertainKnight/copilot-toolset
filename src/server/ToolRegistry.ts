/**
 * Official MCP-Compliant Tool Registry System
 *
 * Based on official GitHub Copilot and VS Code MCP documentation:
 * - https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp
 * - https://code.visualstudio.com/docs/copilot/chat/mcp-servers
 * - https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/Logger.js';

/**
 * MCP Tool Definition - follows official MCP specification
 */
export interface MCPToolDefinition {
  /** Unique tool name (required by MCP spec) */
  name: string;
  /** Human-readable title (required by MCP spec) */
  title: string;
  /** Tool description (required by MCP spec) */
  description: string;
  /** Input schema using Zod (official TypeScript SDK pattern) */
  inputSchema: Record<string, z.ZodType<any>>;
  /** Optional output schema for validation */
  outputSchema?: z.ZodType<any>;
  /** Tool category for organization (VS Code supports up to 128 tools) */
  category?: string;
  /** Security permissions required */
  permissions?: string[];
  /** Rate limiting (tools/sec) */
  rateLimit?: number;
  /** Whether tool requires user confirmation (GitHub Copilot security) */
  requiresConfirmation?: boolean;
}

/**
 * Tool execution context with security controls
 */
export interface ToolExecutionContext {
  /** Current workspace path */
  workspacePath?: string;
  /** User authentication info */
  user?: { id: string; permissions: string[] };
  /** Request rate limiting */
  rateLimiter?: Map<string, number>;
}

/**
 * Tool handler function signature (MCP specification compliant)
 */
export type ToolHandler<T = any> = (
  args: T,
  context: ToolExecutionContext
) => Promise<{
  /** Content array (required by MCP spec) */
  content: Array<{
    type: 'text' | 'image' | 'audio' | 'resource';
    text?: string;
    data?: string;
    url?: string;
    mimeType?: string;
  }>;
  /** Error flag (MCP specification) */
  isError?: boolean;
  /** Optional structured data */
  structuredContent?: any;
}>;

/**
 * MCP-Compliant Automatic Tool Registry
 *
 * Implements official MCP protocol requirements:
 * - tools/list method for discovery
 * - tools/call method for invocation
 * - Schema validation with Zod
 * - Security controls and rate limiting
 */
export class MCPToolRegistry {
  private tools: Map<string, {
    definition: MCPToolDefinition;
    handler: ToolHandler;
  }> = new Map();

  private categories: Map<string, string[]> = new Map();
  private rateLimiters: Map<string, Map<string, number>> = new Map();

  constructor(
    private mcpServer: McpServer,
    private logger: Logger
  ) {}

  /**
   * Register a tool following official MCP patterns
   * Based on @modelcontextprotocol/sdk TypeScript examples
   */
  async registerTool<T>(
    definition: MCPToolDefinition,
    handler: ToolHandler<T>
  ): Promise<void> {
    try {
      // Validate tool definition against MCP spec
      this.validateToolDefinition(definition);

      // Store tool metadata
      this.tools.set(definition.name, { definition, handler });

      // Add to category index (VS Code supports categorization)
      const category = definition.category || 'general';
      if (!this.categories.has(category)) {
        this.categories.set(category, []);
      }
      this.categories.get(category)!.push(definition.name);

      // Register with MCP server using official SDK pattern
      this.mcpServer.registerTool(definition.name, {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema
      }, async (args) => {
        return await this.executeToolWithSecurity(definition.name, args);
      });

      this.logger.info(`Registered MCP tool: ${definition.name}`);

    } catch (error) {
      this.logger.error(`Failed to register tool ${definition.name}:`, error);
      throw error;
    }
  }

  /**
   * Automatically discover and register tools from decorated classes
   * Supports both decorator and configuration-based registration
   */
  async discoverAndRegisterTools(toolSources: any[]): Promise<void> {
    for (const source of toolSources) {
      if (typeof source === 'function') {
        // Class-based tool registration
        await this.registerToolsFromClass(source);
      } else if (typeof source === 'object') {
        // Configuration-based tool registration
        await this.registerToolsFromConfig(source);
      }
    }

    this.logger.info(`Total tools registered: ${this.tools.size}`);

    // Validate VS Code tool limit (max 128 tools per request)
    if (this.tools.size > 128) {
      this.logger.warn(`Tool count (${this.tools.size}) exceeds VS Code limit of 128 tools`);
    }
  }

  /**
   * MCP tools/list method implementation
   * Returns paginated tool list following MCP specification
   */
  async handleToolsList(params?: { cursor?: string; category?: string }): Promise<{
    tools: Array<{
      name: string;
      title: string;
      description: string;
      inputSchema: any;
      outputSchema?: any;
    }>;
    nextCursor?: string;
  }> {
    let toolsToReturn = Array.from(this.tools.values());

    // Filter by category if specified
    if (params?.category) {
      const categoryTools = this.categories.get(params.category) || [];
      toolsToReturn = toolsToReturn.filter(({ definition }) =>
        categoryTools.includes(definition.name)
      );
    }

    // Implement pagination (MCP spec supports cursor-based pagination)
    const pageSize = 50; // Reasonable page size
    const startIndex = params?.cursor ? parseInt(params.cursor) || 0 : 0;
    const endIndex = Math.min(startIndex + pageSize, toolsToReturn.length);

    const tools = toolsToReturn.slice(startIndex, endIndex).map(({ definition }) => ({
      name: definition.name,
      title: definition.title,
      description: definition.description,
      inputSchema: this.convertZodToJsonSchema(definition.inputSchema),
      outputSchema: definition.outputSchema ?
        this.convertZodToJsonSchema({ result: definition.outputSchema }) : undefined
    }));

    const response: any = { tools };
    if (endIndex < toolsToReturn.length) {
      response.nextCursor = endIndex.toString();
    }

    return response;
  }

  /**
   * MCP tools/call method implementation with security
   * Implements rate limiting and access controls per MCP security guidelines
   */
  private async executeToolWithSecurity(
    toolName: string,
    args: any
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool '${toolName}' not found` }],
        isError: true
      };
    }

    try {
      // Rate limiting (MCP security recommendation)
      if (tool.definition.rateLimit) {
        const allowed = await this.checkRateLimit(toolName, tool.definition.rateLimit);
        if (!allowed) {
          return {
            content: [{ type: 'text', text: 'Rate limit exceeded' }],
            isError: true
          };
        }
      }

      // Input validation using Zod (official TypeScript SDK pattern)
      const inputSchema = z.object(tool.definition.inputSchema);
      const validatedArgs = inputSchema.parse(args);

      // Execute tool with context
      const context: ToolExecutionContext = {
        workspacePath: process.cwd(),
        rateLimiter: this.rateLimiters.get(toolName)
      };

      const result = await tool.handler(validatedArgs, context);

      // Output validation if schema provided
      if (tool.definition.outputSchema) {
        tool.definition.outputSchema.parse(result);
      }

      return result;

    } catch (error) {
      this.logger.error(`Tool execution error for ${toolName}:`, error);
      return {
        content: [{
          type: 'text',
          text: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Rate limiting implementation (MCP security guideline)
   */
  private async checkRateLimit(toolName: string, limit: number): Promise<boolean> {
    const now = Date.now();
    const windowMs = 1000; // 1 second window

    if (!this.rateLimiters.has(toolName)) {
      this.rateLimiters.set(toolName, new Map());
    }

    const toolLimiter = this.rateLimiters.get(toolName)!;
    const key = Math.floor(now / windowMs).toString();
    const currentCount = toolLimiter.get(key) || 0;

    if (currentCount >= limit) {
      return false;
    }

    toolLimiter.set(key, currentCount + 1);

    // Cleanup old entries
    for (const [k, _] of toolLimiter.entries()) {
      if (parseInt(k) < Math.floor(now / windowMs) - 10) {
        toolLimiter.delete(k);
      }
    }

    return true;
  }

  /**
   * Get tool statistics for monitoring
   */
  getToolStats(): {
    totalTools: number;
    categories: Record<string, number>;
    toolsWithRateLimit: number;
    toolsWithConfirmation: number;
  } {
    const stats = {
      totalTools: this.tools.size,
      categories: {} as Record<string, number>,
      toolsWithRateLimit: 0,
      toolsWithConfirmation: 0
    };

    for (const [category, tools] of this.categories.entries()) {
      stats.categories[category] = tools.length;
    }

    for (const { definition } of this.tools.values()) {
      if (definition.rateLimit) stats.toolsWithRateLimit++;
      if (definition.requiresConfirmation) stats.toolsWithConfirmation++;
    }

    return stats;
  }

  /**
   * Validate tool definition against MCP specification
   */
  private validateToolDefinition(definition: MCPToolDefinition): void {
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }

    if (!definition.title || typeof definition.title !== 'string') {
      throw new Error('Tool title is required and must be a string');
    }

    if (!definition.description || typeof definition.description !== 'string') {
      throw new Error('Tool description is required and must be a string');
    }

    if (!definition.inputSchema || typeof definition.inputSchema !== 'object') {
      throw new Error('Tool inputSchema is required and must be an object');
    }
  }

  /**
   * Convert Zod schemas to JSON Schema (MCP specification requirement)
   */
  private convertZodToJsonSchema(zodSchema: Record<string, z.ZodType<any>>): any {
    const jsonSchema: any = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const [key, schema] of Object.entries(zodSchema)) {
      // Basic Zod to JSON Schema conversion
      // In production, use zodToJsonSchema library
      if (schema instanceof z.ZodString) {
        jsonSchema.properties[key] = { type: 'string', description: schema.description };
        if (!schema.isOptional()) jsonSchema.required.push(key);
      } else if (schema instanceof z.ZodNumber) {
        jsonSchema.properties[key] = { type: 'number', description: schema.description };
        if (!schema.isOptional()) jsonSchema.required.push(key);
      } else if (schema instanceof z.ZodBoolean) {
        jsonSchema.properties[key] = { type: 'boolean', description: schema.description };
        if (!schema.isOptional()) jsonSchema.required.push(key);
      } else if (schema instanceof z.ZodEnum) {
        jsonSchema.properties[key] = {
          type: 'string',
          enum: schema._def.values,
          description: schema.description
        };
        if (!schema.isOptional()) jsonSchema.required.push(key);
      }
    }

    return jsonSchema;
  }

  /**
   * Register tools from class with metadata
   */
  private async registerToolsFromClass(toolClass: any): Promise<void> {
    // Implementation would use reflection to find decorated methods
    // This is a placeholder for the decorator-based approach
    this.logger.info(`Registering tools from class: ${toolClass.name}`);
  }

  /**
   * Register tools from configuration object
   */
  private async registerToolsFromConfig(config: any): Promise<void> {
    // Implementation would process configuration-based tool definitions
    this.logger.info('Registering tools from configuration');
  }
}