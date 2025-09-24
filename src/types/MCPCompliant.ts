/**
 * MCP-Compliant Type Definitions
 *
 * Based on official MCP specification 2025-06-18 and GitHub Copilot integration requirements
 * https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 * https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-mcp
 */

import { z } from 'zod';

/**
 * MCP Protocol Version (official specification)
 */
export const MCP_PROTOCOL_VERSION = '2025-06-18' as const;

/**
 * MCP JSON-RPC 2.0 Request Schema
 */
export const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.any()).optional()
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;

/**
 * MCP JSON-RPC 2.0 Response Schema
 */
export const MCPResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

export type MCPResponse = z.infer<typeof MCPResponseSchema>;

/**
 * Tool Input Schema (JSON Schema Draft 7 compliant)
 */
export const ToolInputSchemaSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.object({
    type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object']),
    description: z.string(),
    enum: z.array(z.any()).optional(),
    items: z.any().optional(),
    properties: z.record(z.any()).optional(),
    required: z.array(z.string()).optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional()
  })),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional()
});

export type ToolInputSchema = z.infer<typeof ToolInputSchemaSchema>;

/**
 * MCP Tool Definition Schema (official specification)
 */
export const MCPToolDefinitionSchema = z.object({
  name: z.string()
    .min(1)
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Tool name must start with letter and contain only alphanumeric, underscore, or hyphen')
    .describe('Unique tool identifier following MCP naming conventions'),

  title: z.string()
    .min(1)
    .max(100)
    .describe('Human-readable tool title (max 100 characters)'),

  description: z.string()
    .min(10)
    .max(500)
    .describe('Clear, concise tool description (10-500 characters)'),

  inputSchema: ToolInputSchemaSchema
    .describe('JSON Schema Draft 7 compliant input schema'),

  outputSchema: ToolInputSchemaSchema
    .optional()
    .describe('Optional JSON Schema for output validation')
});

export type MCPToolDefinition = z.infer<typeof MCPToolDefinitionSchema>;

/**
 * Tool Content Types (MCP specification)
 */
export const ContentTypeSchema = z.enum([
  'text',
  'image',
  'audio',
  'resource'
]);

export type ContentType = z.infer<typeof ContentTypeSchema>;

/**
 * MCP Tool Result Schema
 */
export const MCPToolResultSchema = z.object({
  content: z.array(z.union([
    // Text content
    z.object({
      type: z.literal('text'),
      text: z.string()
    }),

    // Image content
    z.object({
      type: z.literal('image'),
      data: z.string().describe('Base64 encoded image data'),
      mimeType: z.string().describe('MIME type (e.g., image/png)')
    }),

    // Audio content
    z.object({
      type: z.literal('audio'),
      data: z.string().describe('Base64 encoded audio data'),
      mimeType: z.string().describe('MIME type (e.g., audio/wav)')
    }),

    // Resource reference
    z.object({
      type: z.literal('resource'),
      resource: z.object({
        uri: z.string().describe('Resource URI'),
        name: z.string().optional().describe('Human-readable resource name'),
        description: z.string().optional().describe('Resource description'),
        mimeType: z.string().optional().describe('MIME type if applicable')
      })
    })
  ])).min(1).describe('Array of content items (at least one required)'),

  isError: z.boolean()
    .optional()
    .describe('Whether this result represents an error'),

  structuredContent: z.any()
    .optional()
    .describe('Optional structured data for machine consumption')
});

export type MCPToolResult = z.infer<typeof MCPToolResultSchema>;

/**
 * tools/list method parameters
 */
export const ToolsListParamsSchema = z.object({
  cursor: z.string()
    .optional()
    .describe('Pagination cursor for large tool sets')
}).optional();

export type ToolsListParams = z.infer<typeof ToolsListParamsSchema>;

/**
 * tools/list method result
 */
