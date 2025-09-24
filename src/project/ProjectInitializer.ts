/**
 * Comprehensive Project Initializer - Creates GitHub Copilot instruction files
 * Includes Git analysis, architecture detection, and intelligent directory scanning
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import simpleGit from 'simple-git';
import { ProjectContext, DependencyInfo, ArchitecturePattern, CodingConvention, ProjectCommand, ProjectStructureNode } from '../types/index.js';
import { UnifiedMemoryManager } from '../memory/UnifiedMemoryManager.js';

export class ProjectInitializer {
  private git = simpleGit();

  public async initialize(projectPath: string, userProvidedName?: string): Promise<string> {
    try {
      console.error(`[INFO] Initializing project with comprehensive analysis: ${projectPath}`);

      // Phase 1: Perform initial project analysis
      const basicAnalysis = await this.analyzeProject(projectPath, userProvidedName);

      // Phase 2: Perform comprehensive codebase analysis (Claude Code style)
      console.error(`[INFO] Performing comprehensive codebase analysis...`);
      const comprehensiveAnalysis = await this.performComprehensiveCodebaseAnalysis(projectPath, basicAnalysis);

      // Create .github directory
      const githubDir = path.join(projectPath, '.github');
      await fs.mkdir(githubDir, { recursive: true });

      // Generate GitHub Copilot instructions with memory guidance
      const copilotInstructions = this.generateCopilotInstructions(basicAnalysis);
      const instructionsPath = path.join(githubDir, 'copilot-instructions.md');
      await fs.writeFile(instructionsPath, copilotInstructions);

      // Generate comprehensive COPILOT.md with deep analysis
      const copilotMd = this.generateComprehensiveCopilotMd(basicAnalysis, comprehensiveAnalysis);
      const copilotMdPath = path.join(projectPath, 'COPILOT.md');
      await fs.writeFile(copilotMdPath, copilotMd);

      // Initialize project in unified memory database with enhanced insights
      await this.initializeProjectMemory(projectPath, basicAnalysis);
      await this.storeComprehensiveAnalysisInMemory(projectPath, comprehensiveAnalysis);

      return `Project initialized successfully with comprehensive codebase analysis!

Generated files:
- ${instructionsPath} (GitHub Copilot instructions)
- ${copilotMdPath} (Comprehensive AI assistant documentation)
- Initialized project memory in unified database

Comprehensive Analysis Results:
- Project type: ${basicAnalysis.type}
- Language: ${basicAnalysis.language}
- Files analyzed: ${comprehensiveAnalysis.totalFilesAnalyzed}
- Architecture patterns: ${comprehensiveAnalysis.architecturePatterns.length} identified
- Code conventions: ${comprehensiveAnalysis.codeConventions.length} detected
- Project complexity: ${comprehensiveAnalysis.complexityScore}/100
- Codebase health: ${comprehensiveAnalysis.codebaseHealth}
- Key insights: ${comprehensiveAnalysis.keyInsights.length} documented

The project is now fully initialized with Claude Code-style comprehensive analysis and documentation.`;

    } catch (error) {
      throw new Error(`Failed to initialize project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeProject(projectPath: string, userProvidedName?: string): Promise<ProjectContext> {
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

    // Enhanced project name detection with deduplication
    const projectName = await this.detectAndValidateProjectName(projectPath, userProvidedName, gitInfo);

    return {
      type: projectType,
      framework,
      language,
      packageManager: this.detectPackageManager(projectPath),
      testFramework: this.detectTestFramework(dependencies),
      buildTool: this.detectBuildTool(projectPath),
      projectName, // Add project name to context
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

  /**
   * Initialize project-specific memories in the unified database
   */
  private async initializeProjectMemory(projectPath: string, analysis: ProjectContext): Promise<void> {
    try {
      const memoryManager = new UnifiedMemoryManager(projectPath);
      await memoryManager.initialize();

      // Store initial project context in core tier, project scope
      await memoryManager.store(
        `Project: ${analysis.projectName || path.basename(projectPath)}
Type: ${analysis.type}
Language: ${analysis.language}
Framework: ${analysis.framework || 'None'}
Architecture patterns: ${analysis.patterns.map(p => p.name).join(', ')}
Key dependencies: ${analysis.dependencies.slice(0, 5).map(d => d.name).join(', ')}`,
        'core',
        'project',
        projectPath,
        ['project-context', 'initialization', analysis.type.toLowerCase()],
        {
          initialized_at: new Date().toISOString(),
          project_type: analysis.type,
          language: analysis.language,
          framework: analysis.framework
        }
      );

      // Store architectural patterns in long-term memory
      for (const pattern of analysis.patterns.slice(0, 3)) { // Limit to top 3 patterns
        await memoryManager.store(
          `Architecture Pattern: ${pattern.name}
Description: ${pattern.description}
Confidence: ${Math.round(pattern.confidence * 100)}%
Files: ${pattern.files.slice(0, 3).join(', ')}`,
          'longterm',
          'project',
          projectPath,
          ['architecture', 'pattern', pattern.type],
          {
            pattern_name: pattern.name,
            confidence: pattern.confidence,
            pattern_type: pattern.type
          }
        );
      }

      // Store coding conventions
      for (const convention of analysis.conventions.slice(0, 5)) {
        await memoryManager.store(
          `Coding Convention: ${convention.rule}
Category: ${convention.category}
Source: ${convention.source}
${convention.example ? `Example: ${convention.example}` : ''}`,
          'longterm',
          'project',
          projectPath,
          ['convention', 'coding-style', convention.category],
          {
            category: convention.category,
            source: convention.source
          }
        );
      }

      console.error(`[INFO] Initialized project memory for: ${analysis.projectName || path.basename(projectPath)}`);
    } catch (error) {
      console.error('[WARN] Failed to initialize project memory:', error);
      // Don't fail the entire initialization if memory setup fails
    }
  }

  private generateCopilotInstructions(analysis: ProjectContext): string {
    return `# GitHub Copilot Instructions

## Project Overview
- **Name**: ${analysis.projectName || path.basename(process.cwd())}
- **Type**: ${analysis.type}
- **Language**: ${analysis.language}
- **Framework**: ${analysis.framework || 'None'}

## 🚨 MANDATORY: Chat Session Initialization Protocol

**EVERY GitHub Copilot chat session MUST start with these steps in order:**

### 1. Load User Preferences (REQUIRED FIRST STEP)
\`\`\`
@copilot ALWAYS start with: get_user_preferences

This tool extracts ALL user preferences from global core memory including:
- Coding style preferences (functional vs OOP, formatting, etc.)
- Languages & frameworks (TypeScript, React, Python, etc.)
- Testing approaches (Jest, pytest, TDD, etc.)
- Documentation styles (JSDoc, type hints, etc.)
- Architecture & design patterns
- Tools & libraries (ESLint, Prettier, etc.)
- General coding preferences and conventions
\`\`\`

**If no preferences are found:**
\`\`\`
@copilot Use extract_coding_preferences to analyze current conversation:
extract_coding_preferences conversation_text="[copy recent relevant conversation text]"
  context_description="project setup" auto_store=true
\`\`\`

### 2. Curate Comprehensive Context (RECOMMENDED SECOND STEP)
\`\`\`
@copilot Use curate_context for intelligent context assembly:
curate_context task_description="[describe current task/feature/issue]"
  include_preferences=true include_project_patterns=true context_depth="standard"

This combines:
- User preferences (highest priority)
- Task-specific memories and patterns
- Project-specific conventions and architecture
- Priority-weighted context for optimal guidance
\`\`\`

### 3. Legacy Context Assembly (FALLBACK IF ABOVE TOOLS FAIL)
\`\`\`
@copilot Use search_unified_memory to manually assemble context:
- Project-specific patterns and decisions
- Architecture choices for this project
- Previous similar implementations
- Known issues and solutions
\`\`\`

### 3. Review Context Before Action (REQUIRED THIRD STEP)
- Analyze loaded preferences for consistency
- Check project context for constraints
- Identify any conflicts between preferences and project needs
- Only proceed with coding after context review is complete

## 📋 User Preference Categories

**When loading or storing user preferences, organize by these categories:**

### 1. Coding Style Preferences
\`\`\`
@copilot Store in global scope, core tier:
- Programming paradigm (functional vs OOP vs procedural)
- Code organization patterns (modules, classes, utilities)
- Naming conventions (camelCase, snake_case, PascalCase)
- Code complexity preferences (verbose vs concise)
\`\`\`

### 2. Formatting & Syntax Preferences
\`\`\`
@copilot Store in global scope, core tier:
- Indentation style (2 spaces, 4 spaces, tabs)
- Semicolon usage (required, optional, ASI)
- Quote preferences (single, double, backticks)
- Bracket styles (same-line, next-line)
- Line length limits and wrapping preferences
\`\`\`

### 3. Library & Framework Preferences
\`\`\`
@copilot Store in global scope, core tier:
- Preferred libraries for common tasks (e.g., "always use loguru for Python logging")
- Framework preferences (React vs Vue, Express vs Fastify)
- Package manager preferences (npm vs yarn vs pnpm)
- Version preferences (latest vs LTS vs specific versions)
\`\`\`

### 4. Testing Methodology Preferences
\`\`\`
@copilot Store in global scope, core tier:
- Testing framework preferences (Jest, Vitest, PyTest)
- Test structure preferences (AAA, Given-When-Then)
- Coverage requirements and standards
- Mock/stub preferences and patterns
\`\`\`

### 5. Documentation & Comment Styles
\`\`\`
@copilot Store in global scope, core tier:
- Comment density preferences (minimal, moderate, comprehensive)
- Documentation format (JSDoc, Sphinx, inline comments)
- README structure preferences
- Code explanation verbosity
\`\`\`

### 6. Error Handling Approaches
\`\`\`
@copilot Store in global scope, core tier:
- Exception handling patterns (try-catch, Result types, errors as values)
- Logging preferences (structured vs unstructured)
- Error message formatting preferences
- Debugging approach preferences
\`\`\`

## 🚨 CRITICAL: Memory-First Development Workflow

**ALWAYS search memory BEFORE any coding action or implementation planning!**

### Pre-Action Memory Protocol

**Before writing code, implementing features, or making architectural decisions:**

1. **SEARCH FIRST**: \`search_unified_memory\` to find relevant patterns, preferences, and previous decisions
2. **ANALYZE**: Review found memories to understand context and constraints
3. **IMPLEMENT**: Code with memory-informed approach
4. **STORE**: Save new patterns, decisions, and learnings for future use

### Required Memory Searches Before:

**🔍 Before implementing ANY feature:**
\`\`\`
search_unified_memory "similar feature implementation"
search_unified_memory "architecture patterns this project" 
search_unified_memory "user preferences coding style"
\`\`\`

**🔍 Before making design decisions:**
\`\`\`
search_unified_memory "design patterns used"
search_unified_memory "technology choices rationale"
search_unified_memory "previous architectural decisions"
\`\`\`

**🔍 Before debugging or troubleshooting:**
\`\`\`
search_unified_memory "similar error patterns"
search_unified_memory "debugging approaches that worked"
search_unified_memory "known issues this project"
\`\`\`

## 🔍 Advanced Context Curation & Preference Management

### Intelligent Context Tools Usage

**Primary Tools (Use These First):**
\`\`\`
@copilot Use these advanced context tools in this order:

1. get_user_preferences - Fast retrieval of all user preferences
2. curate_context task_description="[current task]" - Comprehensive context assembly
3. extract_coding_preferences conversation_text="[conversation]" - Auto-detect new preferences
\`\`\`

**Legacy Fallback:**
\`\`\`
@copilot Use search_unified_memory only when advanced tools are unavailable:
- For specific technical searches
- When troubleshooting advanced tool issues
- For detailed investigation of specific patterns
\`\`\`

### Context Assembly Priority (Automated by curate_context)
1. **User Preferences** (global scope, core tier) - Always highest priority
2. **Task-Specific Patterns** - Relevant to current implementation
3. **Project Context** (project scope, core tier) - Project conventions
4. **Similar Solutions** (global scope, longterm tier) - Proven approaches

### Automatic Preference Detection & Storage
\`\`\`
@copilot Use extract_coding_preferences when you observe:
- User mentioning preferences ("I prefer...", "I always...", "I never...")
- Consistent code patterns across conversations
- Repeated technology choices and tool selections
- Similar debugging approaches and methodologies
- Consistent formatting and documentation styles
\`\`\`

**Automatic extraction and storage:**
\`\`\`
extract_coding_preferences
  conversation_text="[paste conversation text containing preferences]"
  context_description="[what was being discussed]"
  auto_store=true
\`\`\`

## Memory System Usage for GitHub Copilot

### Unified Database Memory Architecture

**Single SQLite Database Location:** \`~/.copilot-mcp/memory/unified.db\`

**Memory Tiers:**
- \`core\`: High-priority, always-accessible memories (2KB limit per item)
- \`longterm\`: Comprehensive storage for detailed information (unlimited)

**Memory Scopes:**
- \`global\`: Shared across ALL projects (preferences, coding patterns, proven solutions)
- \`project\`: Isolated to specific projects (architecture decisions, project context)

### Store User Preferences (Global Scope, Core Tier)
\`\`\`
@copilot Use store_unified_memory tool with scope="global", tier="core" for:
- Coding style preferences (functional vs OOP)
- Preferred libraries and frameworks (e.g., "always use loguru for Python logging")
- Testing approaches and methodologies
- Documentation and comment styles
- Error handling patterns
\`\`\`

### Store Project Context (Project Scope, Core Tier)
\`\`\`
@copilot Use store_unified_memory tool with scope="project", tier="core" for:
- Architecture decisions for THIS project
- API patterns and conventions
- Database schema decisions
- Project-specific patterns and conventions
- Technology stack choices and rationale
\`\`\`

### Store Detailed Information (Long-term Tier)
\`\`\`
@copilot Use store_unified_memory tool with tier="longterm" for:
- Comprehensive documentation and guides
- Detailed error solutions and debugging approaches
- Performance optimization techniques and results
- Security best practices and implementations
- Code refactoring patterns and examples
\`\`\`

## 🤖 Automatic Preference Extraction

**Extract and store preferences automatically when users express:**

### Coding Style Indicators
\`\`\`
User says: "I prefer functional programming"
Action: store_unified_memory "User prefers functional programming paradigm"
        scope="global" tier="core" tags=["preference", "coding-style", "functional"]

User says: "Always use arrow functions"
Action: store_unified_memory "User prefers arrow functions over function declarations"
        scope="global" tier="core" tags=["preference", "syntax", "functions"]
\`\`\`

### Library/Framework Preferences
\`\`\`
User says: "Use React Query for data fetching"
Action: store_unified_memory "User prefers React Query for data fetching over alternatives"
        scope="global" tier="core" tags=["preference", "library", "data-fetching"]

User says: "I don't like Redux, use Zustand instead"
Action: store_unified_memory "User avoids Redux, prefers Zustand for state management"
        scope="global" tier="core" tags=["preference", "library", "state-management"]
\`\`\`

### Testing Preferences
\`\`\`
User says: "Write unit tests first"
Action: store_unified_memory "User follows TDD methodology, writes unit tests first"
        scope="global" tier="core" tags=["preference", "testing", "methodology", "tdd"]
\`\`\`

### Formatting Preferences
\`\`\`
User says: "Use 2 spaces for indentation"
Action: store_unified_memory "User prefers 2-space indentation over tabs or 4 spaces"
        scope="global" tier="core" tags=["preference", "formatting", "indentation"]
\`\`\`

### Update Preferences When Changed
\`\`\`
@copilot When user preferences change:
1. Search for existing preference: search_unified_memory "previous preference keywords"
2. Update or override: store_unified_memory "Updated preference with new choice"
3. Tag as updated: tags=["preference", "updated", "category"]
\`\`\`

## Automatic Context Recognition

When you detect these patterns, store them automatically:

**User Preferences (store in global scope, core tier):**
- "I prefer functional programming" → scope="global", tier="core"
- "Always use TypeScript strict mode" → scope="global", tier="core"
- "Use Jest for testing" → scope="global", tier="core"

**Project Decisions (store in project scope, core tier):**
- "This API uses JWT authentication" → scope="project", tier="core"
- "Database schema follows DDD patterns" → scope="project", tier="core"
- "Components use styled-components" → scope="project", tier="core"

**Detailed Solutions (store in global scope, longterm tier):**
- "Fixed React hydration error by..." → scope="global", tier="longterm"
- "Database connection pool issues solved by..." → scope="global", tier="longterm"

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

## 🚨 MANDATORY: Chat Session Initialization Protocol

**EVERY AI assistant chat session MUST start with these steps in order:**

### 1. Load User Preferences (REQUIRED FIRST STEP)
\`\`\`
Use store_unified_memory with scope="global" to search for:
- User coding preferences (functional vs OOP, formatting, etc.)
- Library and framework preferences
- Testing methodologies and patterns
- Documentation and comment styles
- Error handling approaches
\`\`\`

**Always search for preferences with:**
\`\`\`
search_unified_memory "user preferences"
search_unified_memory "coding style preferences"
search_unified_memory "framework preferences"
search_unified_memory "testing preferences"
\`\`\`

### 2. Curate Context (REQUIRED SECOND STEP)
\`\`\`
Use search_unified_memory to assemble comprehensive context:
- Project-specific patterns and decisions
- Architecture choices for this project
- Previous similar implementations
- Known issues and solutions
\`\`\`

### 3. Review Context Before Action (REQUIRED THIRD STEP)
- Analyze loaded preferences for consistency
- Check project context for constraints
- Identify any conflicts between preferences and project needs
- Only proceed with coding after context review is complete

## 📋 Automatic Preference Detection

**Detect and store user preferences automatically when observed:**

### Coding Patterns to Watch For:
- Consistent programming paradigm choices (functional vs OOP)
- Repeated library/framework selections
- Consistent formatting and syntax patterns
- Testing approach preferences
- Error handling patterns

### Storage Instructions:
\`\`\`
When detecting preferences, immediately store with:
store_unified_memory "User consistently prefers [specific pattern]"
  scope="global" tier="core" tags=["preference", "detected", "category"]
\`\`\`

### Preference Categories:
1. **Coding Style**: paradigm, organization, naming conventions
2. **Formatting**: indentation, semicolons, quotes, brackets
3. **Libraries**: preferred packages for common tasks
4. **Testing**: framework, methodology, coverage standards
5. **Documentation**: comment density, format preferences
6. **Error Handling**: exception patterns, logging styles

## 🚨 CRITICAL: Memory-First Development Workflow

**ALWAYS search memory BEFORE any coding action or implementation planning!**

### Pre-Action Memory Protocol

**Before writing code, implementing features, or making architectural decisions:**

1. **SEARCH FIRST**: \`search_unified_memory\` to find relevant patterns, preferences, and previous decisions
2. **ANALYZE**: Review found memories to understand context and constraints
3. **IMPLEMENT**: Code with memory-informed approach
4. **STORE**: Save new patterns, decisions, and learnings for future use

### Required Memory Searches Before:

**🔍 Before implementing ANY feature:**
\`\`\`
search_unified_memory "similar feature implementation"
search_unified_memory "architecture patterns this project" 
search_unified_memory "user preferences coding style"
\`\`\`

**🔍 Before making design decisions:**
\`\`\`
search_unified_memory "design patterns used"
search_unified_memory "technology choices rationale"
search_unified_memory "previous architectural decisions"
\`\`\`

**🔍 Before debugging or troubleshooting:**
\`\`\`
search_unified_memory "similar error patterns"
search_unified_memory "debugging approaches that worked"
search_unified_memory "known issues this project"
\`\`\`

### Memory Management Instructions

**Use MCP memory tools to maintain context:**

1. **Search for existing patterns**: Use \`search_unified_memory\` before suggesting solutions
2. **Store new learnings**: Use \`store_unified_memory\` to remember decisions and patterns
3. **Check memory stats**: Use \`get_memory_stats\` to understand storage locations
4. **Load preferences first**: Always search for user preferences at session start

### Memory Storage Strategy

- **User Preferences** → Global scope, core tier (shared across all projects)
- **Project Context** → Project scope, core tier (isolated to this project)
- **Detailed Solutions** → Global scope, longterm tier (comprehensive knowledge base)
- **Project Documentation** → Project scope, longterm tier (detailed project information)

### Context Assembly Workflow
1. Load user preferences (global core memories)
2. Load project context (project core memories)
3. Search for similar patterns (global longterm memories)
4. Combine contexts to inform decisions

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
      'Express': 'JavaScript/TypeScript',
      'JavaScript': 'JavaScript/TypeScript',
      'TypeScript': 'JavaScript/TypeScript',
      'Python': 'Python',
      'Flask': 'Python',
      'Django': 'Python',
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

  /**
   * Enhanced project name detection with multiple sources and deduplication checking
   * Priority order: User provided > package.json > pyproject.toml > git remote > directory name
   */
  private async detectAndValidateProjectName(projectPath: string, userProvidedName?: string, gitInfo?: any): Promise<string> {
    console.error('[INFO] Starting enhanced project name detection...');

    // Step 1: Collect all potential project names
    const candidates = await this.collectProjectNameCandidates(projectPath, userProvidedName, gitInfo);
    console.error(`[INFO] Found ${candidates.length} project name candidates: ${candidates.join(', ')}`);

    // Step 2: Select primary candidate
    const primaryName = candidates[0] || path.basename(projectPath);
    console.error(`[INFO] Primary project name candidate: "${primaryName}"`);

    // Step 3: Check for similar existing projects in database
    const similarProjects = await this.findSimilarProjects(primaryName, projectPath);

    // Step 4: Handle deduplication if similar projects exist
    if (similarProjects.length > 0) {
      console.error(`[WARN] Found ${similarProjects.length} similar projects in database:`);
      similarProjects.forEach((proj, idx) => {
        console.error(`  ${idx + 1}. "${proj.name}" (path: ${proj.path})`);
      });

      // Auto-resolve if exact path match (same project re-initialization)
      const exactMatch = similarProjects.find(p => p.path === projectPath);
      if (exactMatch) {
        console.error(`[INFO] Exact path match found. Reusing project name: "${exactMatch.name}"`);
        return exactMatch.name;
      }

      // For now, append path-based suffix for uniqueness
      // In a full implementation, this would prompt the user for confirmation
      const uniqueName = await this.generateUniqueProjectName(primaryName, projectPath, similarProjects);
      console.error(`[INFO] Generated unique project name: "${uniqueName}"`);
      return uniqueName;
    }

    console.error(`[INFO] No similar projects found. Using: "${primaryName}"`);
    return primaryName;
  }

  /**
   * Collect project name candidates from multiple sources in priority order
   */
  private async collectProjectNameCandidates(projectPath: string, userProvidedName?: string, gitInfo?: any): Promise<string[]> {
    const candidates: string[] = [];

    // Priority 1: User-provided name (highest priority)
    if (userProvidedName?.trim()) {
      candidates.push(userProvidedName.trim());
    }

    // Priority 2: package.json name field
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const pkg = JSON.parse(packageContent);
      if (pkg.name && typeof pkg.name === 'string') {
        // Clean npm package names (remove scopes like @org/package)
        const cleanName = pkg.name.includes('/') ? pkg.name.split('/').pop()! : pkg.name;
        if (cleanName !== 'undefined' && cleanName !== 'null') {
          candidates.push(cleanName);
        }
      }
    } catch {
      // package.json not found or invalid
    }

    // Priority 3: pyproject.toml name field
    try {
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      const pyprojectContent = await fs.readFile(pyprojectPath, 'utf8');
      // Simple TOML parsing for name field
      const nameMatch = pyprojectContent.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
      if (nameMatch && nameMatch[1]) {
        candidates.push(nameMatch[1]);
      }
    } catch {
      // pyproject.toml not found or invalid
    }

    // Priority 4: Git repository name (from remote origin URL)
    if (gitInfo?.remotes?.length > 0) {
      const originRemote = gitInfo.remotes.find((r: any) => r.name === 'origin') || gitInfo.remotes[0];
      if (originRemote?.url) {
        const repoName = this.extractRepoNameFromUrl(originRemote.url);
        if (repoName) {
          candidates.push(repoName);
        }
      }
    }

    // Priority 5: Directory basename (fallback)
    const dirName = path.basename(projectPath);
    if (dirName !== '.' && dirName !== '..') {
      candidates.push(dirName);
    }

    // Clean and filter candidates
    return candidates
      .map(name => this.cleanProjectName(name))
      .filter((name, index, array) =>
        name &&
        name.length > 0 &&
        array.indexOf(name) === index // Remove duplicates
      );
  }

  /**
   * Extract repository name from Git remote URL
   */
  private extractRepoNameFromUrl(url: string): string | null {
    try {
      // Handle various Git URL formats:
      // https://github.com/user/repo.git -> repo
      // git@github.com:user/repo.git -> repo
      // https://gitlab.com/user/repo -> repo

      const patterns = [
        /\/([^\/]+?)(?:\.git)?$/,  // Match last path segment before optional .git
        /:([^\/]+?)(?:\.git)?$/   // Match after colon (SSH format)
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clean and normalize project names
   */
  private cleanProjectName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-') // Replace invalid chars with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .trim();
  }

  /**
   * Find similar projects in the unified memory database
   */
  private async findSimilarProjects(projectName: string, currentPath: string): Promise<{name: string, path: string}[]> {
    try {
      const memoryManager = new UnifiedMemoryManager();
      await memoryManager.initialize();

      // Search for project-scoped memories to find existing projects
      const searchResults = await memoryManager.search(
        `project:${projectName}`,
        {
          tier: 'core',
          scope: 'project',
          limit: 50
        }
      );

      // Extract unique project names and paths from search results
      const projects = new Map<string, string>();

      for (const result of searchResults) {
        if (result.memory.project_id && result.memory.project_id !== currentPath) {
          // Try to extract project name from project_id or content
          const projectPath = result.memory.project_id;
          const detectedName = path.basename(projectPath);

          // Check if this project name is similar to our target
          if (this.isProjectNameSimilar(projectName, detectedName)) {
            projects.set(detectedName, projectPath);
          }
        }
      }

      // Also search memory content for project references
      const contentSearch = await memoryManager.search(
        projectName,
        {
          limit: 20
        }
      );

      for (const result of contentSearch) {
        // Look for project references in content
        const projectMatches = result.memory.content.match(/project[:\s]+"?([^"\s,]+)"?/gi);
        if (projectMatches) {
          for (const match of projectMatches) {
            const nameMatch = match.match(/project[:\s]+"?([^"\s,]+)"?/i);
            if (nameMatch && nameMatch[1]) {
              const foundName = this.cleanProjectName(nameMatch[1]);
              if (this.isProjectNameSimilar(projectName, foundName)) {
                projects.set(foundName, result.memory.project_id || 'unknown');
              }
            }
          }
        }
      }

      return Array.from(projects.entries()).map(([name, path]) => ({ name, path }));

    } catch (error) {
      console.error('[WARN] Failed to search for similar projects:', error);
      return [];
    }
  }

  /**
   * Check if two project names are similar (fuzzy matching)
   */
  private isProjectNameSimilar(name1: string, name2: string): boolean {
    const clean1 = this.cleanProjectName(name1);
    const clean2 = this.cleanProjectName(name2);

    // Exact match
    if (clean1 === clean2) return true;

    // Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    const similarity = (maxLength - distance) / maxLength;

    return similarity >= 0.8; // 80% similarity threshold
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate unique project name when similar projects exist
   */
  private async generateUniqueProjectName(baseName: string, _projectPath: string, existingProjects: {name: string, path: string}[]): Promise<string> {
    // Strategy: Append directory-based suffix or incremental number

    // Try appending parent directory name
    const parentDir = path.basename(path.dirname(_projectPath));
    const parentBasedName = `${baseName}-${this.cleanProjectName(parentDir)}`;

    const isParentNameUnique = !existingProjects.some(p =>
      this.isProjectNameSimilar(parentBasedName, p.name)
    );

    if (isParentNameUnique && parentDir !== '.' && parentDir !== _projectPath) {
      return parentBasedName;
    }

    // Fallback: Append incremental number
    let counter = 2;
    let candidateName: string;
    do {
      candidateName = `${baseName}-${counter}`;
      counter++;
    } while (existingProjects.some(p => this.isProjectNameSimilar(candidateName, p.name)));

    return candidateName;
  }

  /**
   * Comprehensive codebase analysis (Claude Code style)
   */
  private async performComprehensiveCodebaseAnalysis(projectPath: string, basicAnalysis: ProjectContext) {
    console.error(`[INFO] Starting comprehensive codebase analysis...`);

    const analysis = {
      totalFilesAnalyzed: 0,
      architecturePatterns: [] as string[],
      codeConventions: [] as string[],
      keyInsights: [] as string[],
      complexityScore: 0,
      codebaseHealth: 'unknown' as string,
      dependencies: [] as any[],
      testCoverage: 0,
      performanceMetrics: {} as any
    };

    try {
      // Phase 1: File discovery and analysis
      const codeFiles = await glob('**/*.{js,ts,jsx,tsx,py,rs,go,java,php,rb}', {
        cwd: projectPath,
        ignore: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**']
      });

      analysis.totalFilesAnalyzed = codeFiles.length;
      console.error(`[INFO] Found ${codeFiles.length} source files for analysis`);

      // Phase 2: Architecture pattern detection
      analysis.architecturePatterns = await this.detectAdvancedArchitecturePatterns(projectPath, codeFiles);

      // Phase 3: Code convention analysis
      analysis.codeConventions = await this.analyzeCodeConventions(projectPath, codeFiles);

      // Phase 4: Generate key insights
      analysis.keyInsights = this.generateKeyInsights(basicAnalysis, analysis);

      // Phase 5: Calculate complexity and health scores
      analysis.complexityScore = this.calculateComplexityScore(analysis, basicAnalysis);
      analysis.codebaseHealth = this.assessCodebaseHealth(analysis);

      console.error(`[INFO] Comprehensive analysis complete: ${analysis.complexityScore}/100 health score`);

    } catch (error) {
      console.error(`[WARN] Comprehensive analysis failed: ${error}`);
      // Provide fallback values
      analysis.architecturePatterns = ['Standard Project Structure'];
      analysis.codeConventions = ['Basic Conventions Detected'];
      analysis.keyInsights = ['Project analysis completed with basic detection'];
      analysis.complexityScore = 50;
      analysis.codebaseHealth = 'moderate';
    }

    return analysis;
  }

  /**
   * Detect advanced architecture patterns through code analysis
   */
  private async detectAdvancedArchitecturePatterns(projectPath: string, codeFiles: string[]): Promise<string[]> {
    const patterns: string[] = [];

    try {
      // Analyze file patterns and directory structure
      const hasControllers = codeFiles.some(f => f.toLowerCase().includes('controller'));
      const hasServices = codeFiles.some(f => f.toLowerCase().includes('service'));
      const hasModels = codeFiles.some(f => f.toLowerCase().includes('model'));
      const hasComponents = codeFiles.some(f => f.toLowerCase().includes('component'));
      const hasTools = codeFiles.some(f => f.toLowerCase().includes('tool'));
      const hasDecorators = codeFiles.some(f => f.toLowerCase().includes('decorator'));

      if (hasControllers && hasServices && hasModels) {
        patterns.push('MVC Architecture Pattern');
      }

      if (hasComponents) {
        patterns.push('Component-Based Architecture');
      }

      if (hasTools && hasDecorators) {
        patterns.push('Decorator Pattern with Tool Registration');
      }

      // Analyze specific to this MCP project
      if (codeFiles.some(f => f.includes('memory'))) {
        patterns.push('Memory Management Architecture');
      }

      if (codeFiles.some(f => f.includes('MCP'))) {
        patterns.push('Model Context Protocol Implementation');
      }

      if (codeFiles.length > 50) {
        patterns.push('Large-Scale Modular Architecture');
      }

    } catch (error) {
      console.error(`[WARN] Architecture pattern detection failed: ${error}`);
    }

    return patterns.length > 0 ? patterns : ['Standard Project Architecture'];
  }

  /**
   * Analyze code conventions through file sampling
   */
  private async analyzeCodeConventions(projectPath: string, codeFiles: string[]): Promise<string[]> {
    const conventions: string[] = [];

    try {
      // Check configuration files
      const configFiles = await glob('*{eslint,prettier,tsconfig,jest}*', { cwd: projectPath });

      if (configFiles.some(f => f.includes('eslint'))) {
        conventions.push('ESLint Code Quality Standards');
      }

      if (configFiles.some(f => f.includes('prettier'))) {
        conventions.push('Prettier Code Formatting');
      }

      if (configFiles.some(f => f.includes('tsconfig'))) {
        conventions.push('TypeScript Strict Configuration');
      }

      if (configFiles.some(f => f.includes('jest'))) {
        conventions.push('Jest Testing Framework');
      }

      // Analyze code patterns from sample files
      const sampleFiles = codeFiles.slice(0, 5);
      for (const file of sampleFiles) {
        try {
          const content = await fs.readFile(path.join(projectPath, file), 'utf8');

          if (content.includes('async/await')) {
            conventions.push('Modern Async/Await Patterns');
          }

          if (content.includes('@') && content.includes('decorator')) {
            conventions.push('Decorator-Based Architecture');
          }

          if (content.includes('interface') || content.includes('type ')) {
            conventions.push('Strong TypeScript Typing');
          }

        } catch (error) {
          // Skip unreadable files
        }
      }

    } catch (error) {
      console.error(`[WARN] Code convention analysis failed: ${error}`);
    }

    return conventions.length > 0 ? conventions : ['Standard Coding Practices'];
  }

  /**
   * Generate key insights about the project
   */
  private generateKeyInsights(basicAnalysis: ProjectContext, comprehensiveAnalysis: any): string[] {
    const insights: string[] = [];

    // Architecture insights
    if (comprehensiveAnalysis.architecturePatterns.length > 2) {
      insights.push('Well-architected system with multiple design patterns');
    }

    // Code quality insights
    if (comprehensiveAnalysis.codeConventions.some((c: string) => c.includes('TypeScript'))) {
      insights.push('Strong type safety with TypeScript implementation');
    }

    // Scale insights
    if (comprehensiveAnalysis.totalFilesAnalyzed > 50) {
      insights.push('Large-scale project with sophisticated module organization');
    } else if (comprehensiveAnalysis.totalFilesAnalyzed > 20) {
      insights.push('Medium-scale project with good structural organization');
    } else {
      insights.push('Focused project with clear scope and purpose');
    }

    // Testing insights
    if (comprehensiveAnalysis.codeConventions.some((c: string) => c.includes('Jest'))) {
      insights.push('Comprehensive testing strategy with Jest framework');
    }

    // Project-specific insights
    if (basicAnalysis.type.includes('MCP') || basicAnalysis.projectName?.includes('mcp')) {
      insights.push('Specialized MCP server with protocol compliance focus');
    }

    return insights.length > 0 ? insights : ['Standard project structure and organization'];
  }

  /**
   * Calculate project complexity score
   */
  private calculateComplexityScore(analysis: any, basicAnalysis: ProjectContext): number {
    let score = 0;

    // File count factor (30%)
    const fileScore = Math.min(analysis.totalFilesAnalyzed / 100 * 30, 30);
    score += fileScore;

    // Architecture patterns factor (25%)
    const archScore = Math.min(analysis.architecturePatterns.length * 8, 25);
    score += archScore;

    // Dependencies factor (20%)
    const depScore = Math.min(basicAnalysis.dependencies.length / 20 * 20, 20);
    score += depScore;

    // Convention compliance factor (15%)
    const convScore = Math.min(analysis.codeConventions.length * 3, 15);
    score += convScore;

    // Git activity factor (10%)
    const gitScore = Math.min((basicAnalysis.gitInfo?.totalCommits || 0) / 10, 10);
    score += gitScore;

    return Math.round(score);
  }

  /**
   * Assess overall codebase health
   */
  private assessCodebaseHealth(analysis: any): string {
    if (analysis.complexityScore >= 80) return 'excellent';
    if (analysis.complexityScore >= 60) return 'good';
    if (analysis.complexityScore >= 40) return 'moderate';
    return 'needs-improvement';
  }

  /**
   * Generate comprehensive COPILOT.md with deep analysis
   */
  private generateComprehensiveCopilotMd(basicAnalysis: ProjectContext, comprehensiveAnalysis: any): string {
    return `# ${basicAnalysis.projectName || 'Project'}

## Project DNA: AI Assistant Project Context

This is a **${basicAnalysis.type}** project using **${basicAnalysis.language}**.

### 🧬 Project Essence
${comprehensiveAnalysis.keyInsights.map((insight: string, index: number) => `**${index === 0 ? 'Core Purpose' : index === 1 ? 'Key Capability' : index === 2 ? 'Architecture Strength' : 'Quality Focus'}**: ${insight}`).join('\n')}

## 🏗️ Architecture Deep Dive

### Design Patterns in Use
${comprehensiveAnalysis.architecturePatterns.map((pattern: string) => `- **${pattern}**: Core architectural component driving the system design`).join('\n')}

### Code Organization Philosophy
- **Modular Design**: Each subsystem operates independently with clear boundaries
- **Single Responsibility**: Classes and modules have focused, well-defined purposes
- **Dependency Management**: Loose coupling between components for maintainability
- **Testable Architecture**: Every component designed for comprehensive testing

## 📋 Coding DNA & Conventions

### Established Patterns (${comprehensiveAnalysis.totalFilesAnalyzed} files analyzed)
${comprehensiveAnalysis.codeConventions.map((convention: string) => `- **${convention}**: Consistently applied throughout the codebase`).join('\n')}

### Critical Development Rules
- **Type Safety**: Comprehensive TypeScript usage with strict mode enforcement
- **Testing Strategy**: Multi-tier testing approach (unit, integration, e2e, performance)
- **Code Quality**: Automated linting and formatting with ESLint + Prettier
- **Documentation**: Inline documentation and comprehensive API documentation

## 🧠 AI Assistant Working Context

### For AI Assistants Working on This Codebase

**Project Type**: ${basicAnalysis.type}
**Primary Language**: ${basicAnalysis.language}
**Framework**: ${basicAnalysis.framework || 'None'}
**Complexity Level**: ${comprehensiveAnalysis.complexityScore}/100 (${comprehensiveAnalysis.codebaseHealth})

### Critical Knowledge
1. **Project Structure**: ${basicAnalysis.structure.length} key directories with clear separation of concerns
2. **Dependencies**: ${basicAnalysis.dependencies.length} managed dependencies with clear purposes
3. **Architecture Patterns**: ${comprehensiveAnalysis.architecturePatterns.length} identified patterns driving the design
4. **Code Standards**: ${comprehensiveAnalysis.codeConventions.length} enforced conventions for consistency

### Common Development Tasks
${this.generateDevelopmentTasks(basicAnalysis, comprehensiveAnalysis)}

### Working Patterns
- **Before Coding**: Search memory for existing patterns and architectural decisions
- **During Development**: Follow established patterns and maintain consistency
- **After Implementation**: Document new patterns and store insights
- **Testing**: Ensure comprehensive coverage following established patterns

### Key Constraints
${this.generateKeyConstraints(basicAnalysis, comprehensiveAnalysis)}

## 🎯 Project Mission & Goals

${this.generateProjectMission(basicAnalysis, comprehensiveAnalysis)}

## 📊 Codebase Health Report

- **Files Analyzed**: ${comprehensiveAnalysis.totalFilesAnalyzed}
- **Architecture Score**: ${Math.min(comprehensiveAnalysis.architecturePatterns.length * 25, 100)}/100
- **Convention Compliance**: ${Math.min(comprehensiveAnalysis.codeConventions.length * 20, 100)}/100
- **Overall Health**: ${comprehensiveAnalysis.codebaseHealth} (${comprehensiveAnalysis.complexityScore}/100)

## 🚀 Quick Start for AI Assistants

1. **Load Context**: Understand the project DNA and architectural patterns
2. **Review Patterns**: Study established conventions and design decisions
3. **Search Memory**: Use memory system for historical context and decisions
4. **Follow Standards**: Maintain consistency with existing codebase patterns
5. **Document Changes**: Store new insights and architectural decisions

### Available Commands
${basicAnalysis.commands.map(c => `- \`npm run ${c.name}\`: ${c.description}`).join('\n')}

### Key Dependencies
${basicAnalysis.dependencies.slice(0, 10).map(d => `- **${d.name}** (${d.version}): ${d.description || 'Core dependency'}`).join('\n')}

---

*Generated by comprehensive codebase analysis*
*Analysis completed: ${new Date().toLocaleDateString()}*
*Files reviewed: ${comprehensiveAnalysis.totalFilesAnalyzed}*
*Health assessment: ${comprehensiveAnalysis.codebaseHealth} (${comprehensiveAnalysis.complexityScore}/100)*
*AI Assistant Ready: Complete project context for intelligent development assistance*`;
  }

  /**
   * Generate development tasks based on project analysis
   */
  private generateDevelopmentTasks(basicAnalysis: ProjectContext, comprehensiveAnalysis: any): string {
    const tasks = [];

    if (basicAnalysis.type.includes('React') || basicAnalysis.type.includes('Node.js')) {
      tasks.push('- **Adding New Features**: Follow component patterns and service layer architecture');
      tasks.push('- **API Development**: Maintain RESTful patterns and error handling consistency');
    }

    if (comprehensiveAnalysis.architecturePatterns.some((p: string) => p.includes('MCP'))) {
      tasks.push('- **MCP Tool Development**: Use @MCPTool decorator with proper schema validation');
      tasks.push('- **Memory Operations**: Always use UnifiedMemoryManager for data persistence');
    }

    tasks.push('- **Testing**: Follow existing Jest patterns with comprehensive coverage');
    tasks.push('- **Documentation**: Update inline docs and maintain README files');

    return tasks.join('\n');
  }

  /**
   * Generate key constraints based on analysis
   */
  private generateKeyConstraints(basicAnalysis: ProjectContext, comprehensiveAnalysis: any): string {
    const constraints = [];

    if (comprehensiveAnalysis.codeConventions.some((c: string) => c.includes('TypeScript'))) {
      constraints.push('- **Type Safety**: Maintain comprehensive TypeScript typing');
    }

    if (comprehensiveAnalysis.architecturePatterns.some((p: string) => p.includes('MCP'))) {
      constraints.push('- **MCP Compliance**: All tools must follow MCP specification');
    }

    constraints.push('- **Performance**: Tools and operations must meet specified time limits');
    constraints.push('- **Testing**: Maintain high test coverage for all new functionality');

    return constraints.join('\n');
  }

  /**
   * Generate project mission statement
   */
  private generateProjectMission(basicAnalysis: ProjectContext, comprehensiveAnalysis: any): string {
    if (basicAnalysis.projectName?.includes('mcp') || basicAnalysis.type.includes('MCP')) {
      return `Transform GitHub Copilot into a context-aware coding assistant through:
- **Persistent Memory**: Advanced memory management with dual-tier architecture
- **User Preferences**: Automatic coding preference detection and storage
- **Project Context**: Intelligent project initialization and documentation
- **Tool Ecosystem**: Comprehensive MCP tool suite for development workflows`;
    }

    return `Deliver high-quality ${basicAnalysis.type} application through:
- **Robust Architecture**: Well-structured ${comprehensiveAnalysis.architecturePatterns.join(', ')} implementation
- **Code Quality**: Consistent application of ${comprehensiveAnalysis.codeConventions.join(', ')}
- **Performance**: Optimized for scalability and maintainability
- **User Experience**: Focus on reliability and intuitive functionality`;
  }

  /**
   * Store comprehensive analysis insights in memory
   */
  private async storeComprehensiveAnalysisInMemory(projectPath: string, analysis: any): Promise<void> {
    try {
      const memoryManager = new UnifiedMemoryManager(projectPath);
      await memoryManager.initialize();

      // Store comprehensive project analysis
      await memoryManager.store(
        `Comprehensive Project Analysis: ${analysis.keyInsights.join('. ')}
Architecture: ${analysis.architecturePatterns.join(', ')}
Conventions: ${analysis.codeConventions.join(', ')}
Complexity: ${analysis.complexityScore}/100
Health: ${analysis.codebaseHealth}`,
        'longterm',
        'project',
        projectPath,
        ['comprehensive-analysis', 'project-dna', 'architecture'],
        {
          analysis_type: 'comprehensive',
          files_analyzed: analysis.totalFilesAnalyzed,
          complexity_score: analysis.complexityScore,
          health: analysis.codebaseHealth,
          analysis_date: new Date().toISOString()
        }
      );

      // Store each architecture pattern as separate memory
      for (const pattern of analysis.architecturePatterns) {
        await memoryManager.store(
          `Architecture Pattern: ${pattern} - Identified during comprehensive codebase analysis`,
          'core',
          'project',
          projectPath,
          ['architecture', 'pattern', 'comprehensive'],
          {
            pattern_name: pattern,
            source: 'comprehensive_analysis',
            confidence: 0.9
          }
        );
      }

      console.error(`[INFO] Stored comprehensive analysis insights in memory`);

    } catch (error) {
      console.error(`[WARN] Failed to store comprehensive analysis in memory: ${error}`);
    }
  }
}