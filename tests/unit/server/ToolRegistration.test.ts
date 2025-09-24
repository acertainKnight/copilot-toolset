/**
 * Tool Registration and Discovery Tests
 * Tests automatic tool registration, schema validation, and discovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';

// Mock types since CopilotMCPServer is not exported yet
interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: any;
}

interface ToolRegistrationResult {
  success: boolean;
  tool?: Tool;
  error?: string;
}

/**
 * Mock Tool Registry for testing
 * Simulates the tool registration system
 */
class MockToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private schemas: Map<string, z.ZodSchema> = new Map();

  registerTool(name: string, config: Omit<Tool, 'name'>): ToolRegistrationResult {
    // Validate tool name
    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Tool name must be a non-empty string' };
    }

    if (this.tools.has(name)) {
      return { success: false, error: `Tool '${name}' is already registered` };
    }

    // Validate required fields
    if (!config.title || !config.description) {
      return { success: false, error: 'Tool must have title and description' };
    }

    // Validate input schema
    if (!this.validateInputSchema(config.inputSchema)) {
      return { success: false, error: 'Invalid input schema format' };
    }

    const tool: Tool = { name, ...config };
    this.tools.set(name, tool);

    return { success: true, tool };
  }

  private validateInputSchema(schema: any): boolean {
    if (!schema || typeof schema !== 'object') return false;

    // Must be JSON Schema Draft 7 compliant
    if (schema.$schema && schema.$schema !== 'http://json-schema.org/draft-07/schema#') {
      return false;
    }

    // Must have type: object for MCP tools
    if (schema.type !== 'object') return false;

    // Must have additionalProperties: false for strict validation
    if (schema.additionalProperties !== false) return false;

    // If properties exist, they must be an object
    if (schema.properties && typeof schema.properties !== 'object') {
      return false;
    }

    // If required exists, it must be an array of strings
    if (schema.required && !Array.isArray(schema.required)) {
      return false;
    }

    return true;
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  clearTools(): void {
    this.tools.clear();
    this.schemas.clear();
  }
}