export const ToolsListResultSchema = z.object({
  tools: z.array(MCPToolDefinitionSchema)
    .max(128)
    .describe('Array of tool definitions (max 128 for VS Code compatibility)'),

  nextCursor: z.string()
    .optional()
    .describe('Cursor for next page of results if available')
});

export type ToolsListResult = z.infer<typeof ToolsListResultSchema>;

/**
 * tools/call method parameters
 */
export const ToolsCallParamsSchema = z.object({
  name: z.string()
    .min(1)
    .describe('Name of the tool to invoke'),

  arguments: z.record(z.any())
    .describe('Tool arguments as key-value pairs')
});

export type ToolsCallParams = z.infer<typeof ToolsCallParamsSchema>;

/**
 * Server capabilities declaration (MCP specification)
 */
export const ServerCapabilitiesSchema = z.object({
  tools: z.object({
    listChanged: z.boolean()
      .optional()
      .describe('Whether server supports tools/list_changed notifications')
  }).optional(),

  resources: z.object({
    subscribe: z.boolean()
      .optional()
      .describe('Whether server supports resource subscriptions'),
    listChanged: z.boolean()
      .optional()
      .describe('Whether server supports resources/list_changed notifications')
  }).optional(),

  prompts: z.object({
    listChanged: z.boolean()
      .optional()
      .describe('Whether server supports prompts/list_changed notifications')
  }).optional(),

  logging: z.object({}).optional().describe('Logging capabilities')
});

export type ServerCapabilities = z.infer<typeof ServerCapabilitiesSchema>;

/**
 * GitHub Copilot specific schemas
 */
export const GitHubCopilotChatModeSchema = z.object({
  name: z.string()
    .min(1)
    .regex(/^[a-z][a-z0-9-_]*$/, 'Chat mode names must be lowercase with hyphens or underscores'),

  description: z.string()
    .min(10)
    .max(200)
    .describe('Clear description for GitHub Copilot UI'),

  tools: z.array(z.string())
    .optional()
    .describe('List of tool names available in this mode'),

  systemPrompt: z.string()
    .min(20)
    .max(2000)
    .describe('System prompt for the chat mode (max 2000 chars for optimal performance)'),

  temperature: z.number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('AI response temperature (0.0-1.0)')
});

export type GitHubCopilotChatMode = z.infer<typeof GitHubCopilotChatModeSchema>;

/**
 * VS Code MCP Server Configuration Schema
 */
export const VSCodeMCPConfigSchema = z.object({
  servers: z.record(z.object({
    type: z.enum(['stdio', 'http', 'sse'])
      .describe('Transport type for MCP communication'),

    command: z.string()
      .optional()
      .describe('Command to execute for stdio transport'),

    args: z.array(z.string())
      .optional()
      .describe('Command line arguments'),

    url: z.string()
      .url()
      .optional()
      .describe('URL for HTTP/SSE transports'),

    env: z.record(z.string())
      .optional()
      .describe('Environment variables'),

    requestInit: z.object({
      headers: z.record(z.string()).optional()
    }).optional()
      .describe('HTTP request initialization for remote servers')
  }))
});

export type VSCodeMCPConfig = z.infer<typeof VSCodeMCPConfigSchema>;

/**
 * Tool Registry Statistics Schema
 */
export const ToolRegistryStatsSchema = z.object({
  totalTools: z.number()
    .min(0)
    .describe('Total number of registered tools'),

  categories: z.record(z.number())
    .describe('Tool count by category'),

  toolsWithRateLimit: z.number()
    .min(0)
    .describe('Number of tools with rate limiting'),

  toolsWithConfirmation: z.number()
    .min(0)
    .describe('Number of tools requiring user confirmation'),

  vsCodeCompliant: z.boolean()
    .describe('Whether tool count is within VS Code limit (128 tools)'),

  mcpProtocolVersion: z.string()
    .default(MCP_PROTOCOL_VERSION)
    .describe('MCP protocol version compliance'),

  lastUpdated: z.date()
    .describe('Last time statistics were updated')
});

export type ToolRegistryStats = z.infer<typeof ToolRegistryStatsSchema>;

