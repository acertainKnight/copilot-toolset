/**
 * GitHub Copilot Chat Mode Manager
 * 100% GitHub Copilot standard - generates .chatmode.md files only
 * Supports natural language mode creation with intelligent system prompt generation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../types/index.js';

export interface ChatModeRequest {
  name: string;
  description: string;
  naturalLanguageSpec: string; // What the user wants the mode to do in natural language
  tools?: string[];
  model?: string;
}

/**
 * Pure GitHub Copilot ChatModeManager - generates only .chatmode.md files
 * No dual storage, no JSON files, 100% GitHub Copilot compatible
 */
export class ChatModeManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create a GitHub Copilot chat mode file from natural language specification
   */
  async createMode(request: ChatModeRequest): Promise<string> {
    try {
      // Validate basic requirements
      if (!request.name || !request.description || !request.naturalLanguageSpec) {
        throw new Error('Name, description, and naturalLanguageSpec are required');
      }

      // Generate detailed system prompt from natural language specification
      const systemPrompt = this.generateDetailedSystemPrompt(request);

      // Determine appropriate tools for the mode
      const tools = this.selectToolsForMode(request);

      // Create .github/chatmodes directory (GitHub Copilot standard location)
      const chatmodesDir = path.join(process.cwd(), '.github', 'chatmodes');
      await fs.mkdir(chatmodesDir, { recursive: true });

      // Generate 100% GitHub Copilot compatible .chatmode.md content
      const content = this.generateGitHubCopilotChatMode({
        name: request.name,
        description: request.description,
        systemPrompt,
        tools,
        model: request.model
      });

      // Write ONLY the GitHub Copilot .chatmode.md file
      const filePath = path.join(chatmodesDir, `${request.name}.chatmode.md`);
      await fs.writeFile(filePath, content);

      this.logger.info('Created GitHub Copilot chat mode', {
        name: request.name,
        filePath: filePath,
        tools: tools.length
      });

      return filePath;
    } catch (error) {
      this.logger.error('Failed to create chat mode', error as Error);
      throw error;
    }
  }

  /**
   * List existing chat modes by reading .github/chatmodes directory
   */
  async listModes(): Promise<string[]> {
    try {
      const chatmodesDir = path.join(process.cwd(), '.github', 'chatmodes');

      try {
        const files = await fs.readdir(chatmodesDir);
        return files
          .filter(file => file.endsWith('.chatmode.md'))
          .map(file => path.basename(file, '.chatmode.md'));
      } catch (error) {
        // Directory doesn't exist or is empty
        return [];
      }
    } catch (error) {
      this.logger.error('Failed to list chat modes', error as Error);
      return [];
    }
  }

  /**
   * Generate built-in chat modes for a project
   */
  async generateBuiltInModes(): Promise<void> {
    const builtInModes = [
      {
        name: 'architect',
        description: 'System design and architecture planning specialist',
        naturalLanguageSpec: 'Help me design and plan software architectures, analyze existing systems, recommend architectural patterns, and make architectural decisions with focus on scalability, performance, and maintainability',
        tools: ['codebase', 'search', 'search_unified_memory', 'store_unified_memory', 'init_project'],
        model: 'claude-sonnet-4-20250514'
      },
      {
        name: 'debugger',
        description: 'Debug and troubleshoot code issues',
        naturalLanguageSpec: 'Help me debug code issues, analyze error messages and stack traces, identify root causes, suggest systematic debugging strategies, and provide specific fix recommendations',
        tools: ['codebase', 'search', 'search_unified_memory', 'store_unified_memory'],
        model: 'claude-sonnet-4-20250514'
      },
      {
        name: 'refactorer',
        description: 'Code refactoring and optimization specialist',
        naturalLanguageSpec: 'Help me refactor and optimize code by identifying code smells, suggesting improvements, reducing complexity, improving readability, and maintaining functionality while enhancing code quality',
        tools: ['codebase', 'search', 'search_unified_memory', 'store_unified_memory'],
        model: 'claude-sonnet-4-20250514'
      },
      {
        name: 'tester',
        description: 'Testing strategy and test creation specialist',
        naturalLanguageSpec: 'Help me create comprehensive testing strategies, design unit and integration tests, improve test coverage, select testing frameworks, and establish testing best practices',
        tools: ['codebase', 'search', 'findTestFiles', 'search_unified_memory', 'store_unified_memory'],
        model: 'claude-sonnet-4-20250514'
      },
      {
        name: 'general',
        description: 'Comprehensive coding assistance with full tool access',
        naturalLanguageSpec: 'Provide comprehensive coding assistance across all technologies including code review, architecture guidance, testing strategy, documentation, project organization, and memory management with access to all available tools',
        tools: ['codebase', 'search', 'fetch', 'findTestFiles', 'git', 'search_unified_memory', 'store_unified_memory', 'get_user_preferences', 'curate_context', 'memorize', 'init_project'],
        model: 'claude-sonnet-4-20250514'
      }
    ];

    for (const mode of builtInModes) {
      await this.createMode(mode);
    }

    this.logger.info(`Generated ${builtInModes.length} built-in chat modes`);
  }

  /**
   * Generate the .chatmode.md file content
   */
  /**
   * Generate detailed system prompt from natural language specification
   */
  private generateDetailedSystemPrompt(request: ChatModeRequest): string {
    const spec = request.naturalLanguageSpec.toLowerCase();

    // Analyze the natural language spec to create comprehensive instructions
    let prompt = `You are a specialized AI assistant for ${request.description.toLowerCase()}.

## Your Role and Capabilities

Based on the request: "${request.naturalLanguageSpec}"

You should:`;

    // Add specific capabilities based on keywords in the spec
    if (spec.includes('debug') || spec.includes('troubleshoot') || spec.includes('error')) {
      prompt += `
- Analyze error messages and stack traces systematically
- Identify root causes and common bug patterns
- Suggest step-by-step debugging strategies
- Recommend preventive measures for future issues`;
    }

    if (spec.includes('test') || spec.includes('testing')) {
      prompt += `
- Design comprehensive test strategies and approaches
- Create unit, integration, and end-to-end tests
- Review existing tests for coverage and quality
- Suggest testing best practices and frameworks`;
    }

    if (spec.includes('architect') || spec.includes('design') || spec.includes('system')) {
      prompt += `
- Analyze and design system architectures
- Recommend architectural patterns and best practices
- Evaluate scalability and performance considerations
- Document architectural decisions and trade-offs`;
    }

    if (spec.includes('refactor') || spec.includes('optimize') || spec.includes('improve')) {
      prompt += `
- Identify code smells and improvement opportunities
- Suggest refactoring strategies that maintain functionality
- Optimize performance and reduce complexity
- Improve code readability and maintainability`;
    }

    if (spec.includes('security') || spec.includes('secure')) {
      prompt += `
- Analyze code for security vulnerabilities
- Recommend secure coding practices
- Review authentication and authorization implementations
- Suggest security best practices and compliance measures`;
    }

    // Add general guidelines
    prompt += `

## Working Approach

1. **Understand Context**: Always review the current codebase and project structure
2. **Search Memory**: Use available tools to search for relevant patterns and decisions
3. **Apply Best Practices**: Follow established coding standards and architectural patterns
4. **Document Decisions**: Store important insights and patterns for future reference
5. **Validate Solutions**: Ensure recommendations are practical and maintainable

## Communication Style

- Provide clear, actionable recommendations
- Explain the reasoning behind suggestions
- Offer multiple approaches when appropriate
- Focus on practical, implementable solutions

Always prioritize code quality, maintainability, and alignment with the project's existing patterns and standards.`;

    return prompt;
  }

  /**
   * Select appropriate tools for the mode based on its purpose
   */
  private selectToolsForMode(request: ChatModeRequest): string[] {
    const spec = request.naturalLanguageSpec.toLowerCase();
    const tools: Set<string> = new Set();

    // Core tools always available
    tools.add('codebase');
    tools.add('search');

    // Add memory tools for context
    if (spec.includes('memory') || spec.includes('remember') || spec.includes('store')) {
      tools.add('store_unified_memory');
      tools.add('search_unified_memory');
    }

    // Add project tools for initialization and analysis
    if (spec.includes('project') || spec.includes('init') || spec.includes('setup')) {
      tools.add('init_project');
    }

    // Add user preference tools for personalization
    if (spec.includes('preference') || spec.includes('style') || spec.includes('coding')) {
      tools.add('get_user_preferences');
      tools.add('curate_context');
    }

    // Add permanent instruction tools for learning
    if (spec.includes('learn') || spec.includes('remember') || spec.includes('always')) {
      tools.add('memorize');
    }

    // Add specific tools based on mode purpose
    if (spec.includes('git') || spec.includes('version')) {
      tools.add('git');
    }

    if (spec.includes('test') || spec.includes('testing')) {
      tools.add('findTestFiles');
    }

    if (spec.includes('network') || spec.includes('api') || spec.includes('fetch')) {
      tools.add('fetch');
    }

    // Always provide memory and search capabilities
    tools.add('search_unified_memory');
    tools.add('store_unified_memory');

    return Array.from(tools);
  }

  /**
   * Generate 100% GitHub Copilot compatible .chatmode.md content
   */
  private generateGitHubCopilotChatMode(params: {
    name: string;
    description: string;
    systemPrompt: string;
    tools: string[];
    model?: string;
  }): string {
    // GitHub Copilot standard YAML frontmatter
    let frontmatter = `---
description: ${params.description}
tools: [${params.tools.map(tool => `'${tool}'`).join(', ')}]`;

    // Add model if specified (GitHub Copilot standard)
    if (params.model) {
      frontmatter += `\nmodel: ${params.model}`;
    }

    frontmatter += '\n---';

    // GitHub Copilot standard markdown body
    return `${frontmatter}

# ${params.name.charAt(0).toUpperCase() + params.name.slice(1)} Mode

${params.systemPrompt}

## Available Tools

${params.tools.map(tool => `- **${tool}**: ${this.getStandardToolDescription(tool)}`).join('\n')}

## Usage in GitHub Copilot

To activate this mode in GitHub Copilot Chat:
\`\`\`
@copilot /${params.name} [your request]
\`\`\`

This specialized mode will provide focused assistance for ${params.description.toLowerCase()}.`;
  }

  /**
   * Standard tool descriptions for GitHub Copilot compatibility
   */
  private getStandardToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      // GitHub Copilot built-in tools
      'codebase': 'Search and analyze the codebase',
      'search': 'Search files and content in the workspace',
      'fetch': 'Fetch content from URLs and external resources',
      'findTestFiles': 'Find and analyze test files in the project',
      'git': 'Git version control operations',

      // MCP memory tools (updated names)
      'store_unified_memory': 'Store information in persistent memory system for future reference',
      'search_unified_memory': 'Search and retrieve information from stored memory',
      'get_unified_memory_stats': 'Get current memory system usage statistics',
      'delete_memory': 'Delete memories with optional cascade handling',
      'check_duplicate_memory': 'Check for duplicate memories using semantic similarity',
      'migrate_memory_tier': 'Migrate memories between core and long-term tiers',
      'get_memory_analytics': 'Get comprehensive memory analytics and usage patterns',

      // User preference tools
      'get_user_preferences': 'Load user coding preferences from global memory',
      'extract_coding_preferences': 'Automatically detect and store coding preferences',
      'curate_context': 'Assemble comprehensive context from preferences and project patterns',

      // Permanent instruction tools
      'memorize': 'Add permanent instructions to GitHub Copilot that are ALWAYS remembered',

      // Project tools
      'init_project': 'Initialize project with comprehensive analysis and documentation generation',

      // Legacy tools (deprecated)
      'store_memory': 'Legacy memory storage (use store_unified_memory instead)',
    };

    return descriptions[toolName] || 'Specialized tool for enhanced functionality';
  }
}