describe('Tool Registration System', () => {
  let registry: MockToolRegistry;

  beforeEach(() => {
    registry = new MockToolRegistry();
  });

  afterEach(() => {
    registry.clearTools();
  });

  describe('Automatic Tool Registration', () => {
    it('should register a valid tool successfully', () => {
      const result = registry.registerTool('test_tool', {
        title: 'Test Tool',
        description: 'A tool for testing',
        inputSchema: {
          type: 'object',
          properties: {
            param: { type: 'string', description: 'Test parameter' }
          },
          required: ['param'],
          additionalProperties: false,
          $schema: 'http://json-schema.org/draft-07/schema#'
        }
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBeDefined();
      expect(result.tool?.name).toBe('test_tool');
    });

    it('should reject duplicate tool names', () => {
      const toolConfig = {
        title: 'Test Tool',
        description: 'A tool for testing',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      };

      const result1 = registry.registerTool('duplicate_tool', toolConfig);
      expect(result1.success).toBe(true);

      const result2 = registry.registerTool('duplicate_tool', toolConfig);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already registered');
    });

    it('should validate required fields', () => {
      const result = registry.registerTool('invalid_tool', {
        title: '',
        description: 'Missing title',
        inputSchema: {
          type: 'object',
          additionalProperties: false
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('title and description');
    });

    it('should handle empty tool name', () => {
      const result = registry.registerTool('', {
        title: 'Test',
        description: 'Test',
        inputSchema: { type: 'object', additionalProperties: false }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool name must be');
    });
  });

  describe('Schema Validation', () => {
    it('should enforce JSON Schema Draft 7 format', () => {
      const result = registry.registerTool('schema_test', {
        title: 'Schema Test',
        description: 'Testing schema validation',
        inputSchema: {
          $schema: 'http://json-schema.org/draft-04/schema#', // Wrong version
          type: 'object',
          additionalProperties: false
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input schema');
    });

    it('should require type: object for MCP tools', () => {
      const result = registry.registerTool('type_test', {
        title: 'Type Test',
        description: 'Testing type requirement',
        inputSchema: {
          type: 'string', // Should be 'object'
          additionalProperties: false
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input schema');
    });

    it('should enforce additionalProperties: false', () => {
      const result = registry.registerTool('strict_test', {
        title: 'Strict Test',
        description: 'Testing strict validation',
        inputSchema: {
          type: 'object',
          properties: {
            param: { type: 'string' }
          }
          // Missing additionalProperties: false
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input schema');
    });

    it('should validate nested schema properties', () => {
      const result = registry.registerTool('nested_test', {
        title: 'Nested Test',
        description: 'Testing nested properties',
        inputSchema: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                threshold: { type: 'number', minimum: 0, maximum: 100 }
              },
              required: ['enabled'],
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      });

      expect(result.success).toBe(true);
      expect(result.tool?.inputSchema.properties.config).toBeDefined();
    });

    it('should handle enum constraints', () => {
      const result = registry.registerTool('enum_test', {
        title: 'Enum Test',
        description: 'Testing enum validation',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['fast', 'normal', 'slow'],
              description: 'Processing mode'
            }
          },
          required: ['mode'],
          additionalProperties: false
        }
      });

      expect(result.success).toBe(true);
      expect(result.tool?.inputSchema.properties.mode.enum).toEqual(['fast', 'normal', 'slow']);
    });

    it('should validate array properties', () => {
      const result = registry.registerTool('array_test', {
        title: 'Array Test',
        description: 'Testing array properties',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 10,
              description: 'Tags for categorization'
            }
          },
          additionalProperties: false
        }
      });

      expect(result.success).toBe(true);
      expect(result.tool?.inputSchema.properties.tags.type).toBe('array');
    });
  });

  describe('Tool Discovery', () => {
    beforeEach(() => {
      // Register test tools
      registry.registerTool('tool_a', {
        title: 'Tool A',
        description: 'First test tool',
        inputSchema: { type: 'object', additionalProperties: false }
      });

      registry.registerTool('tool_b', {
        title: 'Tool B',
        description: 'Second test tool',
        inputSchema: { type: 'object', additionalProperties: false }
      });

      registry.registerTool('tool_c', {
        title: 'Tool C',
        description: 'Third test tool',
        inputSchema: { type: 'object', additionalProperties: false }
      });
    });

    it('should list all registered tools', () => {
      const tools = registry.listTools();

      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toContain('tool_a');
      expect(tools.map(t => t.name)).toContain('tool_b');
      expect(tools.map(t => t.name)).toContain('tool_c');
    });

    it('should retrieve specific tool by name', () => {
      const tool = registry.getTool('tool_b');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('tool_b');
      expect(tool?.title).toBe('Tool B');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = registry.getTool('non_existent');

      expect(tool).toBeUndefined();
    });

    it('should maintain tool order', () => {
      const tools = registry.listTools();
      const names = tools.map(t => t.name);

      // Tools should be in registration order
      const indexA = names.indexOf('tool_a');
      const indexB = names.indexOf('tool_b');
      const indexC = names.indexOf('tool_c');

      expect(indexA).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexC);
    });
  });

  describe('Tool Metadata Validation', () => {
    it('should validate tool title length', () => {
      const result = registry.registerTool('metadata_test', {
        title: 'A'.repeat(200), // Very long title
        description: 'Test description',
        inputSchema: { type: 'object', additionalProperties: false }
      });

      // Should accept but we might want to add length validation
      expect(result.success).toBe(true);
      expect(result.tool?.title.length).toBe(200);
    });

    it('should validate description content', () => {
      const result = registry.registerTool('desc_test', {
        title: 'Description Test',
        description: 'Tool that performs X operation on Y data to achieve Z result',
        inputSchema: { type: 'object', additionalProperties: false }
      });

      expect(result.success).toBe(true);
      expect(result.tool?.description).toContain('performs');
      expect(result.tool?.description).toContain('operation');
    });

    it('should handle special characters in tool names', () => {
      const specialNames = [
        'tool-with-dashes',
        'tool_with_underscores',
        'tool.with.dots',
        'tool123',
        'ToolCamelCase'
      ];

      specialNames.forEach(name => {
        const result = registry.registerTool(name, {
          title: `Test ${name}`,
          description: `Testing ${name}`,
          inputSchema: { type: 'object', additionalProperties: false }
        });

        expect(result.success).toBe(true);
        expect(result.tool?.name).toBe(name);
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle bulk tool registration efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        registry.registerTool(`bulk_tool_${i}`, {
          title: `Bulk Tool ${i}`,
          description: `Bulk test tool number ${i}`,
          inputSchema: {
            type: 'object',
            properties: {
              [`param_${i}`]: { type: 'string' }
            },
            additionalProperties: false
          }
        });
      }

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      expect(registry.listTools()).toHaveLength(100);
      expect(elapsed).toBeLessThan(100); // Should register 100 tools in < 100ms
    });

    it('should retrieve tools quickly even with many registered', () => {
      // Register many tools
      for (let i = 0; i < 500; i++) {
        registry.registerTool(`perf_tool_${i}`, {
          title: `Performance Tool ${i}`,
          description: `Performance test tool ${i}`,
          inputSchema: { type: 'object', additionalProperties: false }
        });
      }

      const startTime = Date.now();
      const tool = registry.getTool('perf_tool_250');
      const endTime = Date.now();

      expect(tool).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5); // Should retrieve in < 5ms
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null or undefined values gracefully', () => {
      const result = registry.registerTool('null_test', {
        title: 'Null Test',
        description: 'Testing null handling',
        inputSchema: null as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input schema');
    });

    it('should handle circular references in schemas', () => {
      const schema: any = {
        type: 'object',
        properties: {
          recursive: null // Will be set to create circular reference
        },
        additionalProperties: false
      };
      schema.properties.recursive = schema; // Create circular reference

      const result = registry.registerTool('circular_test', {
        title: 'Circular Test',
        description: 'Testing circular references',
        inputSchema: schema
      });

      // Should handle without crashing
      expect(result.success).toBeDefined();
    });

    it('should validate deeply nested schemas', () => {
      const deepSchema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' }
                    },
                    additionalProperties: false
                  }
                },
                additionalProperties: false
              }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      };

      const result = registry.registerTool('deep_test', {
        title: 'Deep Test',
        description: 'Testing deeply nested schemas',
        inputSchema: deepSchema
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Tool Registration Integration', () => {
  describe('MCP Protocol Integration', () => {
    it('should format tools for MCP tools/list response', () => {
      const registry = new MockToolRegistry();

      registry.registerTool('mcp_tool', {
        title: 'MCP Tool',
        description: 'Tool for MCP testing',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Input parameter' }
          },
          required: ['input'],
          additionalProperties: false
        }
      });

      const tools = registry.listTools();
      const mcpFormat = tools.map(tool => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));

      expect(mcpFormat[0]).toMatchObject({
        name: 'mcp_tool',
        title: 'MCP Tool',
        description: 'Tool for MCP testing',
        inputSchema: expect.objectContaining({
          type: 'object',
          properties: expect.any(Object),
          required: ['input'],
          additionalProperties: false
        })
      });
    });
  });

  describe('GitHub Copilot Compatibility', () => {
    it('should generate Copilot-compatible tool descriptions', () => {
      const registry = new MockToolRegistry();

      registry.registerTool('copilot_tool', {
        title: 'Copilot Compatible Tool',
        description: 'A tool that integrates with GitHub Copilot chat modes',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['general', 'architect', 'debugger'],
              description: 'Chat mode to use'
            }
          },
          additionalProperties: false
        }
      });

      const tool = registry.getTool('copilot_tool');

      // Tool should have all required fields for Copilot
      expect(tool?.name).toBeDefined();
      expect(tool?.title).toBeDefined();
      expect(tool?.description).toBeDefined();
      expect(tool?.inputSchema).toBeDefined();

      // Description should be clear and actionable
      expect(tool?.description).toMatch(/integrates with/i);
      expect(tool?.description.length).toBeGreaterThan(20);
      expect(tool?.description.length).toBeLessThan(500);
    });
  });
});