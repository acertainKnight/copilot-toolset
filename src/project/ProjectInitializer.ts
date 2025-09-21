/**
 * Comprehensive Project Initializer - Creates GitHub Copilot instruction files
 * Includes Git analysis, architecture detection, and intelligent directory scanning
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import simpleGit from 'simple-git';
import { ProjectContext, DependencyInfo, ArchitecturePattern, CodingConvention, ProjectCommand, ProjectStructureNode } from '../types/index.js';

export class ProjectInitializer {
  private git = simpleGit();

  public async initialize(projectPath: string): Promise<string> {
    try {
      console.error(`[INFO] Initializing project with comprehensive analysis: ${projectPath}`);

      // Perform comprehensive project analysis
      const analysis = await this.analyzeProject(projectPath);

      // Create .github directory
      const githubDir = path.join(projectPath, '.github');
      await fs.mkdir(githubDir, { recursive: true });

      // Create .copilot memory directory
      const memoryDir = path.join(projectPath, '.copilot', 'memory');
      await fs.mkdir(memoryDir, { recursive: true });

      // Generate GitHub Copilot instructions with memory guidance
      const copilotInstructions = this.generateCopilotInstructions(analysis);
      const instructionsPath = path.join(githubDir, 'copilot-instructions.md');
      await fs.writeFile(instructionsPath, copilotInstructions);

      // Generate COPILOT.md in root
      const copilotMd = this.generateCopilotMd(analysis);
      const copilotMdPath = path.join(projectPath, 'COPILOT.md');
      await fs.writeFile(copilotMdPath, copilotMd);

      // Initialize memory files
      await this.initializeMemoryFiles(memoryDir);

      return `Project initialized successfully with comprehensive analysis!

Generated files:
- ${instructionsPath}
- ${copilotMdPath}
- ${memoryDir}/ (memory system)

Analysis results:
- Project type: ${analysis.type}
- Language: ${analysis.language}
- Dependencies: ${analysis.dependencies.length}
- Architecture patterns: ${analysis.patterns.length}
- Git commits: ${analysis.gitInfo?.totalCommits || 0}
- Directory structure: ${analysis.structure.length} key directories`;

    } catch (error) {
      throw new Error(`Failed to initialize project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeProject(projectPath: string): Promise<ProjectContext> {
    const [
      projectType,
      structure,
      dependencies,
      conventions,
      patterns,
      commands,
      gitInfo
    ] = await Promise.all([
      this.detectProjectType(projectPath),
      this.analyzeStructure(projectPath),
      this.extractDependencies(projectPath),
      this.detectCodingConventions(projectPath),
      this.detectArchitecturePatterns(projectPath),
      this.extractCommands(projectPath),
      this.analyzeGitHistory(projectPath)
    ]);

    const language = this.getLanguageForType(projectType);
    const framework = this.getFrameworkForType(projectType, dependencies);

    return {
      type: projectType,
      framework,
      language,
      packageManager: this.detectPackageManager(projectPath),
      testFramework: this.detectTestFramework(dependencies),
      buildTool: this.detectBuildTool(projectPath),
      structure,
      dependencies,
      conventions,
      patterns,
      commands,
      gitInfo
    };
  }

  private async detectProjectType(projectPath: string): Promise<string> {
    const files = await fs.readdir(projectPath).catch(() => [] as string[]);

    if (files.includes('package.json')) {
      try {
        const packagePath = path.join(projectPath, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        const pkg = JSON.parse(packageContent);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.react) return 'React';
        if (deps.vue) return 'Vue';
        if (deps.angular || deps['@angular/core']) return 'Angular';
        if (deps.next) return 'Next.js';
        if (deps.nuxt) return 'Nuxt.js';
        if (deps.express) return 'Express';
        if (deps.fastify) return 'Fastify';
        if (deps.nest || deps['@nestjs/core']) return 'NestJS';

        return 'Node.js';
      } catch {
        return 'JavaScript';
      }
    }

    if (files.includes('requirements.txt') || files.includes('pyproject.toml')) return 'Python';
    if (files.includes('Cargo.toml')) return 'Rust';
    if (files.includes('go.mod')) return 'Go';
    if (files.includes('pom.xml') || files.includes('build.gradle')) return 'Java';
    if (files.includes('composer.json')) return 'PHP';
    if (files.includes('Gemfile')) return 'Ruby';

    return 'Unknown';
  }

  private async analyzeStructure(projectPath: string): Promise<ProjectStructureNode[]> {
    const structure: ProjectStructureNode[] = [];

    try {
      // Use glob to analyze directory structure intelligently
      const patterns = [
        'src/**/*',
        'lib/**/*',
        'components/**/*',
        'pages/**/*',
        'api/**/*',
        'tests/**/*',
        'test/**/*',
        '__tests__/**/*',
        'docs/**/*',
        'config/**/*'
      ];

      for (const pattern of patterns) {
        const matches = await glob(pattern, { cwd: projectPath, nodir: false });
        if (matches.length > 0) {
          const basePath = pattern.split('/')[0];
          const stats = await fs.stat(path.join(projectPath, basePath)).catch(() => null);

          if (stats) {
            structure.push({
              name: basePath,
              type: stats.isDirectory() ? 'directory' : 'file',
              path: basePath,
              size: stats.isFile() ? stats.size : undefined,
              importance: this.determineImportance(basePath),
              description: this.getDirectoryDescription(basePath)
            });
          }
        }
      }
    } catch (error) {
      console.error('[WARN] Structure analysis failed:', error);
    }

    return structure;
  }

  private async extractDependencies(projectPath: string): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];

    try {
      // Node.js dependencies
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const pkg = JSON.parse(packageContent);

      for (const [name, version] of Object.entries(pkg.dependencies || {})) {
        dependencies.push({
          name,
          version: version as string,
          type: 'dependency',
          description: this.getDependencyDescription(name)
        });
      }

      for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
        dependencies.push({
          name,
          version: version as string,
          type: 'devDependency',
          description: this.getDependencyDescription(name)
        });
      }
    } catch {
      // Try other dependency files
      try {
        // Python requirements
        const reqPath = path.join(projectPath, 'requirements.txt');
        const reqContent = await fs.readFile(reqPath, 'utf8');
        const lines = reqContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

        for (const line of lines) {
          const [name, version] = line.split('==');
          dependencies.push({
            name: name.trim(),
            version: version?.trim() || 'latest',
            type: 'dependency',
            description: this.getDependencyDescription(name.trim())
          });
        }
      } catch {
        // No dependency files found
      }
    }

    return dependencies;
  }

  private async detectArchitecturePatterns(projectPath: string): Promise<ArchitecturePattern[]> {
    const patterns: ArchitecturePattern[] = [];

    try {
      const files = await glob('**/*.{js,ts,jsx,tsx,py,rs,go}', {
        cwd: projectPath,
        ignore: ['node_modules/**', 'dist/**', 'build/**']
      });

      // Analyze files for architecture patterns
      let hasControllers = false;
      let hasServices = false;
      let hasModels = false;
      let hasComponents = false;
      let hasHooks = false;
      let hasMiddleware = false;

      for (const file of files.slice(0, 100)) { // Limit analysis for performance
        const fileLower = file.toLowerCase();

        if (fileLower.includes('controller')) hasControllers = true;
        if (fileLower.includes('service')) hasServices = true;
        if (fileLower.includes('model')) hasModels = true;
        if (fileLower.includes('component')) hasComponents = true;
        if (fileLower.includes('hook')) hasHooks = true;
        if (fileLower.includes('middleware')) hasMiddleware = true;
      }

      // Infer architecture patterns
      if (hasControllers && hasServices && hasModels) {
        patterns.push({
          name: 'MVC Architecture',
          type: 'architectural',
          description: 'Model-View-Controller pattern with separate layers',
          confidence: 0.9,
          files: files.filter(f => f.includes('controller') || f.includes('service') || f.includes('model'))
        });
      }

      if (hasComponents && hasHooks) {
        patterns.push({
          name: 'Component-Based Architecture',
          type: 'frontend',
          description: 'React/Vue component architecture with hooks pattern',
          confidence: 0.85,
          files: files.filter(f => f.includes('component') || f.includes('hook'))
        });
      }

      if (hasMiddleware) {
        patterns.push({
          name: 'Middleware Pattern',
          type: 'backend',
          description: 'Express/Fastify middleware-based request processing',
          confidence: 0.8,
          files: files.filter(f => f.includes('middleware'))
        });
      }

    } catch (error) {
      console.error('[WARN] Architecture pattern detection failed:', error);
    }

    return patterns;
  }

  private async detectCodingConventions(projectPath: string): Promise<CodingConvention[]> {
    const conventions: CodingConvention[] = [];

    try {
      // Check for configuration files
      const configFiles = [
        '.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs',
        '.prettierrc', '.prettierrc.json',
        'tsconfig.json',
        '.editorconfig'
      ];

      for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        const exists = await fs.access(configPath).then(() => true).catch(() => false);

        if (exists) {
          conventions.push({
            category: 'formatting',
            rule: `Uses ${configFile} for code formatting`,
            source: 'config'
          });
        }
      }

      // Analyze actual code for conventions
      const jsFiles = await glob('src/**/*.{js,ts,jsx,tsx}', { cwd: projectPath }).catch(() => []);
      if (jsFiles.length > 0) {
        const sampleFile = jsFiles[0];
        const content = await fs.readFile(path.join(projectPath, sampleFile), 'utf8').catch(() => '');

        if (content.includes('function(')) {
          conventions.push({
            category: 'functions',
            rule: 'Uses function expressions',
            example: 'const myFunc = function() { ... }',
            source: 'detected'
          });
        }

        if (content.includes('=>')) {
          conventions.push({
            category: 'functions',
            rule: 'Uses arrow functions',
            example: 'const myFunc = () => { ... }',
            source: 'detected'
          });
        }
      }

    } catch (error) {
      console.error('[WARN] Convention detection failed:', error);
    }

    return conventions;
  }

  private async analyzeGitHistory(projectPath: string): Promise<any> {
    try {
      this.git = simpleGit(projectPath);

      const [log, status, branches, remotes] = await Promise.all([
        this.git.log(['--oneline', '-10']).catch(() => null),
        this.git.status().catch(() => null),
        this.git.branchLocal().catch(() => null),
        this.git.getRemotes(true).catch(() => null)
      ]);

      return {
        totalCommits: log?.total || 0,
        recentCommits: log?.all.map(commit => ({
          hash: commit.hash,
          message: commit.message,
          date: commit.date
        })) || [],
        currentBranch: status?.current || 'unknown',
        branches: branches?.all || [],
        remotes: remotes?.map(r => ({ name: r.name, url: r.refs.fetch })) || [],
        isClean: status?.isClean() || false
      };
    } catch (error) {
      console.error('[WARN] Git analysis failed:', error);
      return null;
    }
  }

  private async extractCommands(projectPath: string): Promise<ProjectCommand[]> {
    const commands: ProjectCommand[] = [];

    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const pkg = JSON.parse(packageContent);

      for (const [name, command] of Object.entries(pkg.scripts || {})) {
        commands.push({
          name,
          command: command as string,
          type: this.classifyCommandType(name),
          description: this.describeCommand(name, command as string)
        });
      }
    } catch {
      // No package.json or scripts
    }

    return commands;
  }

  private async initializeMemoryFiles(memoryDir: string): Promise<void> {
    const memoryFiles = [
      {
        name: 'activeContext.md',
        content: '# Active Context\n\nCurrent session context and temporary notes.\n'
      },
      {
        name: 'decisionLog.md',
        content: '# Decision Log\n\nArchitectural decisions and their rationale.\n'
      },
      {
        name: 'productContext.md',
        content: '# Product Context\n\nFeature requirements and product specifications.\n'
      },
      {
        name: 'progress.md',
        content: '# Progress Tracking\n\nDevelopment progress and milestones.\n'
      },
      {
        name: 'systemPatterns.md',
        content: '# System Patterns\n\nReusable patterns and error solutions.\n'
      }
    ];

    for (const file of memoryFiles) {
      const filePath = path.join(memoryDir, file.name);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);

      if (!exists) {
        await fs.writeFile(filePath, file.content);
      }
    }
  }

  private generateCopilotInstructions(analysis: ProjectContext): string {
    return `# GitHub Copilot Instructions

## Project Overview
- **Name**: ${analysis.projectName || path.basename(process.cwd())}
- **Type**: ${analysis.type}
- **Language**: ${analysis.language}
- **Framework**: ${analysis.framework || 'None'}

## Memory System Usage for GitHub Copilot

When working on this project, use the MCP memory tools to store and retrieve context:

### Store User Preferences (Global)
\`\`\`
@copilot Use store_memory tool with layer="preference" for:
- Coding style preferences (functional vs OOP)
- Preferred libraries and frameworks
- Testing approaches
- Documentation style
\`\`\`

### Store Project Context (Project-Specific)
\`\`\`
@copilot Use store_memory tool with layer="project" for:
- Architecture decisions for THIS project
- API patterns and conventions
- Database schema decisions
- Project-specific patterns
\`\`\`

### Store Session Context (Temporary)
\`\`\`
@copilot Use store_memory tool with layer="prompt" for:
- Current conversation context
- Temporary notes and ideas
- Work-in-progress decisions
\`\`\`

### Store System Patterns (Global)
\`\`\`
@copilot Use store_memory tool with layer="system" for:
- Error patterns and solutions
- Debugging strategies that work
- Performance optimization techniques
\`\`\`

## Automatic Context Recognition

When you detect these patterns, store them automatically:

**User Preferences (store globally):**
- "I prefer functional programming" → layer="preference"
- "Always use TypeScript strict mode" → layer="preference"
- "Use Jest for testing" → layer="preference"

**Project Decisions (store for this project):**
- "This API uses JWT authentication" → layer="project"
- "Database schema follows DDD patterns" → layer="project"
- "Components use styled-components" → layer="project"

**Error Solutions (store globally):**
- "Fixed React hydration error by..." → layer="system"
- "Database connection pool issues solved by..." → layer="system"

## Project Context

${this.formatProjectContext(analysis)}

## Architecture Patterns

${analysis.patterns.map(p => `- **${p.name}**: ${p.description} (confidence: ${Math.round(p.confidence * 100)}%)`).join('\n')}

## Coding Conventions

${analysis.conventions.map(c => `- **${c.category}**: ${c.rule}`).join('\n')}

## Available Commands

${analysis.commands.map(c => `- \`npm run ${c.name}\`: ${c.description}`).join('\n')}

