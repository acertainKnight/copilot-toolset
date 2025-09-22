#!/usr/bin/env node

/**
 * Comprehensive Documentation Validation Script
 *
 * Validates all documentation following the hive mind optimization standards:
 * - Progressive disclosure compliance (length limits)
 * - Markdown format consistency
 * - Code example verification
 * - Cross-reference validation
 * - Content freshness checks
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentationValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.validated = [];

        // Progressive disclosure limits (from hive mind optimization)
        this.lengthLimits = {
            'README.md': 100,        // Main README optimized to 81 lines
            'examples/**/*.md': 150,  // Example files kept concise
            'docs/**/*.md': 200,      // Documentation files
            '*.md': 300              // Default limit for other files
        };

        // Required sections for different file types
        this.requiredSections = {
            'README.md': ['Quick Start', 'Installation', 'Usage'],
            'examples/**/*.md': ['Overview', 'Example'],
            'docs/**/*.md': ['Overview', 'Usage']
        };
    }

    /**
     * Main validation entry point
     */
    async validate() {
        console.log('🔍 Starting comprehensive documentation validation...\n');

        const projectRoot = path.resolve(__dirname, '../..');
        const markdownFiles = await this.getMarkdownFiles(projectRoot);

        console.log(`📄 Found ${markdownFiles.length} markdown files to validate\n`);

        for (const file of markdownFiles) {
            await this.validateFile(file, projectRoot);
        }

        this.generateReport();

        // Exit with error code if validation fails
        if (this.errors.length > 0) {
            process.exit(1);
        }
    }

    /**
     * Get all markdown files in the project
     */
    async getMarkdownFiles(projectRoot) {
        const patterns = [
            '*.md',
            'docs/**/*.md',
            'examples/**/*.md',
            '.github/**/*.md'
        ];

        const files = [];
        for (const pattern of patterns) {
            const matches = await glob(pattern, {
                cwd: projectRoot,
                ignore: [
                    'node_modules/**',
                    'dist/**',
                    'coverage/**',
                    '.copilot/memory/**'  // Exclude memory files
                ]
            });
            files.push(...matches.map(f => path.join(projectRoot, f)));
        }

        return [...new Set(files)]; // Remove duplicates
    }

    /**
     * Validate a single markdown file
     */
    async validateFile(filePath, projectRoot) {
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`🔎 Validating ${relativePath}...`);

        if (!existsSync(filePath)) {
            this.addError(relativePath, 'File does not exist');
            return;
        }

        try {
            const content = readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            // Progressive disclosure compliance
            this.checkLength(relativePath, lines);

            // Markdown structure validation
            this.checkMarkdownStructure(relativePath, content, lines);

            // Required sections validation
            this.checkRequiredSections(relativePath, content);

            // Code block validation
            this.checkCodeBlocks(relativePath, content);

            // Link validation (internal links only for now)
            this.checkInternalLinks(relativePath, content, projectRoot);

            // Content freshness (check for outdated patterns)
            this.checkContentFreshness(relativePath, content);

            this.validated.push(relativePath);

        } catch (error) {
            this.addError(relativePath, `Failed to read file: ${error.message}`);
        }
    }

    /**
     * Check progressive disclosure compliance
     */
    checkLength(filePath, lines) {
        const lineCount = lines.filter(line => line.trim().length > 0).length;
        const limit = this.getLengthLimit(filePath);

        if (lineCount > limit) {
            this.addError(filePath,
                `File exceeds progressive disclosure limit: ${lineCount} lines > ${limit} lines. ` +
                `Consider breaking into smaller sections or using the examples/ directory.`
            );
        } else if (lineCount > limit * 0.8) {
            this.addWarning(filePath,
                `File approaching length limit: ${lineCount}/${limit} lines (${Math.round(lineCount/limit*100)}%)`
            );
        }
    }

    /**
     * Get length limit for a file based on patterns
     */
    getLengthLimit(filePath) {
        for (const [pattern, limit] of Object.entries(this.lengthLimits)) {
            if (this.matchesPattern(filePath, pattern)) {
                return limit;
            }
        }
        return this.lengthLimits['*.md'];
    }

    /**
     * Simple pattern matching for file paths
     */
    matchesPattern(filePath, pattern) {
        const relativePath = path.relative(path.resolve(__dirname, '../..'), filePath);

        if (pattern.includes('**')) {
            // Convert glob pattern to regex - escape special regex chars first
            const regexPattern = pattern
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
                .replace(/\*\*/g, '.*')                 // ** matches any path
                .replace(/\*/g, '[^/]*');               // * matches within path segment

            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(relativePath);
        }

        if (pattern.includes('*')) {
            const regexPattern = pattern
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
                .replace(/\*/g, '.*');                  // * matches anything

            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(path.basename(filePath));
        }

        return path.basename(filePath) === pattern;
    }

    /**
     * Check markdown structure and formatting
     */
    checkMarkdownStructure(filePath, content, lines) {
        // Check for proper heading hierarchy
        const headings = lines.filter(line => line.trim().startsWith('#'));
        let previousLevel = 0;

        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const level = (heading.match(/^#+/) || [''])[0].length;

            if (level - previousLevel > 1) {
                this.addWarning(filePath,
                    `Heading hierarchy skip detected: "${heading.trim()}" (level ${level} after level ${previousLevel})`
                );
            }
            previousLevel = level;
        }

        // Check for consistent list formatting
        const listLines = lines.filter(line => line.trim().match(/^[-*+]\s/));
        if (listLines.length > 0) {
            const markers = listLines.map(line => line.trim()[0]);
            const uniqueMarkers = [...new Set(markers)];
            if (uniqueMarkers.length > 1) {
                this.addWarning(filePath,
                    `Inconsistent list markers found: ${uniqueMarkers.join(', ')}. Use consistent markers.`
                );
            }
        }

        // Check for proper code fence formatting
        const codeFences = content.match(/```[\s\S]*?```/g) || [];
        for (const fence of codeFences) {
            if (!fence.includes('\n')) {
                this.addWarning(filePath, 'Single-line code fence detected. Consider using inline code `code` instead.');
            }
        }
    }

    /**
     * Check for required sections based on file type
     */
    checkRequiredSections(filePath, content) {
        for (const [pattern, sections] of Object.entries(this.requiredSections)) {
            if (this.matchesPattern(filePath, pattern)) {
                for (const section of sections) {
                    if (!content.toLowerCase().includes(section.toLowerCase())) {
                        this.addWarning(filePath, `Missing recommended section: "${section}"`);
                    }
                }
                break;
            }
        }
    }

    /**
     * Validate code blocks for basic syntax
     */
    checkCodeBlocks(filePath, content) {
        const codeBlocks = content.match(/```(\w+)?\n([\s\S]*?)```/g) || [];

        for (let i = 0; i < codeBlocks.length; i++) {
            const block = codeBlocks[i];
            const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
            if (!match) continue;

            const language = match[1] || 'text';
            const code = match[2].trim();

            // Basic validation for common languages
            if (language === 'json') {
                try {
                    JSON.parse(code);
                } catch (error) {
                    this.addError(filePath, `Invalid JSON in code block ${i + 1}: ${error.message}`);
                }
            }

            if (language === 'bash' && code.includes('rm -rf /')) {
                this.addWarning(filePath, `Potentially dangerous bash command in code block ${i + 1}`);
            }

            // Check for placeholder values that should be replaced
            const placeholders = ['YOUR_TOKEN', 'REPLACE_ME', 'TODO', 'FIXME'];
            for (const placeholder of placeholders) {
                if (code.includes(placeholder)) {
                    this.addWarning(filePath,
                        `Code block ${i + 1} contains placeholder "${placeholder}". Ensure examples are complete.`
                    );
                }
            }
        }
    }

    /**
     * Check internal links (relative links within the project)
     */
    checkInternalLinks(filePath, content, projectRoot) {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            const linkText = match[1];
            const linkPath = match[2];

            // Skip external links and anchors
            if (linkPath.startsWith('http') || linkPath.startsWith('#')) {
                continue;
            }

            // Resolve relative links
            const fileDir = path.dirname(filePath);
            const resolvedPath = path.resolve(fileDir, linkPath);

            if (!existsSync(resolvedPath)) {
                this.addError(filePath, `Broken internal link: "${linkText}" -> ${linkPath}`);
            }
        }
    }

    /**
     * Check for outdated content patterns
     */
    checkContentFreshness(filePath, content) {
        const outdatedPatterns = [
            { pattern: /node.*14/gi, message: 'References to Node 14 detected. Consider updating to Node 18+.' },
            { pattern: /npm.*6\./gi, message: 'References to old npm version detected.' },
            { pattern: /\.d\.ts files/gi, message: 'TypeScript definition files mentioned - ensure examples are current.' }
        ];

        for (const { pattern, message } of outdatedPatterns) {
            if (pattern.test(content)) {
                this.addWarning(filePath, message);
            }
        }

        // Check file modification time
        const stats = statSync(filePath);
        const daysSinceModified = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);

        if (daysSinceModified > 90) {
            this.addWarning(filePath,
                `File hasn't been updated in ${Math.round(daysSinceModified)} days. Consider reviewing for accuracy.`
            );
        }
    }

    /**
     * Add an error
     */
    addError(file, message) {
        this.errors.push({ file, message, type: 'error' });
    }

    /**
     * Add a warning
     */
    addWarning(file, message) {
        this.warnings.push({ file, message, type: 'warning' });
    }

    /**
     * Generate validation report
     */
    generateReport() {
        console.log('\n📊 DOCUMENTATION VALIDATION REPORT');
        console.log('='.repeat(50));
        console.log(`✅ Files validated: ${this.validated.length}`);
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);

        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            for (const { file, message } of this.errors) {
                console.log(`   ${file}: ${message}`);
            }
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            for (const { file, message } of this.warnings) {
                console.log(`   ${file}: ${message}`);
            }
        }

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('\n🎉 All documentation passes validation!');
            console.log('✨ Hive mind optimization standards maintained.');
        }

        console.log('\n' + '='.repeat(50));
    }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const validator = new DocumentationValidator();
    validator.validate().catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

export { DocumentationValidator };