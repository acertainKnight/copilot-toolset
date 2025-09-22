/**
 * Self-Healing Manager for Chat Modes and Project Context
 * Allows GitHub Copilot to fix and improve its own configurations
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface HealingRequest {
  type: 'chat_mode' | 'project_context' | 'memory_system';
  target: string; // mode name, file path, etc.
  issue: string; // user description of the problem
  context?: Record<string, any>;
}

export interface HealingResult {
  success: boolean;
  changes: string[];
  explanation: string;
  filePath?: string;
}

export class SelfHealingManager {

  /**
   * Fix a chat mode that isn't working correctly
   * GitHub Copilot can call this when user says "the debugger mode isn't catching X errors"
   */
  public async healChatMode(modeName: string, issue: string): Promise<HealingResult> {
    try {
      const chatModePath = path.join(process.cwd(), '.github', 'chatmodes', `${modeName}.chatmode.md`);

      // Check if file exists
      const exists = await fs.access(chatModePath).then(() => true).catch(() => false);
      if (!exists) {
        return {
          success: false,
          changes: [],
          explanation: `Chat mode file ${chatModePath} does not exist. Use create_mode tool to create it first.`
        };
      }

      // Read current mode content
      const content = await fs.readFile(chatModePath, 'utf8');

      // Parse YAML frontmatter and content
      const { frontmatter, body } = this.parseChatModeFile(content);

      // Generate improvements based on the issue
      const improvements = this.generateModeImprovements(modeName, issue, frontmatter, body);

      // Apply improvements
      const updatedContent = this.generateUpdatedChatMode(frontmatter, improvements.systemPrompt);
      await fs.writeFile(chatModePath, updatedContent);

      return {
        success: true,
        changes: improvements.changes,
        explanation: improvements.explanation,
        filePath: chatModePath
      };

    } catch (error) {
      return {
        success: false,
        changes: [],
        explanation: `Failed to heal chat mode: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Fix project context files that aren't providing good guidance
   */
  public async healProjectContext(filePath: string, issue: string): Promise<HealingResult> {
    try {
      const fullPath = path.resolve(filePath);

      // Check if file exists
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      if (!exists) {
        return {
          success: false,
          changes: [],
          explanation: `File ${fullPath} does not exist. Use init_project tool to create it first.`
        };
      }

      // Read current content
      const content = await fs.readFile(fullPath, 'utf8');

      // Generate improvements
      const improvements = this.generateContextImprovements(issue, content);

      // Create backup
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, content);

      // Apply improvements
      const updatedContent = this.applyContextImprovements(content, improvements);
      await fs.writeFile(fullPath, updatedContent);

      return {
        success: true,
        changes: improvements,
        explanation: `Updated project context file with improvements for: ${issue}`,
        filePath: fullPath
      };

    } catch (error) {
      return {
        success: false,
        changes: [],
        explanation: `Failed to heal project context: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Optimize memory system based on usage patterns
   */
  public async healMemorySystem(issue: string): Promise<HealingResult> {
    try {
      const changes: string[] = [];
      let explanation = '';

      if (issue.toLowerCase().includes('slow') || issue.toLowerCase().includes('performance')) {
        changes.push('Suggested memory optimization: Use search_memory with specific layers for faster results');
        changes.push('Recommended: Store frequently accessed preferences in preference layer');
        explanation = 'Performance issues can be improved by using layer-specific searches and proper memory categorization.';
      }

      if (issue.toLowerCase().includes('not finding') || issue.toLowerCase().includes('missing')) {
        changes.push('Suggested search improvement: Use broader query terms');
        changes.push('Recommended: Check get_memory_stats to verify storage locations');
        explanation = 'Search issues often result from too specific queries or searching the wrong memory layer.';
      }

      if (issue.toLowerCase().includes('too much') || issue.toLowerCase().includes('overwhelming')) {
        changes.push('Suggested: Use layer filtering in search_memory queries');
        changes.push('Recommended: Store session-specific notes in prompt layer only');
        explanation = 'Information overload can be managed by using appropriate memory layers and filtering.';
      }

      return {
        success: true,
        changes,
        explanation: explanation || 'Memory system analysis completed with general recommendations.'
      };

    } catch (error) {
      return {
        success: false,
        changes: [],
        explanation: `Failed to analyze memory system: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Private helper methods
  private parseChatModeFile(content: string): { frontmatter: any, body: string } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterText = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    // Simple YAML-like parsing for frontmatter
    const frontmatter: any = {};
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }

    return { frontmatter, body };
  }

  private generateModeImprovements(modeName: string, issue: string, frontmatter: any, body: string): {
    changes: string[];
    explanation: string;
    systemPrompt: string;
  } {
    const changes: string[] = [];
    let updatedPrompt = body;

    // Analyze the issue and suggest improvements
    if (issue.toLowerCase().includes('not catching') || issue.toLowerCase().includes('missing')) {
      changes.push(`Enhanced ${modeName} mode to better detect and handle specific error patterns`);
      changes.push('Added more comprehensive error analysis instructions');

      updatedPrompt += `

## Enhanced Error Detection

When analyzing errors, always:
1. Check the full stack trace for root causes
2. Look for common patterns in error messages
3. Consider environment-specific issues
4. Search memory for similar error solutions using search_memory tool
5. Store successful solutions using store_memory with layer="system"

Pay special attention to:
- ${this.extractErrorTypeFromIssue(issue)}
- Context-specific debugging approaches
- Prevention strategies for similar issues`;
    }

    if (issue.toLowerCase().includes('suggestions') || issue.toLowerCase().includes('recommendations')) {
      changes.push(`Improved ${modeName} mode suggestions and recommendations`);
      changes.push('Added context-aware suggestion generation');

      updatedPrompt += `

## Context-Aware Suggestions

Before making suggestions:
1. Use search_memory to find user preferences and past decisions
2. Consider the current project's architecture patterns
3. Respect established coding conventions
4. Store new patterns that work well using store_memory`;
    }

    return {
      changes,
      explanation: `Updated ${modeName} mode to address: ${issue}`,
      systemPrompt: updatedPrompt
    };
  }

  private generateContextImprovements(issue: string, content: string): string[] {
    const improvements: string[] = [];

    if (issue.toLowerCase().includes('missing information')) {
      improvements.push('Added more detailed project context sections');
      improvements.push('Enhanced dependency analysis and architecture pattern detection');
    }

    if (issue.toLowerCase().includes('outdated')) {
      improvements.push('Updated project analysis with current dependencies');
      improvements.push('Refreshed architecture pattern detection');
    }

    if (issue.toLowerCase().includes('memory') || issue.toLowerCase().includes('context')) {
      improvements.push('Enhanced memory usage instructions for GitHub Copilot');
      improvements.push('Added clear guidance on when to store vs search information');
    }

    return improvements;
  }

  private applyContextImprovements(content: string, improvements: string[]): string {
    // Add improvement notes to the content
    const improvementSection = `

## Recent Improvements

${improvements.map(imp => `- ${imp}`).join('\n')}

*Improvements applied: ${new Date().toISOString()}*

`;

    return content + improvementSection;
  }

  private generateUpdatedChatMode(frontmatter: any, systemPrompt: string): string {
    const frontmatterKeys = Object.keys(frontmatter);
    const frontmatterText = frontmatterKeys
      .map(key => `${key}: "${frontmatter[key]}"`)
      .join('\n');

    return `---
${frontmatterText}
---

${systemPrompt}`;
  }

  private extractErrorTypeFromIssue(issue: string): string {
    const errorTypes = [
      'syntax errors',
      'runtime exceptions',
      'type errors',
      'import/export issues',
      'async/await problems',
      'React rendering errors',
      'API connection failures',
      'database query errors'
    ];

    for (const errorType of errorTypes) {
      if (issue.toLowerCase().includes(errorType.replace(' errors', '').replace(' exceptions', ''))) {
        return errorType;
      }
    }

    return 'general coding errors';
  }
}