## Dependencies

**Production**: ${analysis.dependencies.filter(d => d.type === 'dependency').map(d => d.name).join(', ')}
**Development**: ${analysis.dependencies.filter(d => d.type === 'devDependency').map(d => d.name).join(', ')}

---
*Generated by Copilot MCP Toolset with memory guidance*`;
  }

  private generateCopilotMd(analysis: ProjectContext): string {
    return `# ${analysis.projectName || 'Project'}

## Project Context for AI Assistants

This is a ${analysis.type} project using ${analysis.language}.

### Memory Management Instructions

**Use MCP memory tools to maintain context:**

1. **Search for existing patterns**: Use \`search_memory\` before suggesting solutions
2. **Store new learnings**: Use \`store_memory\` to remember decisions and patterns
3. **Check memory stats**: Use \`get_memory_stats\` to understand storage locations

### Memory Storage Strategy

- **Preferences** → Global across all projects (layer="preference")
- **Project Context** → This project only (layer="project")
- **Error Solutions** → Global system patterns (layer="system")
- **Session Notes** → Temporary conversation context (layer="prompt")

## Project Analysis

**Type**: ${analysis.type}
**Language**: ${analysis.language}
**Framework**: ${analysis.framework || 'None'}
**Package Manager**: ${analysis.packageManager || 'npm'}

### Architecture Patterns Detected

${analysis.patterns.map(p => `- **${p.name}**: ${p.description}`).join('\n')}

### Key Dependencies

${analysis.dependencies.slice(0, 10).map(d => `- ${d.name}: ${d.version}`).join('\n')}

### Git Repository Info

${analysis.gitInfo ? `
- **Total Commits**: ${analysis.gitInfo.totalCommits}
- **Current Branch**: ${analysis.gitInfo.currentBranch}
- **Repository Status**: ${analysis.gitInfo.isClean ? 'Clean' : 'Has changes'}
- **Available Branches**: ${analysis.gitInfo.branches.join(', ')}
` : 'Not a Git repository'}

---
*Generated by Copilot MCP Toolset*`;
  }

  // Helper methods
  private formatProjectContext(analysis: ProjectContext): string {
    return `
**Project Structure**: ${analysis.structure.length} key directories analyzed
**Dependencies**: ${analysis.dependencies.length} packages
**Architecture**: ${analysis.patterns.length} patterns detected
**Commands**: ${analysis.commands.length} npm scripts available
`;
  }

  private determineImportance(dirName: string): 'critical' | 'important' | 'normal' | 'low' {
    const critical = ['src', 'lib', 'app'];
    const important = ['components', 'pages', 'api', 'routes'];
    const normal = ['tests', 'test', '__tests__', 'docs'];

    if (critical.includes(dirName)) return 'critical';
    if (important.includes(dirName)) return 'important';
    if (normal.includes(dirName)) return 'normal';
    return 'low';
  }

  private getDirectoryDescription(dirName: string): string {
    const descriptions: Record<string, string> = {
      'src': 'Main source code directory',
      'lib': 'Library and utility code',
      'components': 'Reusable UI components',
      'pages': 'Page-level components or routes',
      'api': 'API endpoints and handlers',
      'tests': 'Test files and test utilities',
      'docs': 'Documentation and guides',
      'config': 'Configuration files'
    };

    return descriptions[dirName] || 'Project directory';
  }

  private getDependencyDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'react': 'JavaScript library for building user interfaces',
      'vue': 'Progressive JavaScript framework',
      'express': 'Fast, unopinionated web framework for Node.js',
      'typescript': 'Typed superset of JavaScript',
      'jest': 'JavaScript testing framework',
      'eslint': 'JavaScript linting utility'
    };

    return descriptions[name] || 'Package dependency';
  }

  private getLanguageForType(projectType: string): string {
    const languageMap: Record<string, string> = {
      'React': 'JavaScript/TypeScript',
      'Vue': 'JavaScript/TypeScript',
      'Angular': 'TypeScript',
      'Next.js': 'JavaScript/TypeScript',
      'Node.js': 'JavaScript/TypeScript',
      'Python': 'Python',
      'Rust': 'Rust',
      'Go': 'Go',
      'Java': 'Java',
      'PHP': 'PHP',
      'Ruby': 'Ruby'
    };

    return languageMap[projectType] || 'Unknown';
  }

  private getFrameworkForType(projectType: string, dependencies: DependencyInfo[]): string {
    const depNames = dependencies.map(d => d.name);

    if (depNames.includes('next')) return 'Next.js';
    if (depNames.includes('nuxt')) return 'Nuxt.js';
    if (depNames.includes('express')) return 'Express';
    if (depNames.includes('fastify')) return 'Fastify';

    return projectType;
  }

  private detectPackageManager(projectPath: string): string {
    return 'npm'; // Could be enhanced to detect yarn, pnpm, etc.
  }

  private detectTestFramework(dependencies: DependencyInfo[]): string {
    const depNames = dependencies.map(d => d.name);

    if (depNames.includes('jest')) return 'Jest';
    if (depNames.includes('mocha')) return 'Mocha';
    if (depNames.includes('vitest')) return 'Vitest';
    if (depNames.includes('pytest')) return 'PyTest';

    return 'Unknown';
  }

  private detectBuildTool(projectPath: string): string {
    return 'npm'; // Could be enhanced to detect webpack, vite, etc.
  }

  private classifyCommandType(commandName: string): 'build' | 'test' | 'dev' | 'deploy' | 'other' {
    if (commandName.includes('build')) return 'build';
    if (commandName.includes('test')) return 'test';
    if (commandName.includes('dev') || commandName.includes('start')) return 'dev';
    if (commandName.includes('deploy')) return 'deploy';
    return 'other';
  }

  private describeCommand(name: string, command: string): string {
    const descriptions: Record<string, string> = {
      'build': 'Build the project for production',
      'dev': 'Start development server',
      'start': 'Start the application',
      'test': 'Run test suite',
      'lint': 'Check code quality'
    };

    return descriptions[name] || `Run: ${command}`;
  }
}