/**
 * Error Codes (following JSON-RPC 2.0 and MCP conventions)
 */
export const MCPErrorCodes = {
  // JSON-RPC 2.0 standard errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // MCP-specific errors
  TOOL_NOT_FOUND: -32000,
  TOOL_EXECUTION_ERROR: -32001,
  RESOURCE_NOT_FOUND: -32002,
  PERMISSION_DENIED: -32003,
  RATE_LIMIT_EXCEEDED: -32004,
  VALIDATION_ERROR: -32005,
  CONFIGURATION_ERROR: -32006
} as const;

/**
 * MCP Error Schema
 */
export const MCPErrorSchema = z.object({
  code: z.number()
    .describe('Error code following JSON-RPC 2.0 and MCP conventions'),

  message: z.string()
    .min(1)
    .describe('Human-readable error message'),

  data: z.any()
    .optional()
    .describe('Additional error data (tool name, validation details, etc.)')
});

export type MCPError = z.infer<typeof MCPErrorSchema>;

/**
 * Tool Execution Context for enhanced features
 */
export const ToolExecutionContextSchema = z.object({
  workspacePath: z.string()
    .optional()
    .describe('Current workspace path'),

  user: z.object({
    id: z.string(),
    permissions: z.array(z.string())
  }).optional()
    .describe('User authentication and permissions'),

  rateLimiter: z.any()
    .optional()
    .describe('Rate limiting context'),

  requestId: z.union([z.string(), z.number()])
    .optional()
    .describe('Request ID for tracing'),

  timestamp: z.date()
    .default(() => new Date())
    .describe('Request timestamp')
});

export type ToolExecutionContext = z.infer<typeof ToolExecutionContextSchema>;

/**
 * Validation utilities
 */
export class MCPValidator {
  /**
   * Validate MCP tool definition against official specification
   */
  static validateToolDefinition(tool: unknown): MCPToolDefinition {
    return MCPToolDefinitionSchema.parse(tool);
  }

  /**
   * Validate MCP request format
   */
  static validateRequest(request: unknown): MCPRequest {
    return MCPRequestSchema.parse(request);
  }

  /**
   * Validate tool result format
   */
  static validateToolResult(result: unknown): MCPToolResult {
    return MCPToolResultSchema.parse(result);
  }

  /**
   * Validate VS Code configuration
   */
  static validateVSCodeConfig(config: unknown): VSCodeMCPConfig {
    return VSCodeMCPConfigSchema.parse(config);
  }

  /**
   * Validate GitHub Copilot chat mode
   */
  static validateChatMode(mode: unknown): GitHubCopilotChatMode {
    return GitHubCopilotChatModeSchema.parse(mode);
  }
}

/**
 * Type guards for runtime type checking
 */
export const MCPTypeGuards = {
  isToolDefinition: (value: unknown): value is MCPToolDefinition => {
    try {
      MCPToolDefinitionSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  isToolResult: (value: unknown): value is MCPToolResult => {
    try {
      MCPToolResultSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  isMCPRequest: (value: unknown): value is MCPRequest => {
    try {
      MCPRequestSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Constants for GitHub Copilot integration
 */
export const GITHUB_COPILOT_CONSTANTS = {
  MAX_CHAT_MODE_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_SYSTEM_PROMPT_LENGTH: 2000,
  RECOMMENDED_TEMPERATURE: 0.7,
  CHATMODE_FILE_EXTENSION: '.chatmode.md',
  COPILOT_INSTRUCTIONS_FILE: 'copilot-instructions.md'
} as const;

/**
 * Constants for VS Code integration
 */
export const VSCODE_CONSTANTS = {
  MAX_TOOLS_PER_REQUEST: 128,
  CONFIG_FILE_NAME: 'mcp.json',
  SUPPORTED_TRANSPORTS: ['stdio', 'http', 'sse'] as const,
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RESPONSE_SIZE: 10 * 1024 * 1024 // 10MB
} as const;