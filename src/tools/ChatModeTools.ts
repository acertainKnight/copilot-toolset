/**
 * Enhanced Chat Mode Tools with MCP Decorator Registration
 *
 * Implements chat mode management with dual-format support
 * Following GitHub Copilot and VS Code MCP integration patterns
 */

import { z } from 'zod';
import { MCPTool, TOOL_CATEGORIES, TOOL_PERMISSIONS } from '../server/MCPToolDecorator.js';
import { ChatModeManager } from '../modes/ChatModeManager.js';
import type { ToolExecutionContext } from '../types/index.js';

/**
 * Chat Mode Tools for GitHub Copilot integration
 */
export class ChatModeTools {
  private chatModeManager: ChatModeManager;

  constructor() {
    this.chatModeManager = new ChatModeManager();
  }

  /**
   * Create custom chat mode with dual-format support
   */
  @MCPTool({
    name: 'create_chat_mode_enhanced',
    title: 'Create Chat Mode (Enhanced)',
    description: 'Create custom chat mode with dual-format support: internal JSON for MCP operations and GitHub Copilot .chatmode.md format for native integration',
    category: TOOL_CATEGORIES.GENERAL,
    permissions: [TOOL_PERMISSIONS.WRITE_FILES],
    rateLimit: 3,
    requiresConfirmation: true,
    inputSchema: {
      name: z.string().min(1).describe('Mode name (lowercase, no spaces)'),
      description: z.string().min(10).describe('Clear description of the mode purpose'),
      system_prompt: z.string().min(20).describe('System prompt that defines the mode behavior'),
      tools: z.array(z.string()).optional().describe('List of tool names available in this mode'),
      temperature: z.number().min(0).max(1).optional().describe('Temperature for AI responses (0.0-1.0, default: 0.7)')
    }
  })
  async createChatModeEnhanced({
    name,
    description,
    system_prompt,
    tools,
    temperature
  }: {
    name: string;
    description: string;
    system_prompt: string;
    tools?: string[];
    temperature?: number;
  }, context: ToolExecutionContext) {
    try {
      // Validate mode name
      if (!/^[a-z][a-z0-9_-]*$/.test(name)) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ Invalid mode name: "${name}"\n\nMode names must:\n- Start with a lowercase letter\n- Contain only lowercase letters, numbers, hyphens, and underscores\n- No spaces or special characters\n\nExample: "code-reviewer" or "bug_hunter"`
          }],
          isError: true
        };
      }

      // Check if mode already exists
      const existingModes = await this.chatModeManager.listModes();
      if (existingModes.some(mode => mode.name === name)) {
        return {
          content: [{
            type: 'text' as const,
            text: `⚠️ Chat mode "${name}" already exists.\n\nUse a different name or delete the existing mode first.`
          }],
          isError: true
        };
      }

      // Create mode with dual format
      const result = await this.chatModeManager.createMode({
        name,
        description,
        systemPrompt: system_prompt,
        tools: tools || [],
        temperature: temperature || 0.7,
        generateDualFormat: true,
        githubCopilotCompatible: true
      });

      return {
        content: [{
          type: 'text' as const,
          text: `🎯 **Chat Mode Created Successfully!**

**Mode:** ${name}
**Description:** ${description}

**Files Generated:**
✅ Internal JSON: ~/.copilot-mcp/modes/${name}.json
✅ GitHub Copilot: .github/chatmodes/${name}.chatmode.md

**Configuration:**
- **System Prompt:** ${system_prompt.substring(0, 100)}${system_prompt.length > 100 ? '...' : ''}
- **Tools:** ${tools?.join(', ') || 'Default tools'}
- **Temperature:** ${temperature || 0.7}

**GitHub Copilot Integration:**
The .chatmode.md file has been created in your .github/chatmodes/ directory and will be automatically recognized by GitHub Copilot Chat. You can now use "@${name}" in GitHub Copilot Chat to activate this mode.

**Usage:**
1. In GitHub Copilot Chat, type "@${name}"
2. The mode will activate with the custom system prompt
3. Available tools will be scoped to the mode configuration

**Next Steps:**
1. Commit the .github/chatmodes/${name}.chatmode.md file to version control
2. Test the mode in GitHub Copilot Chat
3. Refine the system prompt and tools as needed`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to create chat mode: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * List all available chat modes
   */
  @MCPTool({
    name: 'list_chat_modes',
    title: 'List Chat Modes',
    description: 'List all available chat modes including built-in and custom modes with their descriptions and tools',
    category: TOOL_CATEGORIES.GENERAL,
    permissions: [TOOL_PERMISSIONS.READ_FILES],
    rateLimit: 10,
    inputSchema: {
      include_builtin: z.boolean().optional().describe('Include built-in modes (default: true)'),
      format: z.enum(['summary', 'detailed']).optional().describe('Output format (default: summary)')
    }
  })
  async listChatModes({
    include_builtin,
    format
  }: {
    include_builtin?: boolean;
    format?: 'summary' | 'detailed';
  }, context: ToolExecutionContext) {
    try {
      const modes = await this.chatModeManager.listModes({
        includeBuiltin: include_builtin !== false,
        includeMetadata: format === 'detailed'
      });

      if (modes.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `📝 No chat modes found.\n\nCreate your first custom mode using the create_chat_mode_enhanced tool.`
          }]
        };
      }

      const formatMode = (mode: any) => {
        if (format === 'detailed') {
          return `**${mode.name}** ${mode.isBuiltin ? '(Built-in)' : '(Custom)'}
Description: ${mode.description}
System Prompt: ${mode.systemPrompt.substring(0, 150)}${mode.systemPrompt.length > 150 ? '...' : ''}
Tools: ${mode.tools.join(', ') || 'Default'}
Temperature: ${mode.temperature}
GitHub Copilot: ${mode.githubCopilotCompatible ? '✅ Compatible' : '❌ Not compatible'}`;
        } else {
          return `• **${mode.name}** ${mode.isBuiltin ? '(Built-in)' : '(Custom)'} - ${mode.description}`;
        }
      };

      const builtinModes = modes.filter(mode => mode.isBuiltin);
      const customModes = modes.filter(mode => !mode.isBuiltin);

      let output = `🎯 **Available Chat Modes (${modes.length} total)**\n\n`;

      if (builtinModes.length > 0 && include_builtin !== false) {
        output += `**Built-in Modes (${builtinModes.length}):**\n`;
        output += builtinModes.map(formatMode).join('\n\n');
        output += '\n\n';
      }

      if (customModes.length > 0) {
        output += `**Custom Modes (${customModes.length}):**\n`;
        output += customModes.map(formatMode).join('\n\n');
        output += '\n\n';
      }

      output += `**Usage in GitHub Copilot Chat:**\n`;
      output += `Type "@<mode_name>" to activate any mode in GitHub Copilot Chat.\n\n`;
      output += `**Available Modes for Activation:**\n`;
      output += modes.map(mode => `- @${mode.name}`).join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: output
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to list chat modes: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Update existing chat mode
   */
  @MCPTool({
    name: 'update_chat_mode',
    title: 'Update Chat Mode',
    description: 'Update existing custom chat mode configuration and regenerate GitHub Copilot files',
    category: TOOL_CATEGORIES.GENERAL,
    permissions: [TOOL_PERMISSIONS.READ_FILES, TOOL_PERMISSIONS.WRITE_FILES],
    rateLimit: 3,
    requiresConfirmation: true,
    inputSchema: {
      name: z.string().min(1).describe('Name of the mode to update'),
      description: z.string().optional().describe('New description (optional)'),
      system_prompt: z.string().optional().describe('New system prompt (optional)'),
      tools: z.array(z.string()).optional().describe('New tool list (optional)'),
      temperature: z.number().min(0).max(1).optional().describe('New temperature (optional)')
    }
  })
  async updateChatMode({
    name,
    description,
    system_prompt,
    tools,
    temperature
  }: {
    name: string;
    description?: string;
    system_prompt?: string;
    tools?: string[];
    temperature?: number;
  }, context: ToolExecutionContext) {
    try {
      const result = await this.chatModeManager.updateMode(name, {
        description,
        systemPrompt: system_prompt,
        tools,
        temperature,
        regenerateGithubFormat: true
      });

      const updatedFields = [];
      if (description) updatedFields.push('Description');
      if (system_prompt) updatedFields.push('System Prompt');
      if (tools) updatedFields.push('Tools');
      if (temperature !== undefined) updatedFields.push('Temperature');

      return {
        content: [{
          type: 'text' as const,
          text: `✅ **Chat Mode Updated Successfully!**

**Mode:** ${name}
**Updated Fields:** ${updatedFields.join(', ')}

**Files Updated:**
✅ Internal JSON: ~/.copilot-mcp/modes/${name}.json
✅ GitHub Copilot: .github/chatmodes/${name}.chatmode.md

**Changes Applied:**
${description ? `- Description: ${description}\n` : ''}${system_prompt ? `- System Prompt: ${system_prompt.substring(0, 100)}${system_prompt.length > 100 ? '...' : ''}\n` : ''}${tools ? `- Tools: ${tools.join(', ')}\n` : ''}${temperature !== undefined ? `- Temperature: ${temperature}\n` : ''}

**Next Steps:**
1. Test the updated mode in GitHub Copilot Chat using "@${name}"
2. Commit the updated .github/chatmodes/${name}.chatmode.md file
3. The changes will be available immediately in GitHub Copilot`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to update chat mode: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Delete custom chat mode
   */
  @MCPTool({
    name: 'delete_chat_mode',
    title: 'Delete Chat Mode',
    description: 'Delete custom chat mode and clean up associated files (built-in modes cannot be deleted)',
    category: TOOL_CATEGORIES.GENERAL,
    permissions: [TOOL_PERMISSIONS.WRITE_FILES],
    rateLimit: 2,
    requiresConfirmation: true,
    inputSchema: {
      name: z.string().min(1).describe('Name of the mode to delete'),
      confirm: z.boolean().describe('Confirmation flag - must be true to proceed with deletion')
    }
  })
  async deleteChatMode({
    name,
    confirm
  }: {
    name: string;
    confirm: boolean;
  }, context: ToolExecutionContext) {
    try {
      if (!confirm) {
        return {
          content: [{
            type: 'text' as const,
            text: `⚠️ Deletion not confirmed.\n\nTo delete the "${name}" mode, set confirm=true.\n\nThis action cannot be undone.`
          }],
          isError: true
        };
      }

      const result = await this.chatModeManager.deleteMode(name);

      return {
        content: [{
          type: 'text' as const,
          text: `🗑️ **Chat Mode Deleted Successfully!**

**Mode:** ${name}

**Files Removed:**
✅ Internal JSON: ~/.copilot-mcp/modes/${name}.json
✅ GitHub Copilot: .github/chatmodes/${name}.chatmode.md

**Cleanup Complete:**
- Mode configuration removed from internal storage
- GitHub Copilot chatmode file deleted
- Mode is no longer available for activation

**Note:**
If you have committed the .github/chatmodes/${name}.chatmode.md file to version control, you may want to commit the deletion as well to keep your repository clean.

The "@${name}" command will no longer work in GitHub Copilot Chat.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to delete chat mode: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Validate chat mode GitHub Copilot compatibility
   */
  @MCPTool({
    name: 'validate_chat_mode_compatibility',
    title: 'Validate Chat Mode Compatibility',
    description: 'Validate chat mode configuration for GitHub Copilot compatibility and suggest improvements',
    category: TOOL_CATEGORIES.TESTING,
    permissions: [TOOL_PERMISSIONS.READ_FILES],
    rateLimit: 5,
    inputSchema: {
      name: z.string().min(1).describe('Name of the mode to validate'),
      fix_issues: z.boolean().optional().describe('Automatically fix compatibility issues (default: false)')
    }
  })
  async validateChatModeCompatibility({
    name,
    fix_issues
  }: {
    name: string;
    fix_issues?: boolean;
  }, context: ToolExecutionContext) {
    try {
      const validation = await this.chatModeManager.validateMode(name, {
        checkGithubCompatibility: true,
        autoFix: fix_issues || false
      });

      const issuesList = validation.issues.map(issue => `❌ ${issue.message}`).join('\n');
      const suggestionsList = validation.suggestions.map(suggestion => `💡 ${suggestion}`).join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `🔍 **Chat Mode Compatibility Report**

**Mode:** ${name}
**Overall Status:** ${validation.isValid ? '✅ Valid' : '❌ Has Issues'}
**GitHub Copilot Compatible:** ${validation.githubCopilotCompatible ? '✅ Yes' : '❌ No'}

${validation.issues.length > 0 ? `**Issues Found:**\n${issuesList}\n\n` : ''}${validation.suggestions.length > 0 ? `**Suggestions:**\n${suggestionsList}\n\n` : ''}**Validation Details:**
- System Prompt Length: ${validation.systemPromptLength} characters ${validation.systemPromptLength > 2000 ? '(⚠️ Too long)' : '(✅ OK)'}
- Tool Count: ${validation.toolCount} ${validation.toolCount > 20 ? '(⚠️ Many tools)' : '(✅ OK)'}
- Temperature: ${validation.temperature} ${validation.temperature < 0 || validation.temperature > 1 ? '(❌ Invalid range)' : '(✅ OK)'}
- File Format: ${validation.fileFormatValid ? '✅ Valid' : '❌ Invalid'}

${fix_issues && validation.fixesApplied ? `**Fixes Applied:**\n${validation.fixesApplied.map(fix => `✅ ${fix}`).join('\n')}\n\n` : ''}**Recommendations:**
${validation.isValid ? '- Mode is ready for GitHub Copilot integration\n- No changes required' : '- Address the issues above for full compatibility\n- Use fix_issues=true to automatically resolve simple issues'}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to validate chat mode: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
}