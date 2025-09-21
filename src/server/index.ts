#!/usr/bin/env node

/**
 * Main MCP Server Entry Point - Simplified Implementation
 * Orchestrates the three-tier memory system and project initialization
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { MemoryManager } from '../memory/MemoryManager.js';
import { ProjectInitializer } from '../project/ProjectInitializer.js';
import { ChatModeManager } from '../modes/ChatModeManager.js';
import { SelfHealingManager } from '../utils/SelfHealingManager.js';
import { Logger, StoragePaths, MemoryLayer } from '../types/index.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

interface WorkspaceContext {
  workspacePath: string;
  memoryManager: MemoryManager;
  projectInitializer: ProjectInitializer;
  lastAccessed: Date;
}

interface GlobalConfig {
  server: {
    globalInstance: boolean;
    maxConcurrentProjects: number;
    memoryCleanupInterval: string;
    logLevel: string;
  };
  memory: {
    globalStoragePath: string;
    projectStoragePattern: string;
    sharedMemoryTypes: string[];
    isolatedMemoryTypes: string[];
  };
  modes: {
    globalModes: string[];
    allowCustomModes: boolean;
    modeStoragePath: string;
  };
  performance: {
    resourceLimits: {
      maxMemoryPerWorkspace: string;
      maxConcurrentWorkspaces: number;
      memoryCleanupThreshold: string;
    };
  };
}

interface ServerState {
  globalConfig: GlobalConfig;
  chatModeManager: ChatModeManager;
  selfHealingManager: SelfHealingManager;
  workspaceContexts: Map<string, WorkspaceContext>;
  currentWorkspace?: string;
}

class CopilotMCPServer {
  private server: McpServer;
  private state: ServerState;

  constructor() {
    this.server = new McpServer({
      name: 'copilot-mcp-toolset',
      version: '1.0.0',
    });

    // Load global configuration
    const globalConfig = this.loadGlobalConfig();

    // Create simple logger that uses stderr for all output except MCP protocol
    const logger: Logger = {
      debug: (msg: string) => console.error(`[DEBUG] ${msg}`),
      info: (msg: string) => console.error(`[INFO] ${msg}`),
      warn: (msg: string) => console.error(`[WARN] ${msg}`),
      error: (msg: string, error?: Error) => console.error(`[ERROR] ${msg}`, error)
    };

    // Create global storage paths
    const globalStoragePaths: StoragePaths = {
      root: path.join(os.homedir(), '.copilot-mcp'),
      database: path.join(os.homedir(), '.copilot-mcp', 'memory.db'),
      cache: path.join(os.homedir(), '.copilot-mcp', 'cache'),
      modeDefinitions: path.join(os.homedir(), '.copilot-mcp', 'modes'),
      projectContexts: path.join(os.homedir(), '.copilot-mcp', 'projects'),
      backups: path.join(os.homedir(), '.copilot-mcp', 'backups'),
      logs: path.join(os.homedir(), '.copilot-mcp', 'logs')
    };

    // Initialize global state
    this.state = {
      globalConfig,
      chatModeManager: new ChatModeManager(logger),
      selfHealingManager: new SelfHealingManager(),
      workspaceContexts: new Map(),
    };

    // Parse command line arguments for workspace
    this.parseCommandLineArgs();

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
    this.setupGracefulShutdown();
  }

  private loadGlobalConfig(): GlobalConfig {
    try {
      const configPath = path.join(os.homedir(), '.copilot-mcp', 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error('[WARN] Failed to load global config, using defaults:', error);
    }

    // Default configuration
    return {
      server: {
        globalInstance: true,
        maxConcurrentProjects: 10,
        memoryCleanupInterval: "24h",
        logLevel: "info"
      },
      memory: {
        globalStoragePath: "~/.copilot-mcp/memory/global.db",
        projectStoragePattern: "{{projectRoot}}/.copilot/memory",
        sharedMemoryTypes: ["preferences", "common_patterns"],
        isolatedMemoryTypes: ["project", "prompt", "local_context"]
      },
      modes: {
        globalModes: ["general", "architect", "debugger", "refactorer", "tester"],
        allowCustomModes: true,
        modeStoragePath: "~/.copilot-mcp/modes"
      },
      performance: {
        resourceLimits: {
          maxMemoryPerWorkspace: "50MB",
          maxConcurrentWorkspaces: 10,
          memoryCleanupThreshold: "100MB"
        }
      }
    };
  }

  private parseCommandLineArgs(): void {
    const args = process.argv.slice(2);

    // Handle help command
    if (args.includes('--help') || args.includes('-h')) {
      this.printHelp();
      process.exit(0);
    }

    // Handle version command
    if (args.includes('--version') || args.includes('-v')) {
      this.printVersion();
      process.exit(0);
    }

    // Handle workspace argument
    const workspaceArg = args.find(arg => arg.startsWith('--workspace='));
    if (workspaceArg) {
      const workspacePath = workspaceArg.split('=')[1];
      console.error(`[INFO] Setting initial workspace: ${workspacePath}`);
      this.state.currentWorkspace = workspacePath;
    }
  }

  private printHelp(): void {
    console.log(`
Copilot MCP Toolset Server v1.0.0

USAGE:
    copilot-mcp-server [OPTIONS]

OPTIONS:
    --workspace=<path>    Set the initial workspace path
    --version, -v         Show version information
    --help, -h           Show this help message

DESCRIPTION:
    A standalone MCP server for GitHub Copilot that provides intelligent project
    initialization, custom chat modes, and a persistent three-tier memory system.

MCP INTEGRATION:
    This server implements the Model Context Protocol (MCP) and should be configured
    in VS Code or other MCP clients through their respective configuration files.

TOOLS PROVIDED:
    • init_project        - Initialize project with COPILOT.md files
    • store_memory        - Store information in memory system
    • search_memory       - Search across memory tiers
    • get_memory_stats    - Get memory usage statistics
    • create_mode         - Create custom chat modes
    • list_modes          - List available chat modes
    • activate_mode       - Activate a specific chat mode
    • switch_workspace    - Switch workspace context
    • list_workspaces     - List active workspaces

CONFIGURATION:
    Global config: ~/.copilot-mcp/config.json
    VS Code global: ~/.config/Code/User/mcp.json
    Workspace config: .vscode/mcp.json

For more information, see the documentation or visit:
https://github.com/copilot-mcp/toolset
`);
  }

  private printVersion(): void {
    console.log('copilot-mcp-server 1.0.0');
  }

  private async getOrCreateWorkspaceContext(workspacePath: string): Promise<WorkspaceContext> {
    if (this.state.workspaceContexts.has(workspacePath)) {
      const context = this.state.workspaceContexts.get(workspacePath)!;
      context.lastAccessed = new Date();
      return context;
    }

    // Create new workspace context with project-aware memory manager
    const context: WorkspaceContext = {
      workspacePath,
      memoryManager: new MemoryManager(workspacePath), // Pass project path for context-aware storage
      projectInitializer: new ProjectInitializer(),
      lastAccessed: new Date()
    };

    await context.memoryManager.initialize();

    this.state.workspaceContexts.set(workspacePath, context);

    // Cleanup old contexts if we exceed the limit
    if (this.state.workspaceContexts.size > this.state.globalConfig.performance.resourceLimits.maxConcurrentWorkspaces) {
      await this.cleanupOldestWorkspace();
    }

    return context;
  }

  private async cleanupOldestWorkspace(): Promise<void> {
    let oldestPath = '';
    let oldestTime = new Date();

    for (const [path, context] of this.state.workspaceContexts.entries()) {
      if (context.lastAccessed < oldestTime) {
        oldestTime = context.lastAccessed;
        oldestPath = path;
      }
    }

    if (oldestPath) {
      const context = this.state.workspaceContexts.get(oldestPath);
      if (context) {
        await context.memoryManager.close();
        this.state.workspaceContexts.delete(oldestPath);
        console.error(`[INFO] Cleaned up workspace context for: ${oldestPath}`);
      }
    }
  }

  private getCurrentContext(): WorkspaceContext | null {
    if (this.state.currentWorkspace) {
      return this.state.workspaceContexts.get(this.state.currentWorkspace) || null;
    }
    return null;
  }

  private async initializeAsync(): Promise<void> {
    try {
      // Initialize current workspace if specified
      if (this.state.currentWorkspace) {
        await this.getOrCreateWorkspaceContext(this.state.currentWorkspace);
      }
    } catch (error) {
      console.error('[ERROR] Failed to initialize server components:', error);
    }
  }

  private setupToolHandlers(): void {
    // Register init_project tool
    this.server.registerTool("init_project", {
      title: "Initialize Project",
      description: "Initialize project with COPILOT.md files and memory bank",
      inputSchema: {
        project_path: z.string().describe('Path to the project directory')
      }
    }, async ({ project_path }) => {
      try {
        const result = await this.handleInitProject({ project_path });
        return result;
      } catch (error) {
        console.error(`[ERROR] Tool init_project failed:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error executing init_project: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    // Register store_memory tool with clear guidance
    this.server.registerTool("store_memory", {
      title: "Store Memory",
      description: "Store information in the three-tier memory system (Core→Warm→Cold). Use appropriate layers: 'preference' for global user preferences, 'project' for project-specific context, 'prompt' for session context, 'system' for error solutions and patterns.",
      inputSchema: {
        content: z.string().describe('Content to store - be specific and actionable'),
        layer: z.enum(['preference', 'project', 'prompt', 'system']).describe('Memory layer: preference=global user prefs, project=this project only, prompt=session context, system=error patterns/solutions'),
        tags: z.array(z.string()).optional().describe('Tags for categorization (e.g., ["react", "hooks", "performance"])'),
        metadata: z.record(z.any()).optional().describe('Additional context metadata')
      }
    }, async ({ content, layer, tags, metadata }) => {
      try {
        const context = this.getCurrentContext();
        const memoryManager = context?.memoryManager || new MemoryManager();

        const memoryId = await memoryManager.store(content, layer, tags || [], metadata);
        const storageLocation = this.getStorageLocationDescription(layer);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Memory stored successfully!

ID: ${memoryId}
Layer: ${layer}
Storage: ${storageLocation}
Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}
Tags: ${tags?.join(', ') || 'none'}

This information is now ${layer === 'preference' || layer === 'system' ? 'available globally across all projects' : 'stored for this project only'}.`
            }
          ]
        };
      } catch (error) {
        console.error(`[ERROR] Tool store_memory failed:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error storing memory: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    // Register search_memory tool
    this.server.registerTool("search_memory", {
      title: "Search Memory",
      description: "Search across all memory tiers",
      inputSchema: {
        query: z.string().describe('Search query')
      }
    }, async ({ query }) => {
      try {
        const result = await this.handleSearchMemory({ query });
        return result;
      } catch (error) {
        console.error(`[ERROR] Tool search_memory failed:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error executing search_memory: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    // Register get_memory_stats tool
    this.server.registerTool("get_memory_stats", {
      title: "Get Memory Stats",
      description: "Get memory system statistics",
      inputSchema: {}
    }, async () => {
      try {
        const result = await this.handleGetMemoryStats();
        return result;
      } catch (error) {
        console.error(`[ERROR] Tool get_memory_stats failed:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error executing get_memory_stats: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    // Register create_mode tool - simplified to just generate .chatmode.md files
    this.server.registerTool("create_mode", {
      title: "Create Chat Mode",
      description: "Create a GitHub Copilot chat mode file",
      inputSchema: {
        name: z.string().describe('Name of the chat mode'),
        description: z.string().describe('Description of the chat mode'),
        systemPrompt: z.string().describe('System prompt for the chat mode'),
        tools: z.array(z.string()).optional().describe('MCP tools available to this mode'),
        temperature: z.number().optional().describe('Temperature for the chat mode')
      }
    }, async ({ name, description, systemPrompt, tools, temperature }) => {
      try {
        const filePath = await this.state.chatModeManager.createMode({
          name,
          description,
          systemPrompt,
          tools,
          temperature
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: `Created GitHub Copilot chat mode "${name}" at ${filePath}`
            }
          ]
        };
      } catch (error) {
        console.error(`[ERROR] Tool create_mode failed:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error creating chat mode: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    // Register self-healing tools
    this.server.registerTool("heal_chat_mode", {
      title: "Heal Chat Mode",
      description: "Fix a chat mode that isn't working correctly. Use when user says 'the debugger mode isn't catching X errors' or similar issues.",
      inputSchema: {
        mode_name: z.string().describe('Name of the chat mode to fix'),
        issue: z.string().describe('Description of what is not working correctly')
      }
    }, async ({ mode_name, issue }) => {
      try {
        const result = await this.state.selfHealingManager.healChatMode(mode_name, issue);

        return {
          content: [
            {
              type: 'text' as const,
              text: result.success
                ? `Successfully healed chat mode "${mode_name}"!

Changes made:
${result.changes.map(c => `- ${c}`).join('\n')}

Explanation: ${result.explanation}

Updated file: ${result.filePath || 'N/A'}`
                : `Failed to heal chat mode: ${result.explanation}`
            }
          ],
          isError: !result.success
        };
      } catch (error) {
        console.error(`[ERROR] Tool heal_chat_mode failed:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error healing chat mode: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    this.server.registerTool("heal_project_context", {
      title: "Heal Project Context",
      description: "Fix project context files (COPILOT.md, .github/copilot-instructions.md) that aren't providing good guidance. Use when context files are outdated or missing information.",
      inputSchema: {
        file_path: z.string().describe('Path to the context file to fix (e.g., "COPILOT.md" or ".github/copilot-instructions.md")'),
        issue: z.string().describe('Description of what is wrong with the context file')
      }
    }, async ({ file_path, issue }) => {
      try {
        const result = await this.state.selfHealingManager.healProjectContext(file_path, issue);

        return {
          content: [
            {
              type: 'text' as const,
              text: result.success
                ? `Successfully healed project context file!

File: ${result.filePath}
Changes made:
${result.changes.map(c => `- ${c}`).join('\n')}

Explanation: ${result.explanation}`
                : `Failed to heal project context: ${result.explanation}`
            }
          ],
          isError: !result.success
        };
      } catch (error) {
        console.error(`[ERROR] Tool heal_project_context failed:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error healing project context: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });

    this.server.registerTool("optimize_memory", {
      title: "Optimize Memory System",
      description: "Optimize memory system performance and organization. Use when memory searches are slow or returning too many/few results.",
      inputSchema: {
        issue: z.string().describe('Description of memory system issues (e.g., "searches are slow", "not finding relevant info", "too much clutter")')
      }
    }, async ({ issue }) => {
      try {
        const context = this.getCurrentContext();
        const memoryManager = context?.memoryManager || new MemoryManager();

        // Promote frequently accessed memories
        const promotedCount = await memoryManager.promoteMemories();

        // Get self-healing recommendations
        const healingResult = await this.state.selfHealingManager.healMemorySystem(issue);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Memory system optimization completed!

Promoted ${promotedCount} frequently accessed memories to faster tiers.

Recommendations:
${healingResult.changes.map(c => `- ${c}`).join('\n')}

${healingResult.explanation}

Use get_memory_stats to see current memory organization.`
            }
          ]
        };
      } catch (error) {
        console.error(`[ERROR] Tool optimize_memory failed:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error optimizing memory: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private setupResourceHandlers(): void {
    // Register memory stats resource
    this.server.registerResource("memory://stats", "memory://stats", {
      name: "Memory System Statistics",
      description: "Current statistics and health of the memory system",
      mimeType: "application/json"
    }, async () => {
      try {
        // Use current workspace context or create a default one
        const context = this.getCurrentContext();
        const memoryManager = context?.memoryManager || new MemoryManager();

        const stats = await memoryManager.getMemoryStats();
        return {
          contents: [
            {
              uri: "memory://stats",
              text: JSON.stringify(stats, null, 2),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        console.error('[ERROR] Failed to get memory stats resource:', error);
        throw error;
      }
    });
  }

  private setupPromptHandlers(): void {
    // Register memory context prompt
    this.server.registerPrompt("memory_context", {
      title: "Memory Context",
      description: "Generate context from memory for current task",
      argsSchema: {
        task_type: z.string().describe('Type of task being performed')
      }
    }, async ({ task_type }) => {
      try {
        const result = await this.generateMemoryContextPrompt({ task_type });
        return result;
      } catch (error) {
        console.error('[ERROR] Failed to generate memory context prompt:', error);
        throw error;
      }
    });
  }

  // Tool handlers
  private async handleInitProject(args: any) {
    const { project_path } = args;

    // Switch to workspace context
    const context = await this.getOrCreateWorkspaceContext(project_path);
    this.state.currentWorkspace = project_path;

    const result = await context.projectInitializer.initialize(project_path);

    return {
      content: [
        {
          type: 'text' as const,
          text: result
        }
      ]
    };
  }

  private async handleStoreMemory(args: any) {
    const { content, layer, tags } = args;

    // Use current workspace context or create a default one
    const context = this.getCurrentContext();
    const memoryManager = context?.memoryManager || new MemoryManager();

    const memoryId = await memoryManager.store(content, layer, tags);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Memory stored successfully with ID: ${memoryId} in workspace: ${this.state.currentWorkspace || 'global'}`
        }
      ]
    };
  }

  private async handleSearchMemory(args: any) {
    const { query } = args;

    // Use current workspace context or create a default one
    const context = this.getCurrentContext();
    const memoryManager = context?.memoryManager || new MemoryManager();

    const results = await memoryManager.search(query);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${results.length} results in workspace ${this.state.currentWorkspace || 'global'}:\n\n${JSON.stringify(results, null, 2)}`
        }
      ]
    };
  }

  private async handleGetMemoryStats() {
    const context = this.getCurrentContext();
    const memoryManager = context?.memoryManager || new MemoryManager();

    const stats = await memoryManager.getMemoryStats();

    // Add workspace information to stats
    const enhancedStats = {
      ...stats,
      workspace: this.state.currentWorkspace || 'global',
      activeWorkspaces: this.state.workspaceContexts.size,
      totalContexts: Array.from(this.state.workspaceContexts.keys())
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(enhancedStats, null, 2)
        }
      ]
    };
  }

  private async handleCreateMode(args: any) {
    const { name, description, tools = [], systemPrompt } = args;

    // Get available tools for validation
    const availableTools = ['init_project', 'store_memory', 'search_memory', 'get_memory_stats', 'create_mode', 'list_modes', 'activate_mode'];

    // Validate tools
    const invalidTools = tools.filter((tool: string) => !availableTools.includes(tool));
    if (invalidTools.length > 0) {
      throw new Error(`Unknown tools: ${invalidTools.join(', ')}`);
    }

    await this.state.chatModeManager.createMode({ name, description, tools, systemPrompt });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Chat mode '${name}' created successfully`
        }
      ]
    };
  }


  // Helper methods
  private getStorageLocationDescription(layer: MemoryLayer): string {
    const descriptions = {
      'preference': 'Core Memory + Global SQLite - Available across ALL projects',
      'project': 'Warm Storage + Project SQLite - Available only in THIS project',
      'prompt': 'Warm Storage - Session-specific, temporary',
      'system': 'Core Memory + Global SQLite - Error patterns available across ALL projects'
    };

    return descriptions[layer] || 'General storage';
  }

  // Prompt generator
  private async generateMemoryContextPrompt(args: any) {
    const { task_type } = args;

    // Use current workspace context or create a default one
    const context = this.getCurrentContext();
    const memoryManager = context?.memoryManager || new MemoryManager();

    const relevantMemories = await memoryManager.search(task_type);
    const contextText = relevantMemories.map(result =>
      `- ${result.memory.layer}: ${result.memory.content.substring(0, 200)}...`
    ).join('\n');

    return {
      description: `Context for ${task_type} task`,
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Based on the memory system, here's relevant context for your ${task_type} task:\n\n${contextText}`
          }
        }
      ]
    };
  }

  private setupGracefulShutdown(): void {
    const cleanup = async () => {
      console.error('[INFO] Shutting down MCP server...');
      try {
        // Close all workspace contexts
        for (const [path, context] of this.state.workspaceContexts.entries()) {
          await context.memoryManager.close();
          console.error(`[INFO] Closed memory system for workspace: ${path}`);
        }
        console.error('[INFO] All memory systems closed successfully');
      } catch (error) {
        console.error('[ERROR] Error during shutdown:', error);
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  async run(): Promise<void> {
    // Initialize ChatModeManager before starting server
    await this.initializeAsync();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[INFO] Copilot MCP Server running on stdio');
  }
}

// Start the server
const server = new CopilotMCPServer();
server.run().catch((error) => {
  console.error('[ERROR] Server failed to start:', error);
  process.exit(1);
});