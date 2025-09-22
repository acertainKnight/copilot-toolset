#!/usr/bin/env node

/**
 * Workspace Setup Script for Copilot MCP Toolset
 *
 * This script initializes a workspace with the necessary configuration
 * for the Copilot MCP Toolset to work with VS Code and GitHub Copilot.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

class WorkspaceSetup {
  constructor() {
    this.workspaceRoot = process.env.COPILOT_MCP_WORKSPACE || process.cwd();
    this.isWindows = process.platform === 'win32';
    this.appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    this.localAppDataPath = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  }

  async createDirectories() {
    const directories = [
      // Global directories
      path.join(this.appDataPath, 'CopilotMCP'),
      path.join(this.appDataPath, 'CopilotMCP', 'modes'),
      path.join(this.appDataPath, 'CopilotMCP', 'user'),
      path.join(this.appDataPath, 'CopilotMCP', 'logs'),
      path.join(this.localAppDataPath, 'CopilotMCP', 'cache'),

      // Workspace directories
      path.join(this.workspaceRoot, '.copilot'),
      path.join(this.workspaceRoot, '.copilot', 'memory'),
      path.join(this.workspaceRoot, '.copilot', 'modes'),
      path.join(this.workspaceRoot, '.copilot', 'temp'),
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✓ Created directory: ${dir}`);
      } catch (error) {
        console.error(`✗ Failed to create directory ${dir}:`, error.message);
      }
    }
  }

  async createMemoryFiles() {
    const memoryPath = path.join(this.workspaceRoot, '.copilot', 'memory');
    const memoryFiles = [
      {
        name: 'activeContext.md',
        content: `# Active Context

This file contains the current active context for the project.

## Current Focus
- No specific focus set

## Active Files
- None

## Recent Changes
- Project initialized

---
*This file is automatically managed by Copilot MCP Toolset*
`
      },
      {
        name: 'decisionLog.md',
        content: `# Decision Log

This file tracks important architectural and implementation decisions.

## Decision Template
\`\`\`markdown
### Decision: [Title]
**Date**: YYYY-MM-DD
**Status**: [Proposed/Accepted/Rejected/Superseded]
**Context**: What led to this decision?
**Decision**: What was decided?
**Consequences**: What are the implications?
\`\`\`

## Decisions

### Decision: Initialize Copilot MCP Toolset
**Date**: ${new Date().toISOString().split('T')[0]}
**Status**: Accepted
**Context**: Setting up MCP toolset for enhanced GitHub Copilot integration
**Decision**: Use Copilot MCP Toolset with memory system and custom modes
**Consequences**: Improved context awareness and project-specific AI assistance

---
*This file is automatically managed by Copilot MCP Toolset*
`
      },
      {
        name: 'productContext.md',
        content: `# Product Context

This file contains information about the product/project goals and context.

## Project Overview
- **Name**: ${path.basename(this.workspaceRoot)}
- **Type**: To be determined
- **Stage**: Development
- **Team Size**: Unknown

## Goals
- [ ] Define project goals
- [ ] Set up development environment
- [ ] Implement core features

## Key Features
- To be defined based on project analysis

## Target Users
- To be defined

## Success Metrics
- To be defined

---
*This file is automatically managed by Copilot MCP Toolset*
`
      },
      {
        name: 'progress.md',
        content: `# Progress Tracking

This file tracks the progress of development tasks and milestones.

## Current Sprint/Iteration
**Focus**: Project setup and initialization

## Completed Tasks
- [x] Initialize Copilot MCP Toolset
- [x] Set up workspace structure
- [x] Create memory system files

## In Progress
- [ ] Analyze project structure
- [ ] Generate project context files

## Upcoming
- [ ] Configure custom chat modes
- [ ] Set up memory preferences
- [ ] Initialize project-specific tools

## Blockers
- None identified

---
*This file is automatically managed by Copilot MCP Toolset*
`
      },
      {
        name: 'systemPatterns.md',
        content: `# System Patterns

This file documents recurring patterns, conventions, and architectural decisions.

## Code Patterns
- To be identified through project analysis

## Naming Conventions
- To be extracted from existing code

## File Organization
- To be documented based on project structure

## Dependencies
- To be analyzed and documented

## Architectural Patterns
- To be identified and documented

---
*This file is automatically managed by Copilot MCP Toolset*
`
      },
      {
        name: 'userPreferences.json',
        content: JSON.stringify({
          codingStyle: {
            language: "typescript",
            formatting: {
              semicolons: true,
              quotes: "single",
              trailingCommas: true,
              tabSize: 2
            },
            patterns: {
              preferFunctional: true,
              useTypeScript: true,
              preferArrowFunctions: true
            }
          },
          tools: {
            preferred: [],
            disabled: []
          },
          memory: {
            autoStore: true,
            layers: {
              userPreferences: true,
              projectContext: true,
              selfHealing: true
            }
          },
          modes: {
            default: "general",
            favorites: []
          },
          notifications: {
            enabled: true,
            level: "info"
          },
          lastUpdated: new Date().toISOString()
        }, null, 2)
      }
    ];

    for (const file of memoryFiles) {
      const filePath = path.join(memoryPath, file.name);
      try {
        // Check if file already exists
        await fs.access(filePath);
        console.log(`- File already exists: ${file.name}`);
      } catch {
        // File doesn't exist, create it
        await fs.writeFile(filePath, file.content);
        console.log(`✓ Created memory file: ${file.name}`);
      }
    }
  }

  async createVSCodeConfig() {
    const vscodeDir = path.join(this.workspaceRoot, '.vscode');

    // Check if mcp.json already exists
    const mcpConfigPath = path.join(vscodeDir, 'mcp.json');
    try {
      await fs.access(mcpConfigPath);
      console.log('- MCP configuration already exists');
    } catch {
      console.log('- MCP configuration not found in workspace .vscode directory');
      console.log('- Please ensure mcp.json is configured in your .vscode directory');
    }
  }

  async createGitIgnore() {
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    const mcpIgnoreRules = `

# Copilot MCP Toolset
.copilot/temp/
.copilot/logs/
.copilot/*.log
.copilot/memory/*.tmp
storage/cache/
storage/logs/
*.mcp.log
`;

    try {
      const existingContent = await fs.readFile(gitignorePath, 'utf8');
      if (!existingContent.includes('# Copilot MCP Toolset')) {
        await fs.appendFile(gitignorePath, mcpIgnoreRules);
        console.log('✓ Added MCP ignore rules to .gitignore');
      } else {
        console.log('- MCP ignore rules already in .gitignore');
      }
    } catch {
      // .gitignore doesn't exist, create it
      await fs.writeFile(gitignorePath, `# Copilot MCP Toolset generated .gitignore${mcpIgnoreRules}`);
      console.log('✓ Created .gitignore with MCP rules');
    }
  }

  async checkDependencies() {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    try {
      await fs.access(packageJsonPath);
      console.log('✓ package.json found');

      // Check if MCP toolset is properly built
      const distPath = path.join(this.workspaceRoot, 'dist', 'server', 'index.js');
      try {
        await fs.access(distPath);
        console.log('✓ MCP server built and ready');
      } catch {
        console.log('⚠ MCP server not built. Run "npm run build" to build the server');
      }
    } catch {
      console.log('⚠ No package.json found in workspace');
    }
  }

  async displaySummary() {
    console.log('\\n' + '='.repeat(60));
    console.log('COPILOT MCP TOOLSET WORKSPACE SETUP COMPLETE');
    console.log('='.repeat(60));

    console.log('\\nStorage Paths:');
    console.log(`  Global Config: ${path.join(this.appDataPath, 'CopilotMCP')}`);
    console.log(`  Cache: ${path.join(this.localAppDataPath, 'CopilotMCP', 'cache')}`);
    console.log(`  Workspace Memory: ${path.join(this.workspaceRoot, '.copilot', 'memory')}`);

    console.log('\\nNext Steps:');
    console.log('  1. Ensure VS Code has the GitHub Copilot extension installed');
    console.log('  2. Configure .vscode/mcp.json if not already done');
    console.log('  3. Run "npm run build" to build the MCP server');
    console.log('  4. Use Ctrl+Shift+P → "Initialize Project Context" to analyze your project');
    console.log('  5. Start using GitHub Copilot with enhanced MCP tools!');

    console.log('\\nAvailable VS Code Tasks:');
    console.log('  - Start MCP Server');
    console.log('  - Start MCP Server (Development)');
    console.log('  - Test MCP Tools');
    console.log('  - MCP Inspector');
    console.log('  - Setup All Windows Paths');

    console.log('\\nFor help: https://github.com/copilot-mcp/toolset#readme');
    console.log('='.repeat(60));
  }

  async run() {
    console.log('Setting up Copilot MCP Toolset workspace...');
    console.log(`Workspace: ${this.workspaceRoot}`);
    console.log(`Platform: ${this.isWindows ? 'Windows' : 'Unix'}`);
    console.log('');

    try {
      await this.createDirectories();
      console.log('');
      await this.createMemoryFiles();
      console.log('');
      await this.createVSCodeConfig();
      console.log('');
      await this.createGitIgnore();
      console.log('');
      await this.checkDependencies();
      console.log('');
      await this.displaySummary();

      process.exit(0);
    } catch (error) {
      console.error('\\nSetup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new WorkspaceSetup();
  setup.run();
}

module.exports = WorkspaceSetup;