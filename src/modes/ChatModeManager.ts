/**
 * Chat Mode Manager - Simple GitHub Copilot chat mode generation
 * Generates .chatmode.md files that GitHub Copilot can use directly
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../types/index.js';

export interface ChatModeRequest {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: string[];
  temperature?: number;
}

/**
 * Simplified ChatModeManager - just generates GitHub Copilot .chatmode.md files
 */
export class ChatModeManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create a GitHub Copilot chat mode file
   */
  async createMode(request: ChatModeRequest): Promise<string> {
    try {
      // Validate basic requirements
      if (!request.name || !request.description || !request.systemPrompt) {
        throw new Error('Name, description, and systemPrompt are required');
      }

      // Create .github/chatmodes directory
      const chatmodesDir = path.join(process.cwd(), '.github', 'chatmodes');
      await fs.mkdir(chatmodesDir, { recursive: true });

      // Generate the .chatmode.md file content
      const content = this.generateChatModeContent(request);

      // Write to file
      const filePath = path.join(chatmodesDir, `${request.name}.chatmode.md`);
      await fs.writeFile(filePath, content);

      this.logger.info('Created GitHub Copilot chat mode', {
        name: request.name,
        filePath: filePath
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
    const builtInModes: ChatModeRequest[] = [
      {
        name: 'architect',
        description: 'System design and architecture planning specialist',
        systemPrompt: `You are a software architecture expert specializing in system design and planning.

Your role is to:
- Analyze existing system architectures and suggest improvements
- Help design scalable and maintainable solutions
- Provide architectural decision guidance
- Document architectural patterns and decisions

Focus on clean architecture principles, SOLID design principles, scalability, performance, security, and technology stack recommendations.

Always consider the project's current state, constraints, and future growth needs.`,
        tools: ['init_project', 'store_memory', 'search_memory'],
        temperature: 0.8
      },
      {
        name: 'debugger',
        description: 'Debug and troubleshoot code issues',
        systemPrompt: `You are an expert debugging specialist focused on identifying and fixing code issues.

Your expertise includes:
- Analyzing error messages and stack traces
- Identifying common bug patterns and root causes
- Suggesting systematic debugging strategies
- Performance issue identification

Approach:
1. Understand the problem context
2. Analyze available error information
3. Suggest systematic debugging steps
4. Provide specific fix recommendations
5. Help prevent similar issues in the future`,
        tools: ['search_memory', 'store_memory'],
        temperature: 0.6
      },
      {
        name: 'refactorer',
        description: 'Code refactoring and optimization specialist',
        systemPrompt: `You are a code refactoring expert focused on improving code quality and maintainability.

Your specializations:
- Code smell identification and elimination
- Refactoring pattern application
- Performance optimization
- Code organization and structure improvement
- Technical debt reduction

Refactoring principles:
- Maintain existing functionality while improving code
- Improve readability and reduce complexity
- Eliminate duplication and follow established patterns
- Enhance testability

Always suggest incremental, safe refactoring steps with clear benefits explained.`,
        tools: ['store_memory', 'search_memory'],
        temperature: 0.7
      },
      {
        name: 'tester',
        description: 'Testing strategy and test creation specialist',
        systemPrompt: `You are a testing expert specializing in test strategy, creation, and automation.

Your focus areas:
- Unit test creation and optimization
- Integration testing strategies
- Test-driven development (TDD) guidance
- Testing framework recommendations
- Test coverage analysis and mock/stub strategies

Testing principles:
- Write clear, maintainable tests with good coverage
- Focus on edge cases and error conditions
- Create meaningful test names and descriptions
- Optimize test execution speed and maintain test independence

Help create comprehensive test suites that catch bugs early and support refactoring.`,
        tools: ['store_memory', 'search_memory'],
        temperature: 0.7
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
  private generateChatModeContent(request: ChatModeRequest): string {
    const tools = request.tools || ['store_memory', 'search_memory'];
    const temperature = request.temperature || 0.7;

    return `---
description: "${request.description}"
tools: [${tools.map(tool => `"${tool}"`).join(', ')}]
mcp: ["copilot-mcp"]
temperature: ${temperature}
---

# ${request.name.charAt(0).toUpperCase() + request.name.slice(1)} Mode

${request.systemPrompt}

## Available MCP Tools

${tools.map(tool => `- **${tool}**: ${this.getToolDescription(tool)}`).join('\n')}

## Usage

This mode is specialized for ${request.description.toLowerCase()}. GitHub Copilot will use this context and the available MCP tools to provide focused assistance in this domain.

---
*Generated by Copilot MCP Toolset*
`;
  }

  /**
   * Simple tool descriptions
   */
  private getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      'init_project': 'Initialize project context and create GitHub Copilot instruction files',
      'store_memory': 'Store information in persistent memory system for future reference',
      'search_memory': 'Search and retrieve information from stored memory',
      'get_memory_stats': 'Get current memory system usage statistics',
    };

    return descriptions[toolName] || 'Specialized MCP tool for enhanced functionality';
  }
}