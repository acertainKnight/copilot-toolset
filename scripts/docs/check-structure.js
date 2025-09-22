#!/usr/bin/env node

/**
 * Progressive Disclosure Compliance Checker
 *
 * Validates documentation structure following hive mind optimization:
 * - Progressive disclosure patterns (main -> detailed -> examples)
 * - File length compliance with optimization standards
 * - Content hierarchy and organization
 * - Cross-reference validation
 * - Duplication detection
 * - Content freshness and consistency
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StructureChecker {
    constructor() {
        this.results = {
            compliance: { passed: [], failed: [] },
            hierarchy: { valid: [], invalid: [] },
            duplication: { duplicates: [], unique: [] },
            organization: { wellStructured: [], needsWork: [] }
        };

        // Hive mind optimization standards
        this.standards = {
            // Length limits (lines of non-empty content)
            lengthLimits: {
                'README.md': { max: 100, ideal: 80, critical: true },
                'examples/**/*.md': { max: 150, ideal: 120, critical: false },
                'docs/**/*.md': { max: 200, ideal: 150, critical: false },
                '*.md': { max: 300, ideal: 200, critical: false }
            },

            // Required progressive disclosure patterns
            progressivePatterns: {
                'README.md': {
                    requiredSections: ['Quick Start', 'Installation', 'Usage'],
                    mustHaveLinks: true,
                    maxDetailLevel: 2, // H1, H2 only
                    shouldReference: ['examples/', 'docs/']
                },
                'examples/**/*.md': {
                    requiredSections: ['Overview', 'Example'],
                    maxDetailLevel: 3,
                    shouldReference: ['../', 'docs/']
                },
                'docs/**/*.md': {
                    requiredSections: ['Overview'],
                    maxDetailLevel: 4,
                    mustHaveLinks: true
                }
            },

            // Content organization rules
            organizationRules: {
                // Main README should be gateway, not comprehensive
                mainReadmeMaxSections: 6,
                // Examples should be practical, not theoretical
                examplesShouldHaveCode: true,
                // Documentation should be reference-focused
                docsShouldHaveStructure: true
            }
        };

        // Content similarity detection
        this.duplicateThreshold = 0.7; // 70% similarity
    }

    /**
     * Main structure checking entry point
     */
    async checkStructure() {
        console.log('🏗️  Checking progressive disclosure structure compliance...\n');

        const projectRoot = path.resolve(__dirname, '../..');
        const markdownFiles = await this.getMarkdownFiles(projectRoot);

        console.log(`📄 Analyzing ${markdownFiles.length} documentation files\n`);

        // Analyze each file
        for (const file of markdownFiles) {
            await this.analyzeFile(file, projectRoot);
        }

        // Perform cross-file analysis
        await this.performCrossFileAnalysis();

        this.generateReport();

        // Return compliance status
        const hasViolations = this.results.compliance.failed.length > 0 ||
                             this.results.hierarchy.invalid.length > 0 ||
                             this.results.organization.needsWork.length > 0;

        return !hasViolations;
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
                    '.copilot/memory/**'
                ]
            });
            files.push(...matches.map(f => path.join(projectRoot, f)));
        }

        return [...new Set(files)];
    }

    /**
     * Analyze a single file for structure compliance
     */
    async analyzeFile(filePath, projectRoot) {
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`🔍 Analyzing structure of ${relativePath}...`);

        if (!existsSync(filePath)) {
            return;
        }

        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Progressive disclosure compliance check
        const complianceResult = this.checkProgressiveCompliance(relativePath, content, lines);
        if (complianceResult.compliant) {
            this.results.compliance.passed.push(complianceResult);
        } else {
            this.results.compliance.failed.push(complianceResult);
        }

        // Hierarchy check
        const hierarchyResult = this.checkHierarchy(relativePath, content);
        if (hierarchyResult.valid) {
            this.results.hierarchy.valid.push(hierarchyResult);
        } else {
            this.results.hierarchy.invalid.push(hierarchyResult);
        }

        // Organization check
        const organizationResult = this.checkOrganization(relativePath, content, lines);
        if (organizationResult.wellStructured) {
            this.results.organization.wellStructured.push(organizationResult);
        } else {
            this.results.organization.needsWork.push(organizationResult);
        }
    }

    /**
     * Check progressive disclosure compliance
     */
    checkProgressiveCompliance(filePath, content, lines) {
        const violations = [];
        const warnings = [];

        // Check length compliance
        const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;
        const lengthStandard = this.getLengthStandard(filePath);

        if (nonEmptyLines > lengthStandard.max) {
            const violation = {
                type: 'length_exceeded',
                severity: lengthStandard.critical ? 'critical' : 'warning',
                message: `File exceeds ${lengthStandard.critical ? 'critical' : 'recommended'} length: ${nonEmptyLines} > ${lengthStandard.max} lines`,
                suggestion: 'Consider breaking into smaller focused sections or moving details to examples/'
            };

            if (lengthStandard.critical) {
                violations.push(violation);
            } else {
                warnings.push(violation);
            }
        }

        // Check progressive pattern compliance
        const pattern = this.getProgressivePattern(filePath);
        if (pattern) {
            // Required sections
            for (const section of pattern.requiredSections || []) {
                if (!this.hasSection(content, section)) {
                    violations.push({
                        type: 'missing_section',
                        severity: 'error',
                        message: `Missing required section: "${section}"`,
                        suggestion: 'Add section to maintain progressive disclosure structure'
                    });
                }
            }

            // Detail level compliance
            const maxHeadingLevel = this.getMaxHeadingLevel(content);
            if (maxHeadingLevel > pattern.maxDetailLevel) {
                warnings.push({
                    type: 'excessive_detail',
                    severity: 'warning',
                    message: `Heading depth ${maxHeadingLevel} exceeds recommended ${pattern.maxDetailLevel}`,
                    suggestion: 'Consider moving detailed content to dedicated documentation'
                });
            }

            // Link requirements
            if (pattern.mustHaveLinks && !this.hasLinks(content)) {
                violations.push({
                    type: 'missing_links',
                    severity: 'error',
                    message: 'File should contain links to related documentation',
                    suggestion: 'Add links to relevant examples, docs, or related sections'
                });
            }

            // Reference requirements
            if (pattern.shouldReference) {
                for (const ref of pattern.shouldReference) {
                    if (!this.referencesPath(content, ref)) {
                        warnings.push({
                            type: 'missing_reference',
                            severity: 'warning',
                            message: `Should reference "${ref}" for progressive disclosure`,
                            suggestion: 'Add links to guide users to more detailed information'
                        });
                    }
                }
            }
        }

        return {
            file: filePath,
            compliant: violations.length === 0,
            violations,
            warnings,
            stats: {
                lineCount: nonEmptyLines,
                lengthStandard: lengthStandard,
                sections: this.extractSections(content)
            }
        };
    }

    /**
     * Check heading hierarchy validity
     */
    checkHierarchy(filePath, content) {
        const issues = [];
        const headings = this.extractHeadings(content);

        let previousLevel = 0;

        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const currentLevel = heading.level;

            // Check for hierarchy skips
            if (currentLevel - previousLevel > 1) {
                issues.push({
                    type: 'hierarchy_skip',
                    line: heading.line,
                    message: `Heading skips levels: H${previousLevel} to H${currentLevel}`,
                    content: heading.text
                });
            }

            // Check for too deep nesting in overview files
            if (filePath.includes('README') && currentLevel > 3) {
                issues.push({
                    type: 'too_deep',
                    line: heading.line,
                    message: 'README should not go deeper than H3',
                    content: heading.text
                });
            }

            previousLevel = currentLevel;
        }

        return {
            file: filePath,
            valid: issues.length === 0,
            issues,
            headingStructure: headings.map(h => ({ level: h.level, text: h.text }))
        };
    }

    /**
     * Check content organization quality
     */
    checkOrganization(filePath, content, lines) {
        const issues = [];
        const strengths = [];

        // Check for code examples in example files
        if (filePath.includes('examples/') && this.standards.organizationRules.examplesShouldHaveCode) {
            const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
            if (codeBlocks === 0) {
                issues.push({
                    type: 'missing_code',
                    severity: 'warning',
                    message: 'Example file should contain code examples',
                    suggestion: 'Add practical code examples users can copy and use'
                });
            } else {
                strengths.push('Contains practical code examples');
            }
        }

        // Check README complexity
        if (path.basename(filePath) === 'README.md') {
            const sections = this.extractSections(content);
            if (sections.length > this.standards.organizationRules.mainReadmeMaxSections) {
                issues.push({
                    type: 'too_complex',
                    severity: 'warning',
                    message: `README has ${sections.length} sections, should be ≤ ${this.standards.organizationRules.mainReadmeMaxSections}`,
                    suggestion: 'Move detailed content to dedicated documentation files'
                });
            } else {
                strengths.push('Maintains focused overview structure');
            }
        }

        // Check for clear structure in docs
        if (filePath.includes('docs/') && this.standards.organizationRules.docsShouldHaveStructure) {
            const hasOverview = this.hasSection(content, 'overview');
            const hasUsage = this.hasSection(content, 'usage') || this.hasSection(content, 'example');

            if (!hasOverview) {
                issues.push({
                    type: 'missing_overview',
                    severity: 'warning',
                    message: 'Documentation should start with overview section',
                    suggestion: 'Add overview section to orient readers'
                });
            }

            if (!hasUsage) {
                issues.push({
                    type: 'missing_usage',
                    severity: 'info',
                    message: 'Consider adding usage or example section',
                    suggestion: 'Show practical application of the concepts'
                });
            }

            if (hasOverview && hasUsage) {
                strengths.push('Well-structured with overview and usage');
            }
        }

        // Check for progressive disclosure patterns
        const hasLinks = this.hasLinks(content);
        const linkCount = (content.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;

        if (hasLinks && linkCount >= 3) {
            strengths.push('Good use of progressive disclosure through links');
        } else if (lines.length > 50 && linkCount < 2) {
            issues.push({
                type: 'insufficient_links',
                severity: 'info',
                message: 'Consider adding more links for progressive disclosure',
                suggestion: 'Link to detailed examples, related docs, or external resources'
            });
        }

        return {
            file: filePath,
            wellStructured: issues.filter(i => i.severity === 'error' || i.severity === 'warning').length === 0,
            issues,
            strengths,
            metrics: {
                codeBlocks: (content.match(/```[\s\S]*?```/g) || []).length,
                links: linkCount,
                sections: this.extractSections(content).length,
                lineCount: lines.filter(l => l.trim()).length
            }
        };
    }

    /**
     * Perform cross-file analysis for duplication
     */
    async performCrossFileAnalysis() {
        console.log('🔄 Performing cross-file duplication analysis...');

        const fileContents = this.results.compliance.passed.concat(this.results.compliance.failed)
            .map(result => ({
                file: result.file,
                content: readFileSync(result.file, 'utf-8')
            }));

        // Check for content duplication
        for (let i = 0; i < fileContents.length; i++) {
            for (let j = i + 1; j < fileContents.length; j++) {
                const similarity = this.calculateSimilarity(
                    fileContents[i].content,
                    fileContents[j].content
                );

                if (similarity > this.duplicateThreshold) {
                    this.results.duplication.duplicates.push({
                        file1: path.relative(path.resolve(__dirname, '../..'), fileContents[i].file),
                        file2: path.relative(path.resolve(__dirname, '../..'), fileContents[j].file),
                        similarity: Math.round(similarity * 100),
                        suggestion: 'Consider consolidating or cross-referencing these similar sections'
                    });
                }
            }
        }

        // Mark unique content
        const duplicateFiles = new Set();
        this.results.duplication.duplicates.forEach(dup => {
            duplicateFiles.add(dup.file1);
            duplicateFiles.add(dup.file2);
        });

        this.results.duplication.unique = fileContents
            .filter(fc => !duplicateFiles.has(path.relative(path.resolve(__dirname, '../..'), fc.file)))
            .map(fc => ({ file: path.relative(path.resolve(__dirname, '../..'), fc.file) }));
    }

    /**
     * Calculate content similarity between two strings
     */
    calculateSimilarity(content1, content2) {
        // Simple implementation - count common lines
        const lines1 = new Set(content1.split('\n').map(l => l.trim()).filter(l => l.length > 10));
        const lines2 = new Set(content2.split('\n').map(l => l.trim()).filter(l => l.length > 10));

        const intersection = new Set([...lines1].filter(l => lines2.has(l)));
        const union = new Set([...lines1, ...lines2]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Helper methods for content analysis
     */

    getLengthStandard(filePath) {
        for (const [pattern, standard] of Object.entries(this.standards.lengthLimits)) {
            if (this.matchesPattern(filePath, pattern)) {
                return standard;
            }
        }
        return this.standards.lengthLimits['*.md'];
    }

    getProgressivePattern(filePath) {
        for (const [pattern, patternConfig] of Object.entries(this.standards.progressivePatterns)) {
            if (this.matchesPattern(filePath, pattern)) {
                return patternConfig;
            }
        }
        return null;
    }

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
            return regex.test(path.basename(relativePath));
        }

        return path.basename(relativePath) === pattern;
    }

    hasSection(content, sectionName) {
        const regex = new RegExp(`^#+\\s+.*${sectionName}.*$`, 'mi');
        return regex.test(content);
    }

    getMaxHeadingLevel(content) {
        const headings = content.match(/^#+/gm) || [];
        return Math.max(0, ...headings.map(h => h.length));
    }

    hasLinks(content) {
        return /\[[^\]]+\]\([^)]+\)/.test(content) || /<a\s+[^>]*href/.test(content);
    }

    referencesPath(content, pathPattern) {
        return content.includes(pathPattern);
    }

    extractSections(content) {
        return (content.match(/^#+\s+(.+)$/gm) || [])
            .map(match => match.replace(/^#+\s+/, '').trim());
    }

    extractHeadings(content) {
        const lines = content.split('\n');
        const headings = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headingMatch = line.match(/^(#+)\s+(.+)$/);
            if (headingMatch) {
                headings.push({
                    level: headingMatch[1].length,
                    text: headingMatch[2].trim(),
                    line: i + 1
                });
            }
        }

        return headings;
    }

    /**
     * Generate comprehensive structure report
     */
    generateReport() {
        console.log('\n🏗️  PROGRESSIVE DISCLOSURE STRUCTURE REPORT');
        console.log('='.repeat(60));

        const totalFiles = this.results.compliance.passed.length + this.results.compliance.failed.length;
        console.log(`📊 Total files analyzed: ${totalFiles}`);

        // Compliance summary
        console.log(`\n📋 Progressive Disclosure Compliance:`);
        console.log(`   ✅ Compliant: ${this.results.compliance.passed.length}`);
        console.log(`   ❌ Non-compliant: ${this.results.compliance.failed.length}`);

        // Hierarchy summary
        console.log(`\n🔢 Heading Hierarchy:`);
        console.log(`   ✅ Valid structure: ${this.results.hierarchy.valid.length}`);
        console.log(`   ❌ Issues found: ${this.results.hierarchy.invalid.length}`);

        // Organization summary
        console.log(`\n📖 Content Organization:`);
        console.log(`   ✅ Well structured: ${this.results.organization.wellStructured.length}`);
        console.log(`   ⚠️  Needs improvement: ${this.results.organization.needsWork.length}`);

        // Duplication summary
        console.log(`\n🔄 Content Duplication:`);
        console.log(`   ✅ Unique content: ${this.results.duplication.unique.length}`);
        console.log(`   ⚠️  Similar content pairs: ${this.results.duplication.duplicates.length}`);

        // Show detailed compliance failures
        if (this.results.compliance.failed.length > 0) {
            console.log(`\n❌ COMPLIANCE VIOLATIONS:`);
            for (const failure of this.results.compliance.failed) {
                console.log(`\n   📄 ${failure.file}:`);
                for (const violation of failure.violations) {
                    console.log(`     ${this.getViolationIcon(violation.severity)} ${violation.message}`);
                    console.log(`        💡 ${violation.suggestion}`);
                }
            }
        }

        // Show hierarchy issues
        if (this.results.hierarchy.invalid.length > 0) {
            console.log(`\n❌ HIERARCHY ISSUES:`);
            for (const issue of this.results.hierarchy.invalid) {
                console.log(`\n   📄 ${issue.file}:`);
                for (const problem of issue.issues) {
                    console.log(`     ⚠️  Line ${problem.line}: ${problem.message}`);
                    console.log(`        Content: "${problem.content}"`);
                }
            }
        }

        // Show organization issues (warnings only)
        const orgIssues = this.results.organization.needsWork.filter(org =>
            org.issues.some(i => i.severity === 'warning')
        );
        if (orgIssues.length > 0) {
            console.log(`\n⚠️  ORGANIZATION SUGGESTIONS:`);
            for (const org of orgIssues.slice(0, 3)) { // Show top 3
                console.log(`\n   📄 ${org.file}:`);
                for (const issue of org.issues.filter(i => i.severity === 'warning')) {
                    console.log(`     💡 ${issue.message}`);
                    console.log(`        ${issue.suggestion}`);
                }
            }
        }

        // Show content duplications
        if (this.results.duplication.duplicates.length > 0) {
            console.log(`\n🔄 CONTENT DUPLICATION DETECTED:`);
            for (const dup of this.results.duplication.duplicates.slice(0, 5)) { // Show top 5
                console.log(`   📄 ${dup.file1} ↔️ ${dup.file2}`);
                console.log(`      Similarity: ${dup.similarity}%`);
                console.log(`      💡 ${dup.suggestion}`);
            }
            if (this.results.duplication.duplicates.length > 5) {
                console.log(`   ... and ${this.results.duplication.duplicates.length - 5} more pairs`);
            }
        }

        // Success message
        if (this.results.compliance.failed.length === 0 && this.results.hierarchy.invalid.length === 0) {
            console.log('\n🎉 Documentation structure follows progressive disclosure principles!');
            console.log('✨ Hive mind optimization standards maintained.');
        }

        console.log('\n' + '='.repeat(60));
    }

    getViolationIcon(severity) {
        const icons = {
            critical: '🚨',
            error: '❌',
            warning: '⚠️',
            info: '💡'
        };
        return icons[severity] || '•';
    }
}

// Run structure checking if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const checker = new StructureChecker();
    checker.checkStructure().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Structure checking failed:', error);
        process.exit(1);
    });
}

export { StructureChecker };