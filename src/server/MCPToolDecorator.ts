/**
 * Official MCP Tool Decorator System
 *
 * Implements automatic tool registration following:
 * - GitHub Copilot MCP integration guidelines
 * - VS Code MCP server requirements
 * - MCP specification 2025-06-18
 */

import 'reflect-metadata';
import { z } from 'zod';
import type { MCPToolDefinition, ToolHandler } from './ToolRegistry.js';
import type { ToolExecutionContext } from '../types/MCPCompliant.js';

/**
 * Metadata storage for decorated tools
 */
const TOOL_METADATA_KEY = Symbol('mcp:tool');

/**
 * MCP Tool decorator for automatic registration
 * Based on official TypeScript SDK patterns
 */
export function MCPTool(definition: Omit<MCPToolDefinition, 'inputSchema'> & {
  inputSchema?: Record<string, z.ZodType<any>>;
}) {
  return function <T extends ToolHandler>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    // Store metadata for discovery
    const toolDefinition: MCPToolDefinition = {
      name: definition.name,
      title: definition.title,
      description: definition.description,
      inputSchema: definition.inputSchema || {},
      category: definition.category,
      permissions: definition.permissions,
      rateLimit: definition.rateLimit,
      requiresConfirmation: definition.requiresConfirmation,
      outputSchema: definition.outputSchema
    };

    Reflect.defineMetadata(TOOL_METADATA_KEY, toolDefinition, target, propertyKey);

    // Wrap with automatic error handling and logging
    descriptor.value = (async function(this: any, args: any, context: ToolExecutionContext) {
      try {
        return await originalMethod.call(this, args, context);
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error in ${definition.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }) as T;

    return descriptor;
  };
}

/**
 * Tool discovery utilities for decorated classes
 */
export class ToolDiscovery {
  /**
   * Extract all decorated tools from a class instance
   */
  static getToolsFromInstance(instance: any): Array<{
    definition: MCPToolDefinition;
    handler: ToolHandler;
  }> {
    const tools: Array<{
      definition: MCPToolDefinition;
      handler: ToolHandler;
    }> = [];

    const prototype = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(prototype);

    for (const methodName of methodNames) {
      if (methodName === 'constructor') continue;

      const metadata: MCPToolDefinition | undefined = Reflect.getMetadata(
        TOOL_METADATA_KEY,
        prototype,
        methodName
      );

      if (metadata && typeof instance[methodName] === 'function') {
        tools.push({
          definition: metadata,
          handler: instance[methodName].bind(instance)
        });
      }
    }

    return tools;
  }

  /**
   * Get all tools from multiple class instances
   */
  static getAllTools(instances: any[]): Array<{
    definition: MCPToolDefinition;
    handler: ToolHandler;
  }> {
    const allTools: Array<{
      definition: MCPToolDefinition;
      handler: ToolHandler;
    }> = [];

    for (const instance of instances) {
      const instanceTools = this.getToolsFromInstance(instance);
      allTools.push(...instanceTools);
    }

    return allTools;
  }
}

/**
 * Predefined tool categories for VS Code organization
 * Based on official VS Code MCP documentation
 */
export const TOOL_CATEGORIES = {
  MEMORY: 'memory',
  PROJECT: 'project',
  FILE: 'file',
  SEARCH: 'search',
  ANALYSIS: 'analysis',
  GENERATION: 'generation',
  DEBUGGING: 'debugging',
  TESTING: 'testing',
  MIGRATION: 'migration',
  HEALING: 'healing',
  GENERAL: 'general'
} as const;

/**
 * Common tool permissions based on security best practices
 */
export const TOOL_PERMISSIONS = {
  READ_FILES: 'read:files',
  WRITE_FILES: 'write:files',
  EXECUTE_COMMANDS: 'execute:commands',
  NETWORK_ACCESS: 'network:access',
  DATABASE_READ: 'database:read',
  DATABASE_WRITE: 'database:write',
  WORKSPACE_MODIFY: 'workspace:modify'
} as const;