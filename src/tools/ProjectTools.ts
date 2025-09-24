/**
 * Enhanced Project Tools with MCP Decorator Registration
 *
 * Implements project initialization and context generation
 * Following official MCP patterns for GitHub Copilot integration
 */

import { z } from 'zod';
import { MCPTool, TOOL_CATEGORIES, TOOL_PERMISSIONS } from '../server/MCPToolDecorator.js';
import { ProjectInitializer } from '../project/ProjectInitializer.js';
import type { ToolExecutionContext } from '../types/index.js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Project Tools for automatic project initialization
 */
export class ProjectTools {
  private projectInitializer: ProjectInitializer;

  constructor() {
    this.projectInitializer = new ProjectInitializer();
  }

  /**
   * Initialize project with comprehensive context generation
   */
  @MCPTool({
    name: 'init_project_enhanced',
    title: 'Initialize Project (Enhanced)',
    description: 'Initialize project with dual context generation: COPILOT.md (root) and .github/copilot-instructions.md (GitHub Copilot native), plus unified memory integration',
    category: TOOL_CATEGORIES.PROJECT,
    permissions: [TOOL_PERMISSIONS.READ_FILES, TOOL_PERMISSIONS.WRITE_FILES, TOOL_PERMISSIONS.WORKSPACE_MODIFY],
    rateLimit: 2, // Limited to prevent abuse
    requiresConfirmation: true, // Requires user confirmation for file creation
    inputSchema: {
      project_path: z.string().describe('Path to the project directory to initialize'),
      force: z.boolean().optional().describe('Force overwrite existing files (default: false)'),
      context_type: z.enum(['minimal', 'standard', 'comprehensive']).optional().describe('Level of context generation (default: standard)')
    }
  })
  async initProjectEnhanced({
    project_path,
    force,
    context_type
  }: {
    project_path: string;
    force?: boolean;
    context_type?: 'minimal' | 'standard' | 'comprehensive';
  }, context: ToolExecutionContext) {
    try {
      const resolvedPath = path.resolve(project_path);

      // Validate project directory exists
      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ Project directory does not exist: ${resolvedPath}\n\nPlease create the directory first or verify the path.`
          }],
          isError: true
        };
      }

      // Check if project is already initialized
      const copilotMdPath = path.join(resolvedPath, 'COPILOT.md');
      const githubInstructionsPath = path.join(resolvedPath, '.github', 'copilot-instructions.md');

      if ((fs.existsSync(copilotMdPath) || fs.existsSync(githubInstructionsPath)) && !force) {
        return {
          content: [{
            type: 'text' as const,
            text: `⚠️ Project appears to be already initialized.\n\nExisting files:\n${fs.existsSync(copilotMdPath) ? '- COPILOT.md\n' : ''}${fs.existsSync(githubInstructionsPath) ? '- .github/copilot-instructions.md\n' : ''}\nUse force=true to overwrite.`
          }]
        };
      }

      // Initialize project with enhanced context
      const result = await this.projectInitializer.initializeProject(resolvedPath, {
        contextLevel: context_type || 'standard',
        generateDualContext: true,
        storeInUnifiedMemory: true,
        force: force || false
      });

      // Format success message
      const createdFiles = [];
      if (result.copilotMdCreated) createdFiles.push('✅ COPILOT.md (root-level context)');
      if (result.githubInstructionsCreated) createdFiles.push('✅ .github/copilot-instructions.md (GitHub Copilot native)');
      if (result.memoryStored) createdFiles.push('✅ Project context stored in unified memory');

      return {
        content: [{
          type: 'text' as const,
          text: `🚀 **Project Initialization Complete!**

**Project:** ${path.basename(resolvedPath)}
**Path:** ${resolvedPath}
**Context Level:** ${context_type || 'standard'}

**Files Created:**
${createdFiles.join('\n')}

**Project Analysis:**
- **Type:** ${result.projectType}
- **Framework:** ${result.framework || 'None detected'}
- **Languages:** ${result.languages.join(', ') || 'None detected'}
- **Package Manager:** ${result.packageManager || 'None detected'}

**Memory Integration:**
- Project context stored in unified memory system
- Available for cross-session retrieval
- Searchable by project name and technologies

**Next Steps:**
1. Review the generated COPILOT.md file
2. Customize GitHub Copilot instructions in .github/copilot-instructions.md
3. Commit files to version control
4. Start using GitHub Copilot with enhanced context awareness

The project is now ready for AI-assisted development! 🎯`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to initialize project: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Analyze existing project structure and generate context
   */
  @MCPTool({
    name: 'analyze_project_context',
    title: 'Analyze Project Context',
    description: 'Analyze existing project structure to understand technologies, patterns, and generate contextual information for AI assistance',
    category: TOOL_CATEGORIES.ANALYSIS,
    permissions: [TOOL_PERMISSIONS.READ_FILES],
    rateLimit: 5,
    inputSchema: {
      project_path: z.string().describe('Path to the project directory to analyze'),
      depth: z.enum(['shallow', 'medium', 'deep']).optional().describe('Analysis depth (default: medium)'),
      include_dependencies: z.boolean().optional().describe('Include dependency analysis (default: true)')
    }
  })
  async analyzeProjectContext({
    project_path,
    depth,
    include_dependencies
  }: {
    project_path: string;
    depth?: 'shallow' | 'medium' | 'deep';
    include_dependencies?: boolean;
  }, context: ToolExecutionContext) {
    try {
      const resolvedPath = path.resolve(project_path);

      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ Project directory does not exist: ${resolvedPath}`
          }],
          isError: true
        };
      }

      // Perform project analysis
      const analysis = await this.projectInitializer.analyzeProject(resolvedPath, {
        analysisDepth: depth || 'medium',
        includeDependencies: include_dependencies !== false,
        generateSummary: true
      });

      // Format analysis results
      const dependenciesText = analysis.dependencies.length > 0
        ? `\n**Key Dependencies:**\n${analysis.dependencies.slice(0, 10).map(dep => `- ${dep.name} (${dep.version})`).join('\n')}`
        : '';

      const architectureText = analysis.architecture
        ? `\n**Architecture Patterns:**\n${analysis.architecture.patterns.map(p => `- ${p}`).join('\n')}`
        : '';

      return {
        content: [{
          type: 'text' as const,
          text: `📊 **Project Analysis Results**

**Project:** ${path.basename(resolvedPath)}
**Path:** ${resolvedPath}

**Technology Stack:**
- **Type:** ${analysis.projectType}
- **Primary Language:** ${analysis.primaryLanguage}
- **Framework:** ${analysis.framework || 'None detected'}
- **Languages:** ${analysis.languages.join(', ')}
- **Package Manager:** ${analysis.packageManager || 'None detected'}

**Project Structure:**
- **Source Directories:** ${analysis.sourceDirectories.join(', ') || 'None'}
- **Test Directories:** ${analysis.testDirectories.join(', ') || 'None'}
- **Config Files:** ${analysis.configFiles.length} detected
- **Documentation:** ${analysis.documentationFiles.length} files

${dependenciesText}

${architectureText}

**Complexity Metrics:**
- **File Count:** ${analysis.fileCount}
- **Code Complexity:** ${analysis.complexity || 'Not calculated'}
- **Maintainability:** ${analysis.maintainability || 'Not assessed'}

**AI Assistant Recommendations:**
${analysis.recommendations ? analysis.recommendations.map(rec => `- ${rec}`).join('\n') : '- No specific recommendations'}

**Context Generation:**
This analysis can be used to generate enhanced COPILOT.md and GitHub Copilot instructions for better AI assistance.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to analyze project: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Generate context files for existing projects
   */
  @MCPTool({
    name: 'generate_project_context',
    title: 'Generate Project Context Files',
    description: 'Generate COPILOT.md and .github/copilot-instructions.md for existing projects based on analysis',
    category: TOOL_CATEGORIES.GENERATION,
    permissions: [TOOL_PERMISSIONS.READ_FILES, TOOL_PERMISSIONS.WRITE_FILES],
    rateLimit: 3,
    requiresConfirmation: true,
    inputSchema: {
      project_path: z.string().describe('Path to the project directory'),
      context_style: z.enum(['concise', 'detailed', 'comprehensive']).optional().describe('Context file style (default: detailed)'),
      overwrite: z.boolean().optional().describe('Overwrite existing context files (default: false)')
    }
  })
  async generateProjectContext({
    project_path,
    context_style,
    overwrite
  }: {
    project_path: string;
    context_style?: 'concise' | 'detailed' | 'comprehensive';
    overwrite?: boolean;
  }, context: ToolExecutionContext) {
    try {
      const resolvedPath = path.resolve(project_path);

      // Generate context files based on analysis
      const result = await this.projectInitializer.generateContextFiles(resolvedPath, {
        style: context_style || 'detailed',
        overwrite: overwrite || false,
        includeBothFormats: true
      });

      const generatedFiles = [];
      if (result.copilotMd) generatedFiles.push('✅ COPILOT.md');
      if (result.githubInstructions) generatedFiles.push('✅ .github/copilot-instructions.md');

      return {
        content: [{
          type: 'text' as const,
          text: `📝 **Context Files Generated Successfully!**

**Project:** ${path.basename(resolvedPath)}
**Style:** ${context_style || 'detailed'}

**Files Generated:**
${generatedFiles.join('\n')}

**Content Summary:**
- Project overview and architecture
- Technology stack documentation
- Development guidelines
- AI assistant instructions
- Code patterns and conventions

**GitHub Copilot Integration:**
The generated .github/copilot-instructions.md file will be automatically recognized by GitHub Copilot Chat, providing enhanced context awareness for your development workflow.

**Next Steps:**
1. Review and customize the generated files
2. Commit to version control
3. Start using GitHub Copilot with enhanced project context`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to generate project context: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Update project context with new information
   */
  @MCPTool({
    name: 'update_project_context',
    title: 'Update Project Context',
    description: 'Update existing project context files with new information, maintaining version history',
    category: TOOL_CATEGORIES.PROJECT,
    permissions: [TOOL_PERMISSIONS.READ_FILES, TOOL_PERMISSIONS.WRITE_FILES],
    rateLimit: 5,
    inputSchema: {
      project_path: z.string().describe('Path to the project directory'),
      update_type: z.enum(['dependencies', 'architecture', 'guidelines', 'full']).describe('Type of update to perform'),
      backup: z.boolean().optional().describe('Create backup of existing files (default: true)')
    }
  })
  async updateProjectContext({
    project_path,
    update_type,
    backup
  }: {
    project_path: string;
    update_type: 'dependencies' | 'architecture' | 'guidelines' | 'full';
    backup?: boolean;
  }, context: ToolExecutionContext) {
    try {
      const resolvedPath = path.resolve(project_path);

      const result = await this.projectInitializer.updateContextFiles(resolvedPath, {
        updateType: update_type,
        createBackup: backup !== false,
        timestamp: new Date().toISOString()
      });

      return {
        content: [{
          type: 'text' as const,
          text: `🔄 **Project Context Updated Successfully!**

**Project:** ${path.basename(resolvedPath)}
**Update Type:** ${update_type}
**Backup Created:** ${result.backupCreated ? 'Yes' : 'No'}

**Files Updated:**
${result.updatedFiles.map(file => `✅ ${file}`).join('\n')}

**Changes Made:**
${result.changes.map(change => `- ${change}`).join('\n')}

**Version History:**
Context files maintain version history for tracking changes over time.

The updated context will be available immediately for GitHub Copilot integration.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Failed to update project context: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
}